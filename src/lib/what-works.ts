import type { ActionType } from '@/config/actions';

/**
 * "Lo que te funciona" y "cuándo abandonas" (puro y testeado). Sale solo de lo que la persona ya vivió en SOI
 * (moment_runs: a qué hora, cuánto duró, qué prácticas tenía, si lo terminó, su ánimo antes y después y si le
 * ayudó). Sin IA y sin pedirle nada: SOI aprende de ella y lo usa para elegir la única acción de hoy.
 * Abandono: un hábito que venía practicando y lleva días sin aparecer. La respuesta nunca es culpa: «nunca dos
 * veces seguidas» (James Clear, *Atomic Habits*, 2018, cap. 16) y volver en la versión más pequeña.
 */

export type DayPart = 'manana' | 'tarde' | 'noche';
export const PART_PHRASE: Record<DayPart, string> = { manana: 'por las mañanas', tarde: 'por las tardes', noche: 'por las noches' };

export type RunSample = {
  started_at: string;
  completed_at: string | null;
  /** Hora local en que empezó (0–23). */
  hour: number;
  minutes: number;
  types: ActionType[];
  mood_before: number | null;
  mood_after: number | null;
  helped: boolean | null;
};

/** Familias de práctica (lo que una persona reconoce, no el nombre técnico del bloque). */
export const PRACTICES = {
  respirar: { label: 'respirar', types: ['breathing', 'body_scan'] },
  meditar: { label: 'meditar', types: ['meditation', 'rest', 'music'] },
  escribir: { label: 'escribir', types: ['writing', 'reflection', 'letter', 'reframe', 'emotion_log', 'canvas', 'mind_map'] },
  moverte: { label: 'moverte', types: ['exercise', 'walk', 'stretching'] },
  visualizar: { label: 'visualizar y manifestar', types: ['visualization', 'manifestation'] },
  afirmar: { label: 'afirmaciones', types: ['affirmation', 'audio'] },
  agradecer: { label: 'agradecer', types: ['gratitude', 'celebration'] },
  enfocarte: { label: 'enfocarte en una tarea', types: ['pomodoro', 'timer', 'checklist', 'next_step', 'agenda'] },
  aprender: { label: 'leer y aprender', types: ['reading', 'book', 'document', 'video', 'quiz'] },
} as const satisfies Record<string, { label: string; types: readonly ActionType[] }>;
export type PracticeId = keyof typeof PRACTICES;

const TYPE_TO_PRACTICE = new Map<string, PracticeId>(
  (Object.entries(PRACTICES) as [PracticeId, { types: readonly string[] }][]).flatMap(([id, p]) => p.types.map((t) => [t, id] as const)),
);

export function practicesOf(types: readonly string[]): PracticeId[] {
  return [...new Set(types.map((t) => TYPE_TO_PRACTICE.get(t)).filter((p): p is PracticeId => Boolean(p)))];
}

export function partOf(hour: number): DayPart {
  if (hour >= 5 && hour < 12) return 'manana';
  if (hour >= 12 && hour < 19) return 'tarde';
  return 'noche';
}

export type LengthBucket = 'corto' | 'medio' | 'largo';
export const LENGTH_PHRASE: Record<LengthBucket, string> = { corto: 'de 5 minutos o menos', medio: 'de 6 a 12 minutos', largo: 'de más de 12 minutos' };
/** Lo mismo para la IA, sin cifras (los números solo se ven en Mi Vida). */
const LENGTH_PROMPT: Record<LengthBucket, string> = { corto: 'cortos, de pocos minutos', medio: 'de duración media', largo: 'largos' };
export function lengthOf(minutes: number): LengthBucket {
  return minutes <= 5 ? 'corto' : minutes <= 12 ? 'medio' : 'largo';
}

/** Mínimo de Moments terminados para afirmar algo (con menos, SOI todavía está conociéndola). */
export const MIN_SAMPLES = 5;
/** Mínimo de veces que se vivió un grupo (hora, duración, práctica) para compararlo. */
const MIN_GROUP = 2;

type Stat = { n: number; done: number; helped: number; rated: number; lift: number; lifted: number };
const empty = (): Stat => ({ n: 0, done: 0, helped: 0, rated: 0, lift: 0, lifted: 0 });

function add(s: Stat, r: RunSample) {
  s.n++;
  if (!r.completed_at) return;
  s.done++;
  if (r.helped !== null) { s.rated++; if (r.helped) s.helped++; }
  if (r.mood_before !== null && r.mood_after !== null) { s.lifted++; s.lift += r.mood_after - r.mood_before; }
}

/** 0–1: termina y le ayuda (el ánimo suma un poco). */
function score(s: Stat): number {
  const completion = s.n ? s.done / s.n : 0;
  const helped = s.rated ? s.helped / s.rated : 0.5;
  const lift = s.lifted ? Math.max(-1, Math.min(1, s.lift / s.lifted / 2)) : 0;
  return completion * 0.45 + helped * 0.4 + (lift + 1) / 2 * 0.15;
}

export type WhatWorks = {
  samples: number;
  enough: boolean;
  bestPart: { part: DayPart; completion: number } | null;
  bestLength: LengthBucket | null;
  /** Lo que más le ayuda (máx. 3), de mejor a peor. */
  helps: PracticeId[];
  /** Lo que no le ha ayudado (2+ veces "no del todo" y nunca sí). */
  notHelps: PracticeId[];
  /** Cuánto sube su ánimo en promedio al terminar (−4 a 4), si lo registró. */
  moodLift: number | null;
  /** De cada 10 que empieza, cuántos termina. */
  completion: number;
};

export function whatWorks(runs: RunSample[]): WhatWorks {
  const all = empty();
  const byPart = new Map<DayPart, Stat>();
  const byLength = new Map<LengthBucket, Stat>();
  const byPractice = new Map<PracticeId, Stat>();
  for (const r of runs) {
    add(all, r);
    const p = partOf(r.hour);
    add(byPart.get(p) ?? byPart.set(p, empty()).get(p)!, r);
    const l = lengthOf(r.minutes);
    add(byLength.get(l) ?? byLength.set(l, empty()).get(l)!, r);
    for (const pr of practicesOf(r.types)) add(byPractice.get(pr) ?? byPractice.set(pr, empty()).get(pr)!, r);
  }
  const enough = all.done >= MIN_SAMPLES;
  const best = <K,>(m: Map<K, Stat>) => [...m].filter(([, s]) => s.done >= MIN_GROUP).sort((a, b) => score(b[1]) - score(a[1]));
  const parts = best(byPart);
  const lengths = best(byLength);
  const practices = best(byPractice);
  // Solo vale la pena decirlo si hay contraste (dos grupos comparables) o un grupo claramente bueno.
  const bestPart = enough && parts.length && (parts.length > 1 || score(parts[0]![1]) >= 0.7)
    ? { part: parts[0]![0], completion: Math.round((parts[0]![1].done / parts[0]![1].n) * 10) } : null;
  const bestLength = enough && lengths.length && (lengths.length > 1 || score(lengths[0]![1]) >= 0.7) ? lengths[0]![0] : null;
  const helps = enough ? practices.filter(([, s]) => s.rated === 0 || s.helped / s.rated >= 0.6).slice(0, 3).map(([k]) => k) : [];
  const notHelps = [...byPractice].filter(([, s]) => s.rated >= 2 && s.helped === 0).map(([k]) => k).filter((k) => !helps.includes(k));
  return {
    samples: all.done, enough, bestPart, bestLength, helps, notHelps,
    moodLift: all.lifted >= 3 ? Math.round((all.lift / all.lifted) * 10) / 10 : null,
    completion: all.n ? Math.round((all.done / all.n) * 10) : 0,
  };
}

/**
 * Cuánto encaja un Moment con lo que le funciona (para elegir la propuesta de Hoy): suma por cada práctica que le
 * ayuda, resta si lo central es algo que no le ha servido y suma si dura lo que suele terminar. 0 sin datos.
 */
export function fitScore(m: { types: readonly string[]; minutes: number }, w: WhatWorks | null | undefined): number {
  if (!w?.enough) return 0;
  const pr = practicesOf(m.types);
  let s = pr.filter((p) => w.helps.includes(p)).length * 2;
  if (pr.length && pr.filter((p) => w.notHelps.includes(p)).length * 2 >= pr.length) s -= 3;
  if (w.bestLength && lengthOf(m.minutes) === w.bestLength) s += 1;
  return s;
}

/** Frases para la persona (Mi mapa). Vacío si aún no hay suficiente. */
export function whatWorksLines(w: WhatWorks): string[] {
  if (!w.enough) return [];
  const lines: string[] = [];
  if (w.bestPart) lines.push(`Te funciona más ${PART_PHRASE[w.bestPart.part]}: ahí terminas ${w.bestPart.completion} de cada 10.`);
  if (w.bestLength) lines.push(`Los Moments ${LENGTH_PHRASE[w.bestLength]} son los que más terminas.`);
  if (w.helps.length) lines.push(`Lo que más te ayuda: ${listEs(w.helps.map((h) => PRACTICES[h].label))}.`);
  if (w.notHelps.length) lines.push(`Lo que no te ha servido tanto: ${listEs(w.notHelps.map((h) => PRACTICES[h].label))}. SOI lo propone menos.`);
  if (w.moodLift !== null && w.moodLift > 0) lines.push('Casi siempre terminas sintiéndote mejor que como empezaste.');
  return lines;
}

/** Para el prompt de los agentes (sin cifras: la IA no menciona números). */
export function whatWorksPrompt(w: WhatWorks): string {
  if (!w.enough) return '';
  const parts = [
    w.bestPart && `le funciona más ${PART_PHRASE[w.bestPart.part]}`,
    w.bestLength && `termina más los Moments ${LENGTH_PROMPT[w.bestLength]}`,
    w.helps.length && `le ayuda: ${w.helps.map((h) => PRACTICES[h].label).join(', ')}`,
    w.notHelps.length && `no le ha servido: ${w.notHelps.map((h) => PRACTICES[h].label).join(', ')} (evítalo salvo que lo pida)`,
  ].filter(Boolean);
  return parts.length ? `- Lo que le funciona (de lo que ya vivió): ${parts.join('; ')}. Diseña con esto.` : '';
}

export function listEs(xs: string[]): string {
  return xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} y ${xs.at(-1)}`;
}

/* ----------------------------- Abandono ----------------------------- */

export type HabitTrack = { name: string; tiny?: string | null; moment_id: string; days: string[] };

export type Drift = {
  name: string;
  tiny: string | null;
  moment_id: string;
  /** Días que no lo hizo desde la última vez (1 = solo ayer). */
  daysOff: number;
  /** Cuántos días seguidos suele sostenerlo antes de soltarlo (si hay historia). */
  typicalRun: number | null;
};

const DAY = 86_400_000;
const dayNum = (d: string) => Math.floor(Date.parse(`${d}T12:00:00Z`) / DAY);

/** Rachas (días seguidos) de una lista de fechas YYYY-MM-DD. */
export function runsOf(days: string[]): number[] {
  const nums = [...new Set(days)].map(dayNum).sort((a, b) => a - b);
  const out: number[] = [];
  let len = 0;
  for (let i = 0; i < nums.length; i++) {
    len = i > 0 && nums[i]! - nums[i - 1]! === 1 ? len + 1 : 1;
    if (i === nums.length - 1 || nums[i + 1]! - nums[i]! !== 1) out.push(len);
  }
  return out;
}

function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor((s.length - 1) / 2)]!;
}

/**
 * Hábitos que se están cayendo: los hizo 3+ días en las 3 semanas previas y ayer (o más) no lo hizo.
 * El primero es el que más se le está escapando (más días fuera).
 */
export function detectDrift(habits: HabitTrack[], today: string): Drift[] {
  const t = dayNum(today);
  const out: Drift[] = [];
  for (const h of habits) {
    const days = [...new Set(h.days)].filter((d) => dayNum(d) <= t);
    if (!days.length) continue;
    const last = Math.max(...days.map(dayNum));
    // off = 2: ayer no lo hizo (hoy es el día de no fallar dos veces seguidas).
    const off = t - last;
    if (off < 2 || off > 21) continue;
    const recent = days.filter((d) => t - dayNum(d) <= 21).length;
    if (recent < 3) continue;
    const streaks = runsOf(days);
    out.push({ name: h.name, tiny: h.tiny ?? null, moment_id: h.moment_id, daysOff: off - 1, typicalRun: streaks.length >= 2 ? median(streaks) : null });
  }
  return out.sort((a, b) => b.daysOff - a.daysOff);
}

/** El protocolo para retomar, en una frase (sin culpa, con su patrón si lo hay). */
export function driftLine(d: Drift): string {
  const pattern = d.typicalRun && d.typicalRun >= 2 ? `Sueles sostenerlo unos ${d.typicalRun} días y luego se te escapa: es un patrón, no un defecto. ` : '';
  return `${pattern}Nunca dos veces seguidas: hoy solo ${d.tiny ? `«${d.tiny}»` : 'la versión más pequeña'}.`;
}
