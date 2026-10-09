import { blockSeconds, type ActionBlock } from '@/config/actions';

/**
 * Avance de un Moment en curso y cómo retomarlo tras una interrupción (una llamada, un mensaje, cerrar la app).
 * Puro y testeado. El avance se mide por tiempo (un paso de 10 min pesa más que uno de 1 min); nunca llega a 100
 * hasta terminar, para no prometer algo que no pasó.
 */

type Timed = Pick<ActionBlock, 'id' | 'minutes' | 'seconds'>;

/** Cuánto tiempo después todavía se ofrece retomar (luego, empezar de nuevo es más natural). */
export const RESUME_WINDOW_MS = 72 * 3_600_000;
/** Tras una pausa larga se repite el paso completo: volver a entrar a una meditación a la mitad no se siente bien. */
export const RESTART_STEP_AFTER_MS = 10 * 60_000;
/** Tras una pausa corta se retrocede un poco para recuperar el hilo. */
export const REWIND_SECONDS = 5;

export type SavedProgress = {
  step_index: number | null;
  step_block_id: string | null;
  step_remaining: number | null;
  progress: number | null;
  last_active_at: string | null;
};

/** Porcentaje (0–99) por tiempo: pasos anteriores completos + lo vivido del paso actual. */
export function runProgress(blocks: Timed[], index: number, remaining: number): number {
  const total = blocks.reduce((s, b) => s + blockSeconds(b), 0);
  if (!total || (index <= 0 && remaining >= blockSeconds(blocks[0] ?? { minutes: 0 }))) return 0;
  const before = blocks.slice(0, Math.max(0, index)).reduce((s, b) => s + blockSeconds(b), 0);
  const current = blocks[index] ? Math.min(blockSeconds(blocks[index]!), Math.max(0, blockSeconds(blocks[index]!) - remaining)) : 0;
  return Math.min(99, Math.max(0, Math.floor(((before + current) / total) * 100)));
}

export type ResumePoint = { index: number; remaining: number; progress: number; restartedStep: boolean };

/**
 * Dónde retomar, o null si ya no tiene sentido: sin avance guardado, muy antiguo o el Moment cambió (el paso
 * guardado ya no existe). Si el paso se movió de lugar, se encuentra por su id.
 */
export function resumePoint(blocks: Timed[], saved: SavedProgress, now = Date.now()): ResumePoint | null {
  if (saved.step_index == null || !saved.last_active_at || !blocks.length) return null;
  const gap = now - Date.parse(saved.last_active_at);
  if (!Number.isFinite(gap) || gap > RESUME_WINDOW_MS) return null;
  let index = saved.step_index;
  if (saved.step_block_id && blocks[index]?.id !== saved.step_block_id) {
    index = blocks.findIndex((b) => b.id === saved.step_block_id);
  }
  if (index < 0 || index >= blocks.length) return null;
  const full = blockSeconds(blocks[index]!);
  const restartedStep = gap > RESTART_STEP_AFTER_MS;
  const left = Math.max(0, Math.min(full, saved.step_remaining ?? full));
  const remaining = restartedStep ? full : Math.min(full, left + REWIND_SECONDS);
  // Nada que retomar si no se avanzó (abrió y cerró al instante).
  if (index === 0 && remaining >= full && (saved.progress ?? 0) === 0) return null;
  return { index, remaining, restartedStep, progress: runProgress(blocks, index, remaining) };
}

/** "hace 5 min", "hace 2 h", "ayer", "hace 3 días": cuándo se dejó. */
export function leftAgo(iso: string, now = Date.now()): string {
  const min = Math.max(0, Math.round((now - Date.parse(iso)) / 60_000));
  if (min < 1) return 'hace un momento';
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? 'ayer' : `hace ${d} días`;
}
