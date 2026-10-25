import { createAdminClient } from '@/lib/supabase/server';
import { loadPersona, personsApiSession } from '@/lib/persons/server';
import { MIN_DEBRIEF_MESSAGES } from '@/lib/persons/debrief';
import { runDebrief } from '@/lib/persons/coach-server';
import { trialDaysLeft } from '@/lib/billing/access-rules';

export const maxDuration = 60;

/**
 * Terminar la sesión y recibir feedback (lo pides tú; también llega solo al terminar una plática). Ver `runDebrief`.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await personsApiSession();
  if (s instanceof Response) return s;
  const persona = await loadPersona(s.userId, (await params).id);
  if (!persona) return Response.json({ error: 'No encontramos a esta persona' }, { status: 404 });
  const r = await runDebrief(persona, s.plan, { trialDays: trialDaysLeft(s.profile) });
  if (!r.ok) return Response.json({ error: `Escribe al menos ${MIN_DEBRIEF_MESSAGES} mensajes en esta sesión para recibir feedback.`, reason: 'too_short' }, { status: 400 });
  return Response.json({ id: r.id, report: r.report, coach: r.coach });
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
