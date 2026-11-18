import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/supabase/server';
import { getProfile } from '@/lib/billing/check-access';
import { effectivePlan, trialDaysLeft } from '@/lib/billing/access-rules';
import { AppShell } from '@/components/layout/app-shell';
import { AnalyticsProvider } from '@/components/providers/analytics';
import { TimezoneSync } from '@/components/layout/timezone-sync';
import { getConsentState } from '@/lib/consent';
import { ConsentGate } from '@/components/legal/consent-gate';
import { NavTracker } from '@/components/analytics/nav-tracker';
import { Suspense } from 'react';
import { ReminderListener } from '@/components/pwa/reminder-listener';
import { WelcomeTour } from '@/components/onboarding/welcome-tour';
import { FeedbackBubble } from '@/components/feedback/feedback-bubble';
import { NotificationsSync } from '@/components/notifications/notification-bell';
import { ensureRewardNotification, unreadNotifications } from '@/lib/notifications-server';
import { rewardEligible } from '@/lib/trial-reward';
import { UnreadSync } from '@/components/chat/unread-badge';
import { unreadCount } from '@/lib/coach/proactive-server';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user } = await getSessionUser();
  if (!user) redirect('/login');

  const [profile, { data: conversations }, consent, unread, notifications] = await Promise.all([
    getProfile(user.id),
    supabase.from('conversations').select('id, title')
      .eq('user_id', user.id).eq('is_archived', false)
      .order('is_pinned', { ascending: false }).order('last_message_at', { ascending: false }).limit(8),
    getConsentState(user.id),
    // Mensajes de SOI sin leer: la burbuja de la pestaña SOI.
    unreadCount(supabase, user.id).catch(() => 0),
    // La campanita (y, si su prueba terminó, «Usa SOI un mes gratis» antes de contar).
    getProfile(user.id)
      .then((p) => (p?.app_role === 'persons' ? undefined : ensureRewardNotification(user.id, p)))
      .then(() => unreadNotifications(user.id)).catch(() => 0),
  ]);
  // Sin consentimiento legal vigente: un cuadro pequeño dentro de la app, una sola vez (ya no en el login).
  const needsConsent = consent.state !== 'ok';
  // Las cuentas de /persons son otro tipo de usuario: no ven SOI.
  if (profile?.app_role === 'persons') redirect('/persons');

  const plan = profile ? effectivePlan(profile) : 'free';

  return (
    <AppShell data={{
      name: profile?.display_name ?? user.email?.split('@')[0] ?? 'Tú',
      avatarUrl: profile?.avatar_url ?? (user.user_metadata?.avatar_url as string | undefined) ?? null,
      streak: profile?.streak_current ?? 0,
      shields: profile?.streak_shields ?? 0,
      plan,
      trialDaysLeft: profile ? trialDaysLeft(profile) : 0,
      conversations: (conversations ?? []) as { id: string; title: string }[],
    }}>
      <AnalyticsProvider userId={user.id} />
      <Suspense fallback={null}><NavTracker /></Suspense>
      <ReminderListener />
      <UnreadSync initial={unread} />
      <NotificationsSync initial={notifications} />
      {needsConsent ? <ConsentGate kind="soi" updated={consent.state === 'updated'} /> : (
        <>
          {/* Introducción de bienvenida: la primera vez y desde Ajustes (?tour=1). */}
          <Suspense fallback={null}><WelcomeTour seenAt={profile?.tour_seen_at ?? null} /></Suspense>
          {/* Tu opinión: burbuja discreta; se abre sola una vez, cuando ya tiene opinión (después de la bienvenida). */}
          <Suspense fallback={null}><FeedbackBubble canAutoPrompt={!profile?.feedback_prompted_at && Boolean(profile?.tour_seen_at)} reward={rewardEligible(profile)} /></Suspense>
        </>
      )}
      <TimezoneSync stored={profile?.timezone ?? null} auto={profile?.timezone_auto ?? true} />
      {children}
    </AppShell>
  );
}
