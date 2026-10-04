import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { Plus } from 'lucide-react';
import { getSessionUser } from '@/lib/supabase/server';
import { getAccessMap } from '@/lib/billing/check-access';
import { buttonClass } from '@/components/ui/button';
import { MomentFlowCard } from '@/components/moments/moment-flow-card';
import { Empty } from '@/components/social/feed-sections';
import { creatorsById, type CreatorLite } from '@/lib/social/queries';
import { MOMENT_FIELDS, toMomentFlow, type MomentFlow } from '@/lib/moments/types';
import { recommendMoment, officialCounts, withOfficialCounts } from '@/lib/moments/server';
import { loadToday } from '@/lib/today';
import { OFFICIAL_MOMENTS } from '@/config/official-moments';
import { MOMENT_KINDS, MomentKindSchema, type MomentKind } from '@/config/actions';
import { MODE_KINDS } from '@/lib/moments/recommend';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Explorar Moments' };


/**
 * Explorar (Impulso): descubrir Moments — secuencias de acciones que producen resultados.
 * Hoy recomendado (según tu estado) · Tendencia (ejecuciones de la semana) · Nuevos. Filtro por tipo.
 * Paginado con "Ver más": sin scroll infinito ni métricas de vanidad.
 */
export default async function ExplorarPage({ searchParams }: { searchParams: Promise<{ tipo?: string; antes?: string }> }) {
  const sp = await searchParams;
  const tipo = MomentKindSchema.safeParse(sp.tipo).success ? (sp.tipo as MomentKind) : null;
  const { supabase, user } = await getSessionUser();
  if (!user) redirect('/login');

  return (
    <div className="mx-auto max-w-2xl px-5 py-6 md:py-8">
      <header className="flex items-end justify-between gap-3">
        <div>
          <Link href="/impulso" className="text-sm text-soi-muted hover:text-soi-ink">← Impulso</Link>
          <h1 className="text-3xl font-semibold tracking-tight">Explorar Moments</h1>
          <p className="text-soi-muted">Ejecútalos, guárdalos y hazlos tuyos.</p>
        </div>
        <Link href="/m/nuevo" className={buttonClass('primary', 'sm')}><Plus className="h-4 w-4" aria-hidden="true" /> Crear</Link>
      </header>

      <nav aria-label="Tipo de Moment" className="-mx-5 mt-5 flex gap-1.5 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
        <KindChip href="/impulso/explorar" active={!tipo} label="Para ti" />
        {(Object.keys(MOMENT_KINDS) as MomentKind[]).map((k) => (
          <KindChip key={k} href={`/impulso/explorar?tipo=${k}`} active={tipo === k} label={MOMENT_KINDS[k].label} />
        ))}
      </nav>

      <div className="mt-5">
        {tipo ? <ByKind supabase={supabase} kind={tipo} before={sp.antes} /> : <ParaTi supabase={supabase} userId={user.id} />}
      </div>
    </div>
  );
}

function KindChip({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link href={href} aria-current={active ? 'page' : undefined}
      className={cn('press flex h-9 shrink-0 items-center rounded-lg px-3 text-sm', active ? 'bg-soi-ink text-white' : 'bg-white text-soi-ink shadow-ring hover:shadow-soft')}>
      {label}
    </Link>
  );
}

type Sb = Awaited<ReturnType<typeof getSessionUser>>['supabase'];

function Section({ title, hint, items, creators, badge }: { title: string; hint?: string; items: MomentFlow[]; creators: Map<string, CreatorLite>; badge?: string }) {
  if (!items.length) return null;
  return (
    <section className="mb-8" aria-label={title}>
      <h2 className="text-sm font-medium text-soi-muted">{title}</h2>
      {hint && <p className="mb-2 text-xs text-soi-subtle">{hint}</p>}
      <ul className="mt-2 flex flex-col gap-3">
        {items.map((m) => <li key={m.id}><MomentFlowCard m={m} creator={m.creator_id ? creators.get(m.creator_id) : undefined} badge={badge} /></li>)}
      </ul>
    </section>
  );
}

async function ParaTi({ supabase, userId }: { supabase: Sb; userId: string }) {
  const { profile, access } = await getAccessMap(userId);
  const { decision } = await loadToday(supabase, userId, profile, access.daily_ritual);
  const kinds = MODE_KINDS[decision.mode];

  const [recommended, { data: trendingRows }, { data: fresh }, { data: forKinds }] = await Promise.all([
    recommendMoment(supabase, userId, kinds),
    supabase.rpc('trending_blueprints', { p_days: 7, p_limit: 5 }),
    supabase.from('soi_blueprints').select(MOMENT_FIELDS).eq('status', 'published').order('created_at', { ascending: false }).limit(5),
    supabase.from('soi_blueprints').select(MOMENT_FIELDS).eq('status', 'published').in('kind', kinds).order('executions_count', { ascending: false }).limit(3),
  ]);
  const trendingIds = ((trendingRows ?? []) as { blueprint_id: string; recent_implementations: number }[]).filter((r) => Number(r.recent_implementations) > 0).map((r) => r.blueprint_id);
  const { data: trendingData } = trendingIds.length
    ? await supabase.from('soi_blueprints').select(MOMENT_FIELDS).in('id', trendingIds)
    : { data: [] as Record<string, unknown>[] };
  const byId = new Map((trendingData ?? []).map((r) => [r.id as string, toMomentFlow(r)]));
  const trending = trendingIds.map((id) => byId.get(id)).filter(Boolean) as MomentFlow[];

  const recs: MomentFlow[] = [];
  const add = (m: MomentFlow | null | undefined) => { if (m && !recs.some((x) => x.id === m.id)) recs.push(m); };
  add(recommended);
  (forKinds ?? []).map(toMomentFlow).forEach(add);
  OFFICIAL_MOMENTS.filter((m) => kinds.includes(m.kind)).forEach(add);

  const seen = new Set([...recs, ...trending].map((m) => m.id));
  const nuevos = (fresh ?? []).map(toMomentFlow).filter((m) => !seen.has(m.id));
  const counts = await officialCounts(supabase);
  const recsC = withOfficialCounts(recs, counts);
  const all = [...recsC, ...trending, ...nuevos];
  const creators = await creatorsById(supabase, all.map((m) => m.creator_id).filter(Boolean) as string[]);

  if (!all.length) return <Empty text="Aún no hay Moments publicados. Crea el primero o empieza con uno oficial." />;
  return (
    <>
      <Section title="Hoy recomendado" hint={decision.headline} items={recsC.slice(0, 3)} creators={creators} />
      <Section title="Tendencia" hint="Los que más personas ejecutaron esta semana." items={trending} creators={creators} badge="Tendencia" />
      <Section title="Nuevos" items={nuevos} creators={creators} badge="Nuevo" />
    </>
  );
}

async function ByKind({ supabase, kind, before }: { supabase: Sb; kind: MomentKind; before?: string }) {
  let q = supabase.from('soi_blueprints').select(MOMENT_FIELDS).eq('status', 'published').eq('kind', kind)
    .order('created_at', { ascending: false }).limit(12);
  if (before) q = q.lt('created_at', before);
  const { data } = await q;
  const published = (data ?? []).map(toMomentFlow);
  const official = before ? [] : withOfficialCounts(OFFICIAL_MOMENTS.filter((m) => m.kind === kind), await officialCounts(supabase));
  const items = [...official, ...published];
  const creators = await creatorsById(supabase, published.map((m) => m.creator_id).filter(Boolean) as string[]);
  if (!items.length) return <Empty text={`Todavía no hay Moments de ${MOMENT_KINDS[kind].label.toLowerCase()}. ¿Creas el primero?`} />;
  const last = published.at(-1);
  return (
    <>
      <p className="mb-3 text-sm text-soi-muted">{MOMENT_KINDS[kind].hint}</p>
      <ul className="flex flex-col gap-3">
        {items.map((m) => <li key={m.id}><MomentFlowCard m={m} creator={m.creator_id ? creators.get(m.creator_id) : undefined} /></li>)}
      </ul>
      {published.length === 12 && last && (
        <div className="mt-5 text-center">
          <Link href={`/impulso/explorar?tipo=${kind}&antes=${encodeURIComponent(last.created_at)}`} className={buttonClass('outline', 'sm')}>Ver más</Link>
        </div>
      )}
    </>
  );
}
