import type { MomentKind } from '@/config/actions';
import type { TodayMode } from '@/lib/momentum';

/** Lo que el Director decide hoy → qué tipo de Moment recomendar (Hoy e Impulso usan el mismo mapeo). */
export const MODE_KINDS: Record<TodayMode, MomentKind[]> = {
  REGULATE: ['recovery'],
  REFLECT: ['learning', 'recovery'],
  CLARIFY: ['growth'],
  CONTINUE: ['daily'],
  EXECUTE: ['growth', 'challenge'],
  INSPIRE: ['learning', 'recovery'],
};
