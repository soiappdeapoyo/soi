/**
 * Bienestar medido sin preguntas (puro y testeado). Estima los 5 ítems del Índice de Bienestar WHO-5 (OMS, 1998;
 * Topp et al., 2015) con lo que la persona ya hace en SOI: lo que cuenta en el chat (IA o reglas), el ánimo y el
 * cumplimiento de sus Moments y su check-in. Misma escala (cada ítem 0–5 → 0–100), misma ventana (dos semanas),
 * los mismos cortes (≤ 50 bajo, ≤ 28 muy bajo) y el mismo cambio que cuenta (10 puntos).
 *
 * No es el cuestionario autoaplicado: el WHO-5 está validado como respuesta directa; esto es una estimación y así se
 * muestra. Nunca es un diagnóstico.
 */

import { dateInTz } from '@/lib/utils';

export const WHO5_ITEMS = ['cheerful', 'calm', 'active', 'rested', 'interest'] as const;
export type Who5Item = (typeof WHO5_ITEMS)[number];

/** Nombre corto y el ítem del WHO-5 que estima (parafraseado, en neutro). */
export const WHO5_LABEL: Record<Who5Item, { short: string; item: string }> = {
  cheerful: { short: 'Buen ánimo', item: 'Me he sentido de buen ánimo y con alegría' },
  calm: { short: 'Calma', item: 'Me he sentido con calma y en paz' },
  active: { short: 'Energía', item: 'Me he sentido con energía y vitalidad' },
  rested: { short: 'Descanso', item: 'Me he despertado con la sensación de haber descansado' },
  interest: { short: 'Interés en tu día', item: 'Mi día a día ha estado lleno de cosas que me interesan' },
};

export type ObsSource = 'chat' | 'chat_rules' | 'moment' | 'checkin';
export type Observation = { item: Who5Item; value: number; weight: number; at: string; source: ObsSource; evidence?: string | null };

export const WINDOW_DAYS = 14;
export const HALF_LIFE_DAYS = 7;
/** Cambio que cuenta en el WHO-5 (Topp et al., 2015). */
export const MEANINGFUL_CHANGE = 10;
const DAY = 86_400_000;
const ITEM_MIN_WEIGHT = 0.8;
const clamp5 = (v: number) => Math.max(0, Math.min(5, v));
const mood5 = (m: number) => clamp5((m - 1) * 1.25);

// ---------------------------------------------------------------- Moments y check-in

export type RunIn = { started_at: string; completed_at: string | null; mood_before: number | null; mood_after: number | null; helped: boolean | null };
export type CheckinIn = { at: string; state: string };

/**
 * Lo que dicen sus Moments. El ánimo con el que llega pesa más que el de después (ese ya trae el efecto del Moment).
 * Cumplimiento: los días que practicó (energía) y lo que empieza y termina (interés). No usar la app no es una señal:
 * sin Moments en la ventana no se deduce nada.
 */
export function momentObservations(runs: RunIn[], timeZone: string, now = Date.now()): Observation[] {
  const from = now - WINDOW_DAYS * DAY;
  const inWindow = runs.filter((r) => Date.parse(r.started_at) >= from);
  const out: Observation[] = [];
  for (const r of inWindow) {
    const at = r.completed_at ?? r.started_at;
    if (typeof r.mood_before === 'number') {
      out.push({ item: 'cheerful', value: mood5(r.mood_before), weight: 0.5, at, source: 'moment' });
      // Llegar muy abajo también habla de calma y energía, con menos peso.
      if (r.mood_before <= 2) out.push({ item: 'calm', value: mood5(r.mood_before) + 0.5, weight: 0.2, at, source: 'moment' });
    }
    if (typeof r.mood_after === 'number') out.push({ item: 'cheerful', value: mood5(r.mood_after), weight: 0.25, at, source: 'moment' });
  }
  const done = inWindow.filter((r) => r.completed_at);
  if (!done.length) return out;
  const last = done.map((r) => r.completed_at!).sort().at(-1)!;
  const days = new Set(done.map((r) => dateInTz(r.completed_at!, timeZone))).size;
  out.push({ item: 'active', value: clamp5(1.5 + days * 0.5), weight: 0.6, at: last, source: 'moment' });
  out.push({ item: 'interest', value: clamp5(1 + 4 * (done.length / inWindow.length)), weight: 0.5, at: last, source: 'moment' });
  const answered = done.filter((r) => r.helped !== null);
  if (answered.length >= 2) {
    const helped = answered.filter((r) => r.helped).length / answered.length;
    out.push({ item: 'interest', value: clamp5(1 + 4 * helped), weight: 0.4, at: last, source: 'moment' });
  }
  return out;
}

/** El check-in de un toque en Hoy (cómo llega). */
export function checkinObservations(checkins: CheckinIn[]): Observation[] {
  const out: Observation[] = [];
  for (const c of checkins) {
    const o = (item: Who5Item, value: number, weight: number) => out.push({ item, value, weight, at: c.at, source: 'checkin' });
    if (c.state === 'high_energy') { o('active', 4.2, 0.7); o('cheerful', 3.6, 0.3); }
    else if (c.state === 'low_energy') { o('active', 1.5, 0.7); o('cheerful', 2, 0.3); }
    else if (c.state === 'anxiety') o('calm', 1.2, 0.8);
    else if (c.state === 'confusion') { o('interest', 2.2, 0.3); o('calm', 2.2, 0.3); }
  }
  return out;
}

// ---------------------------------------------------------------- Chat por reglas (respaldo sin IA)

const norm = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const LEXICON: { item: Who5Item; value: number; re: RegExp }[] = [
  { item: 'rested', value: 1.2, re: /\b(no (he )?(podido |puedo )?dorm\w*|insomnio|desvelad\w|mal dormid\w|duermo (muy )?mal|no descans\w*|sin descansar)/ },
  { item: 'rested', value: 4, re: /\b(dormi (muy )?bien|descansad[oa]s?|desperte (con energia|bien|descansad\w))/ },
  { item: 'calm', value: 1.3, re: /\b(ansios\w*|ansiedad|estresad\w|estres|nervios\w*|abrumad\w|angustia\w*|preocupad\w|agobiad\w)/ },
  { item: 'calm', value: 4, re: /\b(tranquil\w+|en paz|relajad\w|calmad\w|sereno|serena)/ },
  { item: 'cheerful', value: 1.3, re: /\b(triste\w*|tristeza|deprimid\w|desanimad\w|bajon|me siento vaci\w|llor\w+|sin animo)/ },
  { item: 'cheerful', value: 4.2, re: /\b(feliz|content[oa]s?|alegre|de buen humor|emocionad\w|agradecid\w|me siento (muy )?bien)/ },
  { item: 'active', value: 1.4, re: /\b(sin energia|agotad\w|cansad\w|exhaust\w|flojera|no tengo fuerzas|no me puedo levantar|sin ganas)/ },
  { item: 'active', value: 4.1, re: /\b(con (mucha )?energia|motivad\w|con ganas|activ[oa] (hoy|todo)|productiv\w)/ },
  { item: 'interest', value: 1.3, re: /\b(nada me interesa|todo me da igual|sin sentido|aburrid\w|no me motiva nada|no disfruto)/ },
  { item: 'interest', value: 4, re: /\b(me encanta|me interesa|ilusion\w*|ilusionad\w|disfrut\w+|me apasiona)/ },
];

/** Una negación justo antes ("no estoy ansiosa", "ya no me siento triste") anula la coincidencia. */
function negated(text: string, index: number) {
  return /\b(no|ya no|nunca|tampoco|ni)\s+(\w+\s+){0,2}$/.test(text.slice(Math.max(0, index - 24), index));
}

/** Respaldo sin IA: frases típicas de cada ítem en lo que escribió. Peso menor que la lectura de la IA. */
export function chatRuleObservations(texts: string[], at: string): Observation[] {
  const hits = new Map<Who5Item, number[]>();
  for (const raw of texts) {
    const t = norm(raw);
    for (const { item, value, re } of LEXICON) {
      const m = re.exec(t);
      if (!m || negated(t, m.index)) continue;
      hits.set(item, [...(hits.get(item) ?? []), value]);
    }
  }
  return [...hits].map(([item, vs]) => ({ item, value: vs.reduce((s, v) => s + v, 0) / vs.length, weight: 0.6, at, source: 'chat_rules' as const }));
}

// ---------------------------------------------------------------- Estimación

export type Band = 'bien' | 'bajo' | 'muy_bajo';
export type Confidence = 'baja' | 'media' | 'alta';
export type ItemEstimate = { value: number | null; weight: number; sources: ObsSource[] };
export type Estimate = {
  score: number;
  band: Band;
  confidence: Confidence;
  items: Record<Who5Item, ItemEstimate>;
  observations: number;
  /** Cuántas señales vienen de cada fuente (para "cómo lo sé"). */
  bySource: Partial<Record<ObsSource, number>>;
};

export const bandFor = (score: number): Band => (score <= 28 ? 'muy_bajo' : score <= 50 ? 'bajo' : 'bien');
export const BAND_LABEL: Record<Band, string> = { bien: 'Bienestar bueno', bajo: 'Bienestar bajo', muy_bajo: 'Bienestar muy bajo' };

/**
 * Promedio ponderado por ítem en las últimas dos semanas (lo reciente pesa más: vida media de 7 días). Hace falta
 * evidencia de 3 de los 5 ítems; los que faltan toman el promedio de los demás. Sin eso, no hay estimación.
 */
export function estimateWellbeing(obs: Observation[], now = Date.now()): Estimate | null {
  const from = now - WINDOW_DAYS * DAY;
  const recent = obs.filter((o) => { const t = Date.parse(o.at); return t >= from && t <= now + DAY; });
  const items = Object.fromEntries(WHO5_ITEMS.map((i): [Who5Item, ItemEstimate] => [i, { value: null, weight: 0, sources: [] }])) as Record<Who5Item, ItemEstimate>;
  const sums = new Map<Who5Item, number>();
  const bySource: Partial<Record<ObsSource, number>> = {};
  for (const o of recent) {
    const w = o.weight * 0.5 ** (Math.max(0, now - Date.parse(o.at)) / DAY / HALF_LIFE_DAYS);
    const it = items[o.item];
    it.weight += w;
    sums.set(o.item, (sums.get(o.item) ?? 0) + w * clamp5(o.value));
    if (!it.sources.includes(o.source)) it.sources.push(o.source);
    bySource[o.source] = (bySource[o.source] ?? 0) + 1;
  }
  const known = WHO5_ITEMS.filter((i) => items[i].weight >= ITEM_MIN_WEIGHT);
  for (const i of WHO5_ITEMS) items[i].value = items[i].weight > 0 ? Math.round((sums.get(i)! / items[i].weight) * 100) / 100 : null;
  const total = known.reduce((s, i) => s + items[i].weight, 0);
  if (known.length < 3 || total < 3) return null;
  const mean = known.reduce((s, i) => s + items[i].value!, 0) / known.length;
  const raw = WHO5_ITEMS.reduce((s, i) => s + (known.includes(i) ? items[i].value! : mean), 0);
  const score = Math.round(raw * 4);
  const confidence: Confidence = known.length === 5 && total >= 8 ? 'alta' : known.length >= 4 && total >= 5 ? 'media' : 'baja';
  return { score, band: bandFor(score), confidence, items, observations: recent.length, bySource };
}

// ---------------------------------------------------------------- Evolución

export type WeeklyEstimate = { week_end: string; score: number; confidence: Confidence };
export type Trend = { baseline: WeeklyEstimate; current: WeeklyEstimate; change: number; meaningful: boolean; weeks: number };

/** Desde la primera semana con confianza media o alta (o la primera) hasta la última. */
export function wellbeingTrend(history: WeeklyEstimate[]): Trend | null {
  const sorted = [...history].sort((a, b) => a.week_end.localeCompare(b.week_end));
  if (sorted.length < 2) return null;
  const baseline = sorted.find((h) => h.confidence !== 'baja') ?? sorted[0]!;
  const current = sorted.at(-1)!;
  if (current.week_end === baseline.week_end) return null;
  const change = current.score - baseline.score;
  const weeks = Math.round((Date.parse(current.week_end) - Date.parse(baseline.week_end)) / (7 * DAY));
  return { baseline, current, change, meaningful: Math.abs(change) >= MEANINGFUL_CHANGE, weeks };
}

export function trendLine(t: Trend): string {
  const span = t.weeks === 1 ? 'hace una semana' : `hace ${t.weeks} semanas`;
  if (t.change >= MEANINGFUL_CHANGE) return `Subiste ${t.change} puntos desde ${span}. Es un cambio que cuenta.`;
  if (t.change > 0) return `Vas ${t.change} ${t.change === 1 ? 'punto' : 'puntos'} arriba de ${span}.`;
  if (t.change === 0) return `Igual que ${span}.`;
  if (t.change <= -MEANINGFUL_CHANGE) return `Bajaste ${-t.change} puntos desde ${span}. Cuéntale a SOI qué cambió: te acompaña a recuperarlo.`;
  return `Un poco abajo de ${span} (${t.change}). Es normal que varíe.`;
}

/** Domingo que cierra la semana (lunes a domingo) de una fecha local YYYY-MM-DD. */
export function weekEnd(localDate: string): string {
  const d = new Date(`${localDate}T12:00:00Z`);
  const dow = d.getUTCDay(); // 0 = domingo
  d.setUTCDate(d.getUTCDate() + ((7 - dow) % 7));
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------- Panel

export type UserHistory = { user_id: string; history: WeeklyEstimate[] };
export type WellbeingOutcomes = { measured: number; improved: { num: number; den: number }; worsened: number; avgChange: number | null; lowAtStart: number; recovered: { num: number; den: number } };

/** Personas con 4+ semanas entre su primera estimación y la última: cuántas mejoraron 10+ puntos y cuántas salieron de bienestar bajo. */
export function wellbeingOutcomes(users: UserHistory[], minWeeks = 4): WellbeingOutcomes {
  const changes: number[] = [];
  let improved = 0, worsened = 0, low = 0, recovered = 0;
  for (const u of users) {
    const t = wellbeingTrend(u.history);
    if (!t || t.weeks < minWeeks) continue;
    changes.push(t.change);
    if (t.change >= MEANINGFUL_CHANGE) improved++;
    if (t.change <= -MEANINGFUL_CHANGE) worsened++;
    if (t.baseline.score <= 50) { low++; if (t.current.score > 50) recovered++; }
  }
  return {
    measured: changes.length,
    improved: { num: improved, den: changes.length },
    worsened,
    avgChange: changes.length ? Math.round((changes.reduce((s, c) => s + c, 0) / changes.length) * 10) / 10 : null,
    lowAtStart: low,
    recovered: { num: recovered, den: low },
  };
}
