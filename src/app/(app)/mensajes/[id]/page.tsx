import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getSessionUser } from '@/lib/supabase/server';
import { loadMessages } from '@/lib/social/dm';
import type { PublicAuthor } from '@/lib/social/posts';
import { Conversation } from '@/components/dm/conversation';

export const metadata: Metadata = { title: 'Conversación' };

export default async function ConversacionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getSessionUser();
  if (!user) redirect('/login');
  const { data: thread } = await supabase.from('dm_threads').select('id, user_a, user_b').eq('id', id).maybeSingle();
  if (!thread) notFound();
  const otherId = (thread.user_a === user.id ? thread.user_b : thread.user_a) as string;
  const [{ data: prof }, { messages, more }, { data: canSend }, { data: block }] = await Promise.all([
    supabase.rpc('get_public_profiles', { p_ids: [otherId] }),
    loadMessages(supabase, user.id, id),
    supabase.rpc('can_message', { p_sender: user.id, p_recipient: otherId }),
    supabase.from('user_blocks').select('blocked_id').eq('blocker_id', user.id).eq('blocked_id', otherId).maybeSingle(),
  ]);
  const other = ((prof ?? []) as PublicAuthor[])[0] ?? { user_id: otherId, display_name: 'Alguien de SOI', avatar_url: null, handle: null, is_verified: false };
  return <Conversation threadId={id} meId={user.id} other={other} initial={messages} hasMore={more} canSend={Boolean(canSend)} blocked={Boolean(block)} />;
}
