import type { ActionBlock } from '@/config/actions';

export type RunSignal = {
  skipped: string[];       // ids de bloques saltados
  moodBefore: number | null;
  moodAfter: number | null;
  helped: boolean | null;
  learning: string | null;
  availableMinutes?: number | null;
};

/**
 * Respaldo determinista de "la mejor versión" (cuando la IA no responde):
 * - Quita los bloques que la persona saltó (siempre deja al menos uno).
 * - Si no ayudó o el ánimo no mejoró, acorta los bloques largos (> 8 min) un tercio.
 * - Si hay minutos disponibles menores al total, reparte proporcionalmente.
 * Nunca toca el original: devuelve una propuesta que la persona aprueba o descarta.
 */
export function improveByRules(blocks: ActionBlock[], s: RunSignal): { blocks: ActionBlock[]; note: string } {
  const notes: string[] = [];
  let next = blocks.filter((b) => !s.skipped.includes(b.id));
  if (!next.length) next = blocks.slice(0, 1);
  if (next.length < blocks.length) notes.push(`Quité ${blocks.length - next.length === 1 ? 'el paso que saltaste' : 'los pasos que saltaste'}.`);

  const improved = s.moodBefore != null && s.moodAfter != null && s.moodAfter > s.moodBefore;
  if (s.helped === false || (!improved && s.moodBefore != null && s.moodAfter != null)) {
    let changed = false;
    next = next.map((b) => {
      if (b.minutes <= 8) return b;
      changed = true;
      return { ...b, minutes: Math.max(3, Math.round(b.minutes * 0.67)), seconds: undefined };
    });
    if (changed) notes.push('Acorté los pasos más largos para que sea más fácil de sostener.');
  }

  const total = next.reduce((a, b) => a + (b.seconds ? b.seconds / 60 : b.minutes), 0);
  if (s.availableMinutes && total > s.availableMinutes) {
    const ratio = s.availableMinutes / total;
    next = next.map((b) => ({ ...b, minutes: Math.max(1, Math.round(b.minutes * ratio)), seconds: undefined }));
    notes.push(`Ajusté todo a tus ${s.availableMinutes} minutos.`);
  }

  if (!notes.length) notes.push(improved ? 'Funcionó: mantuve lo esencial.' : 'Mantuve el flujo; prueba repetirlo mañana.');
  return { blocks: next, note: notes.join(' ') };
}
