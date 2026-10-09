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
import { buildPortrait } from '@/lib/identity/portrait';
import { loadIdentityView } from '@/lib/identity/view';
import { intensityLabel, loadBattles } from '@/lib/battles';
import { ENEMIES } from '@/config/enemies';
import { DayPlanner } from '@/components/moments/day-planner';
import { PrepareCounter } from '@/components/battles/battle-actions';
import { isCreatorAccount } from '@/lib/creators/profile';
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
            {data.continue.map(({ moment: m, label, href, progress }) => (
              <li key={m.id} className="w-36 shrink-0 snap-start">
                <MomentFlowCard m={m} variant="tile" href={href} />
                {progress != null && (
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-soi-tray" aria-hidden="true">
                    <div className="h-full origin-left rounded-full bg-soi-accent" style={{ transform: `scaleX(${progress / 100})` }} />
                  </div>
                )}
                <p className="nums mt-0.5 text-xs font-medium text-soi-accent">{label}</p>
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
  const [{ data }, creatorAccount] = await Promise.all([
    supabase.from('library_items').select('id, kind, title, author, cover_url, status, external_id, file_size, metadata')
      .eq('user_id', userId).order('updated_at', { ascending: false }).limit(200),
    isCreatorAccount(supabase, userId),
  ]);
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
          {/* Cuenta de creador: sin contenido escrito por la IA. */}
          {!creatorAccount && <GuidedCreate />}
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
/** "Ver todo": lo detallado queda a un toque, sin cargar la primera vista. */
function More({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <details className="group">
      <summary className="press flex cursor-pointer list-none items-center justify-center gap-1.5 rounded-[14px] py-3 text-sm text-soi-muted hover:bg-black/[0.03]">
        {label} <ArrowRight className="h-3.5 w-3.5 rotate-90 transition-transform duration-[var(--dur-fast)] group-open:-rotate-90" aria-hidden="true" />
      </summary>
      <div className="mt-4 flex flex-col gap-8">{children}</div>
    </details>
  );
}

/**
 * Mi Nuevo Yo, en simple: en quién te estás convirtiendo, lo que sumaste esta semana y el siguiente paso.
 * Visión, capacidades, observaciones e historia quedan en "Ver todo".
 */
async function NewSelfTab({ supabase, userId }: { supabase: Sb; userId: string }) {
  const profile = await getProfile(userId);
  const tz = profile?.timezone ?? 'America/Mexico_City';
  const v = await loadIdentityView(supabase, userId, profile, tz);
  const name = profile?.display_name?.split(/\s+/)[0];
  const main = v.active[0];
  const week = v.evidence.filter((e) => Date.now() - Date.parse(e.at) < 7 * 86_400_000);
  const last = v.evidence[0];
  const portrait = buildPortrait({
    identities: v.active.map((i) => ({ name: i.name, evidenceCount: i.evidenceCount })),
    capacities: v.capacities, evidence: v.evidence, vision: v.vision,
  });

  if (!main) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-[15px] text-soi-muted">Elige en quién te quieres convertir. Cada Moment que vivas será una prueba de que ya lo estás siendo.</p>
        <IdentitySetup auto compact={false} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Link href={`/mi-vida/yo/${main.id}`} className="press block rounded-[20px] bg-soi-ink p-5 text-white">
        <p className="text-sm text-white/70">{name ? `${name}, te estás convirtiendo en` : 'Te estás convirtiendo en'}</p>
        <p className="mt-1 text-balance text-[24px] font-semibold leading-tight">{main.name}</p>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/15" role="progressbar" aria-label={`Hacia el nivel ${main.level.level + 1}`} aria-valuemin={0} aria-valuemax={main.level.next} aria-valuenow={main.level.current}>
          <div className="h-full origin-left rounded-full bg-white" style={{ transform: `scaleX(${main.level.progress})` }} />
        </div>
        <p className="nums mt-2 text-sm text-white/80">Nivel {main.level.level} · {main.evidenceCount} {main.evidenceCount === 1 ? 'evidencia' : 'evidencias'}</p>
      </Link>

      {v.active.length > 1 && (
        <ul className="flex flex-wrap gap-1.5">
          {v.active.slice(1).map((i) => (
            <li key={i.id}><Link href={`/mi-vida/yo/${i.id}`} className="press nums inline-flex rounded-full bg-white px-3 py-1.5 text-sm shadow-ring">{i.name} · Nv {i.level.level}</Link></li>
          ))}
        </ul>
      )}

      {/* La recompensa primero: lo que ya hiciste. */}
      <div className="rounded-[20px] bg-soi-accent-soft p-4">
        {week.length ? (
          <>
            <p className="nums text-[17px] font-semibold text-soi-accent">Esta semana sumaste {week.length} {week.length === 1 ? 'evidencia' : 'evidencias'}</p>
            {last && <p className="mt-1 text-sm text-soi-ink/80">Lo último: {last.note ? `«${last.note.slice(0, 90)}${last.note.length > 90 ? '…' : ''}»` : last.title}</p>}
          </>
        ) : (
          <p className="text-[15px] text-soi-ink/80">Esta semana aún no hay evidencias. Un Moment pequeño basta para empezar.</p>
        )}
        <Link href="/hoy" className={buttonClass('primary', 'md', 'mt-3 w-full')}>Sumar una evidencia</Link>
      </div>

      <More label="Ver todo">
        <section aria-labelledby="ny-vision">
          <h2 id="ny-vision" className="mb-2 text-sm font-medium text-soi-muted">Tu visión</h2>
          {v.vision.aim || v.vision.goals.length ? (
            <div className="rounded-[20px] bg-white p-4 shadow-ring">
              {v.vision.aim && <p className="text-[17px] font-medium leading-snug">{v.vision.aim}</p>}
              {(v.vision.target || v.vision.deadline) && <p className="mt-1 text-sm text-soi-muted">{[v.vision.target, v.vision.deadline && `para ${v.vision.deadline}`].filter(Boolean).join(' · ')}</p>}
              {v.vision.goals.length > 0 && <ul className="mt-3 flex flex-wrap gap-1.5">{v.vision.goals.map((g, i) => <li key={i} className="rounded-full bg-soi-tray px-2.5 py-1 text-xs">{g}</li>)}</ul>}
            </div>
          ) : (
            <Link href="/chat?agent=napoleon_hill" className="press block rounded-[20px] bg-soi-sidebar p-4 text-sm text-soi-muted">
              Aún no defines tu propósito. <span className="text-soi-accent underline underline-offset-4">Constrúyelo con Napoleon Hill</span>.
            </Link>
          )}
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

        {v.observations.length > 0 && (
          <section aria-labelledby="ny-ev" className="rounded-[20px] bg-white p-4 shadow-ring">
            <h2 id="ny-ev" className="text-sm font-medium text-soi-accent">SOI ha observado que:</h2>
            <ul className="mt-2 flex flex-col gap-1.5">{v.observations.map((o) => <li key={o} className="flex gap-2 text-[15px]"><Check className="mt-0.5 h-4 w-4 shrink-0 text-soi-accent" aria-hidden="true" />{o}</li>)}</ul>
          </section>
        )}

        <section aria-labelledby="ny-story">
          <h2 id="ny-story" className="mb-2 text-sm font-medium text-soi-muted">Tu historia</h2>
          <div className="flex flex-col gap-4">
            <WeeklyStory />
            {portrait.traits.length || portrait.future ? (
              <div className="flex flex-col gap-5 rounded-[20px] bg-white p-5 shadow-ring">
                {portrait.becoming.length > 0 && (
                  <p className="text-[17px] font-semibold leading-snug">
                    Te estás convirtiendo en {portrait.becoming.map((b, i) => (
                      <span key={b}>{i > 0 && (i === portrait.becoming.length - 1 ? ' y ' : ', ')}<span className="text-soi-accent">{b}</span></span>
                    ))}.
                  </p>
                )}
                {portrait.traits.length > 0 && (
                  <div>
                    <p className="text-sm text-soi-muted">Ya eres alguien que…</p>
                    <ul className="mt-2 flex flex-col gap-2">
                      {portrait.traits.map((t) => <li key={t} className="flex gap-2 text-[15px] leading-relaxed"><Check className="mt-1 h-4 w-4 shrink-0 text-soi-accent" aria-hidden="true" />{t}.</li>)}
                    </ul>
                  </div>
                )}
                {portrait.future && (
                  <div className="rounded-[14px] bg-soi-sidebar p-3">
                    <p className="text-sm text-soi-muted">Hacia dónde vas</p>
                    <p className="mt-1 text-[15px] leading-relaxed">{portrait.future}</p>
                  </div>
                )}
              </div>
            ) : <p className="text-sm text-soi-muted">Tu historia empieza con tu primer Moment.</p>}
          </div>
        </section>

        <IdentitySetup auto={false} compact />
      </More>
    </div>
  );
}

/**
 * Batallas, en simple: primero lo que ya venciste (recompensa), luego UN enemigo para hoy con un solo botón.
 * El mapa, los jefes por meta y los 13 enemigos quedan en "Ver todos".
 */
async function BattlesTab({ supabase, userId }: { supabase: Sb; userId: string }) {
  const profile = await getProfile(userId);
  const b = await loadBattles(supabase, userId, profile, profile?.timezone ?? 'America/Mexico_City');
  const maxI = Math.max(2, ...b.active.map((e) => e.intensity));
  const maxA = Math.max(1, ...b.allies.map((a) => a.level.level));
  const seen = new Set(b.active.map((e) => e.enemy.id));
  const wins = b.defeated.reduce((a, d) => a + d.victories30, 0);
  const focus = b.active[0];
  const minutes = (e: (typeof ENEMIES)[number]) => e.counter.blocks.reduce((a, x) => a + (x.minutes ?? 0), 0);

  return (
    <div className="flex flex-col gap-4">
      <p className="px-1 text-[15px] italic leading-relaxed text-soi-muted">No eres tus pensamientos. Son patrones que aparecen en todos; SOI los enfrenta contigo.</p>

      {wins > 0 && (
        <div className="rounded-[20px] bg-soi-accent-soft p-4">
          <p className="nums text-[17px] font-semibold text-soi-accent">Les ganaste {wins} {wins === 1 ? 'vez' : 'veces'} este mes</p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {b.defeated.map((d) => <li key={d.enemy.id} className="nums inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-sm"><Check className="h-3.5 w-3.5 text-soi-accent" aria-hidden="true" />{d.enemy.name} ×{d.victories30}</li>)}
          </ul>
        </div>
      )}

      {focus ? (
        <section aria-labelledby="bt-focus" className="rounded-[20px] bg-soi-ink p-5 text-white">
          <p id="bt-focus" className="text-xs font-medium text-white/60">{wins ? 'El que más aparece ahora' : 'Apareció en tus días'}</p>
          <p className="mt-1 text-[22px] font-semibold leading-snug">{focus.enemy.name}</p>
          <p className="mt-0.5 text-[15px] italic text-white/75">«{focus.enemy.whisper}»</p>
          <p className="mt-3 text-sm text-white/80">Lo vence: {focus.enemy.allies.slice(0, 2).join(' y ')}.</p>
          <div className="mt-4"><PrepareCounter enemy={focus.enemy.id} label={`Enfrentarlo · ${minutes(focus.enemy)} min`}
            className="press tap-target flex w-full items-center justify-center gap-2 rounded-[14px] bg-white py-3 text-[16px] font-semibold text-soi-ink disabled:opacity-60" /></div>
          <Link href={`/mi-vida/batallas/${focus.enemy.id}`} className="press mt-2 block py-1.5 text-center text-sm text-white/70">Conocerlo mejor</Link>
        </section>
      ) : (
        <p className="rounded-[20px] bg-soi-sidebar p-4 text-[15px] text-soi-muted">
          Hoy no hay batallas. Cuando un patrón intente ganar terreno en tus conversaciones, SOI te lo dirá aquí y te dará cómo vencerlo.
        </p>
      )}

      <More label="Ver todos los enemigos">
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
            <h2 id="bt-boss" className="mb-2 text-sm font-medium text-soi-muted">En tus metas</h2>
            <ul className="flex flex-col gap-2">
              {b.bosses.map((boss) => (
                <li key={boss.goal} className="rounded-[20px] bg-white p-4 shadow-ring">
                  <p className="font-medium">{boss.goal}</p>
                  <p className="mt-1 text-sm text-soi-muted">Aquí aparece{boss.top.length > 1 ? 'n' : ''} {boss.top.slice(0, 2).map((t) => t.enemy.name).join(' y ')}.</p>
                  <Link href={`/mi-vida/batallas/${boss.top[0]!.enemy.id}`} className="mt-2 inline-block text-sm font-medium text-soi-accent underline underline-offset-4">Cómo vencer a {boss.top[0]!.enemy.name}</Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-labelledby="bt-all">
          <h2 id="bt-all" className="mb-2 text-sm font-medium text-soi-muted">Los 13 enemigos interiores</h2>
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
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      </More>
    </div>
  );
}
