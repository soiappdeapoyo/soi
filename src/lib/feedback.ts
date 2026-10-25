/**
 * Retroalimentación de SOI (burbuja «Tu opinión»), puro y testeado: dónde se ve la burbuja, cuándo se abre sola
 * (una vez, cuando ya tiene opinión y le está yendo bien) y qué dispositivo es.
 */

export const FEEDBACK_MAX = 1000;

export const RATINGS = [
  { value: 1, emoji: '😞', label: 'No me gusta' },
  { value: 2, emoji: '😐', label: 'Más o menos' },
  { value: 3, emoji: '🙂', label: 'Me gusta' },
  { value: 4, emoji: '😍', label: 'Me encanta' },
] as const;

export type FeedbackDevice = 'android' | 'ios' | 'desktop' | 'other';

/** Donde la burbuja estorbaría: el cuadro del chat, un Moment en marcha y los flujos de pantalla completa. */
const HIDDEN = [/^\/chat(\/|$)/, /^\/m\/[^/]+\/play$/, /^\/mapa\//, /^\/consentimiento/, /^\/onboarding/, /^\/rutinas\/[^/]+$/, /^\/mensajes\/[^/]+$/];
export function showsFeedbackBubble(pathname: string): boolean {
  return !HIDDEN.some((r) => r.test(pathname));
}

/** Se abre sola solo en pantallas tranquilas. */
const AUTO_PATHS = [/^\/hoy$/, /^\/mi-vida$/, /^\/yo$/];
export function autoPromptPath(pathname: string): boolean {
  return AUTO_PATHS.some((r) => r.test(pathname));
}

export const AUTO_MIN_MOMENTS = 3;
export const AUTO_MIN_DAYS = 3;

/**
 * Una sola vez: ya vio la bienvenida, nunca se le abrió ni la ha enviado, y ya tiene opinión (3 Moments terminados, o
 * 3+ días con la cuenta y al menos uno).
 */
export function promptEligible(i: {
  promptedAt: string | null; tourSeen: boolean; sentBefore: boolean; completedMoments: number; accountDays: number;
}): boolean {
  if (i.promptedAt || i.sentBefore || !i.tourSeen) return false;
  return i.completedMoments >= AUTO_MIN_MOMENTS || (i.accountDays >= AUTO_MIN_DAYS && i.completedMoments >= 1);
}

export function deviceFrom(userAgent: string | null | undefined): FeedbackDevice {
  const ua = userAgent ?? '';
  if (/android/i.test(ua)) return 'android';
  if (/iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && /mobile/i.test(ua))) return 'ios';
  if (/windows|macintosh|linux|cros/i.test(ua)) return 'desktop';
  return 'other';
}

export function cleanText(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim().slice(0, FEEDBACK_MAX);
  return t || null;
}
