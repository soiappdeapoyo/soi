import { createAdminClient } from '@/lib/supabase/server';
import { consumeChatQuery, refundChatQuery } from '@/lib/billing/check-access';
import { detectCrisis } from '@/lib/ai/crisis';
import { getCrisisResources } from '@/config/crisis-resources';
import { startOfTodayISO } from '@/lib/utils';
import { AllProvidersFailedError } from '@/lib/ai/fallback';
import { hash, seeded } from './spec';
import { applyEvents, circadianEnergy, decay, detectEvents, labelFor, parseEmotion, snapshot } from './emotion';
import { localClock, presenceAt } from './presence';
import { paceFor, planDelivery } from './scheduler';
import { humanizeItems, quirksFor } from './humanize';
import { scheduleChatPhoto } from './images';
import { scheduleTip } from './coach-server';
import { blockNotice, checkTurn } from './moderation';
import { actorReply, personaRegion, type ChatLine } from './ai';
import { canSendToday } from './entitlements';
import type { PersonaMessageRow, PersonaRow, PersonsSession } from './server';

/**
 * Un mensaje de la persona a un personaje: crisis primero (nunca descuenta) → tope diario → consulta del plan →
 * moderación → emoción (función pura) → actor → cuándo llega cada burbuja (agenda). Si la persona escribe otra vez
 * antes de que llegue la respuesta, la respuesta pendiente se descarta y se vuelve a pensar con todo lo que escribió.
 */
export type TurnResult =
  | { ok: true; messageId: string }
  | { ok: false; status: number; reason: 'daily_limit' | 'exhausted' | 'ai' | 'archived' };

const REASON_LABEL = { sexual: 'un comentario sexual', insult: 'un insulto', pressure: 'presión para que conteste', control: 'querer controlar dónde está o con quién', threat: 'una amenaza' } as const;

export async function sendTurn(s: PersonsSession, persona: PersonaRow, text: string, opts: { blind?: boolean } = {}): Promise<TurnResult> {
  if (persona.archived_at) return { ok: false, status: 409, reason: 'archived' };
  const db = createAdminClient();
  const now = new Date();
  const nowIso = now.toISOString();

  // Crisis: la seguridad va antes del paywall y del personaje (nunca descuenta, nunca responde en personaje).
  if (detectCrisis(text)) {
    const lines = getCrisisResources(s.profile.country).map((r) => `${r.name}: ${r.phone}`).join(' · ');
    const { data } = await db.from('persona_messages').insert({ persona_id: persona.id, user_id: s.userId, role: 'user', content: text, read_at: nowIso, meta: { crisis: true } }).select('id').single();
    await db.from('persona_messages').insert({
      persona_id: persona.id, user_id: s.userId, role: 'system', deliver_at: new Date(now.getTime() + 1000).toISOString(),
      content: `Esto es más importante que la práctica. Si estás pensando en hacerte daño, no estás solo ni sola: habla hoy con alguien. ${lines}. Si estás en peligro inmediato, llama a emergencias.`,
      meta: { crisis: true },
    });
    const log = await db.from('agent_knowledge').insert({
      user_id: s.userId, category: 'crisis_log', title: 'Crisis detectada (persons)', content: text,
      metadata: { country: s.profile.country ?? 'MX', source: 'persons', persona_id: persona.id },
    });
    if (log.error) console.error('[persons] crisis_log', log.error.message);
    return { ok: true, messageId: data?.id ?? '' };
  }

  const { count: sentToday } = await db.from('persona_messages').select('id', { count: 'exact', head: true })
    .eq('user_id', s.userId).eq('role', 'user').gte('created_at', startOfTodayISO(s.timezone, now));
  if (!canSendToday(s.limits, sentToday ?? 0).ok) return { ok: false, status: 429, reason: 'daily_limit' };

  const consumed = await consumeChatQuery();
  if (consumed === 'exhausted') return { ok: false, status: 402, reason: 'exhausted' };

  const check = checkTurn(text);
  if (check.level === 'block') {
    // No se entrega: el personaje no se entera (ni cambia su emoción). La consulta se devuelve.
    const { data } = await db.from('persona_messages').insert({ persona_id: persona.id, user_id: s.userId, role: 'user', content: text, meta: { blocked: check.reason } }).select('id').single();
    await db.from('persona_messages').insert({ persona_id: persona.id, user_id: s.userId, role: 'system', content: blockNotice(persona.name), deliver_at: new Date(now.getTime() + 800).toISOString(), meta: { blocked: check.reason } });
    if (consumed === 'consumed') await refundChatQuery();
    return { ok: true, messageId: data?.id ?? '' };
  }

  const spec = persona.spec;
  const t = spec.derived.temperament;
  const presence = presenceAt(spec.derived.dayPlan, now, persona.timezone);
  const { minute } = localClock(now, persona.timezone);
  const hours = (now.getTime() - Date.parse(persona.emotion_at)) / 3_600_000;
  const prev = decay(parseEmotion(persona.emotion, t), hours, t, circadianEnergy(t.energy, minute, presence.state));

  const [{ data: lastUser }, { count: userTurns }, { data: lastPersona }, { count: recentPhotos }] = await Promise.all([
    db.from('persona_messages').select('created_at').eq('persona_id', persona.id).eq('role', 'user').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    db.from('persona_messages').select('id', { count: 'exact', head: true }).eq('persona_id', persona.id).eq('role', 'user'),
    db.from('persona_messages').select('deliver_at').eq('persona_id', persona.id).eq('role', 'persona').lte('deliver_at', nowIso).order('deliver_at', { ascending: false }).limit(1).maybeSingle(),
    db.from('persona_messages').select('id', { count: 'exact', head: true }).eq('persona_id', persona.id).eq('role', 'persona').not('meta->photo', 'is', null).gte('deliver_at', new Date(now.getTime() - 6 * 3_600_000).toISOString()),
  ]);
  const hoursSinceLast = lastUser ? (now.getTime() - Date.parse(lastUser.created_at as string)) / 3_600_000 : null;
  const recentBoundary = Boolean(prev.boundaryAt && now.getTime() - Date.parse(prev.boundaryAt) < 6 * 3_600_000);
  const events = detectEvents(text, { interests: spec.interests, boundary: check.level === 'boundary', previousBoundary: recentBoundary, hoursSinceLast, trust: prev.trust });
  const next = applyEvents(prev, events, t, now);
  const label = labelFor(next, now, presence.state);
  const snap = snapshot(next, events, now, presence.state);

  const { data: inserted, error } = await db.from('persona_messages').insert({ persona_id: persona.id, user_id: s.userId, role: 'user', content: text, emotion: snap }).select('id').single();
  if (error || !inserted) {
    if (consumed === 'consumed') await refundChatQuery();
    throw new Error(error?.message ?? 'no se guardó el mensaje');
  }

  // Lo que iba a contestar y aún no llega se vuelve a pensar con todo lo nuevo.
  await db.from('persona_messages').delete().eq('persona_id', persona.id).eq('role', 'persona').gt('deliver_at', nowIso);

  const { data: recent } = await db.from('persona_messages').select('role, kind, content, deliver_at, created_at, meta')
    .eq('persona_id', persona.id).lte('deliver_at', new Date(now.getTime() + 1000).toISOString())
    .order('deliver_at', { ascending: false }).limit(30);
  const history: ChatLine[] = ((recent ?? []) as Pick<PersonaMessageRow, 'role' | 'kind' | 'content' | 'deliver_at' | 'created_at' | 'meta'>[])
    .filter((m) => !m.meta?.blocked && !m.meta?.crisis)
    .reverse()
    .map((m) => ({ role: m.role, kind: m.kind, content: m.content, at: m.role === 'user' ? m.created_at : m.deliver_at }));

  const region = personaRegion(spec, s.region);
  let reply;
  try {
    ({ reply } = await actorReply(spec, history, {
      emotion: next, label, presence, now, timezone: persona.timezone, region,
      boundary: check.level === 'boundary' ? REASON_LABEL[check.reason ?? 'pressure'] : null, risk: next.risk,
    }));
  } catch (error) {
    console.error('[persons] actor', error instanceof AllProvidersFailedError ? error.message : error);
    if (consumed === 'consumed') await refundChatQuery();
    await db.from('personas').update({ emotion: next, emotion_at: nowIso, last_message_at: nowIso }).eq('id', persona.id);
    return { ok: false, status: 503, reason: 'ai' };
  }

  // El tiempo cuenta desde que terminó de "pensar": al inicio la respuesta llega en segundos.
  const replyNow = new Date();
  const rand = seeded(hash(`${inserted.id}`));
  const boundary = reply.sets_boundary || check.level === 'boundary';
  const pace = paceFor({ userTurns: userTurns ?? 0, lastPersonaAt: lastPersona ? new Date(lastPersona.deliver_at as string) : null, now: replyNow, presence });
  const plan = planDelivery({
    now: replyNow, presence, emotion: next, profile: spec.derived.responseProfile, userText: text, replies: reply.messages,
    boundary, voiceAllowed: s.limits.voice, vulnerable: events.includes('shared_self'), pace, ack: region.ack, rand,
  });
  // Escribe como en el teléfono: minúsculas, acentos que se le pasan, algún dedazo (nunca al marcar un límite).
  plan.items = humanizeItems(plan.items, quirksFor(spec, persona.id), rand, boundary);

  const unread = await db.from('persona_messages').update({ read_at: plan.readAt.toISOString() }).eq('persona_id', persona.id).eq('role', 'user').is('read_at', null);
  if (unread.error) console.error('[persons] read_at', unread.error.message);
  if (plan.items.length) {
    const { error: e } = await db.from('persona_messages').insert(plan.items.map((it) => ({
      persona_id: persona.id, user_id: s.userId, role: 'persona', kind: it.kind, content: it.content.slice(0, 2000),
      deliver_at: it.deliverAt.toISOString(), emotion: snap, meta: { ...it.meta, boundary: reply.sets_boundary || undefined },
    })));
    if (e) console.error('[persons] programar respuesta', e.message);
    // Una foto de lo que está viendo, de vez en cuando (máx. una cada 6 h, nunca al marcar un límite ni en el primer mensaje).
    if (reply.photo && !boundary && (userTurns ?? 0) >= 2 && !(recentPhotos ?? 0)) {
      scheduleChatPhoto({ personaId: persona.id, userId: s.userId, query: reply.photo, caption: null, deliverAt: plan.items[0]!.deliverAt });
    }
  }
  scheduleTip(persona, Boolean(opts.blind), s.region);
  await db.from('personas').update({ emotion: next, emotion_at: nowIso, last_message_at: nowIso, updated_at: nowIso }).eq('id', persona.id);
  return { ok: true, messageId: inserted.id as string };
}
