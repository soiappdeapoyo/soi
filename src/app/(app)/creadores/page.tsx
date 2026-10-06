import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { Check, Plus, UserRound } from 'lucide-react';
import { getSessionUser } from '@/lib/supabase/server';
import { getProfile } from '@/lib/billing/check-access';
import { buttonClass } from '@/components/ui/button';
import { CreatorForm } from '@/components/social/creator-form';
import { MomentGrid } from '@/components/creators/moment-grid';
import { HighlightsEditor } from '@/components/creators/highlights-editor';
import { MOMENT_FIELDS, toMomentFlow } from '@/lib/moments/types';
import { parseHighlights } from '@/lib/creators/profile';
import { CREATOR_REVENUE_SHARE, formatPrice, transformationScore, type CreatorStats } from '@/config/creators';
import type { CreatorProfile } from '@/types/database';

export const metadata: Metadata = { title: 'Panel profesional' };

const PROMISES = [
  'Tu perfil se vuelve tu escaparate: categoría, destacados y la cuadrícula de tus Moments.',
  'Tu contenido es 100% tuyo: tus textos, imágenes, links de video, PDF y audios. SOI no genera nada con IA en tu cuenta.',
  `Publica gratis para generar confianza o cobra por tus Moments: el ${Math.round(CREATOR_REVENUE_SHARE * 100)} % es para ti.`,
  'La IA solo acompaña a quien vive tus Moments, con tu método y tus límites. Nunca cambia lo que creaste.',
];

/**
 * Cuenta de creador. Sin cuenta: qué significa y cómo activarla. Con cuenta: el panel profesional
 * (como el de Instagram): impacto, ganancias, destacados, tus Moments y tu método.
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
        <h1 className="text-3xl font-semibold tracking-tight">Activa tu cuenta de creador</h1>
        <p className="mt-1 text-soi-muted">Comparte tu conocimiento como Moments que otras personas viven en su día.</p>
        <ul className="mb-6 mt-4 flex flex-col gap-2">
          {PROMISES.map((p) => <li key={p} className="flex gap-2 text-[15px]"><Check className="mt-0.5 h-4 w-4 shrink-0 text-soi-accent" aria-hidden="true" />{p}</li>)}
        </ul>
        <CreatorForm initial={null} suggestedName={profile?.display_name ?? ''} />
      </div>
    );
  }

  const c = creator as CreatorProfile;
  const [{ data: rows }, { data: statsRows }, { data: purchases }] = await Promise.all([
    supabase.from('soi_blueprints').select(MOMENT_FIELDS).eq('creator_id', user.id).neq('status', 'archived').order('created_at', { ascending: false }).limit(60),
    supabase.rpc('creator_stats', { p_creator: user.id }),
    supabase.from('blueprint_purchases').select('creator_share_cents, payout_status, currency').eq('creator_id', user.id),
  ]);
  const all = (rows ?? []).map(toMomentFlow);
  const published = all.filter((m) => m.status === 'published');
  const drafts = all.filter((m) => m.status !== 'published');
  const raw = (Array.isArray(statsRows) ? statsRows[0] : statsRows) as Record<keyof CreatorStats, number | string> | null;
  const stats: CreatorStats = {
    implementations: Number(raw?.implementations ?? 0), completions: Number(raw?.completions ?? 0),
    active_last_14d: Number(raw?.active_last_14d ?? 0), results_reported: Number(raw?.results_reported ?? 0),
  };
  const earned = (purchases ?? []).reduce((a, p) => a + (p.creator_share_cents as number), 0);
  const pending = (purchases ?? []).filter((p) => p.payout_status === 'pending').reduce((a, p) => a + (p.creator_share_cents as number), 0);
  const completion = stats.implementations ? Math.round((stats.completions / stats.implementations) * 100) : 0;
  const lived = published.reduce((a, m) => a + m.executions_count, 0);

  const tiles = [
    { k: 'Veces vividos', v: String(lived) },
    { k: 'Personas', v: String(stats.implementations) },
    { k: 'Completitud', v: `${completion}%` },
    { k: 'Transformation Score', v: String(transformationScore(stats)) },
  ];

  return (
    <div className="mx-auto max-w-2xl px-5 py-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Panel profesional</h1>
          <p className="text-soi-muted">@{c.handle}{c.category ? ` · ${c.category}` : ''}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/yo" className={buttonClass('outline', 'sm')}><UserRound className="h-4 w-4" aria-hidden="true" /> Ver perfil</Link>
          <Link href="/m/nuevo" className={buttonClass('primary', 'sm')}><Plus className="h-4 w-4" aria-hidden="true" /> Moment</Link>
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

      <section className="mt-8" aria-labelledby="hl">
        <h2 id="hl" className="text-sm font-medium">Destacados</h2>
        <p className="mb-3 text-sm text-soi-muted">Agrupa tus Moments por tema. Aparecen como círculos bajo tu bio.</p>
        <HighlightsEditor initial={parseHighlights(c.highlights)} moments={published.map((m) => ({ id: m.id, title: m.title, cover: m.cover }))} />
      </section>

      <section className="mt-8" aria-labelledby="pub">
        <h2 id="pub" className="mb-3 text-sm font-medium">Publicados <span className="nums text-soi-muted">· {published.length}</span></h2>
        <MomentGrid moments={published} empty={<p className="rounded-[14px] bg-soi-sidebar p-4 text-sm text-soi-muted">Diseña tu primer Moment con tu propio material: textos, imágenes, links de video, PDF y audios.</p>} />
      </section>

      {drafts.length > 0 && (
        <section className="mt-8" aria-labelledby="drafts">
          <h2 id="drafts" className="mb-3 text-sm font-medium">Borradores y privados <span className="nums text-soi-muted">· {drafts.length}</span></h2>
          <MomentGrid moments={drafts} />
        </section>
      )}

      <details className="mt-8">
        <summary className="press w-fit rounded-lg px-1 text-sm font-medium text-soi-muted hover:text-soi-ink">Categoría y método</summary>
        <div className="mt-3"><CreatorForm initial={c} suggestedName={profile?.display_name ?? c.display_name} /></div>
      </details>
    </div>
  );
}
