import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/supabase/server';
import { getProfile } from '@/lib/billing/check-access';
import { effectivePlan, trialDaysLeft } from '@/lib/billing/access-rules';
import { AppShell } from '@/components/layout/app-shell';
import { AnalyticsProvider } from '@/components/providers/analytics';
import { TimezoneSync } from '@/components/layout/timezone-sync';
import { getConsentState } from '@/lib/consent';

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
      <TimezoneSync stored={profile?.timezone ?? null} auto={profile?.timezone_auto ?? true} />
      {children}
    </AppShell>
  );
}
