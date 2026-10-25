import { after } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { actorOpener, personaRegion } from './ai';
import { initialEmotion, labelFor } from './emotion';
import { presenceAt } from './presence';
import { typingSeconds } from './scheduler';
import { humanizeItems, quirksFor } from './humanize';
import { fallbackOpener } from './meeting';
import { hash, seeded, type PersonSpec } from './spec';

/**
 * En un chat nuevo, algunos personajes escriben primero (según cómo se conocieron: un match que te saluda, la amiga de
 * tu amiga, o un número que no te tiene guardado: «¿quién eres? ¿cómo conseguiste mi número?»). Llega en 15–60 s,
 * como si acabara de ver el chat. Con IA (corto, en su forma de hablar) y, si no responde, una frase del escenario.
 */
export async function sendOpener(o: { personaId: string; userId: string; spec: PersonSpec; timezone: string; userRegion: string }) {
  const { spec } = o;
  const now = new Date();
  const rand = seeded(hash(`opener:${o.personaId}`));
  const emotion = initialEmotion(spec.derived.temperament);
  const presence = presenceAt(spec.derived.dayPlan, now, o.timezone);
  let messages: string[];
  try {
    messages = await actorOpener(spec, {
      emotion, label: labelFor(emotion, now, presence.state), presence, now, timezone: o.timezone, boundary: null, risk: false,
      region: personaRegion(spec, o.userRegion),
    });
  } catch {
    messages = [fallbackOpener(spec.meeting ?? 'app_citas', spec.name, o.personaId)];
  }
  if (!messages.length) return;
  let at = now.getTime() + (15 + rand() * 45) * 1000;
  const items = messages.map((content, i) => {
    if (i > 0) at += (typingSeconds(content) + 1 + rand() * 3) * 1000;
    return { content, kind: 'text' as const, deliverAt: new Date(at), meta: { opener: true } as Record<string, unknown> };
  });
  const rows = humanizeItems(items, quirksFor(spec, o.personaId), rand).map((it) => ({
    persona_id: o.personaId, user_id: o.userId, role: 'persona', kind: 'text', content: it.content.slice(0, 2000),
    deliver_at: it.deliverAt.toISOString(), meta: it.meta,
  }));
  const db = createAdminClient();
  const { error } = await db.from('persona_messages').insert(rows);
  if (error) console.error('[persons] primer mensaje', error.message);
  await db.from('personas').update({ last_message_at: new Date(at).toISOString() }).eq('id', o.personaId);
}

export function scheduleOpener(o: Parameters<typeof sendOpener>[0]) {
  const run = () => sendOpener(o).catch((e: unknown) => console.error('[persons] primer mensaje', e instanceof Error ? e.message : e));
  try { after(run); } catch { void run(); }
}
