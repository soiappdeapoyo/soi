/** `source` en un paso: cuando la rutina combina autores, cada paso cita el suyo (Regla #8). */
type Step = { id: string; label: string; seconds?: number; minutes?: number; quote?: string; source?: string };

export const ROUTINES = {
  brian_tracy_5min: {
    id: 'brian_tracy_5min', label: 'Ritual de 5 minutos', author: 'Brian Tracy',
    totalMinutes: 5, source: 'Goals! / Eat That Frog!', eslabon: 'pensamiento',
    steps: [
      { id: 'wake', label: 'Siéntate con lápiz y papel. No toques el teléfono.', seconds: 30 },
      { id: 'say', label: 'Di en voz alta: "Hoy va a ser el mejor día de todos."', seconds: 15, quote: 'Hoy va a ser el mejor día de todos.' },
      { id: 'write_top', label: 'Escribe esa frase en la parte superior de la página.', seconds: 30 },
      { id: 'write_day', label: 'Escribe cómo se desarrollará tu día. Sé específico y positivo.', seconds: 180 },
      { id: 'thank', label: 'Escribe y di en voz alta: "Gracias."', seconds: 15, quote: 'Gracias.' },
    ],
  },
  miracle_morning: {
    id: 'miracle_morning', label: 'Miracle Morning', author: 'Hal Elrod',
    totalMinutes: 36, source: 'The Miracle Morning', eslabon: 'accion',
    steps: [
      { id: 'silence', label: 'Silencio: meditación o respiración consciente.', minutes: 6 },
      { id: 'affirmations', label: 'Afirmaciones: declara tu intención del día.', minutes: 6 },
      { id: 'visualization', label: 'Visualización: ve tu día saliendo perfecto.', minutes: 6 },
      { id: 'exercise', label: 'Ejercicio: mueve tu cuerpo.', minutes: 6 },
      { id: 'reading', label: 'Lectura: lee unas páginas de un libro inspirador.', minutes: 6 },
      { id: 'scribing', label: 'Escritura: diario o gratitud.', minutes: 6 },
    ],
  },
  five_am_club: {
    id: 'five_am_club', label: 'Club de las 5 AM', author: 'Robin Sharma',
    totalMinutes: 60, source: 'The 5AM Club', eslabon: 'accion',
    steps: [
      { id: 'move', label: 'Bloque 1 — Moverse: ejercicio intenso.', minutes: 20 },
      { id: 'reflect', label: 'Bloque 2 — Reflexionar: meditación y planificación.', minutes: 20 },
      { id: 'grow', label: 'Bloque 3 — Crecer: lectura o aprendizaje.', minutes: 20 },
    ],
  },
  dispenza_protocol: {
    id: 'dispenza_protocol', label: 'Protocolo Dispenza', author: 'Joe Dispenza',
    totalMinutes: 35, source: 'Breaking the Habit of Being Yourself', eslabon: 'emocion',
    steps: [
      { id: 'morning', label: 'Mañana: mano al corazón; declara con tus palabras que hoy eliges soltar tu pasado.', minutes: 15 },
      { id: 'afternoon', label: 'Tarde: 5 min con movimiento, reconecta.', minutes: 5 },
      { id: 'evening', label: 'Noche: gratitud y revisión.', minutes: 15 },
    ],
  },
  neville_sats: {
    id: 'neville_sats', label: 'SATS', author: 'Neville Goddard',
    totalMinutes: 15, source: 'Feeling is the Secret', eslabon: 'emocion',
    steps: [
      { id: 'relax', label: 'Relájate profundamente en la cama.', minutes: 3 },
      { id: 'scene', label: 'Visualiza una escena corta del deseo cumplido.', minutes: 10 },
      { id: 'sleep', label: 'Repite la escena hasta dormirte.', minutes: 2 },
    ],
  },
  cierre_del_dia: {
    id: 'cierre_del_dia', label: 'Cierre del día', author: 'SOI',
    totalMinutes: 12, source: 'Joe Dispenza, Brian Tracy y Neville Goddard', eslabon: 'resultado',
    steps: [
      { id: 'breathe', label: 'Suelta el día: respira lento, alargando la exhalación.', minutes: 1, source: 'Respiración con exhalación prolongada' },
      { id: 'victory', label: 'Tu victoria de hoy: ¿qué hiciste bien hoy, aunque sea pequeño?', minutes: 2, source: 'Joe Dispenza — Breaking the Habit of Being Yourself (revisión de la noche)' },
      { id: 'learning', label: 'Lo que te enseñó el día: ¿qué aprendiste o qué harías distinto?', minutes: 2, source: 'Joe Dispenza — Breaking the Habit of Being Yourself (revisión de la noche)' },
      { id: 'gratitude', label: 'Gratitud: tres cosas de hoy por las que das gracias.', minutes: 2, source: 'Joe Dispenza — Breaking the Habit of Being Yourself (gratitud de la noche)' },
      { id: 'tomorrow', label: 'Prepara mañana: ¿cuál es la tarea más importante? Decídela hoy.', minutes: 2, source: 'Brian Tracy — Eat That Frog! (planear el día la noche anterior)' },
      { id: 'sats', label: 'Antes de dormir: imagina una escena corta de mañana saliendo bien, como si ya hubiera pasado. Siéntela.', minutes: 3, source: 'Neville Goddard — Feeling is the Secret (SATS)' },
    ],
  },
} as const satisfies Record<string, {
  id: string; label: string; author: string; totalMinutes: number; source: string;
  eslabon: 'pensamiento' | 'emocion' | 'accion' | 'resultado'; steps: readonly Step[];
}>;

export type RoutineId = keyof typeof ROUTINES;
export type RoutineStep = Step;
export const ROUTINE_IDS = Object.keys(ROUTINES) as [RoutineId, ...RoutineId[]];

export function stepSeconds(step: Step): number {
  return step.seconds ?? (step.minutes ?? 0) * 60;
}

export function isRoutineId(v: unknown): v is RoutineId {
  return typeof v === 'string' && v in ROUTINES;
}

/** Sugerencia por minutos disponibles (onboarding). */
export function routineForMinutes(minutes: number): RoutineId {
  if (minutes <= 5) return 'brian_tracy_5min';
  if (minutes <= 15) return 'neville_sats';
  if (minutes <= 36) return 'miracle_morning';
  return 'five_am_club';
}
