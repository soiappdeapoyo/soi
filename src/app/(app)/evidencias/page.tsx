import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { Download, Plus } from 'lucide-react';
import { getSessionUser } from '@/lib/supabase/server';
import { getAccessMap } from '@/lib/billing/check-access';
import { LockedFeature } from '@/components/paywall/locked-feature';
import { MilestoneCelebration } from '@/components/evidence/milestone-celebration';
import { buttonClass } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ESLABON_LABEL, type Eslabon } from '@/config/agents';
import { EVIDENCE_MILESTONES } from '@/config/navigation';
import { cn } from '@/lib/utils';
import { MomentumCard, EvolutionChain } from '@/components/momentum/momentum-card';
import { loadMomentum } from '@/lib/momentum-server';
import { loadEvolution } from '@/lib/social/evolution';

export const metadata: Metadata = { title: 'Muro de Evidencias' };

const FILTERS: (Eslabon | 'todas')[] = ['todas', 'pensamiento', 'emocion', 'accion', 'resultado'];

export default async function EvidenciasPage({ searchParams }: { searchParams: Promise<{ eslabon?: string; hito?: string }> }) {
  const { eslabon, hito } = await searchParams;
  const { supabase, user } = await getSessionUser();
  if (!user) redirect('/login');
  const { access, profile } = await getAccessMap(user.id);

  if (!access.evidence_save) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-8">
        <h1 className="mb-4 text-3xl font-semibold">Muro de Evidencias</h1>
        <LockedFeature
          title="Tu Muro de Evidencias"
          description="Registra cada señal y logro. Las evidencias son el eslabón de Resultados: la prueba de tu nueva identidad."
          preview={<ul className="space-y-2 p-4 text-left">{['Terminé mi primera semana', 'Hablé con calma en la reunión', 'Ahorré el 10%'].map((t) => <li key={t} className="rounded-[14px] bg-black/5 p-3">⭐ {t}</li>)}</ul>}
        />
      </div>
    );
  }

  let q = supabase.from('agent_knowledge').select('id, title, content, tags, metadata, created_at')
    .eq('user_id', user.id).eq('category', 'evidencia').order('created_at', { ascending: false }).limit(200);
  if (eslabon && eslabon !== 'todas') q = q.eq('metadata->>eslabon_soi', eslabon);
  const [{ data: rows }, { count }, momentum, evolution] = await Promise.all([
    q,
    supabase.from('agent_knowledge').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('category', 'evidencia'),
    loadMomentum(supabase, user.id, profile?.streak_current ?? 0),
    loadEvolution(supabase, user.id),
  ]);

  const total = count ?? 0;
  const nextMilestone = EVIDENCE_MILESTONES.find((m) => m > total);
  const hitoNum = Number(hito);

  return (
    <div className="mx-auto max-w-2xl px-5 py-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Muro de Evidencias</h1>
          <p className="text-soi-muted">{total} evidencias{nextMilestone ? ` · próximo hito: ${nextMilestone}` : ''}</p>
        </div>
        <div className="flex gap-2">
          {access.pdf_export && (
            <a href="/api/evidence/pdf" className={buttonClass('outline', 'sm')}><Download className="h-4 w-4" aria-hidden="true" /> PDF</a>
          )}
          <Link href="/evidencias/nueva" className={buttonClass('gold', 'sm')}><Plus className="h-4 w-4" aria-hidden="true" /> Nueva</Link>
        </div>
      </header>

      {EVIDENCE_MILESTONES.includes(hitoNum as 10 | 50 | 100) && <div className="mt-4"><MilestoneCelebration milestone={hitoNum} /></div>}

      <div className="mt-5 flex flex-col gap-3">
        <MomentumCard m={momentum} />
        <EvolutionChain steps={evolution} />
      </div>

      <nav aria-label="Filtrar por eslabón" className="mt-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = (eslabon ?? 'todas') === f;
          return (
            <Link key={f} href={f === 'todas' ? '/evidencias' : `/evidencias?eslabon=${f}`} aria-current={active ? 'page' : undefined}
              className={cn('press tap-target inline-flex h-9 items-center rounded-lg px-3 text-sm', active ? 'bg-soi-ink text-white' : 'bg-white shadow-ring hover:shadow-soft')}>
              {f === 'todas' ? 'Todas' : ESLABON_LABEL[f]}
            </Link>
          );
        })}
      </nav>

      {rows?.length ? (
        <ol className="relative mt-6 space-y-4 border-l-2 border-black/[0.08] pl-5">
          {rows.map((r) => {
            const e = (r.metadata as { eslabon_soi?: Eslabon })?.eslabon_soi;
            return (
              <li key={r.id} className="relative rounded-[20px] bg-white shadow-soft p-4">
                <span className="absolute -left-[29px] top-5 h-4 w-4 rounded-full bg-soi-accent shadow-[0_0_0_3px_white]" aria-hidden="true" />
                <div className="flex flex-wrap items-center gap-2 text-xs text-soi-muted">
                  <time dateTime={r.created_at as string}>{new Date(r.created_at as string).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}</time>
                  {e && <Badge>{ESLABON_LABEL[e]}</Badge>}
                  {(r.tags as string[] | null)?.map((t) => <Badge key={t} className="bg-soi-gold/15">#{t}</Badge>)}
                </div>
                <h2 className="mt-1 font-semibold">{r.title as string}</h2>
                <p className="mt-1 whitespace-pre-wrap text-sm text-soi-ink/90">{r.content as string}</p>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="mt-10 text-center text-soi-muted">Tu primera evidencia está a una acción de distancia. ✨</p>
      )}
    </div>
  );
}
