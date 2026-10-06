import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { BadgeCheck } from 'lucide-react';
import { PublicShell } from '@/components/public/public-shell';
import { MomentGrid } from '@/components/creators/moment-grid';
import { Highlights } from '@/components/creators/highlights';
import { Avatar } from '@/components/feed/avatar';
import { loadCreatorLayer } from '@/lib/creators/profile';
import { loadProfileCard } from '@/lib/social/profile';
import { ProfileLinks } from '@/components/profile/profile-links';
import { createAdminClient, getSessionUser } from '@/lib/supabase/server';
import { transformationScore, type CreatorStats } from '@/config/creators';
import type { CreatorProfile } from '@/types/database';

async function load(handle: string) {
  const { supabase, user } = await getSessionUser();
  const { data } = await supabase.from('creator_profiles').select('*').eq('handle', handle.toLowerCase()).maybeSingle();
  return { supabase, user, creator: data as CreatorProfile | null };
}

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle } = await params;
  const { creator } = await load(handle);
  if (!creator) return { title: 'Creador' };
  return {
    title: `${creator.display_name} en SOI`,
    description: creator.bio ?? `Moments de transformación de ${creator.display_name} para vivir en tu vida.`,
  };
}

/**
 * Perfil público del creador para visitantes sin sesión (enlaces desde redes). Con sesión, es el mismo perfil
 * de siempre (/u/[id]): un solo perfil, como en Instagram.
 */
export default async function CreatorPublicPage({ params, searchParams }: { params: Promise<{ handle: string }>; searchParams: Promise<{ destacado?: string }> }) {
  const [{ handle }, { destacado }] = await Promise.all([params, searchParams]);
  const { supabase, user, creator } = await load(handle);
  if (!creator) notFound();
  if (user) redirect(`/u/${creator.user_id}${destacado ? `?tab=moments&destacado=${destacado}` : ''}`);

  // Un solo perfil: bio, foto y enlaces son los del perfil (lo público de get_profile_card; el visitante no tiene sesión).
  const [layer, { data: statsRows }, card] = await Promise.all([
    loadCreatorLayer(supabase, creator.user_id),
    supabase.rpc('creator_stats', { p_creator: creator.user_id }),
    loadProfileCard(createAdminClient(), creator.user_id),
  ]);
  const raw = (Array.isArray(statsRows) ? statsRows[0] : statsRows) as Record<keyof CreatorStats, number | string> | null;
  const stats: CreatorStats = {
    implementations: Number(raw?.implementations ?? 0), completions: Number(raw?.completions ?? 0),
    active_last_14d: Number(raw?.active_last_14d ?? 0), results_reported: Number(raw?.results_reported ?? 0),
  };
  const moments = layer?.moments ?? [];
  const h = destacado ? layer?.highlights.find((x) => x.id === destacado) : null;

  return (
    <PublicShell signedIn={false}>
      <header>
        <Avatar url={card?.avatar_url ?? creator.avatar_url} name={card?.display_name ?? creator.display_name} size={84} className="text-2xl" />
        <h1 className="mt-3 flex items-center gap-1.5 text-2xl font-semibold tracking-tight">
          {creator.display_name}
          {creator.is_verified && <BadgeCheck className="h-5 w-5 text-soi-accent" aria-label="Creador verificado" />}
        </h1>
        <p className="text-sm text-soi-muted">@{creator.handle}{creator.category ? ` · ${creator.category}` : ''}</p>
        {(card?.bio ?? creator.bio) && <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed">{card?.bio ?? creator.bio}</p>}
        {card && <ProfileLinks links={card.links} />}
        <p className="nums mt-2 text-sm text-soi-muted">
          <span className="font-medium text-soi-ink">{moments.length}</span> Moments
          <span aria-hidden="true"> · </span><span className="font-medium text-soi-ink">{stats.implementations}</span> {stats.implementations === 1 ? 'persona' : 'personas'}
          <span aria-hidden="true"> · </span>Transformation Score <span className="font-medium text-soi-ink">{transformationScore(stats)}</span>
        </p>
      </header>

      {layer && <Highlights items={layer.highlights} base={`/c/${creator.handle}`} active={destacado} withTab={false} />}

      <section className="mt-5" aria-label="Moments">
        {h && <p className="mb-2 px-1 text-sm text-soi-muted">Destacado: <span className="font-medium text-soi-ink">{h.title}</span></p>}
        <MomentGrid moments={h ? h.moments : moments} hrefBase="/b" empty={<p className="rounded-[14px] bg-soi-sidebar p-4 text-sm text-soi-muted">Pronto publicará sus primeros Moments.</p>} />
      </section>
    </PublicShell>
  );
}
