import type { SupabaseClient } from '@supabase/supabase-js';
import { MOMENT_FIELDS, toMomentFlow, type MomentFlow } from '@/lib/moments/types';
import { officialMoment } from '@/config/official-moments';
import { POST_FIELDS, hydratePosts, type PostRow, type PostView, type PublicAuthor } from './posts';

export type DmMessage = {
  id: string; thread_id: string; sender_id: string; body: string | null;
  post_id: string | null; moment_id: string | null; moment_slug: string | null;
  created_at: string; deleted_at: string | null;
};
export type DmMessageView = DmMessage & { post: PostView | null; moment: MomentFlow | null };
export type DmThreadView = {
  id: string; other: PublicAuthor; last_message_at: string; last_message_preview: string | null; unread: boolean;
};

export const DM_FIELDS = 'id, thread_id, sender_id, body, post_id, moment_id, moment_slug, created_at, deleted_at';
export const DM_PAGE = 40;

/** Bandeja: conversaciones propias con la otra persona y si hay mensajes sin leer. */
export async function loadInbox(supabase: SupabaseClient, userId: string): Promise<DmThreadView[]> {
  const { data: threads } = await supabase.from('dm_threads').select('id, user_a, user_b, last_message_at, last_message_preview')
    .order('last_message_at', { ascending: false }).limit(50);
  const rows = (threads ?? []) as { id: string; user_a: string; user_b: string; last_message_at: string; last_message_preview: string | null }[];
  if (!rows.length) return [];
  const others = rows.map((t) => (t.user_a === userId ? t.user_b : t.user_a));
  const [{ data: profiles }, { data: reads }, { data: latest }] = await Promise.all([
    supabase.rpc('get_public_profiles', { p_ids: [...new Set(others)] }),
    supabase.from('dm_reads').select('thread_id, last_read_at').in('thread_id', rows.map((t) => t.id)),
    supabase.from('dm_messages').select('thread_id, sender_id, created_at').in('thread_id', rows.map((t) => t.id)).neq('sender_id', userId)
      .is('deleted_at', null).order('created_at', { ascending: false }).limit(200),
  ]);
  const byId = new Map(((profiles ?? []) as PublicAuthor[]).map((p) => [p.user_id, p]));
  const readAt = new Map((reads ?? []).map((r) => [r.thread_id as string, r.last_read_at as string]));
  const lastIn = new Map<string, string>();
  for (const m of latest ?? []) if (!lastIn.has(m.thread_id as string)) lastIn.set(m.thread_id as string, m.created_at as string);
  return rows.map((t, i) => {
    const other = byId.get(others[i]!) ?? { user_id: others[i]!, display_name: 'Alguien de SOI', avatar_url: null, handle: null, is_verified: false };
    const incoming = lastIn.get(t.id);
    const read = readAt.get(t.id);
    return { id: t.id, other, last_message_at: t.last_message_at, last_message_preview: t.last_message_preview, unread: Boolean(incoming && (!read || incoming > read)) };
  });
}

/** Mensajes (más recientes primero desde la BD; se devuelven en orden cronológico) con publicaciones y Moments compartidos. */
export async function loadMessages(supabase: SupabaseClient, userId: string, threadId: string, before?: string) {
  let q = supabase.from('dm_messages').select(DM_FIELDS).eq('thread_id', threadId).order('created_at', { ascending: false }).limit(DM_PAGE);
  if (before) q = q.lt('created_at', before);
  const { data } = await q;
  const rows = ((data ?? []) as DmMessage[]).reverse();
  return { messages: await hydrateMessages(supabase, userId, rows), more: (data ?? []).length === DM_PAGE };
}

export async function hydrateMessages(supabase: SupabaseClient, userId: string, rows: DmMessage[]): Promise<DmMessageView[]> {
  const postIds = [...new Set(rows.map((m) => m.post_id).filter(Boolean) as string[])];
  const momentIds = [...new Set(rows.map((m) => m.moment_id).filter(Boolean) as string[])];
  const [{ data: posts }, { data: moments }] = await Promise.all([
    postIds.length ? supabase.from('soi_posts').select(POST_FIELDS).in('id', postIds) : Promise.resolve({ data: [] as PostRow[] }),
    momentIds.length ? supabase.from('soi_blueprints').select(MOMENT_FIELDS).in('id', momentIds) : Promise.resolve({ data: [] as Record<string, unknown>[] }),
  ]);
  const postViews = await hydratePosts(supabase, userId, (posts ?? []) as PostRow[]);
  const postById = new Map(postViews.map((p) => [p.id, p]));
  const momentById = new Map((moments ?? []).map((m) => [m.id as string, toMomentFlow(m)]));
  return rows.map((m) => ({
    ...m,
    post: m.post_id ? postById.get(m.post_id) ?? null : null,
    moment: m.moment_id ? momentById.get(m.moment_id) ?? null : m.moment_slug ? officialMoment(m.moment_slug) : null,
  }));
}
