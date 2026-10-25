import { cache } from 'react';
import { createAdminClient, getSessionUser } from '@/lib/supabase/server';
import { getProfile } from '@/lib/billing/check-access';
import { effectivePlan, type EffectivePlan } from '@/lib/billing/access-rules';
import { isAdminEmail } from '@/lib/admin/auth';
import type { UserProfile } from '@/types/database';
import { buildSpec, hash, type Described, type PersonSpec } from './spec';
import { cityCountry, localCity, REGIONS } from '@/config/regionalisms';
import { initialEmotion, labelFor, parseEmotion, type EmotionLabel, type EmotionSnapshot } from './emotion';
import { lastSeenAt, presenceAt, presenceLabel } from './presence';
import { personsLimits, type PersonsLimits } from './entitlements';
import { ENGAGED_MS, typingSeconds } from './scheduler';
import { personsImageUrl, scheduleAvatar } from './images';
import { coachBadge, coachSummary, type CoachSummary } from './coach-server';

/** Fila de `personas` (0041). */
export type PersonaRow = {
  id: string;
  user_id: string;
  preset_id: string | null;
  name: string;
  age: number;
  gender: string;
  profession: string;
  city: string;
  bio: string;
  difficulty: number;
  timezone: string;
  voice: string | null;
  hue: number;
  spec: PersonSpec;
  spec_version: number;
  emotion: unknown;
  emotion_at: string;
  last_message_at: string | null;
  last_read_at: string;
  archived_at: string | null;
  created_at: string;
  /** 0042: foto de perfil (IA o libre de derechos) y hasta dónde leyó lo del coach. */
  avatar_path?: string | null;
  avatar_source?: string | null;
  avatar_at?: string | null;
  coach_read_at?: string;
};

export type PersonaMessageRow = {
  id: string;
  persona_id: string;
  role: 'user' | 'persona' | 'system';
  kind: 'text' | 'voice';
  content: string;
  deliver_at: string;
  read_at: string | null;
  heard_at: string | null;
  emotion: EmotionSnapshot | null;
  meta: Record<string, unknown>;
  created_at: string;
};

export type PersonsSession = {
  userId: string;
  email: string | undefined;
  profile: UserProfile & { app_role?: string };
  plan: EffectivePlan;
  limits: PersonsLimits;
  timezone: string;
  /** País de origen (IP al registrarse; si no, el del perfil): de dónde son los arquetipos y cómo habla el coach. */
  region: string;
};

/** Una cuenta entra a /persons si es de este tipo (o si administra SOI, para revisarlo). */
export function isPersonsAccount(profile: { app_role?: string } | null, email?: string | null) {
  return profile?.app_role === 'persons' || isAdminEmail(email);
}

/** Sesión de /persons o el motivo por el que no hay (sin sesión, otra cuenta). Una vez por petición. */
export const getPersonsSession = cache(async (): Promise<PersonsSession | 'signed_out' | 'other_account'> => {
  const { user } = await getSessionUser();
  if (!user) return 'signed_out';
  const profile = (await getProfile(user.id)) as (UserProfile & { app_role?: string }) | null;
  if (!profile || !isPersonsAccount(profile, user.email)) return 'other_account';
  const plan = effectivePlan(profile);
  return { userId: user.id, email: user.email, profile, plan, limits: personsLimits(plan), timezone: profile.timezone ?? 'America/Mexico_City', region: (profile.geo_country ?? profile.country ?? 'MX').toUpperCase() };
});

/** Para las rutas API: la sesión o una respuesta de error lista. */
export async function personsApiSession(): Promise<PersonsSession | Response> {
  const s = await getPersonsSession();
  if (s === 'signed_out') return new Response('No autorizado', { status: 401 });
  if (s === 'other_account') return new Response('Esta cuenta no es de este espacio', { status: 403 });
  return s;
}

export async function loadPersona(userId: string, id: string): Promise<PersonaRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await createAdminClient().from('personas').select('*').eq('id', id).eq('user_id', userId).maybeSingle();
  return (data as PersonaRow | null) ?? null;
}

export async function activeCount(userId: string) {
  const { count } = await createAdminClient().from('personas').select('id', { count: 'exact', head: true }).eq('user_id', userId).is('archived_at', null);
  return count ?? 0;
}

/** Inserta una persona nueva a partir de su ficha. */
export async function insertPersona(s: PersonsSession, described: Described, source: string, presetId: string | null, opts: { localize?: boolean } = {}) {
  const db = createAdminClient();
  const seed = `${s.userId}:${described.name}:${Date.now()}`;
  // Un arquetipo listo se muda a una ciudad de tu país; uno descrito es de su ciudad (o, si no se reconoce, de tu país).
  const region = REGIONS[s.region];
  const own = cityCountry(described.city);
  let country = own ?? s.region;
  if (opts.localize && presetId && region && own !== s.region) {
    described = { ...described, city: localCity(region, hash(presetId)) };
    country = s.region;
  }
  const spec: PersonSpec = { ...buildSpec(described, source, seed), country };
  const { data, error } = await db.from('personas').insert({
    user_id: s.userId, preset_id: presetId, name: spec.name, age: spec.age, gender: spec.gender,
    profession: spec.profession, city: spec.city, bio: spec.bio, difficulty: spec.difficulty,
    timezone: s.timezone, voice: spec.derived.voice, hue: spec.derived.hue, spec,
    emotion: initialEmotion(spec.derived.temperament),
  }).select('id').single();
  if (error || !data) throw new Error(error?.message ?? 'no se pudo crear');
  // La foto de perfil se prepara mientras abre el chat (no retrasa la creación).
  scheduleAvatar({ id: data.id as string, user_id: s.userId, spec });
  return data.id as string;
}

export type PersonaHeader = { presence: string; emotion: EmotionLabel; online: boolean };

/**
 * `active`: están platicando (contestó hace poco o su respuesta viene en camino en segundos): se queda «en línea»
 * aunque su día diga otra cosa, como quien sigue con el chat abierto.
 */
export function headerFor(p: PersonaRow, now: Date, lastPersonaAt: Date | null, active = false): PersonaHeader {
  const presence = presenceAt(p.spec.derived.dayPlan, now, p.timezone);
  const emotion = parseEmotion(p.emotion, p.spec.derived.temperament);
  const online = presence.state === 'online' || active;
  return {
    presence: online ? 'en línea' : presenceLabel(presence, lastSeenAt(p.spec.derived.dayPlan, now, p.timezone, lastPersonaAt), now, p.timezone),
    emotion: labelFor(emotion, now, presence.state),
    online,
  };
}

/** Foto de perfil si ya la tiene; si no, se prepara después de responder (la pantalla no espera). */
export function avatarFor(p: PersonaRow): string | null {
  if (!p.avatar_path && !p.archived_at) scheduleAvatar(p);
  return personsImageUrl(p.avatar_path);
}

export type ChatListItem = {
  id: string;
  name: string;
  hue: number;
  avatar: string | null;
  gender: string;
  line: string;
  online: boolean;
  last: { content: string; kind: 'text' | 'voice'; role: string; at: string; read: boolean } | null;
  unread: number;
  archived: boolean;
};

/** La lista de chats: último mensaje entregado, no leídos y si está en línea. */
/** La lista de chats y la fila fija de Ale (el coach), con lo nuevo de cada uno. */
export async function loadInbox(userId: string): Promise<{ chats: ChatListItem[]; coach: CoachSummary | null }> {
  const { data } = await createAdminClient().from('personas').select('id, name, created_at, coach_read_at').eq('user_id', userId).limit(60);
  const personas = (data ?? []) as Pick<PersonaRow, 'id' | 'name' | 'created_at' | 'coach_read_at'>[];
  const [chats, coach] = await Promise.all([loadChatList(userId), personas.length ? coachSummary(userId, personas) : Promise.resolve(null)]);
  return { chats, coach };
}

export async function loadChatList(userId: string, opts: { archived?: boolean } = {}): Promise<ChatListItem[]> {
  const db = createAdminClient();
  let q = db.from('personas').select('*').eq('user_id', userId);
  q = opts.archived ? q.not('archived_at', 'is', null) : q.is('archived_at', null);
  const { data } = await q.order('last_message_at', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false }).limit(40);
  const personas = (data ?? []) as PersonaRow[];
  const now = new Date();
  const nowIso = now.toISOString();
  return Promise.all(personas.map(async (p) => {
    const [{ data: last }, { count }] = await Promise.all([
      db.from('persona_messages').select('content, kind, role, deliver_at, read_at, meta').eq('persona_id', p.id).lte('deliver_at', nowIso)
        .order('deliver_at', { ascending: false }).limit(1).maybeSingle(),
      db.from('persona_messages').select('id', { count: 'exact', head: true }).eq('persona_id', p.id).eq('role', 'persona')
        .gt('deliver_at', p.last_read_at).lte('deliver_at', nowIso),
    ]);
    const presence = presenceAt(p.spec.derived.dayPlan, now, p.timezone);
    return {
      id: p.id, name: p.name, hue: p.hue, avatar: avatarFor(p), gender: p.gender, line: `${p.profession} · ${p.city}`,
      online: (presence.state === 'online' || Boolean(last && last.role === 'persona' && now.getTime() - Date.parse(last.deliver_at as string) < ENGAGED_MS)) && !p.archived_at,
      last: last ? { content: (last.meta as { photo?: string } | null)?.photo ? '📷 Foto' : last.content as string, kind: last.kind as 'text' | 'voice', role: last.role as string, at: last.deliver_at as string, read: Boolean(last.read_at && (last.read_at as string) <= nowIso) } : null,
      unread: count ?? 0,
      archived: Boolean(p.archived_at),
    };
  }));
}

/** Mensajes visibles (entregados) para el cliente; los programados solo dejan ver cuándo empieza a escribir. */
export function publicMessage(m: PersonaMessageRow, nowIso: string, showEmotion: boolean) {
  return {
    id: m.id,
    role: m.role,
    kind: m.kind,
    content: m.content,
    at: m.role === 'user' ? m.created_at : m.deliver_at,
    read: m.role === 'user' ? Boolean(m.read_at && m.read_at <= nowIso) : undefined,
    heard: m.kind === 'voice' ? Boolean(m.heard_at) : undefined,
    emotion: showEmotion && m.role === 'user' && m.emotion ? m.emotion.label : undefined,
    photo: typeof m.meta?.photo === 'string' ? personsImageUrl(m.meta.photo) : undefined,
    caption: typeof m.meta?.photo === 'string' ? m.meta.caption === true : undefined,
  };
}
export type PublicMessage = ReturnType<typeof publicMessage>;

/** Estado del chat (lo usan la página y la API que se consulta cada pocos segundos). */
export async function loadChatState(persona: PersonaRow, showEmotion: boolean) {
  const db = createAdminClient();
  const now = new Date();
  const nowIso = now.toISOString();
  const [{ data: rows }, { data: pending }, coach] = await Promise.all([
    db.from('persona_messages').select('*').eq('persona_id', persona.id).lte('deliver_at', nowIso).order('deliver_at', { ascending: false }).limit(120),
    db.from('persona_messages').select('kind, content, deliver_at').eq('persona_id', persona.id).eq('role', 'persona').gt('deliver_at', nowIso)
      .order('deliver_at', { ascending: true }).limit(1).maybeSingle(),
    coachBadge(persona).catch(() => ({ unread: 0, preview: null })),
  ]);
  const messages = ((rows ?? []) as PersonaMessageRow[]).reverse();
  const lastPersona = [...messages].reverse().find((m) => m.role === 'persona');
  const active = Boolean((lastPersona && now.getTime() - Date.parse(lastPersona.deliver_at) < ENGAGED_MS)
    || (pending && Date.parse(pending.deliver_at as string) - now.getTime() < 2 * 60_000));
  const header = headerFor(persona, now, lastPersona ? new Date(lastPersona.deliver_at) : null, active);
  let next: { at: string; typingFrom: string; kind: 'text' | 'voice' } | null = null;
  if (pending) {
    const at = Date.parse(pending.deliver_at as string);
    const kind = pending.kind as 'text' | 'voice';
    next = { at: new Date(at).toISOString(), typingFrom: new Date(at - typingSeconds(pending.content as string, kind) * 1000).toISOString(), kind };
  }
  return {
    messages: messages.map((m) => publicMessage(m, nowIso, showEmotion)),
    header: { ...header, emotion: showEmotion ? header.emotion : null },
    next,
    archived: Boolean(persona.archived_at),
    avatar: avatarFor(persona),
    coach,
  };
}
export type ChatState = Awaited<ReturnType<typeof loadChatState>>;
