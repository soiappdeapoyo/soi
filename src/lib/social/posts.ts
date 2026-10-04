import type { SupabaseClient } from '@supabase/supabase-js';
import { MOMENT_FIELDS, toMomentFlow, type MomentFlow } from '@/lib/moments/types';
import { officialMoment } from '@/config/official-moments';

/** Fila de soi_posts. */
export type PostRow = {
  id: string; author_id: string; body: string | null; images: string[];
  moment_id: string | null; moment_slug: string | null; quote_of: string | null; restack_of: string | null;
  parent_id: string | null; root_id: string | null;
  like_count: number; reply_count: number; restack_count: number; created_at: string; edited_at: string | null;
};

export type PublicAuthor = { user_id: string; display_name: string; avatar_url: string | null; handle: string | null; is_verified: boolean };

/** Lo que pinta una tarjeta (serializable para Client Components). */
export type PostView = PostRow & {
  author: PublicAuthor;
  imageUrls: string[];
  moment: MomentFlow | null;
  quoted: (PostRow & { author: PublicAuthor; imageUrls: string[] }) | null;
  liked: boolean;
  saved: boolean;
  /** Restack puro: quién lo compartió (la tarjeta muestra la publicación original). */
  restackedBy: PublicAuthor | null;
  mine: boolean;
};

export const POST_FIELDS = 'id, author_id, body, images, moment_id, moment_slug, quote_of, restack_of, parent_id, root_id, like_count, reply_count, restack_count, created_at, edited_at';

/** Rutas que empiezan con "/" son archivos de la app (fotos demo en /public/demo); el resto, Storage. */
export function publicImageUrl(path: string) {
  if (path.startsWith('/')) return path;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/post-media/${path}`;
}

const UNKNOWN: Omit<PublicAuthor, 'user_id'> = { display_name: 'Alguien de SOI', avatar_url: null, handle: null, is_verified: false };

async function authors(supabase: SupabaseClient, ids: string[]) {
  const unique = [...new Set(ids)];
  if (!unique.length) return new Map<string, PublicAuthor>();
  const { data } = await supabase.rpc('get_public_profiles', { p_ids: unique });
  return new Map(((data ?? []) as PublicAuthor[]).map((a) => [a.user_id, a]));
}

/**
 * Hidrata publicaciones en 4–5 consultas: originales de restacks y citas, autores, Moments adjuntos,
 * y mis me gusta / guardados. Un restack puro se pinta como la publicación original con "X hizo restack".
 */
export async function hydratePosts(supabase: SupabaseClient, userId: string, rows: PostRow[]): Promise<PostView[]> {
  if (!rows.length) return [];
  const refIds = [...new Set(rows.flatMap((r) => [r.restack_of, r.quote_of]).filter(Boolean) as string[])];
  const { data: refs } = refIds.length
    ? await supabase.from('soi_posts').select(POST_FIELDS).in('id', refIds)
    : { data: [] as PostRow[] };
  const refById = new Map(((refs ?? []) as PostRow[]).map((r) => [r.id, r]));

  // La tarjeta muestra el original en los restacks puros.
  const shown = rows.map((r) => (r.restack_of && !r.body ? refById.get(r.restack_of) ?? null : r)).filter(Boolean) as PostRow[];
  const momentIds = [...new Set(shown.map((r) => r.moment_id).filter(Boolean) as string[])];
  const shownIds = [...new Set(shown.map((r) => r.id))];

  const [authorMap, { data: moments }, { data: likes }, { data: saves }] = await Promise.all([
    authors(supabase, [...rows.map((r) => r.author_id), ...((refs ?? []) as PostRow[]).map((r) => r.author_id)]),
    momentIds.length ? supabase.from('soi_blueprints').select(MOMENT_FIELDS).in('id', momentIds) : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    supabase.from('post_likes').select('post_id').eq('user_id', userId).in('post_id', shownIds),
    supabase.from('post_saves').select('post_id').eq('user_id', userId).in('post_id', shownIds),
  ]);
  const momentById = new Map((moments ?? []).map((m) => [m.id as string, toMomentFlow(m)]));
  const liked = new Set((likes ?? []).map((l) => l.post_id as string));
  const saved = new Set((saves ?? []).map((l) => l.post_id as string));
  const author = (id: string) => authorMap.get(id) ?? { user_id: id, ...UNKNOWN };

  const views: PostView[] = [];
  for (const r of rows) {
    const isPureRestack = Boolean(r.restack_of && !r.body);
    const p = isPureRestack ? refById.get(r.restack_of!) : r;
    if (!p) continue; // el original fue borrado u ocultado
    const q = p.quote_of ? refById.get(p.quote_of) : null;
    views.push({
      ...p,
      author: author(p.author_id),
      imageUrls: p.images.map(publicImageUrl),
      moment: p.moment_id ? momentById.get(p.moment_id) ?? null : p.moment_slug ? officialMoment(p.moment_slug) : null,
      quoted: q ? { ...q, author: author(q.author_id), imageUrls: q.images.map(publicImageUrl) } : null,
      liked: liked.has(p.id),
      saved: saved.has(p.id),
      restackedBy: isPureRestack ? author(r.author_id) : null,
      mine: p.author_id === userId,
    });
  }
  return views;
}

export const FEED_PAGE = 15;

export async function loadForYou(supabase: SupabaseClient, userId: string, offset = 0) {
  const { data } = await supabase.rpc('feed_for_you', { p_offset: offset, p_limit: FEED_PAGE });
  const rows = (data ?? []) as PostRow[];
  return { posts: await hydratePosts(supabase, userId, rows), more: rows.length === FEED_PAGE };
}

export async function loadFollowing(supabase: SupabaseClient, userId: string, before?: string) {
  const { data } = await supabase.rpc('feed_following', { p_before: before ?? null, p_limit: FEED_PAGE });
  const rows = (data ?? []) as PostRow[];
  return { posts: await hydratePosts(supabase, userId, rows), next: rows.length === FEED_PAGE ? rows.at(-1)!.created_at : null };
}

export async function loadByAuthor(supabase: SupabaseClient, userId: string, authorId: string, before?: string) {
  let q = supabase.from('soi_posts').select(POST_FIELDS).eq('author_id', authorId).is('parent_id', null)
    .order('created_at', { ascending: false }).limit(FEED_PAGE);
  if (before) q = q.lt('created_at', before);
  const { data } = await q;
  const rows = (data ?? []) as PostRow[];
  return { posts: await hydratePosts(supabase, userId, rows), next: rows.length === FEED_PAGE ? rows.at(-1)!.created_at : null };
}

/** Publicación + su hilo (comentarios y respuestas a comentarios, en orden). */
export async function loadThread(supabase: SupabaseClient, userId: string, id: string) {
  const { data: root } = await supabase.from('soi_posts').select(POST_FIELDS).eq('id', id).maybeSingle();
  if (!root) return null;
  const rootId = (root as PostRow).root_id ?? (root as PostRow).id;
  const { data: replies } = await supabase.from('soi_posts').select(POST_FIELDS).eq('root_id', rootId)
    .order('created_at', { ascending: true }).limit(200);
  const [post] = await hydratePosts(supabase, userId, [root as PostRow]);
  const all = await hydratePosts(supabase, userId, (replies ?? []) as PostRow[]);
  return { post: post!, replies: all };
}

export async function loadSaved(supabase: SupabaseClient, userId: string) {
  const { data: saves } = await supabase.from('post_saves').select('post_id').eq('user_id', userId).order('created_at', { ascending: false }).limit(50);
  const ids = (saves ?? []).map((s) => s.post_id as string);
  if (!ids.length) return [];
  const { data } = await supabase.from('soi_posts').select(POST_FIELDS).in('id', ids);
  const byId = new Map(((data ?? []) as PostRow[]).map((r) => [r.id, r]));
  return hydratePosts(supabase, userId, ids.map((i) => byId.get(i)).filter(Boolean) as PostRow[]);
}

export async function unreadNotifications(supabase: SupabaseClient, userId: string) {
  const { count } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', userId).is('read_at', null);
  return count ?? 0;
}
