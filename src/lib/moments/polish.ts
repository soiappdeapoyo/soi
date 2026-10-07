import type { ActionBlock } from '@/config/actions';

/**
 * Pulido del servidor sobre el Moment que diseña la IA (reglas, sin tokens), para que siempre tenga forma de
 * experiencia y no de lista de tareas:
 * - Llegar: con ansiedad, el primer paso regula (si no lo hace, se antepone 1 minuto de respiración 4-6).
 * - Cerrar: termina en un próximo paso o una celebración (si no, se agrega una celebración breve).
 * - Tiempo: si la persona dijo cuánto tiene, el total no se pasa de ~25 % (se reparte proporcionalmente, mín. 1 min).
 */
const CALMING = new Set(['breathing', 'body_scan', 'meditation', 'rest']);
const CLOSING = new Set(['next_step', 'celebration', 'agenda', 'contract']);

export type PolishNote = 'prepended_breathing' | 'appended_celebration' | 'scaled_minutes';

export function polishMoment(blocks: ActionBlock[], opts: { minutes?: number | null; anxiety?: boolean } = {}): { blocks: ActionBlock[]; notes: PolishNote[] } {
  let out = [...blocks];
  const notes: PolishNote[] = [];
  if (opts.anxiety && out[0] && !CALMING.has(out[0].type)) {
    out = [{ id: 'p-arrive', type: 'breathing', title: 'Llega: respira lento', minutes: 1, config: { pattern: 'calma', inhale: 4, hold: 0, exhale: 6, holdOut: 0 } } as ActionBlock, ...out];
    notes.push('prepended_breathing');
  }
  const last = out.at(-1);
  if (last && !CLOSING.has(last.type)) {
    out.push({ id: 'p-close', type: 'celebration', title: 'Cierra el Moment', minutes: 1, config: { message: 'Lo hiciste. Esto también es evidencia de quién te estás convirtiendo.' } } as ActionBlock);
    notes.push('appended_celebration');
  }
  const total = out.reduce((a, b) => a + b.minutes, 0);
  if (opts.minutes && opts.minutes > 0 && total > opts.minutes * 1.25) {
    const factor = opts.minutes / total;
    out = out.map((b) => ({ ...b, minutes: Math.max(1, Math.round(b.minutes * factor)) }));
    notes.push('scaled_minutes');
  }
  return { blocks: out, notes };
}
