import { STREAK_MILESTONES } from '@/config/navigation';

/**
 * Progreso que alimenta los circuitos de recompensa: lo que SOI celebra y la evidencia de que funciona.
 * Puro y testeable: recibe ejecuciones y devuelve números con significado.
 */
export type RunRow = {
  moment_id: string | null; moment_slug: string | null; started_at: string; completed_at: string | null;
  mood_before: number | null; mood_after: number | null; helped: boolean | null;
};

export type Progress = {
  weekRuns: number;            // Moments completados en los últimos 7 días
  prevWeekRuns: number;        // los 7 anteriores
  moodLift: number | null;     // promedio (ánimo después − antes) de los últimos 14 días, con ≥ 2 registros
  recentMood: number | null;   // promedio del ánimo con el que llegó a sus últimos 5 Moments (1–5)
  best: { key: string; lift: number; helped: number } | null; // el Moment que más le ayuda
  daysSinceLastRun: number | null;
  streak: number;
  nextMilestone: number | null;
  daysToMilestone: number | null;
};

const DAY = 86_400_000;
export const runKey = (r: Pick<RunRow, 'moment_id' | 'moment_slug'>) => r.moment_id ?? `slug:${r.moment_slug}`;

export function summarizeRuns(runs: RunRow[], streak: number, now = Date.now()): Progress {
  const done = runs.filter((r) => r.completed_at);
  const age = (r: RunRow) => now - Date.parse(r.completed_at ?? r.started_at);
  const weekRuns = done.filter((r) => age(r) < 7 * DAY).length;
  const prevWeekRuns = done.filter((r) => age(r) >= 7 * DAY && age(r) < 14 * DAY).length;

  const withMood = done.filter((r) => age(r) < 14 * DAY && r.mood_before != null && r.mood_after != null);
  const moodLift = withMood.length >= 2
    ? Math.round((withMood.reduce((a, r) => a + (r.mood_after! - r.mood_before!), 0) / withMood.length) * 10) / 10
    : null;

  const arrivals = [...runs].sort((a, b) => Date.parse(b.started_at) - Date.parse(a.started_at)).filter((r) => r.mood_before != null).slice(0, 5);
  const recentMood = arrivals.length >= 2 ? Math.round((arrivals.reduce((a, r) => a + r.mood_before!, 0) / arrivals.length) * 10) / 10 : null;

  const per = new Map<string, { lift: number; n: number; helped: number }>();
  for (const r of done) {
    const k = runKey(r);
    const cur = per.get(k) ?? { lift: 0, n: 0, helped: 0 };
    if (r.mood_before != null && r.mood_after != null) { cur.lift += r.mood_after - r.mood_before; cur.n++; }
    if (r.helped) cur.helped++;
    per.set(k, cur);
  }
  let best: Progress['best'] = null;
  for (const [key, v] of per) {
    const lift = v.n ? v.lift / v.n : 0;
    const score = lift + v.helped * 0.5;
    if (score > 0 && (!best || score > best.lift + best.helped * 0.5)) best = { key, lift: Math.round(lift * 10) / 10, helped: v.helped };
  }

  const last = done.length ? Math.min(...done.map(age)) : null;
  const nextMilestone = STREAK_MILESTONES.find((m) => m > streak) ?? null;
  return {
    weekRuns, prevWeekRuns, moodLift, recentMood, best,
    daysSinceLastRun: last === null ? null : Math.floor(last / DAY),
    streak, nextMilestone, daysToMilestone: nextMilestone ? nextMilestone - streak : null,
  };
}

/** Frase de celebración que cambia cada día (recompensa variable: no siempre la misma). */
export function pickCelebration(p: Progress, seed: number): string | null {
  const options: string[] = [];
  if (p.daysToMilestone !== null && p.daysToMilestone <= 2 && p.streak > 0) {
    options.push(`Llevas ${p.streak} ${p.streak === 1 ? 'día' : 'días'} seguidos. ${p.daysToMilestone === 1 ? 'Mañana' : 'En 2 días'} llegas a ${p.nextMilestone} y ganas un escudo.`);
  }
  if (p.weekRuns > 0 && p.weekRuns > p.prevWeekRuns) {
    options.push(`Esta semana ya viviste ${p.weekRuns} ${p.weekRuns === 1 ? 'Moment' : 'Moments'}, más que la anterior. Así se construye una identidad.`);
  }
  if (p.moodLift !== null && p.moodLift >= 0.5) {
    options.push(`Un dato tuyo: después de cada Moment tu ánimo sube en promedio ${p.moodLift.toLocaleString('es')} ${p.moodLift === 1 ? 'punto' : 'puntos'}. Tu cerebro ya está aprendiendo que esto funciona.`);
  }
  if (p.streak >= 3 && !options.length) options.push(`${p.streak} días seguidos presentándote para ti.`);
  return options.length ? options[seed % options.length]! : null;
}

export function daySeed(today: string) {
  return [...today].reduce((a, ch) => a + ch.charCodeAt(0), 0);
}
