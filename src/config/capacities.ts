import type { ActionType, MomentKind } from '@/config/actions';

/**
 * Capacidades psicológicas que los SOI Moments entrenan (el nivel intermedio entre los Moments y las identidades).
 * La experiencia sale de evidencia real: cada Moment vivido, reflexión, logro o regreso.
 */
export const CAPACITIES = [
  'Claridad', 'Disciplina', 'Constancia', 'Enfoque', 'Calma', 'Confianza', 'Liderazgo', 'Comunicación',
  'Creatividad', 'Gratitud', 'Salud', 'Mentalidad de riqueza', 'Aprendizaje', 'Coraje', 'Paciencia', 'Persistencia',
] as const;
export type Capacity = (typeof CAPACITIES)[number];

export function isCapacity(v: string): v is Capacity {
  return (CAPACITIES as readonly string[]).includes(v);
}

/** Respaldo sin IA: qué capacidad entrena cada tipo de acción. */
export const ACTION_CAPACITY: Partial<Record<ActionType, Capacity[]>> = {
  breathing: ['Calma', 'Paciencia'], meditation: ['Calma', 'Paciencia'], visualization: ['Confianza'], rest: ['Calma'],
  writing: ['Claridad'], reflection: ['Claridad'], goal: ['Claridad'], mind_map: ['Claridad', 'Creatividad'], canvas: ['Creatividad'],
  timer: ['Enfoque'], pomodoro: ['Enfoque', 'Disciplina'], checklist: ['Disciplina'], next_step: ['Disciplina', 'Coraje'], agenda: ['Disciplina'],
  contract: ['Disciplina', 'Persistencia'], tracking: ['Constancia', 'Persistencia'], weekly_review: ['Persistencia', 'Claridad'],
  affirmation: ['Confianza'], manifestation: ['Confianza', 'Mentalidad de riqueza'], gratitude: ['Gratitud'], celebration: ['Gratitud'],
  walk: ['Salud'], exercise: ['Salud', 'Disciplina'], stretching: ['Salud'],
  reading: ['Aprendizaje'], book: ['Aprendizaje'], document: ['Aprendizaje'], video: ['Aprendizaje'], quiz: ['Aprendizaje'],
  emotion_log: ['Calma'], photo: ['Constancia'], audio: ['Confianza'], music: ['Calma'],
  reframe: ['Claridad', 'Confianza'], body_scan: ['Calma', 'Paciencia'], letter: ['Claridad', 'Confianza'],
};

export const KIND_CAPACITY: Partial<Record<MomentKind, Capacity>> = {
  daily: 'Constancia', recovery: 'Calma', growth: 'Disciplina', learning: 'Aprendizaje', challenge: 'Constancia',
};

/** Capacidades de un Moment por reglas (tipo de Moment + las 2 acciones más presentes). */
export function capacitiesByRules(kind: MomentKind | null | undefined, types: ActionType[]): Capacity[] {
  const counts = new Map<Capacity, number>();
  for (const t of types) for (const c of ACTION_CAPACITY[t] ?? []) counts.set(c, (counts.get(c) ?? 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([c]) => c);
  const k = kind ? KIND_CAPACITY[kind] : undefined;
  return [...new Set([...(k ? [k] : []), ...top])].slice(0, 3);
}

/**
 * Niveles: cada nivel pide un poco más de evidencia que el anterior (3, 5, 7, 9… evidencias más).
 * Nunca hay un 100%: siempre se puede seguir creciendo.
 */
export function levelFor(xp: number): { level: number; current: number; next: number; progress: number } {
  let level = 1;
  let floor = 0;
  let step = 3;
  while (xp >= floor + step) { floor += step; level++; step += 2; }
  return { level, current: xp - floor, next: step, progress: Math.max(0, Math.min(1, (xp - floor) / step)) };
}
