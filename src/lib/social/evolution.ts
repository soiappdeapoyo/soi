import type { SupabaseClient } from '@supabase/supabase-js';

/** Conteos para la cadena de evolución del Muro de Evidencias. */
export async function loadEvolution(supabase: SupabaseClient, userId: string) {
  const count = (q: PromiseLike<{ count: number | null }>) => Promise.resolve(q).then((r) => r.count ?? 0);
  const [ideas, actions, habits, results] = await Promise.all([
    count(supabase.from('soi_moments').select('id', { count: 'exact', head: true }).eq('creator_id', userId)),
    count(supabase.from('momentum_events').select('id', { count: 'exact', head: true }).eq('user_id', userId)
      .in('kind', ['action_completed', 'ritual_completed', 'routine_completed', 'blueprint_step'])),
    count(supabase.from('blueprint_implementations').select('id', { count: 'exact', head: true }).eq('user_id', userId)),
    count(supabase.from('agent_knowledge').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('category', 'evidencia')),
  ]);
  return [
    { label: 'Ideas guardadas', value: ideas },
    { label: 'Acciones completadas', value: actions },
    { label: 'Sistemas en práctica', value: habits },
    { label: 'Evidencias', value: results },
  ];
}
