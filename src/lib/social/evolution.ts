import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Evidence of Transformation: no historial, evolución.
 * Videos vistos → ideas guardadas → ejercicios completados → hábitos/sistemas → metas activas.
 */
export async function loadEvolution(supabase: SupabaseClient, userId: string, activeGoals = 0) {
  const count = (q: PromiseLike<{ count: number | null }>) => Promise.resolve(q).then((r) => r.count ?? 0);
  const [videos, ideas, exercises, habits] = await Promise.all([
    count(supabase.from('momentum_events').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('kind', 'video_watched')),
    count(supabase.from('soi_moments').select('id', { count: 'exact', head: true }).eq('creator_id', userId)),
    count(supabase.from('momentum_events').select('id', { count: 'exact', head: true }).eq('user_id', userId)
      .in('kind', ['action_completed', 'ritual_completed', 'routine_completed', 'blueprint_step'])),
    count(supabase.from('blueprint_implementations').select('id', { count: 'exact', head: true }).eq('user_id', userId)),
  ]);
  return [
    { label: 'Videos vistos', value: videos },
    { label: 'Ideas guardadas', value: ideas },
    { label: 'Ejercicios completados', value: exercises },
    { label: 'Hábitos creados', value: habits },
    { label: 'Metas activas', value: activeGoals },
  ];
}
