import type { SupabaseClient } from '@supabase/supabase-js';
import type { CreatorProfile, SoiBlueprint, SoiMoment } from '@/types/database';

export const MOMENT_FIELDS = 'id, creator_id, author_name, title, category, trigger_state, source_type, source_reference, insight, reflection_question, user_reflection, actions, evidence, visibility, blueprint_id, resonance_count, save_count, is_demo, created_at';
export const BLUEPRINT_FIELDS = 'id, creator_id, moment_id, title, objective, required_minutes, duration_days, difficulty, eslabon, target_states, steps, source, tier, price_cents, currency, status, implementations_count, completions_count, steps_completed_count, is_demo, created_at';

export type CreatorLite = Pick<CreatorProfile, 'user_id' | 'handle' | 'display_name' | 'is_verified'>;

export async function creatorsById(supabase: SupabaseClient, ids: string[]) {
  const unique = [...new Set(ids)];
  if (!unique.length) return new Map<string, CreatorLite>();
  const { data } = await supabase.from('creator_profiles').select('user_id, handle, display_name, is_verified').in('user_id', unique);
  return new Map((data ?? []).map((c) => [c.user_id as string, c as CreatorLite]));
}

export async function myInteractions(supabase: SupabaseClient, userId: string, momentIds: string[]) {
  if (!momentIds.length) return new Set<string>();
  const { data } = await supabase.from('moment_interactions').select('moment_id, kind').eq('user_id', userId).in('moment_id', momentIds);
  return new Set((data ?? []).map((r) => `${r.moment_id}:${r.kind}`));
}

export type FeedItem = { type: 'moment'; item: SoiMoment } | { type: 'blueprint'; item: SoiBlueprint };

/** "Para ti": transformaciones recientes; los Blueprints de tu eslabón más débil primero. Paginado, sin feed infinito. */
export async function loadFeed(supabase: SupabaseClient, opts: { before?: string; weakestLink?: string | null; limit?: number }) {
  const limit = opts.limit ?? 12;
  let mq = supabase.from('soi_moments').select(MOMENT_FIELDS).eq('visibility', 'community').eq('flagged', false)
    .order('created_at', { ascending: false }).limit(limit);
  let bq = supabase.from('soi_blueprints').select(BLUEPRINT_FIELDS).eq('status', 'published')
    .order('created_at', { ascending: false }).limit(Math.ceil(limit / 2));
  if (opts.before) { mq = mq.lt('created_at', opts.before); bq = bq.lt('created_at', opts.before); }
  const [{ data: moments }, { data: blueprints }] = await Promise.all([mq, bq]);

  const items: FeedItem[] = [
    ...((moments ?? []) as SoiMoment[]).map((m) => ({ type: 'moment' as const, item: m })),
    ...((blueprints ?? []) as SoiBlueprint[]).map((b) => ({ type: 'blueprint' as const, item: b })),
  ].sort((a, b) => {
    const boost = (x: FeedItem) => (x.type === 'blueprint' && opts.weakestLink && x.item.eslabon === opts.weakestLink ? 1 : 0);
    return boost(b) - boost(a) || b.item.created_at.localeCompare(a.item.created_at);
  }).slice(0, limit);

  const oldest = items.reduce<string | null>((min, x) => (!min || x.item.created_at < min ? x.item.created_at : min), null);
  return { items, nextBefore: items.length >= limit ? oldest : null };
}
