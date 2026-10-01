import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getSessionUser } from '@/lib/supabase/server';
import { canAccess } from '@/lib/billing/check-access';
import { CommunityFeed } from '@/components/community/community-feed';
import { LockedFeature } from '@/components/paywall/locked-feature';
import type { CommunityPost } from '@/types/database';

export const metadata: Metadata = { title: 'Comunidad' };

export default async function ComunidadPage() {
  const { supabase, user } = await getSessionUser();
  if (!user) redirect('/login');
  const access = await canAccess(user.id, 'community');

  if (!access.allowed) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-8">
        <h1 className="mb-4 text-3xl font-bold">Comunidad</h1>
        <LockedFeature title="Comunidad SOI" description="Comparte evidencias, pide fuerza y celebra con personas que también están transformando su identidad." />
      </div>
    );
  }

  const { data: posts } = await supabase.from('community_posts')
    .select('id, user_id, type, content, is_anonymous, author_name, reactions, is_demo, created_at')
    .eq('is_public', true).eq('flagged', false).order('created_at', { ascending: false }).limit(20);
  const ids = (posts ?? []).map((p) => p.id as string);
  const { data: mine } = ids.length
    ? await supabase.from('community_reactions').select('post_id, reaction').eq('user_id', user.id).in('post_id', ids)
    : { data: [] as { post_id: string; reaction: string }[] };

  return (
    <div className="mx-auto max-w-2xl px-5 py-8">
      <h1 className="text-3xl font-bold">Comunidad</h1>
      <p className="mb-5 text-black/70">Un espacio seguro para compartir evidencias, peticiones y preguntas.</p>
      <CommunityFeed
        initialPosts={(posts ?? []) as CommunityPost[]}
        myReactions={(mine ?? []).map((r) => `${r.post_id}:${r.reaction}`)}
      />
    </div>
  );
}
