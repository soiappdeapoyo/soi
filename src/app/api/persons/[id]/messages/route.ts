import { z } from 'zod/v3';
import { loadChatState, loadPersona, personsApiSession } from '@/lib/persons/server';
import { sendTurn } from '@/lib/persons/turn';
import { GATE_COPY } from '@/lib/persons/entitlements';
import { BLIND_COOKIE_RE } from '@/config/persons';

export const maxDuration = 60;

/**
 * El chat: los mensajes ya entregados, el encabezado (presencia y emoción) y, si hay una respuesta en camino, solo
 * cuándo empieza a escribir y cuándo llega (nunca su contenido antes de tiempo).
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await personsApiSession();
  if (s instanceof Response) return s;
  const persona = await loadPersona(s.userId, (await params).id);
  if (!persona) return Response.json({ error: 'No encontramos a esta persona' }, { status: 404 });
  // Modo ciego (Plus): la emoción del personaje no se muestra; se lee en sus mensajes.
  const showEmotion = !(BLIND_COOKIE_RE.test(req.headers.get('cookie') ?? '') && s.limits.blindMode);

  return Response.json(await loadChatState(persona, showEmotion), { headers: { 'Cache-Control': 'no-store' } });
}

const Body = z.object({ text: z.string().trim().min(1).max(1000) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await personsApiSession();
  if (s instanceof Response) return s;
  const persona = await loadPersona(s.userId, (await params).id);
  if (!persona) return Response.json({ error: 'No encontramos a esta persona' }, { status: 404 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Escribe un mensaje' }, { status: 400 });

  try {
    const r = await sendTurn(s, persona, parsed.data.text);
    if (r.ok) return Response.json({ ok: true, id: r.messageId });
    const error = r.reason === 'ai'
      ? 'Tu mensaje se guardó, pero no pudimos generar la respuesta. Escribe de nuevo en un momento.'
      : r.reason === 'archived' ? 'Esta conversación está archivada.' : GATE_COPY[r.reason];
    return Response.json({ error, reason: r.reason }, { status: r.status });
  } catch (error) {
    console.error('[persons] enviar', error instanceof Error ? error.message : error);
    return Response.json({ error: 'No pudimos enviar tu mensaje. Intenta de nuevo.' }, { status: 500 });
  }
}
