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

export type ConsumeResult = 'unlimited' | 'consumed' | 'exhausted';

/** Comprueba y descuenta en una sola operación atómica (RPC con bloqueo de fila). */
export async function consumeChatQuery(): Promise<ConsumeResult> {
  const supabase = await createServerClient();
  const { data, error } = await supabase.rpc('consume_chat_query');
  if (error) {
    console.error('[billing] consume_chat_query', error.message);
    return 'exhausted';
  }
  return data as ConsumeResult;
}

/** Devuelve la consulta si la generación falló por completo. */
export async function refundChatQuery() {
  const supabase = await createServerClient();
  await supabase.rpc('refund_chat_query');
}
