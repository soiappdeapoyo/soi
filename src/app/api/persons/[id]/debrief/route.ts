import { createAdminClient } from '@/lib/supabase/server';
import { loadPersona, personsApiSession, type PersonaMessageRow } from '@/lib/persons/server';
import { blindSpots, emotionTimeline, MIN_DEBRIEF_MESSAGES, ruleReport, type DebriefMessage, type DebriefReport } from '@/lib/persons/debrief';
import { coachReport } from '@/lib/persons/ai';
import { postReport } from '@/lib/persons/coach-server';

export const maxDuration = 60;

/**
 * Terminar la sesión y recibir feedback: lo que se habló desde el último debrief. El coach (IA) puntúa; la línea de
 * emociones y los puntos ciegos salen de reglas. Si la IA no responde, el feedback sale solo por reglas. El feedback
 * llega al chat del coach como tarjeta (y queda en el historial de la ficha).
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await personsApiSession();
  if (s instanceof Response) return s;
  const persona = await loadPersona(s.userId, (await params).id);
  if (!persona) return Response.json({ error: 'No encontramos a esta persona' }, { status: 404 });
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
  if (own < MIN_DEBRIEF_MESSAGES) {
    return Response.json({ error: `Escribe al menos ${MIN_DEBRIEF_MESSAGES} mensajes en esta sesión para recibir feedback.`, reason: 'too_short' }, { status: 400 });
  }

  const timeline = emotionTimeline(messages);
  let report: DebriefReport;
  let provider: string | null = null;
  try {
    const r = await coachReport(persona.spec, messages, timeline);
    provider = r.provider;
    report = { ...r.report, timeline, blindSpots: blindSpots(messages), source: 'ai' };
  } catch (error) {
    console.error('[persons] coach', error instanceof Error ? error.message : error);
    report = { ...ruleReport(messages), timeline, blindSpots: blindSpots(messages), source: 'rules' };
  }

  const { data: saved, error } = await db.from('persona_debriefs').insert({
    persona_id: persona.id, user_id: s.userId, from_at: (last?.to_at as string | undefined) ?? null, to_at: nowIso,
    messages_count: messages.length, report, provider,
  }).select('id, created_at').single();
  if (error) console.error('[persons] guardar debrief', error.message);
  const coach = await postReport(persona, report, (saved?.id as string | undefined) ?? null, nowIso).catch((e: unknown) => {
    console.error('[persons] feedback al coach', e instanceof Error ? e.message : e);
    return [];
  });
  return Response.json({ id: saved?.id ?? null, report, coach });
}

/** Los debriefs anteriores (historial de la ficha). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await personsApiSession();
  if (s instanceof Response) return s;
  const persona = await loadPersona(s.userId, (await params).id);
  if (!persona) return Response.json({ error: 'No encontramos a esta persona' }, { status: 404 });
  const { data } = await createAdminClient().from('persona_debriefs').select('id, created_at, messages_count, report')
    .eq('persona_id', persona.id).order('created_at', { ascending: false }).limit(20);
  return Response.json({ debriefs: data ?? [] });
}
