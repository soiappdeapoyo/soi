import { cache } from 'react';
import { createServerClient } from '@/lib/supabase/server';
import type { UserProfile } from '@/types/database';
import { evaluateAccess, effectivePlan, type AccessResult, type Feature } from './access-rules';

export type { Feature, AccessResult } from './access-rules';

/** Perfil completo del usuario (cacheado por request). */
export const getProfile = cache(async (userId: string): Promise<UserProfile | null> => {
  const supabase = await createServerClient();
  const { data } = await supabase.from('user_profiles').select('*').eq('user_id', userId).single();
  return (data as UserProfile | null) ?? null;
});

export async function canAccess(userId: string, feature: Feature): Promise<AccessResult> {
  return evaluateAccess(await getProfile(userId), feature);
}

/** Mapa de accesos para pasar a Client Components. */
export async function getAccessMap(userId: string) {
  const profile = await getProfile(userId);
  const features: Feature[] = [
    'chat', 'routine_execution', 'tts', 'evidence_save', 'pdf_export',
    'community', 'daily_ritual', 'youtube_embed', 'deep_analysis',
  ];
  const map = Object.fromEntries(features.map((f) => [f, evaluateAccess(profile, f).allowed])) as Record<Feature, boolean>;
  return { profile, plan: profile ? effectivePlan(profile) : 'free', access: map };
}

/** Descuenta una consulta solo si el plan efectivo es Free. */
export async function decrementFreeQuery(userId: string) {
  const profile = await getProfile(userId);
  if (!profile || effectivePlan(profile) !== 'free') return;
  const supabase = await createServerClient();
  if (profile.plan === 'trial') {
    // Transición perezosa si el cron no ha corrido: inicia el pool Free.
    await supabase.rpc('start_free_plan_if_trial_expired');
    return;
  }
  await supabase.rpc('decrement_free_query', { p_user_id: userId });
}
