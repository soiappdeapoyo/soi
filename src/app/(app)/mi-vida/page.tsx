import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowRight, BookOpen, Brain, Check, Dumbbell, FileText, Heart, Plus, Sparkles } from 'lucide-react';
import { GuidedCreate } from '@/components/library/guided-create';
import { GUIDED_LABEL, type GuidedKind } from '@/lib/guided';
import { getSessionUser } from '@/lib/supabase/server';
import { getProfile } from '@/lib/billing/check-access';
import { loadMyMoments, filterMyMoments, MY_FILTERS, type MyMomentsFilter } from '@/lib/moments/mine';
import { ProfileTabs, type ProfileTab } from '@/components/profile/profile-tabs';
import { MomentFlowCard } from '@/components/moments/moment-flow-card';
import { MyMomentsGrid } from '@/components/moments/my-moments-grid';
import { IdentitySetup } from '@/components/identity/identity-setup';
import { WeeklyStory } from '@/components/identity/weekly-story';
import { loadIdentityView } from '@/lib/identity/view';
import { intensityLabel, loadBattles } from '@/lib/battles';
import { ENEMIES } from '@/config/enemies';
import { DayPlanner } from '@/components/moments/day-planner';
import { loadDayPlan, refOf, suggestForPart } from '@/lib/day-plan';
import { OFFICIAL_MOMENTS } from '@/config/official-moments';
import { summarizeRuns, type Progress, type RunRow } from '@/lib/rewards';
import type { MomentFlow } from '@/lib/moments/types';
import { Flame, TrendingUp } from 'lucide-react';
import { BookSearch } from '@/components/library/book-search';
import { PdfUpload } from '@/components/library/pdf-upload';
import { ExerciseAnimation } from '@/components/library/exercise-animation';
import { buttonClass } from '@/components/ui/button';
import { cn, dateInTz } from '@/lib/utils';

export const metadata: Metadata = { title: 'Mi Vida' };

const TABS: ProfileTab[] = [
  { id: 'dia', label: 'Mi día' },
  { id: 'moments', label: 'Moments' },
  { id: 'nuevo-yo', label: 'Mi Nuevo Yo' },
  { id: 'batallas', label: 'Batallas' },
  { id: 'biblioteca', label: 'Biblioteca' },
];

/**
 * Mi Vida: todo lo que guardaste, para volver con facilidad.
 * Mi día · Moments (continúa + colección con portada) · Mi Nuevo Yo (identidad con evidencia) · Biblioteca.
 */
export default async function MiVidaPage({ searchParams }: { searchParams: Promise<{ tab?: string; filtro?: string; ordenar?: string }> }) {
  const { tab: t, filtro, ordenar } = await searchParams;
  // Sin pestaña: Mi día (o Moments si se llega con un filtro de la colección).
  const tab = TABS.some((x) => x.id === t) ? t! : filtro || ordenar ? 'moments' : 'dia';
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
        {tab === 'dia' && <DayTab supabase={supabase} userId={user.id} />}
        {tab === 'moments' && <MomentsTab supabase={supabase} userId={user.id} filter={(MY_FILTERS.some((f) => f.id === filtro) ? filtro : 'todos') as MyMomentsFilter} tidy={ordenar === '1'} />}
        {tab === 'biblioteca' && <LibraryTab supabase={supabase} userId={user.id} />}
        {tab === 'nuevo-yo' && <NewSelfTab supabase={supabase} userId={user.id} />}
        {tab === 'batallas' && <BattlesTab supabase={supabase} userId={user.id} />}
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
  const week = weekDots((runs ?? []) as RunRow[], profile?.timezone ?? 'America/Mexico_City');
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
            <Link href="/mi-vida?tab=moments&ordenar=1" scroll={false} className={buttonClass('outline', 'sm')}>Ordenar mi colección</Link>
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
            <Link key={f.id} href={f.id === 'todos' ? '/mi-vida?tab=moments' : `/mi-vida?tab=moments&filtro=${f.id}`} scroll={false} aria-current={filter === f.id ? 'page' : undefined}
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

type LibraryRow = { id: string; kind: 'book' | 'pdf' | 'exercise' | GuidedKind; title: string; author: string | null; cover_url: string | null; status: string; external_id: string | null; file_size: number | null; metadata: { frames?: string[]; muscles?: string[]; intention?: string } };
const READ_STATUS: Record<string, string> = { want: 'Quiero leer', reading: 'Leyendo', done: 'Leído', saved: '' };

async function LibraryTab({ supabase, userId }: { supabase: Sb; userId: string }) {
  const { data } = await supabase.from('library_items').select('id, kind, title, author, cover_url, status, external_id, file_size, metadata')
    .eq('user_id', userId).order('updated_at', { ascending: false }).limit(200);
  const rows = (data ?? []) as LibraryRow[];
  const order = { reading: 0, want: 1, done: 2, saved: 3 } as Record<string, number>;
  const books = rows.filter((r) => r.kind === 'book').sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9));
  const pdfs = rows.filter((r) => r.kind === 'pdf');
  const exercises = rows.filter((r) => r.kind === 'exercise');
  const guided = rows.filter((r) => r.kind === 'meditation' || r.kind === 'affirmations' || r.kind === 'manifestation');

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="lib-guided">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 id="lib-guided" className="flex items-center gap-1.5 text-sm font-medium text-soi-muted"><Sparkles className="h-4 w-4" aria-hidden="true" /> Meditaciones, afirmaciones y manifestaciones</h2>
          <GuidedCreate />
        </div>
        {guided.length ? (
          <ul className="flex flex-col gap-1.5">
            {guided.map((g) => (
              <li key={g.id}>
                <Link href={`/mi-vida/recursos/${g.id}`} className="press flex items-center gap-3 rounded-[14px] bg-white p-3 shadow-ring hover:shadow-soft">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-soi-accent-soft text-soi-accent">
                    {g.kind === 'meditation' ? <Brain className="h-5 w-5" aria-hidden="true" /> : g.kind === 'affirmations' ? <Heart className="h-5 w-5" aria-hidden="true" /> : <Sparkles className="h-5 w-5" aria-hidden="true" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px]">{g.title}</span>
                    <span className="block truncate text-xs text-soi-muted">{GUIDED_LABEL[g.kind as GuidedKind]}{g.metadata.intention ? ` · ${g.metadata.intention}` : ''}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-soi-subtle" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        ) : <p className="rounded-[14px] bg-soi-sidebar p-4 text-sm text-soi-muted">Pídele a SOI una meditación, afirmaciones o una manifestación escritas para ti. También se guardan aquí las que crea al diseñar tus Moments.</p>}
      </section>

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

/** Los últimos 7 días: cuáles tuvieron al menos un Moment completado (de más antiguo a hoy). */
function weekDots(runs: RunRow[], timeZone: string) {
  // Fechas en la zona horaria de la persona: el domingo en la noche sigue siendo domingo (no lunes en UTC).
  const days = new Set(runs.filter((r) => r.completed_at).map((r) => dateInTz(r.completed_at as string, timeZone)));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86_400_000);
    const key = dateInTz(d, timeZone);
    return { key, label: new Intl.DateTimeFormat('es', { weekday: 'narrow', timeZone }).format(d), done: days.has(key) };
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

async function DayTab({ supabase, userId }: { supabase: Sb; userId: string }) {
  const profile = await getProfile(userId);
  const tz = profile?.timezone ?? 'America/Mexico_City';
  const [plan, mine] = await Promise.all([loadDayPlan(supabase, userId, tz), loadMyMoments(supabase, userId)]);
  const inPlan = new Set(plan.items.map((i) => i.ref));
  const suggestions = await suggestForPart(supabase, userId, plan.part, inPlan);
  const seen = new Set<string>();
  const options = [...mine.mine, ...mine.saved, ...mine.bought, ...OFFICIAL_MOMENTS].filter((m) => {
    const r = refOf(m);
    if (seen.has(r)) return false;
    seen.add(r);
    return true;
  });
  return <DayPlanner initial={plan.items} options={options} suggestions={suggestions} />;
}

/**
 * Mi Nuevo Yo: no se acumulan Moments, se acumula EVIDENCIA DE IDENTIDAD.
 * Visión → Identidades (nivel) → Capacidades → La evidencia ("SOI ha observado que…") → Tu historia.
 */
async function NewSelfTab({ supabase, userId }: { supabase: Sb; userId: string }) {
  const profile = await getProfile(userId);
  const tz = profile?.timezone ?? 'America/Mexico_City';
  const v = await loadIdentityView(supabase, userId, profile, tz);
  const fmt = (iso: string) => new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric', timeZone: tz }).format(new Date(iso));
  const name = profile?.display_name?.split(/\s+/)[0];

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="ny-vision">
        <h2 id="ny-vision" className="mb-2 text-sm font-medium text-soi-muted">Tu visión</h2>
        {v.vision.aim || v.vision.goals.length ? (
          <div className="rounded-[20px] bg-soi-ink p-4 text-white">
            {v.vision.aim && <p className="text-lg font-medium leading-snug">{v.vision.aim}</p>}
            {(v.vision.target || v.vision.deadline) && <p className="mt-1 text-sm text-white/80">{[v.vision.target, v.vision.deadline && `para ${v.vision.deadline}`].filter(Boolean).join(' · ')}</p>}
            {v.vision.goals.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-1.5">{v.vision.goals.map((g, i) => <li key={i} className="rounded-full bg-white/15 px-2.5 py-1 text-xs">{g}</li>)}</ul>
            )}
          </div>
        ) : (
          <Link href="/chat?agent=napoleon_hill" className="press block rounded-[20px] bg-soi-sidebar p-4 text-sm text-soi-muted hover:shadow-soft">
            Aún no defines tu propósito. <span className="text-soi-accent underline underline-offset-4">Constrúyelo con Napoleon Hill</span>: qué quieres, para cuándo y qué darás a cambio.
          </Link>
        )}
      </section>

      <section aria-labelledby="ny-ids">
        <h2 id="ny-ids" className="mb-2 text-sm font-medium text-soi-muted">{name ? `${name}, estás convirtiéndote en…` : 'Estás convirtiéndote en…'}</h2>
        {v.active.length ? (
          <ul className="flex flex-col gap-2">
            {v.active.map((i) => (
              <li key={i.id}>
                <Link href={`/mi-vida/yo/${i.id}`} className="press block rounded-[20px] bg-white p-4 shadow-ring hover:shadow-soft">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-[17px] font-semibold">{i.name}</p>
                    <p className="nums shrink-0 text-sm font-medium text-soi-accent">Nivel {i.level.level}</p>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-soi-tray" role="progressbar" aria-label={`Hacia el nivel ${i.level.level + 1}`} aria-valuemin={0} aria-valuemax={i.level.next} aria-valuenow={i.level.current}>
                    <div className="h-full origin-left rounded-full bg-soi-accent-fill" style={{ transform: `scaleX(${i.level.progress})` }} />
                  </div>
                  <p className="nums mt-1.5 text-xs text-soi-muted">
                    {i.evidenceCount ? `Basado en ${i.evidenceCount} ${i.evidenceCount === 1 ? 'evidencia' : 'evidencias'}` : 'Tu primera evidencia llega con el próximo Moment'}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
        <div className={v.active.length ? 'mt-3' : ''}><IdentitySetup auto={v.active.length === 0} compact={v.active.length > 0} /></div>
      </section>

      {v.capacities.length > 0 && (
        <section aria-labelledby="ny-caps">
          <h2 id="ny-caps" className="mb-2 text-sm font-medium text-soi-muted">Has desarrollado</h2>
          <ul className="flex flex-col gap-2.5 rounded-[20px] bg-white p-4 shadow-ring">
            {v.capacities.map((c) => (
              <li key={c.name} className="grid grid-cols-[7.5rem_1fr_auto] items-center gap-3">
                <span className="truncate text-sm">{c.name}</span>
                <span className="h-2 overflow-hidden rounded-full bg-soi-tray"><span className="block h-full origin-left rounded-full bg-soi-accent-fill" style={{ transform: `scaleX(${c.level.progress})` }} /></span>
                <span className="nums text-xs text-soi-muted">Nivel {c.level.level}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="ny-ev">
        <h2 id="ny-ev" className="mb-2 text-sm font-medium text-soi-muted">La evidencia</h2>
        {v.observations.length ? (
          <div className="rounded-[20px] bg-soi-accent-soft p-4">
            <p className="text-sm font-medium text-soi-accent">SOI ha observado que:</p>
            <ul className="mt-2 flex flex-col gap-1.5">{v.observations.map((o) => <li key={o} className="flex gap-2 text-[15px]"><Check className="mt-0.5 h-4 w-4 shrink-0 text-soi-accent" aria-hidden="true" />{o}</li>)}</ul>
          </div>
        ) : (
          <p className="rounded-[14px] bg-soi-sidebar p-4 text-sm text-soi-muted">
            {v.evidence.length ? `Llevas ${v.evidence.length} ${v.evidence.length === 1 ? 'evidencia' : 'evidencias'}. Con un par de meses de práctica, SOI te mostrará cómo estás cambiando (no motivación: evidencia).` : 'Cada Moment que vivas, cada reflexión y cada regreso se vuelven evidencia de quién te estás convirtiendo.'}
          </p>
        )}
      </section>

      <section aria-labelledby="ny-story">
        <h2 id="ny-story" className="mb-2 text-sm font-medium text-soi-muted">Tu historia</h2>
        <div className="flex flex-col gap-4">
          <WeeklyStory />
          {v.story.length ? (
            <ol className="relative flex flex-col gap-4 border-l border-black/10 pl-4">
              {v.story.map((e, i) => (
                <li key={i} className="relative">
                  <span aria-hidden="true" className="absolute -left-[1.3rem] top-1.5 h-2.5 w-2.5 rounded-full bg-soi-accent-fill" />
                  <p className="text-xs text-soi-muted">{fmt(e.at)}</p>
                  <p className="text-[15px] leading-relaxed">{e.text}</p>
                </li>
              ))}
            </ol>
          ) : <p className="text-sm text-soi-muted">Tu historia empieza con tu primer Moment.</p>}
        </div>
      </section>
    </div>
  );
}

/**
 * Batallas: SOI no lucha contra la persona; lucha JUNTO a ella contra sus enemigos interiores
 * (patrones, no diagnósticos). Victorias, enemigo más frecuente, mapa de la Fortaleza Interior y jefes por meta.
 */
async function BattlesTab({ supabase, userId }: { supabase: Sb; userId: string }) {
  const profile = await getProfile(userId);
  const b = await loadBattles(supabase, userId, profile, profile?.timezone ?? 'America/Mexico_City');
  const maxI = Math.max(2, ...b.active.map((e) => e.intensity));
  const maxA = Math.max(1, ...b.allies.map((a) => a.level.level));
  const seen = new Set(b.active.map((e) => e.enemy.id));

  return (
    <div className="flex flex-col gap-8">
      <p className="rounded-[20px] bg-soi-ink p-4 text-[15px] leading-relaxed text-white">
        No eres tus pensamientos, ni tus emociones, ni tus patrones automáticos. Los enemigos interiores aparecen en todos nosotros;
        la diferencia está en reconocerlos y entrenar a tus aliados para responder de otra manera.
      </p>

      <section aria-labelledby="bt-won">
        <h2 id="bt-won" className="mb-2 text-sm font-medium text-soi-muted">En los últimos 30 días</h2>
        {b.defeated.length ? (
          <div className="rounded-[20px] bg-white p-4 shadow-ring">
            <p className="text-sm font-medium">Has derrotado:</p>
            <ul className="mt-2 flex flex-col gap-1">
              {b.defeated.map((d) => (
                <li key={d.enemy.id} className="nums flex items-center gap-2 text-[15px]"><Check className="h-4 w-4 text-soi-accent" aria-hidden="true" />{d.enemy.name} ({d.victories30} {d.victories30 === 1 ? 'vez' : 'veces'})</li>
              ))}
            </ul>
            {b.mostFrequent && <p className="mt-3 text-sm text-soi-muted">El enemigo que más aparece sigue siendo: <Link href={`/mi-vida/batallas/${b.mostFrequent.enemy.id}`} className="font-medium text-soi-ink underline underline-offset-4">{b.mostFrequent.enemy.name}</Link>.</p>}
          </div>
        ) : (
          <p className="rounded-[14px] bg-soi-sidebar p-4 text-sm text-soi-muted">
            {b.totalEvents30 ? `SOI notó ${b.totalEvents30} ${b.totalEvents30 === 1 ? 'vez' : 'veces'} que un enemigo intentó ganar terreno. Cada Moment que entrena a sus aliados cuenta como victoria.` : 'Cuando un enemigo intente ganar terreno (en tus conversaciones con SOI), aparecerá aquí junto con la forma de vencerlo.'}
          </p>
        )}
      </section>

      <section aria-labelledby="bt-map">
        <h2 id="bt-map" className="mb-2 text-sm font-medium text-soi-muted">Tu Fortaleza Interior</h2>
        <div className="grid gap-3 rounded-[20px] bg-white p-4 shadow-ring sm:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-soi-accent">Aliados</p>
            {b.allies.length ? (
              <ul className="flex flex-col gap-1.5">{b.allies.slice(0, 8).map((a) => (
                <li key={a.name} className="grid grid-cols-[6.5rem_1fr] items-center gap-2 text-sm"><span className="truncate">{a.name}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-soi-tray"><span className="block h-full origin-left rounded-full bg-soi-accent-fill" style={{ transform: `scaleX(${Math.min(1, a.level.level / maxA)})` }} /></span></li>
              ))}</ul>
            ) : <p className="text-sm text-soi-muted">Se fortalecen con cada Moment.</p>}
          </div>
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-soi-danger">Enemigos</p>
            {b.active.length ? (
              <ul className="flex flex-col gap-1.5">{b.active.slice(0, 8).map((e) => (
                <li key={e.enemy.id}>
                  <Link href={`/mi-vida/batallas/${e.enemy.id}`} className="press grid grid-cols-[6.5rem_1fr] items-center gap-2 text-sm"><span className="truncate">{e.enemy.name.replace(/^(El|La) /, '')}</span>
                    <span className="h-2 overflow-hidden rounded-full bg-soi-tray"><span className="block h-full origin-left rounded-full bg-soi-danger/70" style={{ transform: `scaleX(${Math.min(1, e.intensity / maxI)})` }} /></span></Link>
                </li>
              ))}</ul>
            ) : <p className="text-sm text-soi-muted">Ningún enemigo activo ahora.</p>}
          </div>
          <p className="text-xs text-soi-subtle sm:col-span-2">No representa quién eres: es el estado actual de tu entrenamiento.</p>
        </div>
      </section>

      {b.bosses.length > 0 && (
        <section aria-labelledby="bt-boss">
          <h2 id="bt-boss" className="mb-2 text-sm font-medium text-soi-muted">Batallas importantes</h2>
          <ul className="flex flex-col gap-2">
            {b.bosses.map((boss) => {
              const max = Math.max(...boss.top.map((t) => t.count));
              return (
                <li key={boss.goal} className="rounded-[20px] bg-white p-4 shadow-ring">
                  <p className="text-xs text-soi-muted">Meta</p>
                  <p className="font-medium">{boss.goal}</p>
                  <ul className="mt-3 flex flex-col gap-1.5">{boss.top.map((t) => (
                    <li key={t.enemy.id} className="grid grid-cols-[7rem_1fr] items-center gap-2 text-sm"><span className="truncate">{t.enemy.name.replace(/^(El|La) /, '')}</span>
                      <span className="h-2 overflow-hidden rounded-full bg-soi-tray"><span className="block h-full origin-left rounded-full bg-soi-danger/70" style={{ transform: `scaleX(${t.count / max})` }} /></span></li>
                  ))}</ul>
                  <p className="mt-3 text-sm text-soi-muted">En esta meta, {boss.top.slice(0, 2).map((t) => t.enemy.name).join(' y ')} {boss.top.length > 1 ? 'son los que más aparecen' : 'es el que más aparece'}. Podemos preparar un plan para enfrentarlos.</p>
                  <div className="mt-2"><Link href={`/mi-vida/batallas/${boss.top[0]!.enemy.id}`} className="text-sm font-medium text-soi-accent underline underline-offset-4">Ver cómo vencer a {boss.top[0]!.enemy.name}</Link></div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section aria-labelledby="bt-all">
        <h2 id="bt-all" className="mb-2 text-sm font-medium text-soi-muted">Los enemigos interiores</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {[...b.active.map((e) => e.enemy), ...ENEMIES.filter((e) => !seen.has(e.id))].map((enemy) => {
            const st = b.enemies.find((x) => x.enemy.id === enemy.id)!;
            return (
              <li key={enemy.id}>
                <Link href={`/mi-vida/batallas/${enemy.id}`} className="press block h-full rounded-[20px] bg-white p-4 shadow-ring hover:shadow-soft">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-medium">{enemy.name}</p>
                    <p className={st.intensity > 0 ? 'text-xs font-medium text-soi-danger' : 'text-xs text-soi-subtle'}>{intensityLabel(st.intensity)}</p>
                  </div>
                  <p className="mt-0.5 text-sm italic text-soi-muted">«{enemy.whisper}»</p>
                  {st.pattern && <p className="mt-1 text-xs text-soi-muted">{st.pattern}</p>}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
