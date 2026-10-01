import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { Flame, Shield } from 'lucide-react';
import { getSessionUser } from '@/lib/supabase/server';
import { getAccessMap } from '@/lib/billing/check-access';
import { ProfileForm } from '@/components/profile/profile-form';
import { AnalyzeButton } from '@/components/profile/analyze-button';
import { LockedFeature } from '@/components/paywall/locked-feature';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { ESLABON_LABEL, ESLABON_TO_AGENT, AGENTS } from '@/config/agents';
import { RITUAL_PHASES, STREAK_MILESTONES, type RitualPhase } from '@/config/navigation';

export const metadata: Metadata = { title: 'Mi perfil' };

export default async function PerfilPage() {
  const { supabase, user } = await getSessionUser();
  if (!user) redirect('/login');
  const { profile, access } = await getAccessMap(user.id);
  if (!profile) redirect('/onboarding');

  const [{ count: routines }, { count: evidences }] = await Promise.all([
    supabase.from('daily_routines').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('agent_knowledge').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('category', 'evidencia'),
  ]);

  const phase = RITUAL_PHASES[(profile.ritual_phase ?? 'chispa') as RitualPhase] ?? RITUAL_PHASES.chispa;
  const nextMilestone = STREAK_MILESTONES.find((m) => m > profile.streak_current);
  const weak = profile.weakest_link;

  return (
    <div className="mx-auto max-w-2xl space-y-5 px-5 py-8">
      <h1 className="text-3xl font-semibold">Mi perfil</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { k: 'Racha', v: profile.streak_current, icon: <Flame className="h-4 w-4 text-orange-500" aria-hidden="true" /> },
          { k: 'Escudos', v: profile.streak_shields, icon: <Shield className="h-4 w-4" aria-hidden="true" /> },
          { k: 'Rutinas', v: routines ?? 0 },
          { k: 'Evidencias', v: evidences ?? 0 },
        ].map((s) => (
          <Card key={s.k} className="p-4 text-center">
            <p className="flex items-center justify-center gap-1 text-2xl font-semibold nums">{s.icon}{s.v}</p>
            <p className="text-xs text-soi-muted">{s.k}</p>
          </Card>
        ))}
      </div>
      {nextMilestone && <p className="text-sm text-soi-muted">Próximo hito de racha: {nextMilestone} días · Racha más larga: {profile.streak_longest}</p>}

      <Card>
        <CardTitle>Tu mapa SOI</CardTitle>
        <CardDescription>Pensamientos → Emociones → Acciones → Resultados</CardDescription>
        <ol className="mt-4 grid grid-cols-4 gap-2 text-center text-xs">
          {(['pensamiento', 'emocion', 'accion', 'resultado'] as const).map((e) => (
            <li key={e} className={`rounded-2xl p-3 ${weak === e ? 'bg-soi-danger/10 font-semibold text-soi-danger ring-1 ring-soi-danger/40' : 'bg-black/5'}`}>
              {ESLABON_LABEL[e]}{weak === e && <span className="block">eslabón a fortalecer</span>}
            </li>
          ))}
        </ol>
        {weak && <p className="mt-3 text-sm">SOI te acompaña con <strong>{AGENTS[ESLABON_TO_AGENT[weak]].label}</strong>.</p>}
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div><dt className="text-soi-muted">Fase</dt><dd className="font-medium">{phase.label} — {phase.desc}</dd></div>
          <div><dt className="text-soi-muted">Arquetipo</dt><dd className="font-medium">{profile.archetype ?? 'Por descubrir'}</dd></div>
          <div><dt className="text-soi-muted">Emoción dominante</dt><dd className="font-medium">{profile.dominant_emotion ?? '—'}</dd></div>
          <div><dt className="text-soi-muted">Temas recurrentes</dt><dd className="font-medium">{profile.recurring_themes?.join(', ') || '—'}</dd></div>
        </dl>
      </Card>

      {access.deep_analysis ? (
        <Card><CardTitle>Análisis psicológico profundo</CardTitle><CardDescription className="mb-4">SOI analiza tus conversaciones para descubrir tu arquetipo y patrones.</CardDescription><AnalyzeButton /></Card>
      ) : (
        <LockedFeature title="Análisis profundo y arquetipos" description="Descubre tu arquetipo y los patrones que repites. Disponible en SOI+." />
      )}

      <Card><CardTitle className="mb-4">Editar perfil</CardTitle><ProfileForm profile={profile} /></Card>
    </div>
  );
}
