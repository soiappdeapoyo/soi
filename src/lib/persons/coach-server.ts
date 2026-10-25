import { after } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { consumeChatQuery, refundChatQuery } from '@/lib/billing/check-access';
import { detectCrisis } from '@/lib/ai/crisis';
import { getCrisisResources } from '@/config/crisis-resources';
import { coachAnswer, coachTip } from './ai';
import { regionFor } from '@/config/regionalisms';
import { newUserTurns, ruleTip, tipDue, type PracticeLine } from './coach';
import type { DebriefReport } from './debrief';
import type { PersonaMessageRow, PersonaRow, PersonsSession } from './server';

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

async function lastUpto(personaId: string) {
  const { data } = await createAdminClient().from('persona_coach_messages').select('upto_at').eq('persona_id', personaId)
    .not('upto_at', 'is', null).order('created_at', { ascending: false }).limit(1).maybeSingle();
  return (data?.upto_at as string | undefined) ?? null;
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
  const focusPersona = personas.find((p) => p.id === focus);
  let pendingTurns = 0;
  if (focusPersona) {
    const [lines, upto] = await Promise.all([practiceLines(focusPersona.id), lastUpto(focusPersona.id)]);
    pendingTurns = newUserTurns(lines, upto).length;
  }
  void db.from('personas').update({ coach_read_at: new Date().toISOString() }).eq('user_id', userId).then(() => undefined);
  return { messages: rows.filter((r) => ids.has(r.persona_id)).map(publicCoach), focus, pendingTurns };
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
 * Una idea por su cuenta si hubo `TIP_EVERY` mensajes tuyos desde la anterior (con IA; si no responde, por reglas).
 * Nunca descuenta del plan. Devuelve lo insertado.
 */
export async function maybeTip(persona: PersonaRow, blind: boolean, userRegion: string, force = false): Promise<CoachMessage[]> {
  const [lines, upto] = await Promise.all([practiceLines(persona.id), lastUpto(persona.id)]);
  const fresh = newUserTurns(lines, upto);
  if (!fresh.length || (!force && !tipDue(lines, upto))) return [];
  const uptoAt = fresh[fresh.length - 1]!.at;
  let messages: string[];
  let provider: string | null = null;
  try {
    ({ messages, provider } = await coachTip(persona.spec, lines, fresh, blind, regionFor(userRegion)));
  } catch (e) {
    console.error('[persons] coach idea', e instanceof Error ? e.message : e);
    messages = [ruleTip(fresh)];
  }
  // Otra petición pudo comentar lo mismo mientras tanto.
  if ((await lastUpto(persona.id)) !== upto) return [];
  const { data, error } = await insertCoach(persona, messages.map((content, i) => ({ kind: 'tip', content: content.slice(0, 2000), upto_at: i === 0 ? uptoAt : null, meta: { provider } })));
  if (error) console.error('[persons] guardar idea', error.message);
  return ((data ?? []) as CoachRow[]).map(publicCoach);
}

/** Después de responder al personaje: si ya toca, el coach deja su idea (la práctica no espera). */
export function scheduleTip(persona: PersonaRow, blind: boolean, userRegion: string) {
  const run = () => maybeTip(persona, blind, userRegion).then(() => undefined).catch(() => undefined);
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

/** El feedback de la sesión llega al chat del coach: una frase suya y la tarjeta. */
export async function postReport(persona: PersonaRow, report: DebriefReport, debriefId: string | null, uptoAt: string) {
  const intro = report.source === 'ai' ? 'listo, ya leí toda la plática 👀 te dejo cómo te fue:' : 'leí la plática. va un resumen rápido de cómo te fue:';
  const { data } = await insertCoach(persona, [
    { content: intro },
    { kind: 'report', content: report.summary.slice(0, 2000), upto_at: uptoAt, meta: { report, debrief_id: debriefId } },
    { content: '¿quieres que veamos algún mensaje en específico o qué le dirías la próxima vez?' },
  ]);
  return ((data ?? []) as CoachRow[]).map(publicCoach);
}
