import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { ExternalLink, Plus } from 'lucide-react';
import { getSessionUser } from '@/lib/supabase/server';
import { getProfile } from '@/lib/billing/check-access';
import { buttonClass } from '@/components/ui/button';
import { CreatorForm } from '@/components/social/creator-form';
import { BlueprintCard } from '@/components/social/blueprint-card';
import { BLUEPRINT_FIELDS } from '@/lib/social/queries';
import { formatPrice, transformationScore, type CreatorStats } from '@/config/creators';
import type { CreatorProfile, SoiBlueprint } from '@/types/database';

export const metadata: Metadata = { title: 'Estudio de creador' };

/**
 * Transformation Creators: convierten su conocimiento en sistemas que otros implementan.
 * La reputación se mide en vidas transformadas (Transformation Score), no en seguidores.
 */
export default async function CreadoresPage() {
  const { supabase, user } = await getSessionUser();
  if (!user) redirect('/login');
  const [{ data: creator }, profile] = await Promise.all([
    supabase.from('creator_profiles').select('*').eq('user_id', user.id).maybeSingle(),
    getProfile(user.id),
  ]);

  if (!creator) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-8">
        <h1 className="text-3xl font-semibold tracking-tight">Estudio de creador</h1>
        <p className="mb-5 mt-1 text-soi-muted">
          Convierte tu conocimiento en Blueprints que otras personas implementan, con seguimiento de la IA aplicando tu método a su vida.
          Publica gratis para generar confianza o cobra por sistemas completos.
        </p>
        <CreatorForm initial={null} suggestedName={profile?.display_name ?? ''} />
      </div>
    );
  }

  const c = creator as CreatorProfile;
  const [{ data: blueprints }, { data: statsRows }, { data: purchases }] = await Promise.all([
    supabase.from('soi_blueprints').select(BLUEPRINT_FIELDS).eq('creator_id', user.id).order('created_at', { ascending: false }),
    supabase.rpc('creator_stats', { p_creator: user.id }),
    supabase.from('blueprint_purchases').select('creator_share_cents, payout_status, currency').eq('creator_id', user.id),
  ]);
  const raw = (Array.isArray(statsRows) ? statsRows[0] : statsRows) as Record<keyof CreatorStats, number | string> | null;
  const stats: CreatorStats = {
    implementations: Number(raw?.implementations ?? 0), completions: Number(raw?.completions ?? 0),
    active_last_14d: Number(raw?.active_last_14d ?? 0), results_reported: Number(raw?.results_reported ?? 0),
  };
  const earned = (purchases ?? []).reduce((a, p) => a + (p.creator_share_cents as number), 0);
  const pending = (purchases ?? []).filter((p) => p.payout_status === 'pending').reduce((a, p) => a + (p.creator_share_cents as number), 0);
  const completion = stats.implementations ? Math.round((stats.completions / stats.implementations) * 100) : 0;

  const tiles = [
    { k: 'Transformation Score', v: String(transformationScore(stats)) },
    { k: 'Implementaciones', v: String(stats.implementations) },
    { k: 'Completitud', v: `${completion}%` },
    { k: 'Activas (14 días)', v: String(stats.active_last_14d) },
  ];

  return (
    <div className="mx-auto max-w-2xl px-5 py-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Estudio de creador</h1>
          <p className="text-soi-muted">{c.display_name} · @{c.handle}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/c/${c.handle}`} className={buttonClass('outline', 'sm')}><ExternalLink className="h-4 w-4" aria-hidden="true" /> Perfil público</Link>
          <Link href="/creadores/blueprint" className={buttonClass('primary', 'sm')}><Plus className="h-4 w-4" aria-hidden="true" /> Blueprint</Link>
        </div>
      </header>

      <dl className="nums mt-5 grid grid-cols-2 gap-1.5 rounded-[14px] bg-soi-sidebar p-1.5 sm:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.k} className="rounded-lg bg-white px-3 py-2.5 shadow-ring">
            <dt className="text-xs text-soi-muted">{t.k}</dt>
            <dd className="text-xl font-medium">{t.v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-xs text-soi-muted">El Transformation Score combina alcance, completitud, retención y resultados reportados. No cuenta seguidores.</p>

      <section className="mt-6 rounded-[20px] bg-white p-4 shadow-ring" aria-labelledby="earn">
        <h2 id="earn" className="text-sm text-soi-muted">Ganancias</h2>
        <p className="nums mt-1 text-2xl font-medium">{formatPrice(earned)}</p>
        <p className="nums text-sm text-soi-muted">{formatPrice(pending)} pendiente de pago · {purchases?.length ?? 0} {purchases?.length === 1 ? 'venta' : 'ventas'}</p>
      </section>

      <section className="mt-6" aria-labelledby="mine">
        <h2 id="mine" className="mb-2 text-sm font-medium text-soi-muted">Tus Blueprints</h2>
        {blueprints?.length ? (
          <ul className="flex flex-col gap-2">
            {(blueprints as SoiBlueprint[]).map((b) => (
              <li key={b.id}><BlueprintCard bp={b} /></li>
            ))}
          </ul>
        ) : (
          <p className="rounded-[14px] bg-soi-sidebar p-4 text-sm text-soi-muted">Empieza por un momento que te transformó y conviértelo en un sistema que otros puedan implementar.</p>
        )}
      </section>

      <details className="mt-8">
        <summary className="press w-fit rounded-lg px-1 text-sm font-medium text-soi-muted hover:text-soi-ink">Editar perfil y método</summary>
        <div className="mt-3"><CreatorForm initial={c} suggestedName={c.display_name} /></div>
      </details>
    </div>
  );
}
