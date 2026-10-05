import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getSessionUser } from '@/lib/supabase/server';
import { getAccessMap } from '@/lib/billing/check-access';
import { ChatView } from '@/components/chat/chat-view';
import { isAgentId, type Eslabon } from '@/config/agents';
import { buildOpener } from '@/lib/opener';
import { openerContext } from '@/lib/opener-context';
import { todayISO } from '@/lib/utils';

export const metadata: Metadata = { title: 'Chat' };

function hourIn(timeZone: string) {
  try {
    return Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone }).format(new Date()));
  } catch {
    return new Date().getHours();
  }
}

/**
 * Sin fricción: no hay formulario de bienvenida ni bloques. SOI abre la conversación con un saludo
 * agéntico: celebra tu avance, anticipa cómo llegas, te propone un Moment concreto y deja respuestas rápidas.
 */
export default async function ChatPage({ searchParams }: { searchParams: Promise<{ agent?: string }> }) {
  const { agent: agentParam } = await searchParams;
  const { supabase, user } = await getSessionUser();
  if (!user) redirect('/login');
  const [{ profile, access }, { data: last }] = await Promise.all([
    getAccessMap(user.id),
    supabase.from('conversations').select('title').eq('user_id', user.id).eq('is_archived', false)
      .order('last_message_at', { ascending: false }).limit(1).maybeSingle(),
  ]);

  const agent = isAgentId(agentParam) && agentParam !== 'crisis' ? agentParam : undefined;
  const tz = profile?.timezone ?? 'America/Mexico_City';
  const base = {
    name: profile?.display_name ?? '',
    hour: hourIn(tz),
    today: todayISO(tz),
    onboardingCompleted: profile?.onboarding_completed ?? false,
    lastRitualDate: profile?.last_ritual_date ?? null,
    ritualAvailable: access.daily_ritual,
    weakestLink: (profile?.weakest_link as Eslabon | null) ?? null,
    lastConversationTitle: (last?.title as string | undefined) ?? null,
  };
  // Lo que SOI ya sabe (progreso, check-in, retos, lo que más te ayuda) para anticipar y proponer.
  const known = agent ? {} : await openerContext(supabase, user.id, profile, { hour: base.hour, today: base.today }, access.routine_execution);
  const opener = buildOpener({ ...base, ...known, agent });

  return (
    <ChatView
      key={agent ?? 'auto'}
      agent={agent}
      opener={opener}
      paywalled={!access.chat}
      ttsAllowed={access.tts && (profile?.tts_enabled ?? true)}
      voice={profile?.voice_preference}
    />
  );
}
