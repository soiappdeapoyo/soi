import type { ActionBlock } from '@/config/actions';

/**
 * Pulido del servidor sobre el Moment que diseña la IA (reglas, sin tokens), para que siempre tenga forma de
 * experiencia y no de lista de tareas:
 * - Llegar: con ansiedad, el primer paso regula (si no lo hace, se antepone 1 minuto de respiración 4-6).
 * - Cerrar: termina en un próximo paso o una celebración (si no, se agrega una celebración breve).
 * - Tiempo: si la persona dijo cuánto tiene, el total no se pasa de ~25 % (se reparte proporcionalmente, mín. 1 min).
 * - Hábito (James Clear): sin tiempo dicho, no pasa de HABIT_MAX_MINUTES (hazlo fácil) y termina con un voto por su
 *   identidad (hazlo satisfactorio), salvo que ya cierre con una celebración.
 */
export const HABIT_MAX_MINUTES = 5;

/** «Soy alguien que lee cada noche» → «Un voto más por ser alguien que lee cada noche.» */
export function voteMessage(identity?: string | null): string {
  const who = (identity ?? '').trim().replace(/^(yo\s+)?soy\s+/i, '').replace(/[.!]+$/, '');
  return who ? `Un voto más por ser ${/^(alguien|una|un)\s/i.test(who) ? who : `alguien que ${who}`}.` : 'Un voto más por la persona que estás eligiendo ser.';
}

const CALMING = new Set(['breathing', 'body_scan', 'meditation', 'rest']);
const CLOSING = new Set(['next_step', 'celebration', 'agenda', 'contract']);

export type PolishNote = 'prepended_breathing' | 'appended_celebration' | 'appended_vote' | 'scaled_minutes';

export function polishMoment(blocks: ActionBlock[], opts: { minutes?: number | null; anxiety?: boolean; habit?: { identity?: string | null } | null } = {}): { blocks: ActionBlock[]; notes: PolishNote[] } {
  let out = [...blocks];
  const notes: PolishNote[] = [];
  if (opts.anxiety && out[0] && !CALMING.has(out[0].type)) {
    out = [{ id: 'p-arrive', type: 'breathing', title: 'Llega: respira lento', minutes: 1, config: { pattern: 'calma', inhale: 4, hold: 0, exhale: 6, holdOut: 0 } } as ActionBlock, ...out];
    notes.push('prepended_breathing');
  }
  const last = out.at(-1);
  if (opts.habit && last && last.type !== 'celebration') {
    out.push({ id: 'p-vote', type: 'celebration', title: 'Tu voto de hoy', minutes: 1, config: { message: voteMessage(opts.habit.identity) } } as ActionBlock);
    notes.push('appended_vote');
  } else if (last && !CLOSING.has(last.type)) {
    out.push({ id: 'p-close', type: 'celebration', title: 'Cierra el Moment', minutes: 1, config: { message: 'Lo hiciste. Esto también es evidencia de quién te estás convirtiendo.' } } as ActionBlock);
    notes.push('appended_celebration');
  }
  const total = out.reduce((a, b) => a + b.minutes, 0);
  const limit = opts.minutes && opts.minutes > 0 ? opts.minutes * 1.25 : opts.habit ? HABIT_MAX_MINUTES : null;
  if (limit && total > limit) {
    const factor = (opts.minutes && opts.minutes > 0 ? opts.minutes : HABIT_MAX_MINUTES) / total;
    out = out.map((b) => ({ ...b, minutes: Math.max(1, Math.round(b.minutes * factor)) }));
    notes.push('scaled_minutes');
  }
  return { blocks: out, notes };
}
