import { z } from 'zod/v3';
import { LIFE_AREA_IDS, MAX_FOCUS } from '@/config/life-areas';

/**
 * Capítulos (puro y testeado): SOI acompaña años, no semanas. La vida se cuenta en capítulos de 91 días desde que
 * la persona dibujó su mapa; cada cuarto capítulo (364 días) es el cierre del año. Al cerrar uno: la foto del
 * capítulo, volver a medir las áreas, de qué está orgullosa, qué aprendió de sí, qué suelta, su foco siguiente y,
 * al cerrar el año, una visión nueva y una carta para su yo de dentro de un año (que SOI le devuelve entonces).
 */

export const CHAPTER_DAYS = 91;
export const CHAPTERS_PER_YEAR = 4;
/** Se puede cerrar desde unos días antes del final (y queda disponible hasta que se cierre). */
export const OPEN_BEFORE_DAYS = 5;

export type ChapterKind = 'trimestral' | 'anual';
export type ChapterPeriod = { kind: ChapterKind; index: number; period_start: string; period_end: string };
export type ChapterRow = { id: string; kind: ChapterKind; period_start: string; period_end: string; proud: string | null; lesson: string | null; letting_go: string | null; next_vision: string | null; letter: string | null; snapshot: ChapterSnapshot; created_at: string };

export type ChapterSnapshot = {
  scores_start?: Record<string, number>;
  scores_end?: Record<string, number>;
  moments?: number;
  practice_days?: number;
  evidence?: number;
  beliefs_training?: number;
  beliefs_owned?: number;
  learnings_worked?: number;
  habits_automatic?: number;
};

const DAY = 86_400_000;
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
const diff = (a: string, b: string) => Math.round((Date.parse(`${a}T12:00:00Z`) - Date.parse(`${b}T12:00:00Z`)) / DAY);

/** El capítulo `index` (1, 2, …) contado desde el día del mapa. */
export function chapterPeriod(start: string, index: number): ChapterPeriod {
  const kind: ChapterKind = index % CHAPTERS_PER_YEAR === 0 ? 'anual' : 'trimestral';
  return { kind, index, period_start: addDays(start, (index - 1) * CHAPTER_DAYS), period_end: addDays(start, index * CHAPTER_DAYS) };
}

/**
 * El capítulo que toca cerrar hoy: el más antiguo sin cerrar cuyo final ya llegó (o llega en ≤ 5 días).
 * Un capítulo atrasado se cierra igual (sin culpa); si hay varios atrasados, solo el último cuenta (el anual gana).
 */
export function chapterDue(mapStart: string | null, closedEnds: string[], today: string): ChapterPeriod | null {
  if (!mapStart) return null;
  const closed = new Set(closedEnds);
  const elapsed = diff(today, mapStart) + OPEN_BEFORE_DAYS;
  const n = Math.floor(elapsed / CHAPTER_DAYS);
  if (n < 1) return null;
  // De los capítulos ya vencidos, el más reciente sin cerrar (si ya cerró el último, nada).
  const last = chapterPeriod(mapStart, n);
  if (closed.has(last.period_end)) return null;
  // Si dentro de los vencidos hay un anual sin cerrar y está a menos de un capítulo, ese manda.
  if (last.kind !== 'anual') {
    const prevYear = Math.floor(n / CHAPTERS_PER_YEAR) * CHAPTERS_PER_YEAR;
    if (prevYear >= 1 && prevYear === n - 1) {
      const y = chapterPeriod(mapStart, prevYear);
      if (!closed.has(y.period_end) && diff(today, y.period_end) <= 30) return y;
    }
  }
  return last;
}

export function daysUntilNext(mapStart: string | null, today: string): number | null {
  if (!mapStart) return null;
  const n = Math.floor(diff(today, mapStart) / CHAPTER_DAYS) + 1;
  return Math.max(0, diff(chapterPeriod(mapStart, n).period_end, today));
}

const Score = z.number().int().min(1).max(10);
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export const ChapterBody = z.object({
  kind: z.enum(['trimestral', 'anual']),
  period_start: z.string().regex(DATE),
  period_end: z.string().regex(DATE),
  scores: z.record(z.enum(LIFE_AREA_IDS), Score),
  proud: z.string().trim().max(800).default(''),
  lesson: z.string().trim().max(800).default(''),
  letting_go: z.string().trim().max(400).default(''),
  focus: z.array(z.enum(LIFE_AREA_IDS)).min(1).max(MAX_FOCUS),
  next_vision: z.string().trim().max(400).optional(),
  letter: z.string().trim().max(2000).optional(),
});
export type ChapterInput = z.infer<typeof ChapterBody>;

/** Una línea del capítulo en números (para la persona; nada en la IA). */
export function snapshotLines(s: ChapterSnapshot): string[] {
  const n = (v: number | undefined, one: string, many: string) => (v ? `${v} ${v === 1 ? one : many}` : null);
  return [
    n(s.moments, 'Moment vivido', 'Moments vividos'),
    n(s.practice_days, 'día de práctica', 'días de práctica'),
    n(s.evidence, 'logro guardado', 'logros guardados'),
    n(s.learnings_worked, 'aprendizaje que funcionó', 'aprendizajes que funcionaron'),
    n(s.beliefs_owned, 'creencia nueva que ya es tuya', 'creencias nuevas que ya son tuyas'),
    n(s.beliefs_training, 'creencia en entrenamiento', 'creencias en entrenamiento'),
    n(s.habits_automatic, 'hábito que ya te sale solo', 'hábitos que ya te salen solos'),
  ].filter((x): x is string => Boolean(x));
}
