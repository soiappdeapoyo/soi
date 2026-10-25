import { SKILLS, type SkillId } from '@/lib/persons/debrief';

/**
 * ¿Háblame (/persons) de verdad ayuda? Puro y testeado: de dónde llegan (landing de SOI vs. /persons/entrar),
 * cuántos empiezan a practicar, cuántos vuelven y, sobre todo, si conversan mejor con el tiempo:
 * - Habilidades del coach (1–5): primer feedback vs. el último de cada persona.
 * - Señales en sus propios mensajes (reglas, sin contenido): primeros 10 vs. últimos 10 mensajes — cuánto preguntan
 *   por la otra persona, cuántos tropiezos (hablar solo de sí, genérico, cumplido físico pronto, límites) y qué tan
 *   abierto le respondió el personaje.
 * Nunca se usa el texto de los mensajes: solo los eventos y la emoción que ya calculan las reglas.
 */

export type Rate = { num: number; den: number; pct: number | null };
const rate = (num: number, den: number): Rate => ({ num, den, pct: den ? Math.round((num / den) * 100) : null });
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const round1 = (n: number | null) => (n === null ? null : Math.round(n * 10) / 10);
const DAY = 86_400_000;

export type HAccount = { id: string; role: 'soi' | 'persons'; createdAt: string; plan: string };
export type HFunnel = { event: string; detail: string | null; visitor_id: string | null; user_id: string | null };
export type HMessage = { user_id: string; at: string; events: string[]; openness: number | null };
export type HDebrief = { user_id: string; at: string; scores: Partial<Record<SkillId, number>> | null; source: string | null };
export type HReferral = { referrer_id: string; activated_at: string | null; reward_days: number };

export type HablameInput = {
  accounts: HAccount[];
  funnel: HFunnel[];
  personas: { user_id: string }[];
  messages: HMessage[];
  debriefs: HDebrief[];
  coachAsks: { user_id: string }[];
  referrals: HReferral[];
  reactions: number;
  reactors: number;
  voiceHeard: number;
  crisis: number;
  blockedDescriptions: number;
  blockedTurns: number;
  now?: number;
};

/** Una plática termina tras 25 min sin escribir (igual que el feedback automático de Ale). */
export const SESSION_GAP_MS = 25 * 60_000;
/** Para comparar "antes y después" en sus mensajes. */
export const WINDOW = 10;
export const MIN_MESSAGES_FOR_TREND = 20;
/** Mínimo de personas para dar un veredicto. */
export const MIN_FOR_VERDICT = 5;

const GOOD = new Set(['asked_about_her', 'shared_self', 'humor']);
const BAD = new Set(['self_centered', 'generic', 'premature_compliment', 'boundary_crossed', 'insisted_after_no', 'too_long']);

function sessions(times: number[]) {
  const sorted = [...times].sort((a, b) => a - b);
  const out: number[] = [];
  let count = 0;
  let last = -Infinity;
  for (const t of sorted) {
    if (t - last > SESSION_GAP_MS && count) { out.push(count); count = 0; }
    count += 1;
    last = t;
  }
  if (count) out.push(count);
  return out;
}

function windowStats(ms: HMessage[]) {
  const n = ms.length || 1;
  const curiosity = ms.filter((m) => m.events.includes('asked_about_her')).length / n;
  const good = ms.filter((m) => m.events.some((e) => GOOD.has(e))).length / n;
  const bad = ms.filter((m) => m.events.some((e) => BAD.has(e))).length / n;
  const open = avg(ms.map((m) => m.openness).filter((o): o is number => typeof o === 'number'));
  return { curiosity, good, bad, open };
}

const scoreOf = (s: HDebrief['scores']) => {
  const vals = SKILLS.map((k) => s?.[k.id]).filter((v): v is number => typeof v === 'number');
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
};

export function analyzeHablame(i: HablameInput) {
  const now = i.now ?? Date.now();
  const persons = i.accounts.filter((a) => a.role === 'persons');
  const soi = i.accounts.filter((a) => a.role === 'soi');
  const roleOf = new Map(i.accounts.map((a) => [a.id, a.role]));

  // ── De dónde llegan ──
  const visitors = (rows: HFunnel[]) => new Set(rows.map((r, k) => r.visitor_id ?? `anon-${k}`)).size;
  const signupsBy = (role: 'soi' | 'persons') => i.funnel.filter((f) => f.event === 'signup' && f.user_id && roleOf.get(f.user_id) === role).length;
  const acquisition = {
    soi: {
      landing: visitors(i.funnel.filter((f) => f.event === 'landing_view')),
      login: visitors(i.funnel.filter((f) => f.event === 'login_view' && f.detail !== 'persons')),
      signups: signupsBy('soi'),
      accounts: soi.length,
    },
    persons: {
      login: visitors(i.funnel.filter((f) => f.event === 'login_view' && f.detail === 'persons')),
      signups: signupsBy('persons'),
      accounts: persons.length,
      referred: i.referrals.length,
    },
  };

  // ── Por persona ──
  const personIds = new Set(persons.map((p) => p.id));
  const msgsBy = new Map<string, HMessage[]>();
  for (const m of i.messages) if (personIds.has(m.user_id)) msgsBy.set(m.user_id, [...(msgsBy.get(m.user_id) ?? []), m]);
  for (const list of msgsBy.values()) list.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const withPersona = new Set(i.personas.map((p) => p.user_id));

  // ── Activación (cuentas de 2+ días) ──
  const aged = (days: number) => persons.filter((p) => now - Date.parse(p.createdAt) >= days * DAY);
  const a2 = aged(2);
  const practiced = (id: string) => (msgsBy.get(id)?.length ?? 0) >= 3;
  const fullSession = (id: string) => sessions((msgsBy.get(id) ?? []).map((m) => Date.parse(m.at))).some((n) => n >= 5);
  const activation = {
    createdPersona: rate(a2.filter((p) => withPersona.has(p.id)).length, a2.length),
    firstMessage: rate(a2.filter((p) => (msgsBy.get(p.id)?.length ?? 0) >= 1).length, a2.length),
    practiced: rate(a2.filter((p) => practiced(p.id)).length, a2.length),
    fullSession: rate(a2.filter((p) => fullSession(p.id)).length, a2.length),
  };

  // ── Retención: volver a practicar otro día ──
  const practicedOn = (id: string, fromDay: number, toDay: number, created: string) =>
    (msgsBy.get(id) ?? []).some((m) => { const d = (Date.parse(m.at) - Date.parse(created)) / DAY; return d >= fromDay && d < toDay; });
  const r2 = aged(2).filter((p) => practicedOn(p.id, 0, 1, p.createdAt));
  const r14 = aged(14).filter((p) => practiced(p.id));
  const retention = {
    d1: rate(r2.filter((p) => practicedOn(p.id, 1, 2, p.createdAt)).length, r2.length),
    w2: rate(r14.filter((p) => practicedOn(p.id, 7, 14, p.createdAt)).length, r14.length),
    daysPracticed: round1(avg([...msgsBy.values()].map((ms) => new Set(ms.map((m) => m.at.slice(0, 10))).size))),
    sessionsPerUser: round1(avg([...msgsBy.values()].map((ms) => sessions(ms.map((m) => Date.parse(m.at))).length))),
    messagesPerSession: round1(avg([...msgsBy.values()].flatMap((ms) => sessions(ms.map((m) => Date.parse(m.at)))))),
  };

  // ── ¿Mejoran? 1) habilidades del coach: primer feedback vs. el último ──
  const debBy = new Map<string, HDebrief[]>();
  for (const d of i.debriefs) if (personIds.has(d.user_id) && d.scores) debBy.set(d.user_id, [...(debBy.get(d.user_id) ?? []), d]);
  const pairs = [...debBy.values()].map((ds) => ds.sort((a, b) => Date.parse(a.at) - Date.parse(b.at))).filter((ds) => ds.length >= 2);
  const deltas = pairs.map((ds) => ({ first: scoreOf(ds[0]!.scores), last: scoreOf(ds[ds.length - 1]!.scores) }))
    .filter((d): d is { first: number; last: number } => d.first !== null && d.last !== null);
  const perSkill = SKILLS.map((s) => {
    const ch = pairs.map((ds) => (ds[ds.length - 1]!.scores?.[s.id] ?? NaN) - (ds[0]!.scores?.[s.id] ?? NaN)).filter(Number.isFinite);
    return { id: s.id, label: s.label, change: round1(avg(ch)) };
  });
  const skills = {
    people: deltas.length,
    first: round1(avg(deltas.map((d) => d.first))),
    last: round1(avg(deltas.map((d) => d.last))),
    change: round1(avg(deltas.map((d) => d.last - d.first))),
    improved: rate(deltas.filter((d) => d.last - d.first >= 0.5).length, deltas.length),
    worsened: deltas.filter((d) => d.last - d.first <= -0.5).length,
    perSkill,
  };

  // ── ¿Mejoran? 2) señales en sus mensajes: primeros 10 vs. últimos 10 ──
  const trends = [...msgsBy.values()].filter((ms) => ms.length >= MIN_MESSAGES_FOR_TREND)
    .map((ms) => ({ before: windowStats(ms.slice(0, WINDOW)), after: windowStats(ms.slice(-WINDOW)) }));
  const mean = (f: (t: (typeof trends)[number]) => number | null) => {
    const v = avg(trends.map(f).filter((x): x is number => x !== null));
    return v === null ? null : round1(v * 100);
  };
  const signals = {
    people: trends.length,
    curiosity: { before: mean((t) => t.before.curiosity), after: mean((t) => t.after.curiosity) },
    good: { before: mean((t) => t.before.good), after: mean((t) => t.after.good) },
    bad: { before: mean((t) => t.before.bad), after: mean((t) => t.after.bad) },
    openness: { before: mean((t) => t.before.open), after: mean((t) => t.after.open) },
    improved: rate(trends.filter((t) => t.after.good - t.after.bad > t.before.good - t.before.bad).length, trends.length),
  };

  // ── Coach, funciones, dinero, invitaciones y seguridad ──
  const practicing = [...msgsBy.keys()].filter(practiced);
  const asked = new Set(i.coachAsks.map((c) => c.user_id));
  const coach = {
    askedAle: rate(practicing.filter((id) => asked.has(id)).length, practicing.length),
    feedbacks: i.debriefs.filter((d) => personIds.has(d.user_id)).length,
    withFeedback: rate(practicing.filter((id) => debBy.has(id)).length, practicing.length),
    aiShare: rate(i.debriefs.filter((d) => personIds.has(d.user_id) && d.source === 'ai').length, i.debriefs.filter((d) => personIds.has(d.user_id)).length),
  };
  const ended = persons.filter((p) => p.plan !== 'trial');
  const money = {
    trial: persons.filter((p) => p.plan === 'trial').length,
    free: persons.filter((p) => p.plan === 'free').length,
    plus: persons.filter((p) => p.plan === 'soi_plus').length,
    conversion: rate(ended.filter((p) => p.plan === 'soi_plus').length, ended.length),
  };
  const referrals = {
    inviters: new Set(i.referrals.map((r) => r.referrer_id)).size,
    signups: i.referrals.length,
    activated: rate(i.referrals.filter((r) => r.activated_at).length, i.referrals.length),
    days: i.referrals.reduce((n, r) => n + (r.reward_days ?? 0), 0),
  };

  // ── Veredicto: ¿les ayuda? ──
  const evidence = skills.people + signals.people;
  const helps = (skills.people >= MIN_FOR_VERDICT && (skills.change ?? 0) > 0 && (skills.improved.pct ?? 0) >= 50)
    || (signals.people >= MIN_FOR_VERDICT && (signals.improved.pct ?? 0) >= 50);
  const hurts = skills.people >= MIN_FOR_VERDICT && (skills.change ?? 0) < 0;
  const verdict = evidence < MIN_FOR_VERDICT
    ? { label: 'Aún sin datos suficientes', tone: 'neutral' as const, detail: `Hace falta que al menos ${MIN_FOR_VERDICT} personas tengan 2+ feedbacks o ${MIN_MESSAGES_FOR_TREND}+ mensajes (hoy: ${skills.people} y ${signals.people}). Lo primero es activación y retención.` }
    : helps
      ? { label: 'Sí: conversan mejor con la práctica', tone: 'good' as const, detail: `Las habilidades del coach suben ${skills.change ?? 0} en promedio y ${signals.improved.pct ?? 0} % mejora el balance de sus mensajes (más curiosidad, menos tropiezos).` }
      : hurts
        ? { label: 'No: las habilidades bajan', tone: 'bad' as const, detail: 'Revisar la dificultad de los personajes y si el feedback de Ale es accionable.' }
        : { label: 'Señales mixtas', tone: 'neutral' as const, detail: 'Hay práctica, pero la mejora aún no es clara. Mira qué habilidades no se mueven y el balance de sus mensajes.' };

  return {
    acquisition, activation, retention, skills, signals, coach, money, referrals, verdict,
    features: { reactions: i.reactions, reactors: i.reactors, voiceHeard: i.voiceHeard },
    safety: { crisis: i.crisis, blockedDescriptions: i.blockedDescriptions, blockedTurns: i.blockedTurns },
  };
}
export type HablameReport = ReturnType<typeof analyzeHablame>;
