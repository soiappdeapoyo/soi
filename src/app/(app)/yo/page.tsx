import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowRight, Award, Flame, Lock, Settings, Shield } from 'lucide-react';
import { getSessionUser } from '@/lib/supabase/server';
import { getAccessMap } from '@/lib/billing/check-access';
import { loadMomentum } from '@/lib/momentum-server';
import { loadEvolution } from '@/lib/social/evolution';
import { computeAchievements } from '@/lib/achievements';
import { loadByAuthor, loadSaved } from '@/lib/social/posts';
import { loadProfileCard } from '@/lib/social/profile';
import { MOMENT_FIELDS, toMomentFlow } from '@/lib/moments/types';
import { MomentumCard, EvolutionChain } from '@/components/momentum/momentum-card';
import { ProfileHeader } from '@/components/profile/profile-header';
import { Highlights } from '@/components/creators/highlights';
import { CreatorMoments } from '@/components/creators/creator-moments';
import { loadCreatorLayer } from '@/lib/creators/profile';
import { ProfileTabs, PrivateNote, type ProfileTab } from '@/components/profile/profile-tabs';
import { EditProfileButton } from '@/components/profile/edit-profile';
import { FeedList } from '@/components/feed/feed-list';
import { MomentFlowCard } from '@/components/moments/moment-flow-card';
import { ESLABON_LABEL } from '@/config/agents';
import { RITUAL_PHASES, type RitualPhase } from '@/config/navigation';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Yo' };

/** Públicas (las ve cualquiera en /u/[id]) y privadas (solo tú, con candado). */
const TABS: ProfileTab[] = [
  { id: 'publicaciones', label: 'Publicaciones' },
  { id: 'moments', label: 'Moments' },
  { id: 'evolucion', label: 'Evolución', private: true },
  { id: 'logros', label: 'Logros', private: true },
  { id: 'identidad', label: 'Identidad', private: true },
  { id: 'guardados', label: 'Guardados', private: true },
  { id: 'cuenta', label: 'Cuenta', private: true },
];

const ACCOUNT_LINKS = [
  { href: '/perfil', label: 'Mi perfil e identidad' },
  { href: '/evidencias', label: 'Muro de Evidencias' },
  { href: '/ritual', label: 'Ritual diario' },
  { href: '/mensajes', label: 'Mensajes' },
  { href: '/creadores', label: 'Cuenta de creador' },
  { href: '/planes', label: 'Planes SOI+' },
  { href: '/ajustes', label: 'Ajustes' },
];

/**
 * Yo, estilo Substack: la vista principal es tu perfil tal como lo ven los demás (foto, bio, enlaces, seguidores)
 * y debajo pestañas. Las públicas muestran lo que publicas; las privadas (candado) tu evolución, logros e identidad.
 */
export default async function YoPage({ searchParams }: { searchParams: Promise<{ tab?: string; destacado?: string }> }) {
  const { tab: tabParam, destacado } = await searchParams;
  const { supabase, user } = await getSessionUser();
  if (!user) redirect('/login');
  const [{ profile, access }, card, { data: creator }] = await Promise.all([
    getAccessMap(user.id),
    loadProfileCard(supabase, user.id),
    supabase.from('creator_profiles').select('handle').eq('user_id', user.id).maybeSingle(),
  ]);
  if (!card) redirect('/onboarding');
  // Cuenta de creador: un solo perfil (como Instagram). Su trabajo va primero, en cuadrícula, con destacados.
  const layer = creator ? await loadCreatorLayer(supabase, user.id) : null;
  const tabs: ProfileTab[] = layer ? [{ id: 'moments', label: 'Moments' }, { id: 'retos', label: 'Retos' }, ...TABS.filter((t) => t.id !== 'moments')] : TABS;
  const tab = tabs.some((t) => t.id === tabParam) ? tabParam! : tabs[0]!.id;
  const me = { name: profile?.display_name ?? 'Tú', avatarUrl: profile?.avatar_url ?? null };

  return (
    <div className="mx-auto max-w-2xl px-4 pb-8 pt-4 sm:px-5 md:pt-8">
      <div className="flex justify-end">
        <Link href="/ajustes" aria-label="Ajustes" className="press flex h-10 w-10 items-center justify-center rounded-lg text-soi-muted hover:bg-black/[0.04] hover:text-soi-ink">
          <Settings className="h-5 w-5" aria-hidden="true" />
        </Link>
      </div>
      <ProfileHeader
        card={card}
        creator={layer ? { category: layer.category, moments: layer.moments.length, people: layer.people } : null}
        actions={(
          <>
            <EditProfileButton name={card.display_name} bio={profile?.bio ?? card.bio} avatarUrl={card.avatar_url} links={card.links} isCreator={Boolean(creator)} />
            {layer && <Link href="/creadores" className="press inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium shadow-ring hover:shadow-soft">Panel profesional</Link>}
            <Link href={`/u/${user.id}?vista=publica`} className="press inline-flex h-9 items-center rounded-lg px-3 text-sm text-soi-muted hover:bg-black/[0.04] hover:text-soi-ink">Ver como los demás</Link>
          </>
        )}
      />

      {layer && <Highlights items={layer.highlights} base="/yo" active={tab === 'moments' ? destacado : null} />}
      <ProfileTabs tabs={tabs} active={tab} base="/yo" />

      <div className="pt-4">
        {tab === 'publicaciones' && <PostsTab supabase={supabase} userId={user.id} me={me} canPost={access.community} />}
        {layer && (tab === 'moments' || tab === 'retos') && (
          <CreatorMoments creator={layer} tab={tab} highlight={destacado} empty={(
            <div className="py-10 text-center text-sm text-soi-muted">
              <p>{tab === 'retos' ? 'Aún no publicas retos.' : 'Aún no publicas Moments.'}</p>
              <Link href="/m/nuevo" className="mt-2 inline-block text-soi-accent underline underline-offset-4">Crear un Moment</Link>
            </div>
          )} />
        )}
        {!layer && tab === 'moments' && <MomentsTab supabase={supabase} userId={user.id} />}
        {tab === 'evolucion' && <EvolutionTab supabase={supabase} userId={user.id} profile={profile} />}
        {tab === 'logros' && <AchievementsTab supabase={supabase} userId={user.id} profile={profile} isCreator={Boolean(creator)} />}
        {tab === 'identidad' && <IdentityTab profile={profile} />}
        {tab === 'guardados' && <SavedTab supabase={supabase} userId={user.id} me={me} />}
        {tab === 'cuenta' && <AccountTab handle={creator?.handle ?? null} />}
      </div>
    </div>
  );
}

type Sb = Awaited<ReturnType<typeof getSessionUser>>['supabase'];
type Profile = Awaited<ReturnType<typeof getAccessMap>>['profile'];

async function PostsTab({ supabase, userId, me, canPost }: { supabase: Sb; userId: string; me: { name: string; avatarUrl: string | null }; canPost: boolean }) {
  const feed = await loadByAuthor(supabase, userId, userId);
  return (
    <FeedList initial={feed.posts} cursor={feed.next ? { kind: 'before', before: feed.next } : null} query={`autor=${userId}`} me={me} composer={canPost}
      empty={<p className="py-10 text-center text-sm text-soi-muted">Aún no publicas. Comparte cómo te fue con un Moment.</p>} />
  );
}

async function MomentsTab({ supabase, userId }: { supabase: Sb; userId: string }) {
  const { data } = await supabase.from('soi_blueprints').select(MOMENT_FIELDS).eq('creator_id', userId).eq('status', 'published')
    .order('executions_count', { ascending: false }).limit(20);
  const moments = (data ?? []).map(toMomentFlow);
  return moments.length ? (
    <ul className="flex flex-col gap-2">{moments.map((m) => <li key={m.id}><MomentFlowCard m={m} /></li>)}</ul>
  ) : (
    <div className="py-10 text-center text-sm text-soi-muted">
      <p>Aún no publicas Moments.</p>
      <Link href="/m/nuevo" className="mt-2 inline-block text-soi-accent underline underline-offset-4">Crear un Moment</Link>
    </div>
  );
}

async function EvolutionTab({ supabase, userId, profile }: { supabase: Sb; userId: string; profile: Profile }) {
  const [momentum, evolution] = await Promise.all([
    loadMomentum(supabase, userId, profile?.streak_current ?? 0),
    loadEvolution(supabase, userId, profile?.goals?.length ?? 0),
  ]);
  const phase = RITUAL_PHASES[(profile?.ritual_phase ?? 'chispa') as RitualPhase] ?? RITUAL_PHASES.chispa;
  return (
    <div className="flex flex-col gap-5">
      <PrivateNote />
      <MomentumCard m={momentum} />
      <dl className="nums grid grid-cols-3 gap-1.5 rounded-[14px] bg-soi-sidebar p-1.5">
        {[
          { k: 'Racha', v: `${profile?.streak_current ?? 0} d`, icon: <Flame className="h-4 w-4 text-orange-600" aria-hidden="true" /> },
          { k: 'Escudos', v: String(profile?.streak_shields ?? 0), icon: <Shield className="h-4 w-4 text-soi-muted" aria-hidden="true" /> },
          { k: 'Fase', v: phase.label, icon: null },
        ].map((s) => (
          <div key={s.k} className="rounded-lg bg-white px-3 py-2.5 shadow-ring">
            <dt className="flex items-center gap-1.5 text-xs text-soi-muted">{s.icon}{s.k}</dt>
            <dd className="truncate text-xl font-medium">{s.v}</dd>
          </div>
        ))}
      </dl>
      <section aria-labelledby="evo">
        <h2 id="evo" className="mb-2 text-sm font-medium text-soi-muted">Tu evolución</h2>
        <EvolutionChain steps={evolution} />
      </section>
    </div>
  );
}

async function AchievementsTab({ supabase, userId, profile, isCreator }: { supabase: Sb; userId: string; profile: Profile; isCreator: boolean }) {
  const count = (q: PromiseLike<{ count: number | null }>) => Promise.resolve(q).then((r) => r.count ?? 0);
  const [evidences, moments, shared, impls, done, videoRefl] = await Promise.all([
    count(supabase.from('agent_knowledge').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('category', 'evidencia')),
    count(supabase.from('soi_moments').select('id', { count: 'exact', head: true }).eq('creator_id', userId)),
    count(supabase.from('soi_moments').select('id', { count: 'exact', head: true }).eq('creator_id', userId).eq('visibility', 'community')),
    count(supabase.from('blueprint_implementations').select('id', { count: 'exact', head: true }).eq('user_id', userId)),
    count(supabase.from('blueprint_implementations').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'completed')),
    count(supabase.from('soi_moments').select('id', { count: 'exact', head: true }).eq('creator_id', userId).eq('source_type', 'video')),
  ]);
  const achievements = computeAchievements({
    streakLongest: profile?.streak_longest ?? 0, evidences, moments, sharedMoments: shared,
    implementations: impls, completedImplementations: done, videoReflections: videoRefl, isCreator,
  });
  const unlocked = achievements.filter((a) => a.unlocked).length;
  return (
    <section aria-labelledby="ach">
      <PrivateNote />
      <h2 id="ach" className="nums mb-2 text-sm font-medium text-soi-muted">{unlocked} de {achievements.length} logros</h2>
      <ul className="grid grid-cols-2 gap-1.5 rounded-[20px] bg-soi-sidebar p-1.5 sm:grid-cols-3">
        {achievements.map((a) => (
          <li key={a.id} className={cn('rounded-[14px] p-3', a.unlocked ? 'bg-white shadow-ring' : 'bg-transparent shadow-[inset_0_0_0_1px_rgb(11_11_11/0.06)]')}>
            <p className={cn('flex items-center gap-1.5 text-sm font-medium', !a.unlocked && 'text-soi-muted')}>
              {a.unlocked ? <Award className="h-4 w-4 shrink-0 text-soi-gold" aria-hidden="true" /> : <Lock className="h-3.5 w-3.5 shrink-0 text-soi-subtle" aria-hidden="true" />}
              <span className="truncate">{a.label}</span>
            </p>
            <p className="mt-0.5 text-xs text-soi-muted">{a.unlocked ? a.detail : 'Por lograr'}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function IdentityTab({ profile }: { profile: Profile }) {
  return (
    <section aria-labelledby="ident">
      <PrivateNote />
      <div className="rounded-[20px] bg-white p-4 shadow-ring">
        <h2 id="ident" className="text-sm text-soi-muted">Identidad</h2>
        <dl className="mt-2 grid grid-cols-2 gap-3 text-[15px]">
          <div><dt className="text-xs text-soi-muted">Arquetipo</dt><dd>{profile?.archetype ?? 'Por descubrir'}</dd></div>
          <div><dt className="text-xs text-soi-muted">Eslabón a fortalecer</dt><dd>{profile?.weakest_link ? ESLABON_LABEL[profile.weakest_link] : 'Por descubrir'}</dd></div>
          <div><dt className="text-xs text-soi-muted">Emoción dominante</dt><dd>{profile?.dominant_emotion ?? 'Por descubrir'}</dd></div>
          <div><dt className="text-xs text-soi-muted">Temas recurrentes</dt><dd>{profile?.recurring_themes?.join(', ') || 'Por descubrir'}</dd></div>
          <div className="col-span-2"><dt className="text-xs text-soi-muted">Metas</dt><dd>{profile?.goals?.length ? profile.goals.join(' · ') : 'Cuéntaselas a SOI'}</dd></div>
        </dl>
        <Link href="/perfil" className="press mt-4 inline-flex items-center gap-1 text-sm text-soi-accent">Ver mapa SOI y editar <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
      </div>
    </section>
  );
}

async function SavedTab({ supabase, userId, me }: { supabase: Sb; userId: string; me: { name: string; avatarUrl: string | null } }) {
  const posts = await loadSaved(supabase, userId);
  return (
    <>
      <PrivateNote />
      <FeedList initial={posts} cursor={null} query="" me={me} composer={false}
        empty={<p className="py-10 text-center text-sm text-soi-muted">Guarda publicaciones con el marcador para volver a ellas.</p>} />
    </>
  );
}

function AccountTab({ handle }: { handle: string | null }) {
  return (
    <>
      <PrivateNote />
      <nav aria-label="Cuenta" className="flex flex-col gap-1.5 rounded-[20px] bg-soi-sidebar p-1.5">
        {ACCOUNT_LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="press flex items-center justify-between rounded-[14px] bg-white px-3 py-3 text-[15px] shadow-ring hover:shadow-soft">
            {l.href === '/creadores' && handle ? `Panel profesional · @${handle}` : l.label}
            <ArrowRight className="h-4 w-4 text-soi-subtle" aria-hidden="true" />
          </Link>
        ))}
        <form action="/auth/signout" method="post">
          <button type="submit" className="press w-full rounded-[14px] px-3 py-3 text-left text-[15px] text-soi-muted hover:text-soi-ink">Cerrar sesión</button>
        </form>
      </nav>
    </>
  );
}
