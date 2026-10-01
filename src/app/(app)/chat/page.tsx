import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getSessionUser } from '@/lib/supabase/server';
import { getAccessMap } from '@/lib/billing/check-access';
import { trialDaysLeft } from '@/lib/billing/access-rules';
import { ChatView } from '@/components/chat/chat-view';
import { TrialBanner } from '@/components/paywall/trial-banner';
import { isAgentId } from '@/config/agents';
import { streakGreeting } from '@/lib/streak';
import { todayISO } from '@/lib/utils';

export const metadata: Metadata = { title: 'Chat' };

export default async function ChatPage({ searchParams }: { searchParams: Promise<{ agent?: string }> }) {
  const { agent } = await searchParams;
  const { user } = await getSessionUser();
  if (!user) redirect('/login');
  const { profile, plan, access } = await getAccessMap(user.id);
  if (profile && !profile.onboarding_completed) redirect('/onboarding');

  return (
    <>
      <TrialBanner plan={plan} daysLeft={profile ? trialDaysLeft(profile) : 0} queriesLeft={profile?.plan === 'trial' ? 20 : profile?.free_queries_remaining ?? 0} />
      <ChatView
        key={agent ?? 'auto'}
        agent={isAgentId(agent) && agent !== 'crisis' ? agent : undefined}
        paywalled={!access.chat}
        ttsAllowed={access.tts && (profile?.tts_enabled ?? true)}
        voice={profile?.voice_preference}
        greeting={streakGreeting(profile?.last_ritual_date ?? null, todayISO(profile?.timezone ?? undefined))}
      />
    </>
  );
}
