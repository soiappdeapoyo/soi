import type { SupabaseClient } from '@supabase/supabase-js';
import type { CreatorProfile } from '@/types/database';

/** Columnas de una Idea (tabla soi_moments). Los Moments ejecutables usan MOMENT_FIELDS de src/lib/moments/types. */
export const IDEA_FIELDS = 'id, creator_id, author_name, title, category, trigger_state, source_type, source_reference, insight, reflection_question, user_reflection, actions, evidence, visibility, blueprint_id, resonance_count, save_count, is_demo, created_at';

export type CreatorLite = Pick<CreatorProfile, 'user_id' | 'handle' | 'display_name' | 'is_verified'>;

export async function creatorsById(supabase: SupabaseClient, ids: string[]) {
  const unique = [...new Set(ids)];
  if (!unique.length) return new Map<string, CreatorLite>();
  const { data } = await supabase.from('creator_profiles').select('user_id, handle, display_name, is_verified').in('user_id', unique);
  return new Map((data ?? []).map((c) => [c.user_id as string, c as CreatorLite]));
}

export async function myInteractions(supabase: SupabaseClient, userId: string, ideaIds: string[]) {
  if (!ideaIds.length) return new Set<string>();
  const { data } = await supabase.from('moment_interactions').select('moment_id, kind').eq('user_id', userId).in('moment_id', ideaIds);
  return new Set((data ?? []).map((r) => `${r.moment_id}:${r.kind}`));
}
