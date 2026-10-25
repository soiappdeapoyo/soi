import { z } from 'zod/v3';
import { loadPersona, personsApiSession } from '@/lib/persons/server';
import { askCoach, loadCoachState, maybeTip } from '@/lib/persons/coach-server';
import { GATE_COPY } from '@/lib/persons/entitlements';
import { BLIND_COOKIE_RE } from '@/config/persons';

export const maxDuration = 60;

/** El chat con el coach de un personaje: lo que se han dicho y cuántos mensajes tuyos aún no comenta. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await personsApiSession();
  if (s instanceof Response) return s;
  const persona = await loadPersona(s.userId, (await params).id);
  if (!persona) return Response.json({ error: 'No encontramos a esta persona' }, { status: 404 });
  return Response.json(await loadCoachState(persona), { headers: { 'Cache-Control': 'no-store' } });
}

const Body = z.union([
  z.object({ text: z.string().trim().min(1).max(1000) }),
  z.object({ action: z.literal('observe') }),
]);

/** `text`: le preguntas algo (cuenta como un mensaje del plan). `observe`: que comente lo nuevo de la práctica (gratis). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await personsApiSession();
  if (s instanceof Response) return s;
  const persona = await loadPersona(s.userId, (await params).id);
  if (!persona) return Response.json({ error: 'No encontramos a esta persona' }, { status: 404 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Escribe un mensaje' }, { status: 400 });
  const blind = BLIND_COOKIE_RE.test(req.headers.get('cookie') ?? '') && s.limits.blindMode;

  if ('action' in parsed.data) {
    // Al abrir el chat del coach con algo nuevo que comentar, aunque no lleguen a TIP_EVERY.
    return Response.json({ messages: await maybeTip(persona, blind, s.region, true) });
  }
  const r = await askCoach(s, persona, parsed.data.text, blind);
  if (r.ok) return Response.json({ messages: r.messages });
  const error = r.reason === 'exhausted' ? GATE_COPY.exhausted : 'No pude responderte ahora. Escríbeme de nuevo en un momento.';
  return Response.json({ error, reason: r.reason }, { status: r.status });
}
