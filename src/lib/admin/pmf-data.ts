import { createAdminClient } from '@/lib/supabase/server';
import { outcomes } from '@/lib/admin/data';
import { loadNavEvents } from '@/lib/admin/analytics';
import { loadChatOutcomes, loadFunnel } from '@/lib/admin/signups';
import { adminEmails } from '@/lib/admin/notify';
import { analyzeChat, analyzeFunnel } from '@/lib/analytics/funnel';
import { analyzeFlows, buildSessions } from '@/lib/analytics/nav';
import { analyzePmf, pmfFingerprint, type PmfAnalysis, type PmfSnapshot } from '@/lib/admin/pmf';
import { analyzeConversations, complaintHits, type PrevReply, type UserMsg } from '@/lib/admin/conversation-signals';

/** Datos de /panel/analyticsAI (service role). Solo se llaman tras comprobar que quien pide es administrador. */
const DAY = 86_400_000;
const since = (days: number) => new Date(Date.now() - days * DAY).toISOString();
const isDemoEmail = (e: string | null | undefined) => Boolean(e && /\.demo@soi\.app$/i.test(e));

/** PostgREST entrega de a 1000 filas: se pagina hasta `max`. */
async function fetchAll<T>(page: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>, max = 50_000): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; from < max; from += 1000) {
    const { data, error } = await page(from, from + 999);
    if (error) break;
    rows.push(...((data ?? []) as T[]));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

/** Nombres de las herramientas que usó una respuesta (tool_calls del AI SDK). */
const toolNames = (calls: unknown): string[] =>
  Array.isArray(calls) ? [...new Set(calls.map((c) => (c as { toolName?: string; name?: string })?.toolName ?? (c as { name?: string })?.name).filter((n): n is string => Boolean(n)))] : [];

/**
 * Lo que no les sirvió en el chat: los mensajes de la persona del periodo y, para cada queja, la respuesta de SOI
 * justo antes (hasta 150 quejas, las más recientes).
 */
async function loadConversationInsights(days: number, excluded: Set<string>) {
  const a = createAdminClient();
  const msgs = (await fetchAll<UserMsg>((f, t) => a.from('messages').select('id, conversation_id, user_id, content, created_at, agent_category')
    .eq('role', 'user').gte('created_at', since(days)).order('created_at').range(f, t), 30_000)).filter((m) => !excluded.has(m.user_id));
  const hits = complaintHits(msgs).slice(-150);
  const prev = new Map<string, PrevReply>();
  for (let i = 0; i < hits.length; i += 15) {
    await Promise.all(hits.slice(i, i + 15).map(async ({ msg }) => {
      const { data } = await a.from('messages').select('content, agent_category, provider, tool_calls')
        .eq('conversation_id', msg.conversation_id).eq('role', 'assistant').lt('created_at', msg.created_at)
        .order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (data) prev.set(msg.id, { content: String(data.content ?? ''), agent: (data.agent_category as string | null) ?? null, provider: (data.provider as string | null) ?? null, tools: toolNames(data.tool_calls) });
    }));
  }
  return analyzeConversations(msgs, prev);
}

/** La foto de los datos de todo el panel para el periodo: cuentas, resultados, embudo, chat de la landing, navegación, Moments y uso. */
export async function pmfSnapshot(days: number): Promise<PmfSnapshot> {
  const a = createAdminClient();
  const activityFrom = since(Math.max(days, 30));
  const [{ data: auth }, profiles, out, funnelData, chatOutcomes, nav, runs, msgs, crisis] = await Promise.all([
    a.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    fetchAll<{ user_id: string; plan: string | null; created_at: string }>((f, t) => a.from('user_profiles').select('user_id, plan, created_at').range(f, t)),
    outcomes(),
    loadFunnel(days),
    loadChatOutcomes(days),
    loadNavEvents({ days }),
    fetchAll<{ user_id: string; started_at: string; completed_at: string | null; helped: boolean | null; mood_before: number | null; mood_after: number | null }>((f, t) =>
      a.from('moment_runs').select('user_id, started_at, completed_at, helped, mood_before, mood_after').gte('started_at', since(days)).order('started_at').range(f, t)),
    fetchAll<{ user_id: string; role: string; tokens_used: number | null; provider: string | null; created_at: string }>((f, t) =>
      a.from('messages').select('user_id, role, tokens_used, provider, created_at').gte('created_at', activityFrom).order('created_at').range(f, t)),
    a.from('agent_knowledge').select('id', { count: 'exact', head: true }).eq('category', 'crisis_log').gte('created_at', since(days)),
  ]);

  // Sin cuentas demo ni administradores.
  const admins = new Set(adminEmails());
  const excluded = new Set((auth?.users ?? []).filter((u) => isDemoEmail(u.email) || admins.has((u.email ?? '').toLowerCase())).map((u) => u.id));
  const keep = <T extends { user_id: string | null }>(rows: T[]) => rows.filter((r) => !r.user_id || !excluded.has(r.user_id));

  const real = keep(profiles);
  const plan = (p: string) => real.filter((r) => r.plan === p).length;
  const periodStart = Date.now() - days * DAY;

  // Moments del periodo.
  const r = keep(runs);
  const done = r.filter((x) => x.completed_at);
  const answered = done.filter((x) => x.helped !== null);
  const moods = done.filter((x) => x.mood_before && x.mood_after);
  const daysBy = new Map<string, Set<string>>();
  for (const x of done) daysBy.set(x.user_id, (daysBy.get(x.user_id) ?? new Set()).add(x.completed_at!.slice(0, 10)));

  // Actividad (escribir o terminar un Moment) para DAU/MAU de 30 días y activos del periodo.
  const m = keep(msgs);
  const userMsgs = m.filter((x) => x.role === 'user');
  const active = new Map<string, Set<string>>(); // día → personas
  const month = Date.now() - 30 * DAY;
  const activeInPeriod = new Set<string>();
  const mark = (uid: string, at: string) => {
    const t = Date.parse(at);
    if (t >= periodStart) activeInPeriod.add(uid);
    if (t < month) return;
    const d = at.slice(0, 10);
    active.set(d, (active.get(d) ?? new Set()).add(uid));
  };
  for (const x of userMsgs) mark(x.user_id, x.created_at);
  for (const x of done) mark(x.user_id, x.completed_at!);
  const mau = new Set([...active.values()].flatMap((s) => [...s])).size;
  const avgDau = [...active.values()].reduce((s, v) => s + v.size, 0) / 30;

  const inPeriod = m.filter((x) => Date.parse(x.created_at) >= periodStart);
  const providers = new Map<string, number>();
  for (const x of inPeriod) if (x.provider && x.role === 'assistant') providers.set(x.provider, (providers.get(x.provider) ?? 0) + 1);

  const funnel = funnelData.error ? null : analyzeFunnel(funnelData.rows);
  const chat = funnelData.error ? null : analyzeChat(funnelData.rows);
  const step = (id: string) => funnel?.steps.find((x) => x.id === id)?.count ?? 0;
  const cstep = (id: string) => chat?.steps.find((x) => x.id === id)?.count ?? 0;
  const flows = nav.error ? null : analyzeFlows(buildSessions(nav.events.filter((e) => !e.user_id || !excluded.has(e.user_id))));
  const conversations = await loadConversationInsights(days, excluded).catch(() => undefined);

  return {
    generatedAt: new Date().toISOString(),
    days,
    users: { total: real.length, trial: plan('trial'), free: plan('free'), plus: plan('soi_plus'), newInPeriod: real.filter((x) => Date.parse(x.created_at) >= periodStart).length },
    outcomes: {
      signups: out.signups,
      activation: out.activation, wroteFirst: out.wroteFirst, d1: out.d1, d7: out.d7, d30: out.d30,
      transformation: { measured: out.transformation.measured, improved: out.transformation.improved, avgChange: out.transformation.avgChange },
    },
    funnel: funnel ? {
      visitors: funnel.visitors, landing: step('landing_view'), wanted: step('wanted'), authStart: step('auth_start'), signup: step('signup'),
      abandonedAfterAuth: funnel.abandonedAfterAuth, referrers: funnel.referrers,
    } : null,
    landingChat: chat ? {
      wrote: cstep('wrote'), designed: cstep('designed'), started: cstep('started'), claimed: cstep('claimed'),
      lived: chatOutcomes.lived, errors: chat.errors,
    } : null,
    nav: flows ? {
      sessions: flows.summary.sessions, users: flows.summary.users, pagesPerSession: flows.summary.pagesPerSession,
      medianSessionMs: flows.summary.medianSessionMs, bounceRate: flows.summary.bounceRate,
      frictions: flows.frictions.map((f) => ({ kind: f.kind, path: f.path, detail: f.detail })),
    } : null,
    moments: {
      started: r.length, completed: done.length,
      answered: answered.length, helped: answered.filter((x) => x.helped).length,
      moodPairs: moods.length,
      moodDelta: moods.length ? Math.round((moods.reduce((s, x) => s + (x.mood_after! - x.mood_before!), 0) / moods.length) * 100) / 100 : null,
      completers: daysBy.size, repeatCompleters: [...daysBy.values()].filter((s) => s.size >= 3).length,
    },
    engagement: { mau, avgDau, activeInPeriod: activeInPeriod.size, messages: userMsgs.filter((x) => Date.parse(x.created_at) >= periodStart).length },
    ai: { tokens: inPeriod.reduce((s, x) => s + (x.tokens_used ?? 0), 0), crisis: crisis.count ?? 0, providers: [...providers.entries()].sort((x, y) => y[1] - x[1]) },
    conversations,
  };
}

export type SavedAnalysis = {
  id: string; kind: 'rules' | 'ai'; parent_id: string | null; period_days: number; verdict: string | null; score: number | null;
  content: string; provider: string | null; created_at: string; snapshot?: PmfSnapshot;
};

const COLS = 'id, kind, parent_id, period_days, verdict, score, content, provider, created_at';

/**
 * Análisis por reglas del periodo con los datos de ahora. Se guarda solo si cambió respecto al último guardado
 * del mismo periodo (misma huella = mismo análisis): así cada visita no llena el historial.
 */
export async function currentRulesAnalysis(days: number, adminId: string): Promise<{ saved: SavedAnalysis | null; analysis: PmfAnalysis; snapshot: PmfSnapshot; error: string | null }> {
  const snapshot = await pmfSnapshot(days);
  const analysis = analyzePmf(snapshot);
  const fingerprint = pmfFingerprint(analysis, days);
  const a = createAdminClient();
  const { data: last, error: readError } = await a.from('admin_analyses').select(`${COLS}, fingerprint`)
    .eq('kind', 'rules').eq('period_days', days).order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (readError) return { saved: null, analysis, snapshot, error: readError.message };
  if (last && last.fingerprint === fingerprint) return { saved: last as SavedAnalysis, analysis, snapshot, error: null };
  const { data, error } = await a.from('admin_analyses').insert({
    kind: 'rules', period_days: days, verdict: analysis.verdict, score: analysis.score, fingerprint,
    snapshot, content: analysis.text, created_by: adminId,
  }).select(COLS).single();
  return { saved: (data as SavedAnalysis | null) ?? null, analysis, snapshot, error: error?.message ?? null };
}

/** Un análisis guardado (con su foto de datos) y las lecturas de la IA que tiene. */
export async function savedAnalysis(id: string) {
  const a = createAdminClient();
  const [{ data: rules }, { data: ai }] = await Promise.all([
    a.from('admin_analyses').select(`${COLS}, snapshot`).eq('id', id).eq('kind', 'rules').maybeSingle(),
    a.from('admin_analyses').select(COLS).eq('parent_id', id).order('created_at', { ascending: false }).limit(20),
  ]);
  return rules ? { rules: rules as SavedAnalysis, ai: (ai ?? []) as SavedAnalysis[] } : null;
}

/** Historial: los análisis por reglas más recientes y cuántas lecturas de IA tiene cada uno. */
export async function analysisHistory(limit = 40) {
  const a = createAdminClient();
  const { data } = await a.from('admin_analyses').select('id, kind, parent_id, period_days, verdict, score, created_at')
    .order('created_at', { ascending: false }).limit(limit * 4);
  const rows = data ?? [];
  const aiCount = new Map<string, number>();
  for (const r of rows) if (r.kind === 'ai' && r.parent_id) aiCount.set(r.parent_id as string, (aiCount.get(r.parent_id as string) ?? 0) + 1);
  return rows.filter((r) => r.kind === 'rules').slice(0, limit).map((r) => ({
    id: r.id as string, days: r.period_days as number, verdict: r.verdict as string | null, score: r.score as number | null,
    createdAt: r.created_at as string, ai: aiCount.get(r.id as string) ?? 0,
  }));
}
