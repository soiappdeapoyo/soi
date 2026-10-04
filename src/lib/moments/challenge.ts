import type { ActionBlock } from '@/config/actions';

/**
 * Retos de varios días (kind = challenge).
 * - Un bloque con `day` pertenece a ese día; uno sin `day` se repite todos los días.
 * - El reto avanza un día por día de calendario: completas el día N y el N+1 se abre mañana.
 * - Sin castigo: si faltas, no se reinicia; retomas el día donde ibas.
 */
export function challengeLength(blocks: Pick<ActionBlock, 'day'>[], durationDays: number) {
  const maxDay = blocks.reduce((m, b) => Math.max(m, b.day ?? 0), 0);
  return Math.max(1, Math.min(365, Math.max(durationDays || 1, maxDay)));
}

export function blocksForDay<T extends Pick<ActionBlock, 'day'>>(blocks: T[], day: number): T[] {
  return blocks.filter((b) => b.day === undefined || b.day === day);
}

export type ChallengeState = {
  totalDays: number;
  completedCount: number;
  currentDay: number | null;   // null = terminado
  doneToday: boolean;
  availableToday: boolean;
  finished: boolean;
};

export function challengeState(completed: Record<string, string>, totalDays: number, today: string): ChallengeState {
  const done = new Set(Object.keys(completed).map(Number).filter((d) => d >= 1 && d <= totalDays));
  let currentDay: number | null = null;
  for (let d = 1; d <= totalDays; d++) if (!done.has(d)) { currentDay = d; break; }
  const doneToday = Object.values(completed).includes(today);
  const finished = currentDay === null;
  return { totalDays, completedCount: done.size, currentDay, doneToday, availableToday: !finished && !doneToday, finished };
}
