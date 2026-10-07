import type { KnowledgeCategory } from '@/lib/ai/rag';

/**
 * Lo que la persona escribe dentro de un Moment (reflexión, escritura libre, gratitud, registro de emociones)
 * se vuelve memoria con su contexto: qué Moment, qué paso y cómo llegó y se fue. Así el chat, el saludo y
 * Mi Nuevo Yo lo pueden usar (antes quedaba guardado y nadie lo volvía a mirar).
 */
export type RunOutput = { type?: string; text?: string; items?: string[]; word?: string; mood?: number; skipped?: boolean };
export type OutputMemory = { category: KnowledgeCategory; title: string; content: string; blockType: string; said: string };

const MOOD = ['muy mal', 'mal', 'regular', 'bien', 'muy bien'];

/** El texto que escribió en un paso (null si no escribió nada que valga la pena guardar). */
export function outputText(o: RunOutput | null | undefined): string | null {
  if (!o || o.skipped) return null;
  const clean = (t: string) => t.replace(/\s+/g, ' ').trim();
  if ((o.type === 'writing' || o.type === 'reflection' || o.type === 'letter' || o.type === 'reframe') && o.text && clean(o.text).length >= 6) return clean(o.text).slice(0, 1200);
  if (o.type === 'gratitude') {
    const items = (o.items ?? []).map(clean).filter((x) => x.length >= 2);
    return items.length ? items.join('; ').slice(0, 800) : null;
  }
  if (o.type === 'emotion_log') {
    const parts = [o.word && clean(o.word), o.text && clean(o.text)].filter(Boolean);
    return parts.length ? parts.join(' — ').slice(0, 600) : null;
  }
  return null;
}

export function outputMemories(
  outputs: Record<string, RunOutput | null | undefined>,
  ctx: { momentTitle: string; blockTitles: Record<string, string>; moodBefore?: number | null; moodAfter?: number | null },
): OutputMemory[] {
  const mood = (n?: number | null) => (n && n >= 1 && n <= 5 ? MOOD[n - 1] : null);
  const arc = mood(ctx.moodBefore) && mood(ctx.moodAfter) ? ` Llegó ${mood(ctx.moodBefore)} y terminó ${mood(ctx.moodAfter)}.` : '';
  const out: OutputMemory[] = [];
  for (const [blockId, o] of Object.entries(outputs)) {
    const text = outputText(o);
    if (!text || !o?.type) continue;
    const step = ctx.blockTitles[blockId] ?? '';
    const where = `En «${ctx.momentTitle}»${step ? ` (paso «${step}»)` : ''}`;
    const content = o.type === 'gratitude' ? `${where} agradeció: ${text}.${arc}`
      : o.type === 'emotion_log' ? `${where} registró cómo se sentía: ${text}.${arc}`
      : o.type === 'reframe' ? `${where} cambió un pensamiento que la frenaba por: «${text}».${arc}`
      : o.type === 'letter' ? `${where} escribió una carta: «${text}».${arc}`
      : `${where} escribió: «${text}».${arc}`;
    out.push({
      category: o.type === 'gratitude' || o.type === 'emotion_log' ? 'emocion' : 'pensamiento',
      title: `${o.type === 'gratitude' ? 'Gratitud' : o.type === 'emotion_log' ? 'Cómo se sentía' : 'Lo que escribió'} en «${ctx.momentTitle}»`.slice(0, 120),
      content: content.slice(0, 1500),
      blockType: o.type,
      said: text,
    });
  }
  return out;
}

/** Lo más revelador que escribió en una ejecución: reflexión > escritura > emociones > gratitud. */
export function bestWritten(outputs: Record<string, RunOutput | null | undefined> | null | undefined): string | null {
  const rank: Record<string, number> = { reframe: 0, reflection: 1, letter: 2, writing: 3, emotion_log: 4, gratitude: 5 };
  return Object.values(outputs ?? {}).filter((o): o is RunOutput => Boolean(o?.type && o.type in rank))
    .sort((a, b) => rank[a.type!]! - rank[b.type!]!).map(outputText).find(Boolean) ?? null;
}
