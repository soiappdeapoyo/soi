import { redirect } from 'next/navigation';
import { loadJourney } from '@/lib/journey-server';
import { nextStep } from '@/lib/journey';
import type { Metadata } from 'next';
import { getSessionUser } from '@/lib/supabase/server';
import { getAccessMap } from '@/lib/billing/check-access';
import { ChatView } from '@/components/chat/chat-view';
import { situationById } from '@/config/situations';
import { isAgentId, type Eslabon } from '@/config/agents';
import { buildOpener, greetingForHour, momentRunOpener, type Opener } from '@/lib/opener';
import { prepareOpener, takeOpener } from '@/lib/opener-ai';
import { after } from 'next/server';
import { resolveRefs } from '@/lib/day-plan';
import { openerContext } from '@/lib/opener-context';
import { loadThread } from '@/lib/opener-thread';
import { todayISO } from '@/lib/utils';
import { pendingLandingMoment } from '@/lib/moments/drafts';
import { addToMyDay } from '@/lib/day-plan-server';

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
export default async function ChatPage({ searchParams }: { searchParams: Promise<{ agent?: string; run?: string; rutina?: string }> }) {
  const { agent: agentParam, run: runParam, rutina } = await searchParams;
  // Rutina por situación (Mi día): abre con su agente y un toque para empezar a diseñarla.
  const situation = situationById(rutina);
  const { supabase, user } = await getSessionUser();
  if (!user) redirect('/login');
  const [{ profile, access }, { data: last, error: lastError }, journey] = await Promise.all([
    getAccessMap(user.id),
    supabase.from('conversations').select('title').eq('user_id', user.id).eq('is_archived', false)
      .order('last_message_at', { ascending: false }).limit(1).maybeSingle(),
    // El loop principal: si vivió su primer Moment y aún no contó cómo le fue, el chat empieza por ahí.
    !runParam && !agentParam ? loadJourney(supabase, user.id, true).catch(() => null) : Promise.resolve(null),
  ]);
  const followUp = journey && nextStep(journey).kind === 'follow_up' ? journey.firstCompleted?.runId ?? null : null;
  const runId = runParam ?? followUp;

  const agent = situation?.agent ?? (isAgentId(agentParam) && agentParam !== 'crisis' ? agentParam : undefined);
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
  const run = runId && /^[0-9a-f-]{36}$/.test(runId)
    ? (await supabase.from('moment_runs').select('moment_id, moment_slug, mood_before, mood_after, helped').eq('id', runId).eq('user_id', user.id).maybeSingle()).data
    : null;
  const ref = run ? (run.moment_id ? `m:${run.moment_id}` : `s:${run.moment_slug}`) : null;
  const ranMoment = ref ? (await resolveRefs(supabase, [ref])).get(ref) : null;
  // Lo que SOI ya sabe (progreso, check-in, retos, lo que más te ayuda) para anticipar y proponer.
  const plain = !agent && !ranMoment;
  // Lo que SOI ya sabe, lo pendiente (3 días) y si es la primera vez: todo en paralelo.
  // "Primera vez" solo con certeza: perfil reciente, sin descubrimiento hecho y sin conversaciones ni Moments
  // (si alguna consulta falla, no se asume: mejor un saludo normal que presentarse a quien ya conoce SOI).
  const newProfile = Boolean(profile?.created_at && Date.now() - Date.parse(profile.created_at) < 2 * 86_400_000) && !profile?.onboarding_completed;
  const [known, thread, runs, prepared, landing] = await Promise.all([
    plain ? openerContext(supabase, user.id, profile, { hour: base.hour, today: base.today }, access.routine_execution) : Promise.resolve({}),
    plain ? loadThread(supabase, user.id, tz).catch(() => null) : Promise.resolve(null),
    plain && newProfile && !last && !lastError ? supabase.from('moment_runs').select('id', { count: 'exact', head: true }).eq('user_id', user.id) : Promise.resolve(null),
    // El saludo que SOI preparó para hoy (escrito por la IA alrededor de lo que vale la pena recordar).
    plain ? takeOpener(supabase, user.id, tz).catch(() => null) : Promise.resolve(null),
    // El Moment que diseñó en la landing y aún no vive: el chat abre con él (que nunca se sienta perdido).
    plain && !situation ? pendingLandingMoment(supabase, user.id).catch(() => null) : Promise.resolve(null),
  ]);
  const firstTime = Boolean(runs && !runs.error && runs.count === 0);
  const ruled = ranMoment && run
    ? momentRunOpener({ title: ranMoment.title, helped: run.helped as boolean | null, moodBefore: run.mood_before as number | null, moodAfter: run.mood_after as number | null, name: base.name })
    : buildOpener({ ...base, ...known, agent, thread, firstTime });
  // Saludo preparado: su texto y respuestas; la tarjeta (reto o plan que toca) y los enlaces siguen viniendo de las reglas.
  const first = base.name.trim().split(/\s+/)[0] ?? '';
  const firstName = base.name.trim().split(/\s+/)[0] ?? '';
  const landingOpener: Opener | null = landing ? {
    text: `${greetingForHour(base.hour)}${firstName ? `, ${firstName}` : ''}. Aquí está el Moment que diseñamos juntos: «${landing.title}». Ya quedó en tu día: lo encuentras en Hoy y en Mi Vida → Mi día. ¿Lo vivimos ahora?`,
    practice: null,
    proposal: { id: landing.id, title: landing.title, minutes: landing.minutes, cover: landing.cover, why: 'El que diseñamos en la página', label: 'Empezar' },
    replies: [{ label: 'Ahora no', text: 'Ahora no, lo hago más tarde.' }, { label: 'Ajustarlo', text: 'Quiero ajustar ese Moment antes de hacerlo.' }],
    links: [], kind: 'proposal',
  } : null;
  // Si aún no estaba en Mi día (lo reclamó antes de este cambio), se agrega ahora.
  if (landing) { const uid = user.id; try { after(() => addToMyDay(supabase, uid, landing.id).then(() => undefined)); } catch { /* fuera de una petición */ } }
  const opener: Opener = landingOpener ?? (situation
    ? { ...ruled, text: `${situation.opener} Primero te haré una o dos preguntas para que sea tuya. ¿Empezamos?`, practice: null, proposal: null, links: [],
      replies: [{ label: 'Empezar', text: situation.message }, { label: 'Otra cosa', text: 'Prefiero hablar de otra cosa.' }] }
    : prepared && !firstTime
    ? { ...ruled, text: `${greetingForHour(base.hour)}${first ? `, ${first}` : ''}. ${prepared.text}`, replies: prepared.replies.length ? prepared.replies : ruled.replies, kind: 'ai' }
    : ruled);
  // El siguiente saludo se prepara ya (después de responder): la próxima vez será otro.
  if (plain && !firstTime) {
    const uid = user.id;
    // Si salió por reglas, lo mostrado cuenta como reciente (para que el siguiente sea otro).
    const shown = prepared ? null : { key: thread ? `thread:${thread.conversationId}` : 'checkin', text: opener.text };
    try { after(() => prepareOpener(uid, { minAgeMs: 0, shown }).then(() => undefined)); } catch { /* fuera de una petición */ }
  }

  return (
    <ChatView
      key={ranMoment ? `run-${runId}` : situation ? `rutina-${situation.id}` : agent ?? 'auto'}
      agent={agent}
      opener={opener}
      paywalled={!access.chat}
      ttsAllowed={access.tts && (profile?.tts_enabled ?? true)}
      voice={profile?.voice_preference}
    />
  );
}
