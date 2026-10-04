import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowRight, Award, Flame, Lock, Shield } from 'lucide-react';
import { getSessionUser } from '@/lib/supabase/server';
import { getAccessMap } from '@/lib/billing/check-access';
import { loadMomentum } from '@/lib/momentum-server';
import { loadEvolution } from '@/lib/social/evolution';
import { computeAchievements } from '@/lib/achievements';
import { MomentumCard, EvolutionChain } from '@/components/momentum/momentum-card';
import { ESLABON_LABEL } from '@/config/agents';
import { RITUAL_PHASES, type RitualPhase } from '@/config/navigation';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Yo' };

const LINKS = [
  { href: '/perfil', label: 'Mi perfil e identidad' },
  { href: '/evidencias', label: 'Muro de Evidencias' },
  { href: '/creadores', label: 'Estudio de creador' },
  { href: '/planes', label: 'Planes SOI+' },
  { href: '/ajustes', label: 'Ajustes' },
];

/**
 * Yo: tu evolución. Momentum Score, cadena de evolución, racha, logros e identidad.
 * Mide si sigues avanzando, no cuánto tiempo pasas en la app.
 */
export default async function YoPage() {
  const { supabase, user } = await getSessionUser();
  if (!user) redirect('/login');
  const { profile } = await getAccessMap(user.id);
  const count = (q: PromiseLike<{ count: number | null }>) => Promise.resolve(q).then((r) => r.count ?? 0);

  const [momentum, evolution, evidences, moments, shared, impls, done, videoRefl, { data: creator }] = await Promise.all([
    loadMomentum(supabase, user.id, profile?.streak_current ?? 0),
    loadEvolution(supabase, user.id, profile?.goals?.length ?? 0),
    count(supabase.from('agent_knowledge').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('category', 'evidencia')),
    count(supabase.from('soi_moments').select('id', { count: 'exact', head: true }).eq('creator_id', user.id)),
    count(supabase.from('soi_moments').select('id', { count: 'exact', head: true }).eq('creator_id', user.id).eq('visibility', 'community')),
    count(supabase.from('blueprint_implementations').select('id', { count: 'exact', head: true }).eq('user_id', user.id)),
    count(supabase.from('blueprint_implementations').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'completed')),
    count(supabase.from('soi_moments').select('id', { count: 'exact', head: true }).eq('creator_id', user.id).eq('source_type', 'video')),
    supabase.from('creator_profiles').select('handle').eq('user_id', user.id).maybeSingle(),
  ]);

  const achievements = computeAchievements({
    streakLongest: profile?.streak_longest ?? 0, evidences, moments, sharedMoments: shared,
    implementations: impls, completedImplementations: done, videoReflections: videoRefl, isCreator: Boolean(creator),
  });
  const unlocked = achievements.filter((a) => a.unlocked).length;
  const phase = RITUAL_PHASES[(profile?.ritual_phase ?? 'chispa') as RitualPhase] ?? RITUAL_PHASES.chispa;
  const name = profile?.display_name ?? 'Tú';

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-5 py-6 md:py-8">
      <header className="flex items-center gap-4">
        {profile?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.avatar_url} alt="" className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-soi-ink text-2xl font-medium text-white" aria-hidden="true">{name.charAt(0).toUpperCase()}</span>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight">{name}</h1>
          <p className="text-sm text-soi-muted">
            {profile?.archetype ?? 'Identidad en construcción'} · Fase {phase.label.toLowerCase()}
          </p>
        </div>
      </header>

      <MomentumCard m={momentum} />

      <dl className="nums grid grid-cols-3 gap-1.5 rounded-[14px] bg-soi-sidebar p-1.5">
        {[
          { k: 'Racha', v: `${profile?.streak_current ?? 0} d`, icon: <Flame className="h-4 w-4 text-orange-600" aria-hidden="true" /> },
          { k: 'Escudos', v: String(profile?.streak_shields ?? 0), icon: <Shield className="h-4 w-4 text-soi-muted" aria-hidden="true" /> },
          { k: 'Logros', v: `${unlocked}/${achievements.length}`, icon: <Award className="h-4 w-4 text-soi-gold" aria-hidden="true" /> },
        ].map((s) => (
          <div key={s.k} className="rounded-lg bg-white px-3 py-2.5 shadow-ring">
            <dt className="flex items-center gap-1.5 text-xs text-soi-muted">{s.icon}{s.k}</dt>
            <dd className="text-xl font-medium">{s.v}</dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="evo">
        <h2 id="evo" className="mb-2 text-sm font-medium text-soi-muted">Tu evolución</h2>
        <EvolutionChain steps={evolution} />
      </section>

      <section aria-labelledby="ach">
        <h2 id="ach" className="mb-2 text-sm font-medium text-soi-muted">Logros</h2>
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

      <section aria-labelledby="ident" className="rounded-[20px] bg-white p-4 shadow-ring">
        <h2 id="ident" className="text-sm text-soi-muted">Identidad</h2>
        <dl className="mt-2 grid grid-cols-2 gap-3 text-[15px]">
          <div><dt className="text-xs text-soi-muted">Eslabón a fortalecer</dt><dd>{profile?.weakest_link ? ESLABON_LABEL[profile.weakest_link] : 'Por descubrir'}</dd></div>
          <div><dt className="text-xs text-soi-muted">Emoción dominante</dt><dd>{profile?.dominant_emotion ?? 'Por descubrir'}</dd></div>
          <div className="col-span-2"><dt className="text-xs text-soi-muted">Metas</dt><dd>{profile?.goals?.length ? profile.goals.join(' · ') : 'Cuéntaselas a SOI'}</dd></div>
        </dl>
      </section>

      <nav aria-label="Más" className="flex flex-col gap-1.5 rounded-[20px] bg-soi-sidebar p-1.5">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="press flex items-center justify-between rounded-[14px] bg-white px-3 py-3 text-[15px] shadow-ring hover:shadow-soft">
            {l.label === 'Estudio de creador' && creator ? `${l.label} · @${creator.handle}` : l.label}
            <ArrowRight className="h-4 w-4 text-soi-subtle" aria-hidden="true" />
          </Link>
        ))}
        <form action="/auth/signout" method="post">
          <button type="submit" className="press w-full rounded-[14px] px-3 py-3 text-left text-[15px] text-soi-muted hover:text-soi-ink">Cerrar sesión</button>
        </form>
      </nav>
    </div>
  );
}
