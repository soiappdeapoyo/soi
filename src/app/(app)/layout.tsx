import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/supabase/server';
import { getProfile } from '@/lib/billing/check-access';
import { effectivePlan, trialDaysLeft } from '@/lib/billing/access-rules';
import { AppShell } from '@/components/layout/app-shell';
import { AnalyticsProvider } from '@/components/providers/analytics';
import { TimezoneSync } from '@/components/layout/timezone-sync';
import { getConsentState } from '@/lib/consent';
import { NavTracker } from '@/components/analytics/nav-tracker';
import { Suspense } from 'react';
import { ReminderListener } from '@/components/pwa/reminder-listener';
import { WelcomeTour } from '@/components/onboarding/welcome-tour';
import { FeedbackBubble } from '@/components/feedback/feedback-bubble';
import { activeDoor } from '@/config/doors';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user } = await getSessionUser();
  if (!user) redirect('/login');

  const [profile, { data: conversations }, consent] = await Promise.all([
    getProfile(user.id),
    supabase.from('conversations').select('id, title')
      .eq('user_id', user.id).eq('is_archived', false)
      .order('is_pinned', { ascending: false }).order('last_message_at', { ascending: false }).limit(8),
    getConsentState(user.id),
  ]);
  // Sin consentimiento legal vigente (términos, aviso de privacidad y mayoría de edad), primero eso.
  if (consent.state !== 'ok') redirect('/consentimiento');
  // Las cuentas de /persons son otro tipo de usuario: no ven SOI.
  if (profile?.app_role === 'persons') redirect('/persons');

  const plan = profile ? effectivePlan(profile) : 'free';
  // App enfocada (entró por una puerta): tres pestañas y el nombre de su puerta. Sin puerta elegida aún, «SOI».
  const door = activeDoor(profile);
  const focused = profile?.ui_mode === 'door';

  return (
    <AppShell data={{
      name: profile?.display_name ?? user.email?.split('@')[0] ?? 'Tú',
      avatarUrl: profile?.avatar_url ?? (user.user_metadata?.avatar_url as string | undefined) ?? null,
      streak: profile?.streak_current ?? 0,
      shields: profile?.streak_shields ?? 0,
      plan,
      trialDaysLeft: profile ? trialDaysLeft(profile) : 0,
      conversations: (conversations ?? []) as { id: string; title: string }[],
      door: focused ? { app: door?.app ?? 'SOI', accent: door?.accent ?? '#0B0B0B' } : null,
    }}>
      <AnalyticsProvider userId={user.id} />
      <Suspense fallback={null}><NavTracker /></Suspense>
      <ReminderListener />
      {/* Introducción de bienvenida: la primera vez y desde Ajustes (?tour=1). */}
      {/* La app enfocada tiene 3 pestañas: no necesita el recorrido de SOI Full. */}
      {!focused && <Suspense fallback={null}><WelcomeTour seenAt={profile?.tour_seen_at ?? null} /></Suspense>}
      {/* Tu opinión: burbuja discreta; se abre sola una vez, cuando ya tiene opinión (después de la bienvenida). */}
      <Suspense fallback={null}><FeedbackBubble canAutoPrompt={!profile?.feedback_prompted_at && (focused || Boolean(profile?.tour_seen_at))} /></Suspense>
      <TimezoneSync stored={profile?.timezone ?? null} auto={profile?.timezone_auto ?? true} />
      {children}
    </AppShell>
  );
}
