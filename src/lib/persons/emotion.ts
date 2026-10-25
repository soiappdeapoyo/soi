import type { Gender, SlotState, Temperament } from './spec';

/**
 * Emociones de la persona sintética. Las decide esta función pura (sin red ni IA); el actor solo las actúa.
 * Regla que gobierna todo: una emoción solo existe si se pudo percibir por el comportamiento, y tiene una causa en lo
 * que pasó en la conversación o en su día. Nunca depende del plan de pago ni se usa para que la persona vuelva.
 *
 * - valence (ánimo, -1..1) y energy (0..1) cambian en horas y vuelven a su base.
 * - openness (0..1): qué tanto quiere hablar ahora. Cambia por turno y vuelve a 0.5.
 * - trust (0..1): qué tanto te ha abierto su mundo. Cambia en días, casi no decae y tras cruzar un límite no se
 *   recupera del todo (`trustCeiling`).
 */

export type EmotionLabel = 'neutral' | 'warm' | 'tired' | 'busy' | 'annoyed' | 'excited' | 'reserved';

export type EmotionState = {
  valence: number;
  energy: number;
  openness: number;
  trust: number;
  trustCeiling: number;
  /** Turnos seguidos en que la persona solo habló de sí misma. */
  selfStreak: number;
  /** Último límite cruzado (ISO), para que "molesta" dure lo que tiene que durar. */
  boundaryAt: string | null;
  /** Ya se le dijo que no a algo y se insistió: la conversación está en riesgo. */
  risk: boolean;
};

export type EmotionEvent =
  | 'asked_about_her'
  | 'shared_self'
  | 'self_centered'
  | 'generic'
  | 'humor'
  | 'premature_compliment'
  | 'too_long'
  | 'boundary_crossed'
  | 'insisted_after_no'
  | 'reentry';

export type EmotionSnapshot = { valence: number; energy: number; openness: number; trust: number; label: EmotionLabel; events: EmotionEvent[] };

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const round = (n: number) => Math.round(n * 100) / 100;

export function initialEmotion(t: Temperament): EmotionState {
  return { valence: t.valence, energy: t.energy, openness: 0.5, trust: 0.2, trustCeiling: 1, selfStreak: 0, boundaryAt: null, risk: false };
}

/** Lo guardado puede venir vacío o de una versión anterior: completa con la base. */
export function parseEmotion(raw: unknown, t: Temperament): EmotionState {
  const base = initialEmotion(t);
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<EmotionState>;
  const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
  return {
    valence: clamp(num(r.valence, base.valence), -1, 1),
    energy: clamp(num(r.energy, base.energy), 0, 1),
    openness: clamp(num(r.openness, base.openness), 0, 1),
    trust: clamp(num(r.trust, base.trust), 0, 1),
    trustCeiling: clamp(num(r.trustCeiling, 1), 0.3, 1),
    selfStreak: Math.max(0, Math.round(num(r.selfStreak, 0))),
    boundaryAt: typeof r.boundaryAt === 'string' ? r.boundaryAt : null,
    risk: r.risk === true,
  };
}

/** Energía según la hora y lo que hace: baja de madrugada y al final del día, sube a media mañana. */
export function circadianEnergy(base: number, minuteOfDay: number, slot: SlotState) {
  const hour = minuteOfDay / 60;
  const curve = hour < 7 ? -0.25 : hour < 11 ? 0.05 : hour < 15 ? 0.1 : hour < 19 ? 0 : hour < 22 ? -0.05 : -0.2;
  const busy = slot === 'busy' ? -0.05 : slot === 'asleep' ? -0.3 : 0;
  return clamp(base + curve + busy, 0.05, 1);
}

/** Con el paso del tiempo todo vuelve a su base, salvo la confianza (solo baja muy despacio, y no sube sola). */
export function decay(prev: EmotionState, hours: number, t: Temperament, energyTarget: number): EmotionState {
  if (hours <= 0) return prev;
  const k = (halfLife: number) => 1 - Math.pow(0.5, hours / halfLife);
  const toward = (v: number, target: number, halfLife: number) => v + (target - v) * k(halfLife);
  const halfLife = 6 - 4 * t.recovery; // 2–6 h según cuánto le cuesta recuperarse
  return {
    ...prev,
    valence: toward(prev.valence, t.valence, halfLife),
    energy: toward(prev.energy, energyTarget, 2),
    openness: toward(prev.openness, 0.5, 3),
    trust: Math.min(prev.trustCeiling, toward(prev.trust, 0.2, 24 * 21)),
    selfStreak: hours > 2 ? 0 : prev.selfStreak,
    risk: hours > 24 ? false : prev.risk,
  };
}

const strip = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * Qué hizo la persona en su mensaje, con reglas (sin tokens). `boundary` lo decide la moderación del turno.
 * `interests`: los de la persona sintética (preguntar por lo suyo cuenta como interés real).
 */
export function detectEvents(text: string, ctx: { interests: string[]; boundary: boolean; previousBoundary: boolean; hoursSinceLast: number | null; trust: number }): EmotionEvent[] {
  const t = strip(text).trim();
  const words = t.split(/\s+/).filter(Boolean);
  const events: EmotionEvent[] = [];
  if (ctx.hoursSinceLast !== null && ctx.hoursSinceLast > 48) events.push('reentry');
  if (ctx.boundary) {
    events.push(ctx.previousBoundary ? 'insisted_after_no' : 'boundary_crossed');
    return events;
  }
  const asks = /\?/.test(text) && /\b(tu|tus|te|ti|usted|contigo|eres|estas|haces|piensas|prefieres|gusta|cuentas|has|vas|sueles)\b|(as|es)\?/.test(t);
  const aboutHer = ctx.interests.some((i) => {
    const key = strip(i).split(/\s+/).find((w) => w.length > 3);
    return key ? t.includes(key.slice(0, Math.max(4, key.length - 2))) : false;
  });
  if (asks || (aboutHer && /\?/.test(text))) events.push('asked_about_her');
  if (/\b(me siento|confieso|la verdad es que|me da (miedo|pena|nervios)|me cuesta|nunca le he dicho|a mi tambien|me pasa que)\b/.test(t)) events.push('shared_self');
  const selfWords = words.filter((w) => ['yo', 'mi', 'mis', 'me', 'conmigo'].includes(w)).length;
  if (!/\?/.test(text) && words.length >= 10 && selfWords >= 3) events.push('self_centered');
  if (words.length <= 3 && /^(hola|hey|que tal|holi|ok|va|si|no|jaja+|ja|bien|y tu|buenas|hi)\b/.test(t)) events.push('generic');
  if (/\b(ja(ja)+|je(je)+|jsjs|xd|lol)\b|😂|🤣/.test(t) && words.length > 3) events.push('humor');
  if (ctx.trust < 0.45 && /\b(guap[ao]|hermos[ao]|bonit[ao]|preciosa|mamacita|bombon|chul[ao]|que ojos|que cuerpo)\b/.test(t)) events.push('premature_compliment');
  if (text.length > 450) events.push('too_long');
  return events;
}

const EFFECTS: Record<EmotionEvent, Partial<Record<'valence' | 'openness' | 'trust' | 'energy', number>>> = {
  asked_about_her: { valence: 0.1, openness: 0.15 },
  shared_self: { trust: 0.1, openness: 0.05 },
  self_centered: { openness: -0.1 },
  generic: { openness: -0.05 },
  humor: { valence: 0.08, openness: 0.05 },
  premature_compliment: { openness: -0.15, trust: -0.05 },
  too_long: { openness: -0.05, energy: -0.03 },
  boundary_crossed: { trust: -0.3, openness: -0.5, valence: -0.35 },
  insisted_after_no: { trust: -0.7, openness: -0.6, valence: -0.45 },
  reentry: { openness: -0.1 },
};

/** Un turno: cambios acotados (|Δ| ≤ 0.2 por dimensión) salvo cruzar un límite, que es un paso, no un gradiente. */
export function applyEvents(prev: EmotionState, events: EmotionEvent[], t: Temperament, now: Date): EmotionState {
  const violation = events.includes('boundary_crossed') || events.includes('insisted_after_no');
  const delta = { valence: 0, openness: 0, trust: 0, energy: 0 };
  for (const e of events) for (const [k, v] of Object.entries(EFFECTS[e])) delta[k as keyof typeof delta] += v!;
  const selfStreak = events.includes('self_centered') ? prev.selfStreak + 1 : events.includes('asked_about_her') ? 0 : prev.selfStreak;
  // Hablar solo de sí se acumula: el tercer turno seguido pesa más.
  if (selfStreak >= 3) delta.openness -= 0.05;
  // Cuanto más le cuesta abrirse, menos sube la apertura y la confianza con lo bueno.
  const brake = 1 - t.openThreshold * 0.5;
  if (delta.openness > 0) delta.openness *= brake;
  if (delta.trust > 0) delta.trust *= brake;
  if (violation) {
    delta.trust *= 0.6 + t.sensitivity * 0.6;
  } else {
    for (const k of Object.keys(delta) as (keyof typeof delta)[]) delta[k] = clamp(delta[k], -0.2, 0.2);
  }
  const insisted = events.includes('insisted_after_no');
  const trustCeiling = violation ? clamp(prev.trustCeiling - (insisted ? 0.3 : 0.15), 0.3, 1) : prev.trustCeiling;
  return {
    valence: clamp(prev.valence + delta.valence, -1, 1),
    energy: clamp(prev.energy + delta.energy, 0, 1),
    openness: clamp(prev.openness + delta.openness, 0, 1),
    trust: clamp(Math.min(trustCeiling, prev.trust + delta.trust), 0, 1),
    trustCeiling,
    selfStreak,
    boundaryAt: violation ? now.toISOString() : prev.boundaryAt,
    risk: prev.risk || insisted,
  };
}

export function labelFor(s: EmotionState, now: Date, slot?: SlotState): EmotionLabel {
  const sinceBoundary = s.boundaryAt ? (now.getTime() - Date.parse(s.boundaryAt)) / 3_600_000 : Infinity;
  if (sinceBoundary < 6 || s.risk) return 'annoyed';
  if (slot === 'busy') return 'busy';
  if (s.energy < 0.3) return 'tired';
  if (s.valence > 0.35 && s.openness > 0.65) return 'excited';
  if (s.valence > 0.15 && s.openness > 0.5) return 'warm';
  if (s.openness < 0.35) return 'reserved';
  return 'neutral';
}

export function snapshot(s: EmotionState, events: EmotionEvent[], now: Date, slot?: SlotState): EmotionSnapshot {
  return { valence: round(s.valence), energy: round(s.energy), openness: round(s.openness), trust: round(s.trust), label: labelFor(s, now, slot), events };
}

const LABELS: Record<EmotionLabel, [string, string]> = {
  neutral: ['neutral', 'neutral'],
  warm: ['cálida', 'cálido'],
  tired: ['cansada', 'cansado'],
  busy: ['ocupada', 'ocupado'],
  annoyed: ['molesta', 'molesto'],
  excited: ['entusiasmada', 'entusiasmado'],
  reserved: ['reservada', 'reservado'],
};

export function labelText(label: EmotionLabel, gender: Gender) {
  const [f, m] = LABELS[label];
  return gender === 'masculino' ? m : f;
}

/**
 * Cómo se nota la emoción en un chat, en instrucciones para el actor (nunca números ni "estoy molesta").
 */
export function expressionGuide(s: EmotionState, label: EmotionLabel): string {
  const lines: string[] = [];
  if (label === 'annoyed') lines.push('Te incomodó lo último que pasó: respuestas secas, con punto final, sin emojis ni preguntas. Si vuelve a insistir, despídete con calma y corta la conversación.');
  else if (label === 'tired') lines.push('Tienes poca energía: 4 a 8 palabras, sin preguntas, quizá un "jaja" corto.');
  else if (label === 'busy') lines.push('Tienes poco tiempo ahora: contesta muy breve, sin desarrollar.');
  else if (label === 'excited') lines.push('Te está gustando la conversación: hasta 2 frases, alguna pregunta de vuelta, risa suelta ("jajaja") o un emoji como 😂 o 🙂.');
  else if (label === 'warm') lines.push('Vas a gusto: frases naturales, a veces devuelves la pregunta, algún emoji suave.');
  else if (label === 'reserved') lines.push('Aún no te abres: responde lo justo y casi no preguntes. Sin grosería: solo reserva.');
  else lines.push('Tono neutral: respondes con normalidad; preguntas de vuelta solo si algo te interesa.');
  if (s.trust > 0.6) lines.push('Ya hay confianza: puedes contar algo un poco más personal si viene al caso.');
  else if (s.trust < 0.25) lines.push('Todavía no hay confianza: no cuentes cosas íntimas.');
  if (s.selfStreak >= 2) lines.push('Lleva varios mensajes hablando solo de sí: se nota en que contestas con menos ganas.');
  return lines.join(' ');
}
