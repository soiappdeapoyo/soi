import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { BadgeCheck } from 'lucide-react';
import { getSessionUser } from '@/lib/supabase/server';
import { PublicShell } from '@/components/public/public-shell';
import { MomentFlowCard } from '@/components/moments/moment-flow-card';
import { MOMENT_FIELDS, toMomentFlow } from '@/lib/moments/types';
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

/** Perfil público: la reputación es el Transformation Score, no los seguidores. */
export default async function CreatorPublicPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const { supabase, user, creator } = await load(handle);
  if (!creator) notFound();

  const [{ data: blueprints }, { data: statsRows }] = await Promise.all([
    supabase.from('soi_blueprints').select(MOMENT_FIELDS).eq('creator_id', creator.user_id).eq('status', 'published').order('executions_count', { ascending: false }),
    supabase.rpc('creator_stats', { p_creator: creator.user_id }),
  ]);
  const raw = (Array.isArray(statsRows) ? statsRows[0] : statsRows) as Record<keyof CreatorStats, number | string> | null;
  const stats: CreatorStats = {
    implementations: Number(raw?.implementations ?? 0), completions: Number(raw?.completions ?? 0),
    active_last_14d: Number(raw?.active_last_14d ?? 0), results_reported: Number(raw?.results_reported ?? 0),
  };

  return (
    <PublicShell signedIn={Boolean(user)}>
      <p className="text-xs text-soi-muted">Transformation Creator</p>
      <h1 className="mt-1 flex items-center gap-2 text-3xl font-semibold tracking-tight">
        {creator.display_name}
        {creator.is_verified && <BadgeCheck className="h-6 w-6 text-soi-accent" aria-label="Creador verificado" />}
      </h1>
      <p className="text-sm text-soi-muted">@{creator.handle}</p>
      {creator.bio && <p className="mt-4 text-[17px] leading-relaxed">{creator.bio}</p>}

      <dl className="nums mt-5 grid grid-cols-3 gap-1.5 rounded-[14px] bg-soi-sidebar p-1.5">
        {[
          { k: 'Transformation Score', v: transformationScore(stats) },
          { k: 'Personas', v: stats.implementations },
          { k: 'Lo completaron', v: stats.completions },
        ].map((t) => (
          <div key={t.k} className="rounded-lg bg-white px-3 py-2.5 shadow-ring">
            <dt className="text-xs text-soi-muted">{t.k}</dt>
            <dd className="text-xl font-medium">{t.v}</dd>
          </div>
        ))}
      </dl>

      {creator.principles.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-medium text-soi-muted">Principios</h2>
          <ul className="flex flex-col gap-1.5">
            {creator.principles.map((p) => <li key={p} className="rounded-[14px] bg-white p-3 text-[15px] shadow-ring">{p}</li>)}
          </ul>
        </section>
      )}

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-medium text-soi-muted">Moments</h2>
        {blueprints?.length ? (
          <ul className="flex flex-col gap-2">
            {blueprints.map((b) => { const m = toMomentFlow(b); return <li key={m.id}><MomentFlowCard m={m} creator={{ user_id: creator.user_id, handle: creator.handle, display_name: creator.display_name, is_verified: creator.is_verified }} href={`/b/${m.id}`} /></li>; })}
          </ul>
        ) : <p className="rounded-[14px] bg-soi-sidebar p-4 text-sm text-soi-muted">Pronto publicará sus primeros Moments.</p>}
      </section>
    </PublicShell>
  );
}
