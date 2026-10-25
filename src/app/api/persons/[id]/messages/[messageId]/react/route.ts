import { z } from 'zod/v3';
import { createAdminClient } from '@/lib/supabase/server';
import { loadPersona, personsApiSession } from '@/lib/persons/server';
import { applyReaction, parseEmotion, REACTIONS } from '@/lib/persons/emotion';

const Body = z.object({ emoji: z.enum(REACTIONS).nullable() });

/**
 * Reaccionas a un mensaje del personaje (como en WhatsApp) o quitas tu reacción. Se le nota un poco (`applyReaction`,
 * solo la primera vez por mensaje) y la ve en la conversación: así aprende qué te gusta. No usa IA ni descuenta.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string; messageId: string }> }) {
  const s = await personsApiSession();
  if (s instanceof Response) return s;
  const { id, messageId } = await params;
  const persona = await loadPersona(s.userId, id);
  if (!persona || !/^[0-9a-f-]{36}$/i.test(messageId)) return Response.json({ error: 'No encontramos el mensaje' }, { status: 404 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Reacción inválida' }, { status: 400 });

  const db = createAdminClient();
  const { data: msg } = await db.from('persona_messages').select('id, meta').eq('id', messageId).eq('persona_id', persona.id)
    .eq('role', 'persona').lte('deliver_at', new Date().toISOString()).maybeSingle();
  if (!msg) return Response.json({ error: 'No encontramos el mensaje' }, { status: 404 });
  const meta = (msg.meta ?? {}) as Record<string, unknown>;
  const first = !meta.user_reaction && !meta.user_reacted_at;
  const next = { ...meta, user_reaction: parsed.data.emoji, user_reacted_at: meta.user_reacted_at ?? new Date().toISOString() };
  if (!parsed.data.emoji) delete (next as Record<string, unknown>).user_reaction;
  const { error } = await db.from('persona_messages').update({ meta: next }).eq('id', msg.id);
  if (error) return Response.json({ error: 'No pudimos guardar tu reacción' }, { status: 500 });

  if (first && parsed.data.emoji) {
    const emotion = applyReaction(parseEmotion(persona.emotion, persona.spec.derived.temperament), parsed.data.emoji);
    await db.from('personas').update({ emotion }).eq('id', persona.id);
  }
  return Response.json({ ok: true });
}
