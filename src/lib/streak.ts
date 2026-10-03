import type { SupabaseClient } from '@supabase/supabase-js';

export type StreakResult = { streak: number; shields: number; milestone: number | null; used_shield: boolean };

export async function registerRitualDay(supabase: SupabaseClient, userId: string, date: string): Promise<StreakResult | null> {
  const { data, error } = await supabase.rpc('register_ritual_day', { p_user_id: userId, p_date: date });
  if (error) {
    console.error('[streak]', error.message);
    return null;
  }
  return (Array.isArray(data) ? data[0] : data) as StreakResult;
}
