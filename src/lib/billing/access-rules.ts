import type { Plan } from '@/types/database';

export type Feature =
  | 'chat'
  | 'routine_execution'
  | 'tts'
  | 'evidence_save'
  | 'pdf_export'
  | 'community'
  | 'daily_ritual'
  | 'youtube_embed'
  | 'deep_analysis';

export type AccessReason = 'trial_expired' | 'queries_exhausted' | 'paywalled' | 'not_subscribed';
export type AccessResult = { allowed: boolean; reason?: AccessReason };

export type AccessProfile = {
  plan: Plan;
  trial_ends_at: string;
  free_queries_remaining: number;
  is_paywalled: boolean;
};

export type EffectivePlan = Plan;

/** Trial vencido = Free aunque el cron aún no haya corrido. */
export function effectivePlan(p: AccessProfile, now = new Date()): EffectivePlan {
  if (p.plan === 'soi_plus') return 'soi_plus';
  if (p.plan === 'trial' && new Date(p.trial_ends_at) > now) return 'trial';
  return 'free';
}

/** Regla pura y testeable. */
export function evaluateAccess(p: AccessProfile | null, feature: Feature, now = new Date()): AccessResult {
  if (!p) return { allowed: false, reason: 'paywalled' };
  const plan = effectivePlan(p, now);
  if (plan === 'trial' || plan === 'soi_plus') return { allowed: true };

  if (feature === 'chat') {
    // Trial recién vencido (cron pendiente): conserva el pool completo de 20.
    const remaining = p.plan === 'trial' ? 20 : p.free_queries_remaining;
    return remaining > 0 ? { allowed: true } : { allowed: false, reason: 'queries_exhausted' };
  }
  if (p.plan === 'trial') return { allowed: false, reason: 'trial_expired' };
  return { allowed: false, reason: p.is_paywalled ? 'paywalled' : 'not_subscribed' };
}

export function trialDaysLeft(p: AccessProfile, now = new Date()) {
  if (p.plan !== 'trial') return 0;
  return Math.max(0, Math.ceil((new Date(p.trial_ends_at).getTime() - now.getTime()) / 86_400_000));
}
