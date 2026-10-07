import { createAdminClient } from '@/lib/supabase/server';

/** Datos del panel (service role). Solo se llaman tras comprobar que quien pide es administrador. */
const DAY = 86_400_000;
const since = (days: number) => new Date(Date.now() - days * DAY).toISOString();

const isDemoEmail = (e: string | null | undefined) => Boolean(e && /\.demo@soi\.app$/i.test(e));

export async function overview() {
  const a = createAdminClient();
  const count = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;
  const [{ data: auth }, { data: profiles }, runs7, crisis7, { data: msgs7 }] = await Promise.all([
    a.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    a.from('user_profiles').select('user_id, plan, created_at').limit(5000),
    count(a.from('moment_runs').select('id', { count: 'exact', head: true }).not('completed_at', 'is', null).gte('completed_at', since(7))),
    count(a.from('agent_knowledge').select('id', { count: 'exact', head: true }).eq('category', 'crisis_log').gte('created_at', since(7))),
    a.from('messages').select('user_id, role, tokens_used, created_at').gte('created_at', since(7)).limit(20_000),
  ]);
  // Sin las cuentas demo (*.demo@soi.app).
  const demo = new Set((auth?.users ?? []).filter((u) => isDemoEmail(u.email)).map((u) => u.id));
  const real = (profiles ?? []).filter((p) => !demo.has(p.user_id as string));
  const by = (plan: string) => real.filter((p) => p.plan === plan).length;
  const total = real.length, trial = by('trial'), free = by('free'), plus = by('soi_plus');
  const new7 = real.filter((p) => Date.now() - Date.parse(p.created_at as string) < 7 * DAY).length;
  const rows = ((msgs7 ?? []) as { user_id: string; role: string; tokens_used: number | null; created_at: string }[]).filter((m) => !demo.has(m.user_id));
  const today = rows.filter((m) => Date.now() - Date.parse(m.created_at) < DAY);
  return {
    users: { total, trial, free, plus, new7 },
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
