import { createAdminClient } from '@/lib/supabase/server';
import { computeOutcomes } from '@/lib/admin/outcomes';
import { wellbeingOutcomes, type UserHistory, type WeeklyEstimate } from '@/lib/wellbeing';
import { analyzeHablame, type HAccount, type HDebrief, type HFunnel, type HMessage, type HReferral } from '@/lib/admin/hablame';
import { isAdminEmail } from '@/lib/admin/auth';
import type { FeedbackRow } from '@/lib/admin/feedback';
import type { EmotionSnapshot } from '@/lib/persons/emotion';

/** Datos del panel (service role). Solo se llaman tras comprobar que quien pide es administrador. */
const DAY = 86_400_000;
const since = (days: number) => new Date(Date.now() - days * DAY).toISOString();

const isDemoEmail = (e: string | null | undefined) => Boolean(e && /\.demo@soi\.app$/i.test(e));

export async function overview() {
  const a = createAdminClient();
  const count = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;
  const [{ data: auth }, { data: allProfiles }, runs7, crisis7, { data: msgs7 }] = await Promise.all([
    a.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    a.from('user_profiles').select('user_id, plan, created_at, app_role').limit(5000),
    count(a.from('moment_runs').select('id', { count: 'exact', head: true }).not('completed_at', 'is', null).gte('completed_at', since(7))),
    count(a.from('agent_knowledge').select('id', { count: 'exact', head: true }).eq('category', 'crisis_log').gte('created_at', since(7))),
    a.from('messages').select('user_id, role, tokens_used, created_at').gte('created_at', since(7)).limit(20_000),
  ]);
  // Sin las cuentas demo (*.demo@soi.app). Las de Háblame (/persons) se cuentan aparte: su análisis está en /panel/hablame.
  const demo = new Set((auth?.users ?? []).filter((u) => isDemoEmail(u.email)).map((u) => u.id));
  const hablame = (allProfiles ?? []).filter((p) => p.app_role === 'persons' && !demo.has(p.user_id as string)).length;
  const profiles = (allProfiles ?? []).filter((p) => p.app_role !== 'persons');
  const real = (profiles ?? []).filter((p) => !demo.has(p.user_id as string));
  const by = (plan: string) => real.filter((p) => p.plan === plan).length;
  const total = real.length, trial = by('trial'), free = by('free'), plus = by('soi_plus');
  const new7 = real.filter((p) => Date.now() - Date.parse(p.created_at as string) < 7 * DAY).length;
  const rows = ((msgs7 ?? []) as { user_id: string; role: string; tokens_used: number | null; created_at: string }[]).filter((m) => !demo.has(m.user_id));
  const today = rows.filter((m) => Date.now() - Date.parse(m.created_at) < DAY);
  return {
    users: { total, trial, free, plus, new7, hablame },
    active7: new Set(rows.filter((m) => m.role === 'user').map((m) => m.user_id)).size,
    messages7: rows.filter((m) => m.role === 'user').length,
    messagesToday: today.filter((m) => m.role === 'user').length,
    tokens7: rows.reduce((s, m) => s + (m.tokens_used ?? 0), 0),
    tokensToday: today.reduce((s, m) => s + (m.tokens_used ?? 0), 0),
    runs7, crisis7,
  };
}

export type UserRow = {
  id: string; email: string | null; name: string | null; plan: string | null; trialEnds: string | null; freeLeft: number | null;
  createdAt: string; lastSignIn: string | null; demo: boolean;
};

/** Lista de cuentas (búsqueda por correo o nombre). Para la escala actual basta con leer hasta 1000. */
export async function listUsers(q = '', page = 1, perPage = 50) {
  const a = createAdminClient();
  const { data: auth } = await a.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const users = auth?.users ?? [];
  const { data: profiles } = await a.from('user_profiles').select('user_id, display_name, plan, trial_ends_at, free_queries_remaining')
    .in('user_id', users.map((u) => u.id));
  const byId = new Map((profiles ?? []).map((p) => [p.user_id as string, p]));
  const needle = q.trim().toLowerCase();
  const rows: UserRow[] = users.map((u) => {
    const p = byId.get(u.id);
    return {
      id: u.id, email: u.email ?? null, name: (p?.display_name as string | null) ?? null, plan: (p?.plan as string | null) ?? null,
      trialEnds: (p?.trial_ends_at as string | null) ?? null, freeLeft: (p?.free_queries_remaining as number | null) ?? null,
      createdAt: u.created_at, lastSignIn: u.last_sign_in_at ?? null, demo: isDemoEmail(u.email),
    };
  }).filter((r) => !needle || r.email?.toLowerCase().includes(needle) || r.name?.toLowerCase().includes(needle))
    .sort((x, y) => Date.parse(y.lastSignIn ?? y.createdAt) - Date.parse(x.lastSignIn ?? x.createdAt));
  return { rows: rows.slice((page - 1) * perPage, page * perPage), total: rows.length };
}

/** Todo lo de una cuenta, para revisión. */
export async function userDetail(id: string) {
  const a = createAdminClient();
  const [{ data: auth }, { data: profile }, { data: convs }, { data: runs }, { data: moments }, { data: memories }, { data: identities }, { data: enemies }, { data: msgs7 }, { data: crisis }] = await Promise.all([
    a.auth.admin.getUserById(id),
    a.from('user_profiles').select('*').eq('user_id', id).maybeSingle(),
    a.from('conversations').select('id, title, agent_category, message_count, last_message_at, created_at, is_archived').eq('user_id', id).order('last_message_at', { ascending: false }).limit(50),
    a.from('moment_runs').select('id, moment_id, moment_slug, started_at, completed_at, mood_before, mood_after, helped, learning, outputs').eq('user_id', id).order('started_at', { ascending: false }).limit(30),
    a.from('soi_blueprints').select('id, title, kind, status, required_minutes, created_at, executions_count').eq('creator_id', id).neq('status', 'archived').order('created_at', { ascending: false }).limit(50),
    a.from('agent_knowledge').select('id, category, title, content, tags, created_at').eq('user_id', id).neq('category', 'crisis_log').order('created_at', { ascending: false }).limit(60),
    a.from('identities').select('name, status, capacities').eq('user_id', id),
    a.from('enemy_events').select('enemy, source, evidence, occurred_at').eq('user_id', id).order('occurred_at', { ascending: false }).limit(30),
    a.from('messages').select('role, tokens_used, created_at, provider').eq('user_id', id).gte('created_at', since(7)).limit(5000),
    a.from('agent_knowledge').select('id, content, created_at').eq('user_id', id).eq('category', 'crisis_log').order('created_at', { ascending: false }).limit(20),
  ]);
  if (!auth?.user) return null;
  const m7 = (msgs7 ?? []) as { role: string; tokens_used: number | null; created_at: string; provider: string | null }[];
  const providers = new Map<string, number>();
  for (const m of m7) if (m.provider) providers.set(m.provider, (providers.get(m.provider) ?? 0) + 1);
  return {
    auth: { email: auth.user.email ?? null, createdAt: auth.user.created_at, lastSignIn: auth.user.last_sign_in_at ?? null, provider: auth.user.app_metadata?.provider ?? null },
    profile: profile as Record<string, unknown> | null,
    conversations: convs ?? [], runs: runs ?? [], moments: moments ?? [], memories: memories ?? [], identities: identities ?? [], enemies: enemies ?? [],
    usage: {
      messages7: m7.filter((m) => m.role === 'user').length,
      tokens7: m7.reduce((s, m) => s + (m.tokens_used ?? 0), 0),
      tokensToday: m7.filter((m) => Date.now() - Date.parse(m.created_at) < DAY).reduce((s, m) => s + (m.tokens_used ?? 0), 0),
      providers: [...providers.entries()],
    },
    crisis: crisis ?? [],
  };
}

export async function conversationMessages(userId: string, conversationId: string) {
  const a = createAdminClient();
  const [{ data: conv }, { data: msgs }] = await Promise.all([
    a.from('conversations').select('id, title, created_at, user_id').eq('id', conversationId).eq('user_id', userId).maybeSingle(),
    a.from('messages').select('id, role, content, agent_category, provider, tokens_used, created_at').eq('conversation_id', conversationId).eq('user_id', userId).order('created_at', { ascending: true }).limit(500),
  ]);
  return conv ? { conv, msgs: msgs ?? [] } : null;
}

export async function auditLog(limit = 150) {
  const { data } = await createAdminClient().from('admin_audit').select('id, admin_id, action, target_user, detail, created_at').order('created_at', { ascending: false }).limit(limit);
  return data ?? [];
}

/** Activación, retención y transformación (últimos 120 días de registros; sin cuentas demo ni contenido). */
export async function outcomes() {
  const a = createAdminClient();
  const from = since(120);
  const [{ data: auth }, { data: msgs }, { data: runs }, { data: maps }, { data: assess }, { data: wb }, { data: roles }] = await Promise.all([
    a.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    a.from('messages').select('user_id, created_at').eq('role', 'user').gte('created_at', from).limit(50_000),
    a.from('moment_runs').select('user_id, completed_at').not('completed_at', 'is', null).gte('completed_at', from).limit(50_000),
    a.from('life_maps').select('user_id, focus_areas').limit(5000),
    a.from('life_assessments').select('user_id, kind, scores, created_at').limit(20_000),
    a.from('wellbeing_estimates').select('user_id, week_end, score, confidence').limit(50_000),
    a.from('user_profiles').select('user_id').eq('app_role', 'persons').limit(10_000),
  ]);
  // Solo cuentas de SOI: las de Háblame no usan el chat ni los Moments y bajarían la activación (ver /panel/hablame).
  const hablame = new Set((roles ?? []).map((r) => r.user_id as string));
  const users = (auth?.users ?? []).filter((u) => !isDemoEmail(u.email) && !hablame.has(u.id) && Date.parse(u.created_at) >= Date.parse(from)).map((u) => ({ id: u.id, created_at: u.created_at }));
  const real = new Set((auth?.users ?? []).filter((u) => !isDemoEmail(u.email)).map((u) => u.id));
  const activity = [
    ...(msgs ?? []).map((m) => ({ user_id: m.user_id as string, at: m.created_at as string, kind: 'message' as const })),
    ...(runs ?? []).map((r) => ({ user_id: r.user_id as string, at: r.completed_at as string, kind: 'moment' as const })),
  ];
  const byUser = new Map<string, { kind: string; scores: Record<string, number>; created_at: string }[]>();
  for (const r of assess ?? []) byUser.set(r.user_id as string, [...(byUser.get(r.user_id as string) ?? []), { kind: r.kind as string, scores: (r.scores ?? {}) as Record<string, number>, created_at: r.created_at as string }]);
  const mapRows = (maps ?? []).filter((m) => real.has(m.user_id as string))
    .map((m) => ({ user_id: m.user_id as string, focus: (m.focus_areas as string[] | null) ?? [], assessments: byUser.get(m.user_id as string) ?? [] }));
  // Bienestar (WHO-5 estimado): primera semana medida vs. la última, 4+ semanas después.
  const wbBy = new Map<string, WeeklyEstimate[]>();
  for (const r of wb ?? []) if (real.has(r.user_id as string)) wbBy.set(r.user_id as string, [...(wbBy.get(r.user_id as string) ?? []), r as unknown as WeeklyEstimate]);
  const histories: UserHistory[] = [...wbBy].map(([user_id, history]) => ({ user_id, history }));
  return { ...computeOutcomes(users, activity, mapRows), signups: users.length, wellbeing: wellbeingOutcomes(histories) };
}

/**
 * Háblame (/persons): de dónde llegan, si practican, si vuelven y si conversan mejor (120 días; sin demo ni
 * administración; nunca el texto de los mensajes: solo eventos y emoción calculados por reglas). Ver `analyzeHablame`.
 */
export async function hablame() {
  const a = createAdminClient();
  const from = since(120);
  const count = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;
  const [{ data: auth }, { data: profiles }, { data: funnel }, { data: personas }, { data: msgs }, { data: debriefs }, { data: asks }, { data: refs }, { data: reacted }, voiceHeard, crisis, blockedDescriptions, blockedTurns] = await Promise.all([
    a.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    a.from('user_profiles').select('user_id, app_role, plan, created_at').gte('created_at', from).limit(10_000),
    a.from('funnel_events').select('event, detail, visitor_id, user_id').in('event', ['landing_view', 'login_view', 'signup']).gte('at', from).limit(100_000),
    a.from('personas').select('user_id').gte('created_at', from).limit(20_000),
    a.from('persona_messages').select('user_id, created_at, emotion').eq('role', 'user').is('meta->blocked', null).gte('created_at', from).order('created_at', { ascending: true }).limit(100_000),
    a.from('persona_debriefs').select('user_id, created_at, scores:report->scores, source:report->>source').gte('created_at', from).limit(20_000),
    a.from('persona_coach_messages').select('user_id').eq('role', 'user').gte('created_at', from).limit(50_000),
    a.from('persons_referrals').select('referrer_id, activated_at, reward_days').gte('created_at', from).limit(10_000),
    a.from('persona_messages').select('user_id').eq('role', 'persona').not('meta->user_reaction', 'is', null).gte('created_at', from).limit(50_000),
    count(a.from('persona_messages').select('id', { count: 'exact', head: true }).eq('kind', 'voice').not('heard_at', 'is', null).gte('created_at', from)),
    count(a.from('agent_knowledge').select('id', { count: 'exact', head: true }).eq('category', 'crisis_log').in('metadata->>source', ['persons', 'persons_coach']).gte('created_at', from)),
    count(a.from('persona_generations').select('id', { count: 'exact', head: true }).not('blocked_reason', 'is', null).gte('created_at', from)),
    count(a.from('persona_messages').select('id', { count: 'exact', head: true }).eq('role', 'user').not('meta->blocked', 'is', null).gte('created_at', from)),
  ]);
  const skip = new Set((auth?.users ?? []).filter((u) => isDemoEmail(u.email) || isAdminEmail(u.email)).map((u) => u.id));
  const keep = <T extends { user_id: string | null }>(rows: T[] | null) => (rows ?? []).filter((r) => !r.user_id || !skip.has(r.user_id));
  const accounts: HAccount[] = keep(profiles as { user_id: string; app_role: string | null; plan: string; created_at: string }[] | null)
    .map((p) => ({ id: p.user_id, role: p.app_role === 'persons' ? 'persons' : 'soi', createdAt: p.created_at, plan: p.plan }));
  const messages: HMessage[] = keep(msgs as { user_id: string; created_at: string; emotion: EmotionSnapshot | null }[] | null)
    .map((m) => ({ user_id: m.user_id, at: m.created_at, events: m.emotion?.events ?? [], openness: m.emotion?.openness ?? null }));
  const reactors = keep(reacted as { user_id: string }[] | null);
  return analyzeHablame({
    accounts,
    funnel: keep(funnel as HFunnel[] | null),
    personas: keep(personas as { user_id: string }[] | null),
    messages,
    debriefs: keep(debriefs as { user_id: string; created_at: string; scores: HDebrief['scores']; source: string | null }[] | null)
      .map((d) => ({ user_id: d.user_id, at: d.created_at, scores: d.scores, source: d.source })),
    coachAsks: keep(asks as { user_id: string }[] | null),
    referrals: ((refs ?? []) as HReferral[]).filter((r) => !skip.has(r.referrer_id)),
    reactions: reactors.length,
    reactors: new Set(reactors.map((r) => r.user_id)).size,
    voiceHeard, crisis, blockedDescriptions, blockedTurns,
  });
}

/**
 * Lo que dicen (burbuja de opinión de SOI): los últimos `days` días, sin demo ni administración. Ver `analyzeFeedback`.
 */
export async function feedback(days = 90) {
  const a = createAdminClient();
  const [{ data: auth }, { data, error }] = await Promise.all([
    a.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    a.from('app_feedback').select('id, user_id, rating, liked, disliked, path, device, plan, account_days, source, crisis, created_at')
      .gte('created_at', since(days)).order('created_at', { ascending: false }).limit(5000),
  ]);
  const skip = new Set((auth?.users ?? []).filter((u) => isDemoEmail(u.email) || isAdminEmail(u.email)).map((u) => u.id));
  const emails = new Map((auth?.users ?? []).map((u) => [u.id, u.email ?? null]));
  const rows = ((data ?? []) as FeedbackRow[]).filter((r) => !r.user_id || !skip.has(r.user_id));
  return { rows, emails, error: error?.message ?? null };
}
