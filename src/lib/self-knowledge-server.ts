import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserProfile } from '@/types/database';
import { loadHillMemory } from '@/lib/ai/hill-memory';
import { loadHabits } from '@/lib/ai/habit-memory';
import { topEnemy } from '@/lib/north';
import { buildKnown, type KnownItem } from '@/lib/self-knowledge';

type Understanding = { id: string; content: string; created_at: string };

/** "Lo que SOI sabe de ti", desde la base (servidor). */
export async function loadKnown(supabase: SupabaseClient, userId: string, profile: UserProfile | null): Promise<KnownItem[]> {
  const since = new Date(Date.now() - 14 * 86_400_000).toISOString();
  const [hill, habits, { data: und }, { data: ids }, { data: enemies }] = await Promise.all([
    loadHillMemory(supabase, userId).catch(() => ({ id: null, memory: null })),
    loadHabits(supabase, userId).catch(() => ({ id: null, memory: null })),
    supabase.from('agent_knowledge').select('id, content, created_at').eq('user_id', userId).eq('category', 'perfil_usuario')
      .contains('tags', ['entendimiento']).order('created_at', { ascending: false }).limit(3),
    supabase.from('identities').select('id, name').eq('user_id', userId).eq('status', 'active').order('position').limit(7),
    supabase.from('enemy_events').select('enemy, occurred_at').eq('user_id', userId).gte('occurred_at', since).limit(200),
  ]);
  const aim = hill.memory?.definite_chief_aim?.trim();
  const enemy = topEnemy((enemies ?? []) as { enemy: string; occurred_at: string }[]);
  return buildKnown({
    profile,
    purpose: hill.id && aim ? { id: hill.id, aim } : null,
    understandings: (und ?? []) as Understanding[],
    habits: habits.memory?.habits ?? [],
    identities: (ids ?? []) as { id: string; name: string }[],
    enemy: enemy ? { id: enemy.id, name: enemy.name } : null,
  });
}
