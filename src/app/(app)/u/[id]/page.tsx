import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { BadgeCheck } from 'lucide-react';
import { getSessionUser } from '@/lib/supabase/server';
import { getAccessMap } from '@/lib/billing/check-access';
import { loadByAuthor, type PublicAuthor } from '@/lib/social/posts';
import { MOMENT_FIELDS, toMomentFlow } from '@/lib/moments/types';
import { Avatar } from '@/components/feed/avatar';
import { FollowButton } from '@/components/feed/follow-button';
import { FeedList } from '@/components/feed/feed-list';
import { MomentFlowCard } from '@/components/moments/moment-flow-card';

export const metadata: Metadata = { title: 'Perfil' };

/** Perfil en Impulso: publicaciones, Moments publicados, seguidores. */
export default async function UserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getSessionUser();
  if (!user) redirect('/login');
  const [{ data: prof }, feed, { count: followers }, { count: followingCount }, { data: iFollow }, { data: moments }, { profile, access }] = await Promise.all([
    supabase.rpc('get_public_profiles', { p_ids: [id] }),
    loadByAuthor(supabase, user.id, id),
    supabase.from('follows').select('follower_id', { count: 'exact', head: true }).eq('followee_id', id),
    supabase.from('follows').select('followee_id', { count: 'exact', head: true }).eq('follower_id', id),
    supabase.from('follows').select('followee_id').eq('follower_id', user.id).eq('followee_id', id).maybeSingle(),
    supabase.from('soi_blueprints').select(MOMENT_FIELDS).eq('creator_id', id).eq('status', 'published').order('executions_count', { ascending: false }).limit(4),
    getAccessMap(user.id),
  ]);
  const a = ((prof ?? []) as PublicAuthor[])[0];
  if (!a) notFound();
  const mine = id === user.id;
  const me = { name: profile?.display_name ?? 'Tú', avatarUrl: profile?.avatar_url ?? null };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-5 md:py-8">
      <header className="flex items-start gap-4">
        <Avatar url={a.avatar_url} name={a.display_name} size={64} />
        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-1.5 truncate text-2xl font-semibold tracking-tight">
            {a.display_name}{a.is_verified && <BadgeCheck className="h-5 w-5 text-soi-accent" aria-label="Creador verificado" />}
          </h1>
          {a.handle && <p className="text-sm text-soi-muted">@{a.handle} · <Link href={`/c/${a.handle}`} className="underline-offset-4 hover:underline">Perfil de creador</Link></p>}
          <p className="nums mt-1 text-sm text-soi-muted">{followingCount ?? 0} siguiendo</p>
          <div className="mt-3">
            {mine ? <Link href="/perfil" className="text-sm text-soi-accent underline underline-offset-4">Editar mi perfil</Link>
              : <FollowButton userId={id} initial={Boolean(iFollow)} count={followers ?? 0} />}
          </div>
        </div>
      </header>

      {(moments ?? []).length > 0 && (
        <section className="mt-6" aria-labelledby="um">
          <h2 id="um" className="mb-2 text-sm font-medium text-soi-muted">Moments</h2>
          <ul className="flex flex-col gap-2">{(moments ?? []).map((m) => { const f = toMomentFlow(m); return <li key={f.id}><MomentFlowCard m={f} /></li>; })}</ul>
        </section>
      )}

      <section className="mt-6" aria-labelledby="up">
        <h2 id="up" className="text-sm font-medium text-soi-muted">Publicaciones</h2>
        <FeedList initial={feed.posts} cursor={feed.next ? { kind: 'before', before: feed.next } : null} query={`autor=${id}`} me={me}
          composer={mine && access.community} empty={<p className="py-8 text-center text-sm text-soi-muted">Aún no hay publicaciones.</p>} />
      </section>
    </div>
  );
}
