import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getSessionUser } from '@/lib/supabase/server';
import { getAccessMap } from '@/lib/billing/check-access';
import { ChatView } from '@/components/chat/chat-view';
import { isAgentId, type Eslabon } from '@/config/agents';
import { buildOpener, momentRunOpener } from '@/lib/opener';
import { resolveRefs } from '@/lib/day-plan';
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
export default async function ChatPage({ searchParams }: { searchParams: Promise<{ agent?: string; run?: string }> }) {
  const { agent: agentParam, run: runParam } = await searchParams;
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
  // "Hablar con SOI" al terminar un Moment: el chat empieza sabiendo qué viviste y cómo te fue (solo tus propios runs, RLS).
  const run = runParam && /^[0-9a-f-]{36}$/.test(runParam)
    ? (await supabase.from('moment_runs').select('moment_id, moment_slug, mood_before, mood_after, helped').eq('id', runParam).eq('user_id', user.id).maybeSingle()).data
    : null;
  const ref = run ? (run.moment_id ? `m:${run.moment_id}` : `s:${run.moment_slug}`) : null;
  const ranMoment = ref ? (await resolveRefs(supabase, [ref])).get(ref) : null;
  // Lo que SOI ya sabe (progreso, check-in, retos, lo que más te ayuda) para anticipar y proponer.
  const known = agent || ranMoment ? {} : await openerContext(supabase, user.id, profile, { hour: base.hour, today: base.today }, access.routine_execution);
  const opener = ranMoment && run
    ? momentRunOpener({ title: ranMoment.title, helped: run.helped as boolean | null, moodBefore: run.mood_before as number | null, moodAfter: run.mood_after as number | null, name: base.name })
    : buildOpener({ ...base, ...known, agent });

  return (
    <ChatView
      key={ranMoment ? `run-${runParam}` : agent ?? 'auto'}
      agent={agent}
      opener={opener}
      paywalled={!access.chat}
      ttsAllowed={access.tts && (profile?.tts_enabled ?? true)}
      voice={profile?.voice_preference}
    />
  );
}
