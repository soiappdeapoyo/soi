import { z } from 'zod/v3';
import { loadPersona, personsApiSession } from '@/lib/persons/server';
import { askCoach } from '@/lib/persons/coach-server';
import { GATE_COPY } from '@/lib/persons/entitlements';
import { BLIND_COOKIE_RE } from '@/config/persons';

export const maxDuration = 60;

const Body = z.object({ text: z.string().trim().min(1).max(1000) });

/** Le preguntas algo a Ale sobre tu plática con esta persona (cuenta como un mensaje del plan). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await personsApiSession();
  if (s instanceof Response) return s;
  const persona = await loadPersona(s.userId, (await params).id);
  if (!persona) return Response.json({ error: 'No encontramos a esta persona' }, { status: 404 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Escribe un mensaje' }, { status: 400 });
  const blind = BLIND_COOKIE_RE.test(req.headers.get('cookie') ?? '') && s.limits.blindMode;

  const r = await askCoach(s, persona, parsed.data.text, blind);
  if (r.ok) return Response.json({ messages: r.messages });
  const error = r.reason === 'exhausted' ? GATE_COPY.exhausted : 'No pude responderte ahora. Escríbeme de nuevo en un momento.';
  return Response.json({ error, reason: r.reason }, { status: r.status });
}
