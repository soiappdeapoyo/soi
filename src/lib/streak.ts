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

/** Mensaje sin castigo cuando faltó un día. */
export function streakGreeting(lastRitualDate: string | null, today: string): string | null {
  if (!lastRitualDate) return null;
  const gap = Math.round((Date.parse(today) - Date.parse(lastRitualDate)) / 86_400_000);
  if (gap >= 2) return 'Ayer no te vimos, pero aquí seguimos. ¿Retomamos?';
  return null;
}
