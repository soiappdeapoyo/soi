import type { SupabaseClient } from '@supabase/supabase-js';
import type { ActionBlock, MomentKind } from '@/config/actions';
import { OFFICIAL_MOMENTS, officialMoment } from '@/config/official-moments';
import { searchYouTube, type YouTubeVideo } from '@/lib/integrations/youtube';
import { remember } from '@/lib/ai/rag';
import { flattenBlocks, type MomentRef } from './flatten';
import { MOMENT_FIELDS, toMomentFlow, type MomentFlow } from './types';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Moment por uuid (tabla) o por slug (oficial). Respeta RLS: privados solo para su dueño. */
export async function getMoment(supabase: SupabaseClient, idOrSlug: string): Promise<MomentFlow | null> {
  if (!UUID.test(idOrSlug)) return officialMoment(idOrSlug);
  const { data } = await supabase.from('soi_blueprints').select(MOMENT_FIELDS).eq('id', idOrSlug).maybeSingle();
  return data ? toMomentFlow(data) : null;
}

/** Bloques completos (premium solo para dueño o comprador; si no, null). */
export async function fullBlocks(supabase: SupabaseClient, m: MomentFlow): Promise<ActionBlock[] | null> {
  if (m.official) return m.blocks;
  const { data, error } = await supabase.rpc('get_moment_blocks', { p_id: m.id });
  if (error) return null;
  return (data as ActionBlock[] | null) ?? null;
}

/** Bloques listos para ejecutar: Moments anidados expandidos. */
export async function playableBlocks(supabase: SupabaseClient, m: MomentFlow): Promise<ActionBlock[] | null> {
  const blocks = await fullBlocks(supabase, m);
  if (!blocks) return null;
  const resolve = async (ref: MomentRef) => {
    if (ref.slug) return officialMoment(ref.slug)?.blocks ?? null;
    if (!ref.momentId) return null;
    const { data } = await supabase.rpc('get_moment_blocks', { p_id: ref.momentId });
    return (data as ActionBlock[] | null) ?? null;
  };
  return flattenBlocks(blocks, resolve, { self: m.official ? { slug: m.slug! } : { momentId: m.id } });
}

/**
 * Bloques de video con `query` → video concreto (caché `video_cache` de 7 días por persona).
 * Sin acceso a YouTube (Free) o sin resultado, el bloque queda como está y el reproductor lo omite con elegancia.
 */
export async function resolveVideoBlocks(supabase: SupabaseClient, userId: string, blocks: ActionBlock[], allowed: boolean) {
  if (!allowed) return blocks;
  const out: ActionBlock[] = [];
  for (const b of blocks) {
    const c = b.config as { videoId?: string; query?: string };
    if (b.type !== 'video' || c.videoId || !c.query) { out.push(b); continue; }
    const { data: cached } = await supabase.from('agent_knowledge').select('metadata, created_at')
      .eq('user_id', userId).eq('category', 'video_cache').eq('title', c.query)
      .order('created_at', { ascending: false }).limit(1).maybeSingle();
    let videos: YouTubeVideo[] = cached && Date.now() - Date.parse(cached.created_at as string) < 7 * 86_400_000
      ? ((cached.metadata as { videos?: YouTubeVideo[] })?.videos ?? []) : [];
    if (!videos.length) {
      videos = await searchYouTube(c.query, 3);
      if (videos.length) {
        await remember(supabase, { user_id: userId, category: 'video_cache', title: c.query,
          content: videos.map((v) => `${v.title} — ${v.channel}`).join('\n'), metadata: { videos }, withEmbedding: false });
      }
    }
    const v = videos[0];
    out.push(v ? { ...b, config: { ...c, videoId: v.id, title: v.title, channel: v.channel, thumbnail: v.thumbnail } } : b);
  }
  return out;
}

/** Recomendación por tipo: primero Moments propios de ese tipo, luego oficiales, luego publicados populares. */
export async function recommendMoment(supabase: SupabaseClient, userId: string, kinds: MomentKind[]): Promise<MomentFlow | null> {
  const { data: own } = await supabase.from('soi_blueprints').select(MOMENT_FIELDS)
    .eq('creator_id', userId).in('kind', kinds).neq('status', 'archived').order('updated_at', { ascending: false }).limit(1).maybeSingle();
  if (own) return toMomentFlow(own);
  const official = OFFICIAL_MOMENTS.find((m) => kinds.includes(m.kind));
  if (official) return official;
  const { data: pub } = await supabase.from('soi_blueprints').select(MOMENT_FIELDS)
    .eq('status', 'published').in('kind', kinds).order('executions_count', { ascending: false }).limit(1).maybeSingle();
  return pub ? toMomentFlow(pub) : null;
}

/**
 * Ejecutar un Moment requiere `routine_execution` (Free bloqueado, como las rutinas).
 * Un Moment premium requiere además haberlo comprado (o ser su creador).
 */
export async function canRun(supabase: SupabaseClient, userId: string, m: MomentFlow, routineExecution: boolean) {
  // Premium: siempre exige compra (o ser su creador), sin importar el plan. Lo comprado se usa en cualquier plan.
  if (!m.official && m.tier === 'premium' && m.creator_id !== userId) {
    const { data } = await supabase.from('blueprint_purchases').select('id').eq('blueprint_id', m.id).eq('user_id', userId).maybeSingle();
    return Boolean(data);
  }
  return routineExecution;
}

/** Copia personal de un Moment oficial (los oficiales no están en la tabla). */
export async function forkOfficial(supabase: SupabaseClient, userId: string, m: MomentFlow, blocks?: ActionBlock[]) {
  const { data: existing } = await supabase.from('soi_blueprints').select('id').eq('creator_id', userId)
    .eq('parent_slug', m.slug!).neq('status', 'archived').order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (existing && !blocks) return existing.id as string;
  const { data, error } = await supabase.from('soi_blueprints').insert({
    creator_id: userId, title: m.title, objective: m.objective, source: m.source, eslabon: m.eslabon, kind: m.kind,
    blocks: blocks ?? m.blocks, parent_slug: m.slug, status: 'private', steps: [],
  }).select('id').single();
  if (error) throw new Error(error.message);
  return data.id as string;
}
