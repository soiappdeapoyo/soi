/**
 * «Usa SOI un mes gratis» (puro y testeado): al terminar la prueba, una opinión en la burbuja regala 7 días más, y se
 * repite cada vez que vuelve a terminar, hasta juntar 28 días (7 de la prueba + 21 ganados).
 *
 * Solo cuenta una opinión con algo escrito: la carita sola no gana días (la idea es aprender qué mejorar).
 */
export const TRIAL_REWARD_DAYS = 7;
export const TRIAL_REWARD_MAX = 21;
export const TRIAL_TOTAL_DAYS = 28;
/** Lo escrito (qué le gusta + qué cambiaría) para que cuente como opinión. */
export const REWARD_MIN_CHARS = 15;
/** La invitación lleva aquí: Hoy abre la burbuja sola. */
export const REWARD_URL = '/hoy?opinion=1';

type RewardProfile = { plan: string | null; trial_ends_at: string | null; feedback_reward_days?: number | null };

/** Puede ganar días ahora: no paga SOI+, su prueba ya terminó y aún no junta los 21. */
export function rewardEligible(p: RewardProfile | null, now = Date.now()): boolean {
  if (!p || p.plan === 'soi_plus' || !p.trial_ends_at) return false;
  const ends = Date.parse(p.trial_ends_at);
  return Number.isFinite(ends) && ends <= now && (p.feedback_reward_days ?? 0) < TRIAL_REWARD_MAX;
}

export function meaningfulFeedback(liked: string | null, disliked: string | null): boolean {
  return `${liked ?? ''}${disliked ?? ''}`.replace(/\s+/g, '').length >= REWARD_MIN_CHARS;
}

/** Semanas que aún puede ganar. */
export function weeksLeft(rewardDays: number): number {
  return Math.max(0, Math.round((TRIAL_REWARD_MAX - rewardDays) / TRIAL_REWARD_DAYS));
}

/** El aviso de la campanita (uno por cada vez que termina su prueba: `ref`). */
export function rewardNotification(p: { trial_ends_at: string; feedback_reward_days?: number | null }) {
  const earned = p.feedback_reward_days ?? 0;
  const left = weeksLeft(earned);
  return {
    kind: 'trial_feedback' as const,
    ref: `trial-feedback:${p.trial_ends_at.slice(0, 10)}`,
    url: REWARD_URL,
    title: earned ? 'Gana otra semana de SOI' : 'Usa SOI un mes gratis',
    body: earned
      ? `Tu semana extra terminó. Cuéntanos en la burbuja roja qué te gusta o qué cambiarías y te regalamos 7 días más${left > 1 ? ` (te quedan ${left} semanas por ganar)` : ' (es la última)'}.`
      : 'Tu prueba de 7 días terminó. Déjanos tu opinión en la burbuja roja y te regalamos 7 días más. Puedes repetirlo hasta juntar 28 días de SOI.',
  };
}

/** La prueba crece 7 días desde hoy (o desde su fin, si aún no terminó). */
export function extendedTrialEnd(trialEndsAt: string | null, now = Date.now()): string {
  const from = Math.max(now, trialEndsAt ? Date.parse(trialEndsAt) || 0 : 0);
  return new Date(from + TRIAL_REWARD_DAYS * 86_400_000).toISOString();
}
