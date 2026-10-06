import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { Eye } from 'lucide-react';
import { getSessionUser } from '@/lib/supabase/server';
import { getAccessMap } from '@/lib/billing/check-access';
import { loadByAuthor } from '@/lib/social/posts';
import { loadProfileCard } from '@/lib/social/profile';
import { MOMENT_FIELDS, toMomentFlow } from '@/lib/moments/types';
import { FollowButton } from '@/components/feed/follow-button';
import { MessageButton } from '@/components/dm/message-button';
import { FeedList } from '@/components/feed/feed-list';
import { MomentFlowCard } from '@/components/moments/moment-flow-card';
import { ProfileHeader } from '@/components/profile/profile-header';
import { ProfileTabs, type ProfileTab } from '@/components/profile/profile-tabs';
import { Highlights } from '@/components/creators/highlights';
import { CreatorMoments } from '@/components/creators/creator-moments';
import { loadCreatorLayer } from '@/lib/creators/profile';

export const metadata: Metadata = { title: 'Perfil' };

const TABS: ProfileTab[] = [{ id: 'publicaciones', label: 'Publicaciones' }, { id: 'moments', label: 'Moments' }];
/** Cuenta de creador: primero su trabajo (cuadrícula), luego retos y publicaciones. */
const CREATOR_TABS: ProfileTab[] = [{ id: 'moments', label: 'Moments' }, { id: 'retos', label: 'Retos' }, { id: 'publicaciones', label: 'Publicaciones' }];

/** Perfil público en Impulso (estilo Substack). Tu propio perfil vive en /yo; "Ver como los demás" llega aquí. */
export default async function UserPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string; vista?: string; destacado?: string }> }) {
  const [{ id }, { tab: tabParam, vista, destacado }] = await Promise.all([params, searchParams]);
  const { supabase, user } = await getSessionUser();
  if (!user) redirect('/login');
  const mine = id === user.id;
  if (mine && vista !== 'publica') redirect(tabParam ? `/yo?tab=${tabParam}` : '/yo');

  const [card, { data: iFollow }, { profile, access }, creator] = await Promise.all([
    loadProfileCard(supabase, id),
    supabase.from('follows').select('followee_id').eq('follower_id', user.id).eq('followee_id', id).maybeSingle(),
    getAccessMap(user.id),
    loadCreatorLayer(supabase, id),
  ]);
  if (!card) notFound();
  const tabs = creator ? CREATOR_TABS : TABS;
  const tab = tabs.some((t) => t.id === tabParam) ? tabParam! : tabs[0]!.id;
  const [a, b] = [user.id, id].sort() as [string, string];
  const [{ data: canMessage }, { data: thread }] = mine ? [{ data: false }, { data: null }] : await Promise.all([
    supabase.rpc('can_message', { p_sender: user.id, p_recipient: id }),
    supabase.from('dm_threads').select('id').eq('user_a', a).eq('user_b', b).maybeSingle(),
  ]);
  const me = { name: profile?.display_name ?? 'Tú', avatarUrl: profile?.avatar_url ?? null };
  const base = mine ? `/u/${id}?vista=publica` : `/u/${id}`;

  return (
    <div className="mx-auto max-w-2xl px-4 pb-8 pt-6 sm:px-5 md:pt-8">
      {mine && (
        <p className="mb-4 flex items-center gap-2 rounded-[14px] bg-soi-sidebar p-3 text-sm">
          <Eye className="h-4 w-4 shrink-0 text-soi-muted" aria-hidden="true" />
          <span className="flex-1">Así ven tu perfil los demás.</span>
          <Link href="/yo" className="font-medium text-soi-accent">Volver</Link>
        </p>
      )}
      <ProfileHeader
        card={card}
        creator={creator ? { category: creator.category, moments: creator.moments.length, people: creator.people } : null}
        actions={mine ? null : (
          <>
            <FollowButton userId={id} initial={Boolean(iFollow)} count={card.followers} />
            {access.community && <MessageButton userId={id} enabled={Boolean(canMessage) || Boolean(thread)} />}
          </>
        )}
      />
      {creator && <Highlights items={creator.highlights} base={base} active={tab === 'moments' ? destacado : null} />}
      <ProfileTabs tabs={tabs} active={tab} base={base} />
      <div className="pt-4">
        {tab === 'publicaciones' ? <Posts supabase={supabase} userId={user.id} authorId={id} me={me} />
          : creator ? <CreatorMoments creator={creator} tab={tab} highlight={destacado} />
          : <Moments supabase={supabase} authorId={id} />}
      </div>
    </div>
  );
}

type Sb = Awaited<ReturnType<typeof getSessionUser>>['supabase'];

async function Posts({ supabase, userId, authorId, me }: { supabase: Sb; userId: string; authorId: string; me: { name: string; avatarUrl: string | null } }) {
  const feed = await loadByAuthor(supabase, userId, authorId);
  return (
    <FeedList initial={feed.posts} cursor={feed.next ? { kind: 'before', before: feed.next } : null} query={`autor=${authorId}`} me={me}
      composer={false} empty={<p className="py-8 text-center text-sm text-soi-muted">Aún no hay publicaciones.</p>} />
  );
}

async function Moments({ supabase, authorId }: { supabase: Sb; authorId: string }) {
  const { data } = await supabase.from('soi_blueprints').select(MOMENT_FIELDS).eq('creator_id', authorId).eq('status', 'published')
    .order('executions_count', { ascending: false }).limit(20);
  const moments = (data ?? []).map(toMomentFlow);
  return moments.length
    ? <ul className="flex flex-col gap-2">{moments.map((m) => <li key={m.id}><MomentFlowCard m={m} /></li>)}</ul>
    : <p className="py-8 text-center text-sm text-soi-muted">Aún no publica Moments.</p>;
}
