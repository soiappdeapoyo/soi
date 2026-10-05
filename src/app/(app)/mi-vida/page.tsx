import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowRight, BookOpen, Dumbbell, FileText, Link2, Plus } from 'lucide-react';
import { getSessionUser } from '@/lib/supabase/server';
import { getProfile } from '@/lib/billing/check-access';
import { loadLifeGraph, type LifeNode } from '@/lib/life-graph';
import { loadMyMoments, filterMyMoments, MY_FILTERS, type MyMomentsFilter } from '@/lib/moments/mine';
import { IdeasSection } from '@/components/social/feed-sections';
import { ProfileTabs, type ProfileTab } from '@/components/profile/profile-tabs';
import { MomentFlowCard } from '@/components/moments/moment-flow-card';
import { MyMomentsGrid } from '@/components/moments/my-moments-grid';
import { summarizeRuns, type Progress, type RunRow } from '@/lib/rewards';
import type { MomentFlow } from '@/lib/moments/types';
import { Flame, TrendingUp } from 'lucide-react';
import { BookSearch } from '@/components/library/book-search';
import { PdfUpload } from '@/components/library/pdf-upload';
import { ExerciseAnimation } from '@/components/library/exercise-animation';
import { buttonClass } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Mi Vida' };

const TABS: ProfileTab[] = [
  { id: 'moments', label: 'Moments' },
  { id: 'biblioteca', label: 'Biblioteca' },
  { id: 'ideas', label: 'Ideas' },
  { id: 'sistema', label: 'Mi sistema' },
];

/**
 * Mi Vida: todo lo que guardaste, para volver con facilidad.
 * Moments (continúa + colección con portada) · Biblioteca (libros, PDFs, ejercicios) · Ideas · Mi sistema.
 */
export default async function MiVidaPage({ searchParams }: { searchParams: Promise<{ tab?: string; filtro?: string; ordenar?: string }> }) {
  const { tab: t, filtro, ordenar } = await searchParams;
  const tab = TABS.some((x) => x.id === t) ? t! : 'moments';
  const { supabase, user } = await getSessionUser();
  if (!user) redirect('/login');

  return (
    <div className="mx-auto max-w-2xl px-4 pb-8 pt-6 sm:px-5 md:pt-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Mi Vida</h1>
        <p className="text-soi-muted">Todo lo que guardaste, a un toque de distancia.</p>
      </header>
      <ProfileTabs tabs={TABS} active={tab} base="/mi-vida" />
      <div className="pt-5">
        {tab === 'moments' && <MomentsTab supabase={supabase} userId={user.id} filter={(MY_FILTERS.some((f) => f.id === filtro) ? filtro : 'todos') as MyMomentsFilter} tidy={ordenar === '1'} />}
        {tab === 'biblioteca' && <LibraryTab supabase={supabase} userId={user.id} />}
        {tab === 'ideas' && <IdeasSection supabase={supabase} userId={user.id} />}
        {tab === 'sistema' && <SystemTab supabase={supabase} userId={user.id} />}
      </div>
    </div>
  );
}

type Sb = Awaited<ReturnType<typeof getSessionUser>>['supabase'];

async function MomentsTab({ supabase, userId, filter, tidy }: { supabase: Sb; userId: string; filter: MyMomentsFilter; tidy: boolean }) {
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const [data, { data: legacy }, { data: runs }, profile] = await Promise.all([
    loadMyMoments(supabase, userId),
    supabase.from('blueprint_implementations').select('id, status, completed_steps, adapted_steps, blueprint:soi_blueprints(title)')
      .eq('user_id', userId).order('last_activity_at', { ascending: false }).limit(5),
    supabase.from('moment_runs').select('moment_id, moment_slug, started_at, completed_at, mood_before, mood_after, helped')
      .eq('user_id', userId).gte('started_at', since).order('started_at', { ascending: false }).limit(200),
    getProfile(userId),
  ]);
  const list = filterMyMoments(data, filter);
  const progress = summarizeRuns((runs ?? []) as RunRow[], profile?.streak_current ?? 0);

  // Moments propios que llevan 3+ semanas sin vivirse (y existen hace más de una semana).
  const recent = new Set((runs ?? []).filter((r) => Date.now() - Date.parse(r.started_at as string) < 21 * 86_400_000).map((r) => r.moment_id as string | null).filter(Boolean));
  const ownIds = new Set([...data.mine, ...data.saved].map((m) => m.id));
  const isStale = (m: MomentFlow) => ownIds.has(m.id) && !recent.has(m.id) && Date.now() - Date.parse(m.created_at) > 7 * 86_400_000;
  const stale = [...data.mine, ...data.saved].filter(isStale);
  const tooMany = (ownIds.size >= 6 && stale.length >= 4) || stale.length >= 8;
  const quickPick = [...stale].sort((a, b) => a.required_minutes - b.required_minutes)[0];
  const week = weekDots((runs ?? []) as RunRow[]);
  const older = (legacy ?? []) as unknown as { id: string; status: string; completed_steps: number[]; adapted_steps: unknown[]; blueprint: { title: string } | null }[];

  return (
    <div className="flex flex-col gap-7">
      <WeekCard progress={progress} week={week} />

      {tooMany && quickPick && (
        <section aria-label="Aviso" className="rounded-[20px] bg-soi-gold/15 p-4 shadow-[inset_0_0_0_1px_rgb(212_175_55/0.35)]">
          <p className="font-medium">Tienes {ownIds.size} Moments y {stale.length} llevan 3 semanas sin vivirse.</p>
          <p className="mt-1 text-sm text-soi-muted">No necesitas más Moments: necesitas vivir uno. El que empiezas hoy vale más que diez guardados.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href={`/m/${quickPick.id}/play`} className={buttonClass('primary', 'sm')}>Elige uno por mí · {quickPick.required_minutes} min</Link>
            <Link href="/mi-vida?ordenar=1" scroll={false} className={buttonClass('outline', 'sm')}>Ordenar mi colección</Link>
          </div>
        </section>
      )}

      {data.continue.length > 0 && (
        <section aria-labelledby="cont">
          <h2 id="cont" className="mb-2 text-sm font-medium text-soi-muted">Continúa donde quedaste</h2>
          <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:-mx-5 sm:px-5 [&::-webkit-scrollbar]:hidden">
            {data.continue.map(({ moment: m, label }) => (
              <li key={m.id} className="w-36 shrink-0 snap-start">
                <MomentFlowCard m={m} variant="tile" href={`/m/${m.id}`} />
                <p className="mt-0.5 text-xs font-medium text-soi-accent">{label}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="col">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 id="col" className="text-sm font-medium text-soi-muted">Mis Moments</h2>
          <Link href="/m/nuevo" className={buttonClass('outline', 'sm')}><Plus className="h-4 w-4" aria-hidden="true" /> Crear</Link>
        </div>
        <nav aria-label="Filtrar Moments" className="-mx-4 mb-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] sm:-mx-5 sm:px-5 [&::-webkit-scrollbar]:hidden">
          {MY_FILTERS.map((f) => (
            <Link key={f.id} href={f.id === 'todos' ? '/mi-vida' : `/mi-vida?filtro=${f.id}`} scroll={false} aria-current={filter === f.id ? 'page' : undefined}
              className={cn('press h-8 shrink-0 rounded-full px-3.5 text-sm leading-8', filter === f.id ? 'bg-soi-ink text-white' : 'bg-soi-sidebar text-soi-ink shadow-ring')}>
              {f.label}
            </Link>
          ))}
        </nav>
        {list.length ? (
          <MyMomentsGrid key={tidy ? 'tidy' : filter} startSelecting={tidy}
            items={list.map((m) => ({ moment: m, deletable: ownIds.has(m.id), stale: isStale(m) }))} />
        ) : (
          <p className="rounded-[14px] bg-soi-sidebar p-4 text-sm text-soi-muted">
            {filter === 'guardados' ? 'Cuando guardes tu versión de un Moment de Impulso, aparecerá aquí.'
              : filter === 'comprados' ? 'Aún no has comprado Moments.'
              : filter === 'retos' ? 'Únete a un reto en Impulso y síguelo día a día desde aquí.'
              : <>Crea uno en el <Link href="/m/nuevo" className="text-soi-accent underline underline-offset-4">constructor</Link>, pídeselo a SOI o guarda tu versión de uno de <Link href="/impulso" className="text-soi-accent underline underline-offset-4">Impulso</Link>.</>}
          </p>
        )}
      </section>

      {older.length > 0 && filter === 'todos' && (
        <section aria-labelledby="old">
          <h2 id="old" className="mb-2 text-sm font-medium text-soi-muted">Sistemas anteriores</h2>
          <ul className="flex flex-col gap-1.5">
            {older.map((i) => (
              <li key={i.id}>
                <Link href={`/implementaciones/${i.id}`} className="press flex items-center justify-between gap-3 rounded-[14px] bg-white p-3 shadow-ring">
                  <span className="truncate text-sm">{i.blueprint?.title ?? 'Moment'}</span>
                  <span className="nums shrink-0 text-xs text-soi-muted">{i.status === 'completed' ? 'Completado' : `${i.completed_steps.length} de ${i.adapted_steps.length}`}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

type LibraryRow = { id: string; kind: 'book' | 'pdf' | 'exercise'; title: string; author: string | null; cover_url: string | null; status: string; external_id: string | null; file_size: number | null; metadata: { frames?: string[]; muscles?: string[] } };
const READ_STATUS: Record<string, string> = { want: 'Quiero leer', reading: 'Leyendo', done: 'Leído', saved: '' };

async function LibraryTab({ supabase, userId }: { supabase: Sb; userId: string }) {
  const { data } = await supabase.from('library_items').select('id, kind, title, author, cover_url, status, external_id, file_size, metadata')
    .eq('user_id', userId).order('updated_at', { ascending: false }).limit(200);
  const rows = (data ?? []) as LibraryRow[];
  const order = { reading: 0, want: 1, done: 2, saved: 3 } as Record<string, number>;
  const books = rows.filter((r) => r.kind === 'book').sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9));
  const pdfs = rows.filter((r) => r.kind === 'pdf');
  const exercises = rows.filter((r) => r.kind === 'exercise');

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="lib-books">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 id="lib-books" className="flex items-center gap-1.5 text-sm font-medium text-soi-muted"><BookOpen className="h-4 w-4" aria-hidden="true" /> Libros</h2>
          <BookSearch />
        </div>
        {books.length ? (
          <ul className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4">
            {books.map((b) => (
              <li key={b.id}>
                <Link href={`/mi-vida/libros/${b.id}`} className="press block">
                  {b.cover_url
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={b.cover_url} alt="" loading="lazy" className="aspect-[2/3] w-full rounded-[6px] bg-soi-tray object-cover shadow-ring" />
                    : <span className="flex aspect-[2/3] w-full items-center justify-center rounded-[6px] bg-soi-accent-soft p-2 text-center text-xs font-medium text-soi-accent">{b.title}</span>}
                  <p className="mt-1.5 line-clamp-2 text-sm font-medium leading-snug">{b.title}</p>
                  {READ_STATUS[b.status] && <p className="text-xs text-soi-muted">{READ_STATUS[b.status]}</p>}
                </Link>
              </li>
            ))}
          </ul>
        ) : <p className="rounded-[14px] bg-soi-sidebar p-4 text-sm text-soi-muted">Agrega los libros que te transforman: verás su portada, su resumen y una práctica para aplicarlos.</p>}
      </section>

      <section aria-labelledby="lib-pdf">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 id="lib-pdf" className="flex items-center gap-1.5 text-sm font-medium text-soi-muted"><FileText className="h-4 w-4" aria-hidden="true" /> Documentos</h2>
          <PdfUpload />
        </div>
        {pdfs.length ? (
          <ul className="flex flex-col gap-1.5">
            {pdfs.map((p) => (
              <li key={p.id}>
                <Link href={`/mi-vida/documentos/${p.id}`} className="press flex items-center gap-3 rounded-[14px] bg-white p-3 shadow-ring hover:shadow-soft">
                  <span className="flex h-10 w-8 shrink-0 items-center justify-center rounded-[4px] bg-soi-danger/10 text-[10px] font-semibold text-soi-danger">PDF</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px]">{p.title}</span>
                    {p.file_size && <span className="nums block text-xs text-soi-muted">{(p.file_size / 1_048_576).toFixed(1)} MB</span>}
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-soi-subtle" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        ) : <p className="rounded-[14px] bg-soi-sidebar p-4 text-sm text-soi-muted">Sube tus artículos o ebooks en PDF (hasta 30 MB). Solo tú puedes verlos.</p>}
      </section>

      <section aria-labelledby="lib-ex">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 id="lib-ex" className="flex items-center gap-1.5 text-sm font-medium text-soi-muted"><Dumbbell className="h-4 w-4" aria-hidden="true" /> Ejercicio</h2>
          <Link href="/mi-vida/ejercicios" className={buttonClass('outline', 'sm')}><Plus className="h-4 w-4" aria-hidden="true" /> Explorar</Link>
        </div>
        {exercises.length ? (
          <ul className="grid grid-cols-3 gap-3">
            {exercises.map((e) => (
              <li key={e.id}>
                <Link href={`/mi-vida/ejercicios/${e.external_id}`} className="press block">
                  <ExerciseAnimation frames={e.metadata.frames ?? []} name={e.title} className="aspect-square rounded-[14px] shadow-ring" />
                  <p className="mt-1.5 line-clamp-2 text-sm font-medium leading-snug">{e.title}</p>
                </Link>
              </li>
            ))}
          </ul>
        ) : <p className="rounded-[14px] bg-soi-sidebar p-4 text-sm text-soi-muted">Calistenia, gimnasio y estiramientos con su animación. Guarda los que haces para tenerlos a mano.</p>}
      </section>
    </div>
  );
}

async function SystemTab({ supabase, userId }: { supabase: Sb; userId: string }) {
  const profile = await getProfile(userId);
  const groups = await loadLifeGraph(supabase, userId, profile);
  return (
    <div className="flex flex-col gap-6">
      {groups.map((g) => (
        <section key={g.id} aria-labelledby={`${g.id}-t`}>
          <h2 id={`${g.id}-t`} className="mb-2 text-sm font-medium text-soi-muted">{g.label}</h2>
          {g.nodes.length ? (
            <ul className="flex flex-col gap-1.5 rounded-[20px] bg-soi-sidebar p-1.5">
              {g.nodes.map((n) => <li key={n.id}><Node n={n} /></li>)}
            </ul>
          ) : (
            <p className="rounded-[14px] bg-soi-sidebar p-4 text-sm text-soi-muted">{g.empty}</p>
          )}
        </section>
      ))}
    </div>
  );
}

function Node({ n }: { n: LifeNode }) {
  const body = (
    <>
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 block text-[15px]">{n.title}</span>
        {n.detail && <span className="block text-xs text-soi-muted">{n.detail}</span>}
      </span>
      {n.href && <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-soi-subtle" aria-hidden="true" />}
    </>
  );
  return (
    <div className="rounded-[14px] bg-white shadow-ring">
      {n.href
        ? <Link href={n.href} className="press flex items-start gap-3 p-3">{body}</Link>
        : <div className="flex items-start gap-3 p-3">{body}</div>}
      {n.links.length > 0 && (
        <p className="flex flex-wrap gap-1.5 px-3 pb-3">
          {n.links.map((l) => (
            <Link key={l.href} href={l.href} className="press inline-flex items-center gap-1 rounded-md bg-soi-accent-soft px-2 py-0.5 text-xs text-soi-accent">
              <Link2 className="h-3 w-3" aria-hidden="true" /> Conectado con {l.label}
            </Link>
          ))}
        </p>
      )}
    </div>
  );
}

/** Los últimos 7 días: cuáles tuvieron al menos un Moment completado (de más antiguo a hoy). */
function weekDots(runs: RunRow[]) {
  const days = new Set(runs.filter((r) => r.completed_at).map((r) => (r.completed_at as string).slice(0, 10)));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86_400_000);
    return { key: d.toISOString().slice(0, 10), label: d.toLocaleDateString('es', { weekday: 'narrow' }), done: days.has(d.toISOString().slice(0, 10)) };
  });
}

/**
 * Tu semana: la recompensa visible. Días con Moment, racha y cuánto te sube el ánimo.
 * Sin castigo: un día vacío no se marca en rojo, solo queda esperando.
 */
function WeekCard({ progress: p, week }: { progress: Progress; week: { key: string; label: string; done: boolean }[] }) {
  const active = week.filter((d) => d.done).length;
  const msg = active === 0
    ? 'Tu semana empieza con un solo Moment. Hoy puede ser el primero.'
    : p.weekRuns > p.prevWeekRuns
      ? `¡Vas mejor que la semana pasada! ${p.weekRuns} ${p.weekRuns === 1 ? 'Moment vivido' : 'Moments vividos'}.`
      : `${p.weekRuns} ${p.weekRuns === 1 ? 'Moment vivido' : 'Moments vividos'} esta semana. Cada uno cuenta.`;
  return (
    <section aria-label="Tu semana" className="rounded-[20px] bg-white p-4 shadow-ring">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[15px] font-medium">{msg}</p>
        {p.streak > 0 && <span className="nums inline-flex shrink-0 items-center gap-1 text-sm font-medium text-orange-600"><Flame className="h-4 w-4" aria-hidden="true" />{p.streak}</span>}
      </div>
      <ol className="mt-3 grid grid-cols-7 gap-1.5" aria-label={`${active} de 7 días con un Moment`}>
        {week.map((d, i) => (
          <li key={d.key} className="flex flex-col items-center gap-1">
            <span className={cn('flex h-8 w-8 items-center justify-center rounded-full text-xs', d.done ? 'bg-soi-accent-fill text-white' : i === 6 ? 'shadow-[inset_0_0_0_1.5px_var(--color-soi-accent-fill)] text-soi-accent' : 'bg-soi-sidebar text-soi-subtle')}>
              {d.done ? '✓' : ''}
            </span>
            <span className="text-[11px] uppercase text-soi-subtle">{d.label}</span>
          </li>
        ))}
      </ol>
      {(p.moodLift !== null && p.moodLift > 0) || (p.daysToMilestone !== null && p.streak > 0) ? (
        <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-soi-muted">
          {p.moodLift !== null && p.moodLift > 0 && <span className="inline-flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5 text-soi-accent" aria-hidden="true" />Tus Moments te están haciendo bien</span>}
          {p.daysToMilestone !== null && p.streak > 0 && <span className="nums">A {p.daysToMilestone} {p.daysToMilestone === 1 ? 'día' : 'días'} del hito de {p.nextMilestone} 🛡️</span>}
        </p>
      ) : null}
    </section>
  );
}
