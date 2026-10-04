import type { SupabaseClient } from '@supabase/supabase-js';
import type { Eslabon } from '@/config/agents';
import { computeMomentum, type MomentumEvent, type MomentumKind } from './momentum';

/** Registra un evento de momentum. Nunca rompe el flujo principal si falla. */
export async function recordMomentum(
  supabase: SupabaseClient, userId: string, kind: MomentumKind,
  opts: { eslabon?: Eslabon | null; metadata?: Record<string, unknown> } = {},
) {
  const { error } = await supabase.from('momentum_events').insert({
    user_id: userId, kind, eslabon: opts.eslabon ?? null, metadata: opts.metadata ?? {},
  });
  if (error) console.error('[momentum]', kind, error.message);
}

/** "Regreso diario": un evento `return` como máximo por día. */
export async function recordDailyReturn(supabase: SupabaseClient, userId: string) {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const { count } = await supabase.from('momentum_events').select('id', { count: 'exact', head: true })
    .eq('user_id', userId).eq('kind', 'return').gte('created_at', start.toISOString());
  if (!count) await recordMomentum(supabase, userId, 'return');
}

export async function loadMomentum(supabase: SupabaseClient, userId: string, streak: number) {
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const { data } = await supabase.from('momentum_events').select('kind, created_at')
    .eq('user_id', userId).gte('created_at', since).order('created_at', { ascending: false }).limit(500);
  return computeMomentum((data ?? []) as MomentumEvent[], streak);
}
