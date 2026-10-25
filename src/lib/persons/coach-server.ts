import { after } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { consumeChatQuery, refundChatQuery } from '@/lib/billing/check-access';
import { detectCrisis } from '@/lib/ai/crisis';
import { getCrisisResources } from '@/config/crisis-resources';
import { coachAnswer, coachReport } from './ai';
import { regionFor } from '@/config/regionalisms';
import { newUserTurns, ruleTip, type PracticeLine } from './coach';
import { blindSpots, emotionTimeline, MIN_DEBRIEF_MESSAGES, ruleReport, type DebriefMessage, type DebriefReport } from './debrief';
import type { PersonaMessageRow, PersonaRow, PersonsSession } from './server';
import type { EffectivePlan } from '@/lib/billing/access-rules';

/** Fila de `persona_coach_messages` (0042). */
export type CoachRow = {
  id: string;
  persona_id: string;
  role: 'user' | 'coach';
  kind: 'text' | 'tip' | 'report';
  content: string;
  upto_at: string | null;
  meta: { report?: DebriefReport; debrief_id?: string | null } & Record<string, unknown>;
  created_at: string;
};
export type CoachMessage = Pick<CoachRow, 'id' | 'persona_id' | 'role' | 'kind' | 'content' | 'created_at'> & { report?: DebriefReport };

const publicCoach = (r: CoachRow): CoachMessage => ({ id: r.id, persona_id: r.persona_id, role: r.role, kind: r.kind, content: r.content, created_at: r.created_at, report: r.meta?.report });

/** Lo entregado de la práctica (sin bloqueados ni crisis), en orden. */
export async function practiceLines(personaId: string, limit = 80): Promise<PracticeLine[]> {
  const { data } = await createAdminClient().from('persona_messages').select('role, content, emotion, meta, deliver_at, created_at')
    .eq('persona_id', personaId).lte('deliver_at', new Date().toISOString()).order('deliver_at', { ascending: false }).limit(limit);
  return ((data ?? []) as Pick<PersonaMessageRow, 'role' | 'content' | 'emotion' | 'meta' | 'deliver_at' | 'created_at'>[])
    .filter((m) => !m.meta?.blocked && !m.meta?.crisis && !m.meta?.photo)
    .reverse()
    .map((m) => ({ role: m.role, content: m.content, emotion: m.emotion, at: m.role === 'user' ? m.created_at : m.deliver_at }));
}

async function coachRows(personaId: string, limit = 60) {
  const { data } = await createAdminClient().from('persona_coach_messages').select('*').eq('persona_id', personaId)
    .order('created_at', { ascending: false }).limit(limit);
  return ((data ?? []) as CoachRow[]).reverse();
}

/**
 * El chat con Ale es UNO (una conversación más de la lista): junta lo que te ha dicho de todas tus prácticas, en orden,
 * y cada mensaje sabe de qué personaje habla. Marca leído lo del coach en todos.
 */
export async function loadCoachThread(userId: string, personas: PersonaRow[], focusId: string | null) {
  const db = createAdminClient();
  const { data } = await db.from('persona_coach_messages').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(120);
  const rows = ((data ?? []) as CoachRow[]).reverse();
  const ids = new Set(personas.map((p) => p.id));
  // De qué personaje se habla al abrir: el pedido, el del último mensaje con Ale o el de la práctica más reciente.
  const focus = (focusId && ids.has(focusId) ? focusId : null)
    ?? [...rows].reverse().find((r) => ids.has(r.persona_id))?.persona_id
    ?? personas[0]?.id ?? null;
  void db.from('personas').update({ coach_read_at: new Date().toISOString() }).eq('user_id', userId).then(() => undefined);
  return { messages: rows.filter((r) => ids.has(r.persona_id)).map(publicCoach), focus };
}
export type CoachThread = Awaited<ReturnType<typeof loadCoachThread>>;

/** La fila de Ale en la lista de chats: su último mensaje (y de quién hablaba) y cuántos sin leer. */
export async function coachSummary(userId: string, personas: Pick<PersonaRow, 'id' | 'name' | 'created_at' | 'coach_read_at'>[]) {
  const { data } = await createAdminClient().from('persona_coach_messages').select('persona_id, role, kind, content, created_at')
    .eq('user_id', userId).order('created_at', { ascending: false }).limit(40);
  const byId = new Map(personas.map((p) => [p.id, p]));
  const rows = ((data ?? []) as Pick<CoachRow, 'persona_id' | 'role' | 'kind' | 'content' | 'created_at'>[]).filter((r) => byId.has(r.persona_id));
  const unread = rows.filter((r) => r.role === 'coach' && r.created_at > (byId.get(r.persona_id)!.coach_read_at ?? byId.get(r.persona_id)!.created_at)).length;
  const last = rows[0];
  return {
    unread,
    last: last ? { content: last.kind === 'report' ? '📋 Feedback de la sesión' : last.content, at: last.created_at, role: last.role, about: byId.get(last.persona_id)!.name } : null,
  };
}
export type CoachSummary = Awaited<ReturnType<typeof coachSummary>>;

/** Lo nuevo del coach para el chat de práctica: cuántas ideas sin leer y la última. */
export async function coachBadge(persona: PersonaRow & { coach_read_at?: string }) {
  const db = createAdminClient();
  const since = persona.coach_read_at ?? persona.created_at;
  const { data, count } = await db.from('persona_coach_messages').select('content', { count: 'exact' }).eq('persona_id', persona.id)
    .eq('role', 'coach').gt('created_at', since).order('created_at', { ascending: false }).limit(1);
  return { unread: count ?? 0, preview: (data?.[0]?.content as string | undefined)?.slice(0, 120) ?? null };
}

/** Varias burbujas a la vez: cada una con su milisegundo, para que el orden sea el que se escribió. */
function insertCoach(persona: PersonaRow, rows: Partial<CoachRow>[]) {
  const base = Date.now();
  return createAdminClient().from('persona_coach_messages')
    .insert(rows.map((r, i) => ({ persona_id: persona.id, user_id: persona.user_id, role: 'coach', kind: 'text', created_at: new Date(base + i).toISOString(), ...r })))
    .select('*').order('created_at', { ascending: true });
}

/**
 * Tu coach no escribe a cada rato (ni gasta IA mientras practicas). En tu PRIMERA plática deja una sola idea al tercer
 * mensaje, por reglas, para que sepas que está ahí; después habla al terminar cada plática (`maybeAutoDebrief`) o
 * cuando le preguntas.
 */
export async function maybeFirstTip(userId: string, persona: PersonaRow) {
  const db = createAdminClient();
  const { count } = await db.from('persona_coach_messages').select('id', { count: 'exact', head: true }).eq('user_id', userId);
  if (count) return;
  const lines = await practiceLines(persona.id);
  const fresh = newUserTurns(lines, null);
  if (!fresh.length) return;
  await insertCoach(persona, [
    { kind: 'tip', content: ruleTip(fresh), upto_at: fresh[fresh.length - 1]!.at },
    { content: `cuando termines de platicar con ${persona.name} te dejo el feedback completo: qué funcionó, qué decir distinto y cómo se fue sintiendo` },
  ]);
}

/** Después de responder (Vercel `after`): la petición no espera. */
export function scheduleFirstTip(userId: string, persona: PersonaRow) {
  const run = () => maybeFirstTip(userId, persona).catch(() => undefined);
  try { after(run); } catch { void run(); }
}

export type AskResult = { ok: true; messages: CoachMessage[] } | { ok: false; status: number; reason: 'exhausted' | 'ai' };

/** La persona le pregunta algo al coach (cuenta como un mensaje del plan; la crisis nunca). */
export async function askCoach(s: PersonsSession, persona: PersonaRow, text: string, blind: boolean): Promise<AskResult> {
  const db = createAdminClient();
  const saveOwn = async () => {
    const { data } = await db.from('persona_coach_messages').insert({ persona_id: persona.id, user_id: s.userId, role: 'user', content: text.slice(0, 2000) }).select('*').single();
    return data ? [publicCoach(data as CoachRow)] : [];
  };

  if (detectCrisis(text)) {
    const own = await saveOwn();
    const lines = getCrisisResources(s.profile.country).map((r) => `${r.name}: ${r.phone}`).join(' · ');
    await db.from('agent_knowledge').insert({ user_id: s.userId, category: 'crisis_log', title: 'Crisis detectada (persons, coach)', content: text, metadata: { country: s.profile.country ?? 'MX', source: 'persons_coach', persona_id: persona.id } });
    const { data } = await insertCoach(persona, [{ content: `oye, esto es más importante que cualquier práctica. si estás pensando en hacerte daño, habla hoy con alguien: ${lines}. si estás en peligro, llama a emergencias. aquí sigo.`, meta: { crisis: true } }]);
    return { ok: true, messages: [...own, ...((data ?? []) as CoachRow[]).map(publicCoach)] };
  }

  const consumed = await consumeChatQuery();
  if (consumed === 'exhausted') return { ok: false, status: 402, reason: 'exhausted' };
  const [lines, rows] = await Promise.all([practiceLines(persona.id), coachRows(persona.id, 20)]);
  const own = await saveOwn();
  try {
    const { messages, provider } = await coachAnswer(persona.spec, lines, rows.filter((r) => r.kind !== 'report').map((r) => ({ role: r.role, content: r.content })), text, blind, regionFor(s.region));
    const last = lines.filter((l) => l.role === 'user').pop();
    const { data } = await insertCoach(persona, messages.map((content, i) => ({ content: content.slice(0, 2000), upto_at: i === 0 ? last?.at ?? null : null, meta: { provider } })));
    return { ok: true, messages: [...own, ...((data ?? []) as CoachRow[]).map(publicCoach)] };
  } catch (e) {
    console.error('[persons] coach respuesta', e instanceof Error ? e.message : e);
    if (consumed === 'consumed') await refundChatQuery();
    return { ok: false, status: 503, reason: 'ai' };
  }
}

/** Una plática "terminó" si no escribes en este tiempo (y tuvo al menos `AUTO_MIN_TURNS` mensajes tuyos). */
export const SESSION_GAP_MS = 25 * 60_000;
export const AUTO_MIN_TURNS = 5;

export type DebriefResult = { ok: true; report: DebriefReport; id: string | null; coach: CoachMessage[] } | { ok: false; reason: 'too_short' };

/**
 * El feedback de lo que se habló desde el último. Prueba y Plus: el coach con IA (una llamada por plática); Free: el
 * mismo informe por reglas, sin IA, y Ale cuenta qué más vería con Plus. La línea de emociones y los puntos ciegos
 * siempre salen de reglas. Llega al chat de Ale como tarjeta y queda en el historial de la ficha.
 */
export async function runDebrief(persona: PersonaRow, plan: EffectivePlan, opts: { auto?: boolean; trialDays?: number } = {}): Promise<DebriefResult> {
  const db = createAdminClient();
  const nowIso = new Date().toISOString();
  const { data: last } = await db.from('persona_debriefs').select('to_at').eq('persona_id', persona.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
  let q = db.from('persona_messages').select('role, content, emotion, meta, deliver_at').eq('persona_id', persona.id).lte('deliver_at', nowIso);
  if (last?.to_at) q = q.gt('deliver_at', last.to_at as string);
  const { data } = await q.order('deliver_at', { ascending: true }).limit(200);
  const messages: DebriefMessage[] = ((data ?? []) as Pick<PersonaMessageRow, 'role' | 'content' | 'emotion' | 'meta'>[])
    .filter((m) => !m.meta?.crisis)
    .map((m) => ({ role: m.role, content: m.content, emotion: m.emotion }));
  const own = messages.filter((m) => m.role === 'user').length;
  if (own < (opts.auto ? AUTO_MIN_TURNS : MIN_DEBRIEF_MESSAGES)) return { ok: false, reason: 'too_short' };

  const timeline = emotionTimeline(messages);
  let report: DebriefReport = { ...ruleReport(messages), timeline, blindSpots: blindSpots(messages), source: 'rules' };
  let provider: string | null = null;
  if (plan !== 'free') {
    try {
      const r = await coachReport(persona.spec, messages, timeline);
      provider = r.provider;
      report = { ...r.report, timeline, blindSpots: blindSpots(messages), source: 'ai' };
    } catch (error) {
      console.error('[persons] coach', error instanceof Error ? error.message : error);
    }
  }
  const { data: saved, error } = await db.from('persona_debriefs').insert({
    persona_id: persona.id, user_id: persona.user_id, from_at: (last?.to_at as string | undefined) ?? null, to_at: nowIso,
    messages_count: messages.length, report, provider,
  }).select('id').single();
  if (error) console.error('[persons] guardar debrief', error.message);
  const id = (saved?.id as string | undefined) ?? null;

  const intro = opts.auto ? `vi que terminaste de platicar con ${persona.name} 👀 te dejo cómo te fue:` : report.source === 'ai' ? 'listo, ya leí toda la plática 👀 te dejo cómo te fue:' : 'leí la plática. va un resumen rápido de cómo te fue:';
  const outro = plan === 'free'
    ? 'con Plus te explico frase por frase qué funcionó y qué le habrías podido decir distinto. ¿quieres que veamos algún mensaje?'
    : plan === 'trial' && opts.trialDays
      ? `esto viene completo en tu prueba (te ${opts.trialDays === 1 ? 'queda 1 día' : `quedan ${opts.trialDays} días`}). ¿vemos algún mensaje en específico?`
      : '¿quieres que veamos algún mensaje en específico o qué le dirías la próxima vez?';
  const { data: rows } = await insertCoach(persona, [
    { content: intro },
    { kind: 'report', content: report.summary.slice(0, 2000), upto_at: nowIso, meta: { report, debrief_id: id } },
    { content: outro },
  ]);
  return { ok: true, report, id, coach: ((rows ?? []) as CoachRow[]).map(publicCoach) };
}

/**
 * Al volver a la lista (o abrir a Ale): cada plática que terminó (sin mensajes tuyos en `SESSION_GAP_MS`) y aún no tiene
 * feedback recibe el suyo. Se aparta antes (`auto_debrief_at`) para que dos consultas no lo hagan dos veces.
 */
export async function maybeAutoDebrief(userId: string, plan: EffectivePlan, trialDays: number) {
  const db = createAdminClient();
  const now = Date.now();
  const { data } = await db.from('personas').select('*').eq('user_id', userId).is('archived_at', null)
    .lt('last_message_at', new Date(now - SESSION_GAP_MS).toISOString()).gt('last_message_at', new Date(now - 3 * 86_400_000).toISOString()).limit(10);
  for (const p of (data ?? []) as (PersonaRow & { auto_debrief_at?: string | null })[]) {
    if (p.auto_debrief_at && p.last_message_at && p.auto_debrief_at >= p.last_message_at) continue;
    const { data: claimed } = await db.from('personas').update({ auto_debrief_at: new Date().toISOString() }).eq('id', p.id)
      .or(`auto_debrief_at.is.null,auto_debrief_at.lt.${p.last_message_at}`).select('id');
    if (!claimed?.length) continue;
    await runDebrief(p, plan, { auto: true, trialDays }).catch((e: unknown) => console.error('[persons] feedback automático', e instanceof Error ? e.message : e));
  }
}

export function scheduleAutoDebrief(userId: string, plan: EffectivePlan, trialDays: number) {
  const run = () => maybeAutoDebrief(userId, plan, trialDays).catch(() => undefined);
  try { after(run); } catch { void run(); }
}
