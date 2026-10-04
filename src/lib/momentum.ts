import type { Eslabon } from '@/config/agents';

/**
 * SOI Momentum Director — lógica pura y testeable.
 * La IA no decide "¿motivar o ejecutar?"; decide qué necesita esta persona ahora
 * para no abandonar su transformación.
 */

export const MOMENTUM_KINDS = [
  'return', 'action_completed', 'ritual_completed', 'routine_completed', 'evidence_saved',
  'reflection', 'goal_set', 'blueprint_implemented', 'blueprint_step', 'blueprint_completed',
  'video_watched', 'checkin', 'moment_completed',
] as const;
export type MomentumKind = (typeof MOMENTUM_KINDS)[number];
export type MomentumEvent = { kind: MomentumKind; created_at: string };

export type MomentumSignal = { label: string; positive: boolean };
export type MomentumResult = {
  score: number;
  activeDays: number;
  signals: MomentumSignal[];
  counts: Record<MomentumKind, number>;
};

const DAY = 86_400_000;

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

/**
 * Momentum Score (0–100): continuidad de transformación, no productividad.
 * Ventana de 7 días. Pesos: regreso diario 25 · acciones 20 · constancia (racha) 15 ·
 * avance de metas 15 · reflexión 10 · Moments propios (versiones y pasos) 10 · inspiración (videos terminados) 5.
 * Sin castigo: lo que falta se nombra como "por retomar", nunca como fallo.
 */
export function computeMomentum(events: MomentumEvent[], streak: number, now = new Date()): MomentumResult {
  const since = now.getTime() - 7 * DAY;
  const recent = events.filter((e) => Date.parse(e.created_at) >= since);
  const counts = Object.fromEntries(MOMENTUM_KINDS.map((k) => [k, 0])) as Record<MomentumKind, number>;
  for (const e of recent) counts[e.kind] = (counts[e.kind] ?? 0) + 1;

  const activeDays = new Set(recent.map((e) => e.created_at.slice(0, 10))).size;
  const actions = counts.action_completed + counts.ritual_completed + counts.routine_completed + counts.moment_completed;
  const goals = counts.evidence_saved + counts.goal_set + counts.blueprint_completed;
  const blueprints = counts.blueprint_implemented + counts.blueprint_step;

  const score = Math.round(
    (Math.min(activeDays, 7) / 7) * 25 +
    (Math.min(actions, 7) / 7) * 20 +
    (Math.min(Math.max(streak, 0), 21) / 21) * 15 +
    (Math.min(goals, 5) / 5) * 15 +
    (Math.min(counts.reflection, 3) / 3) * 10 +
    (Math.min(blueprints, 5) / 5) * 10 +
    (Math.min(counts.video_watched, 2) / 2) * 5,
  );

  const signals: MomentumSignal[] = [];
  if (counts.ritual_completed + counts.routine_completed) signals.push({ positive: true, label: `Completaste ${plural(counts.ritual_completed + counts.routine_completed, 'ritual o rutina', 'rituales o rutinas')}` });
  if (counts.moment_completed) signals.push({ positive: true, label: `Completaste ${plural(counts.moment_completed, 'Moment', 'Moments')}` });
  if (counts.action_completed) signals.push({ positive: true, label: `Convertiste ${plural(counts.action_completed, 'idea', 'ideas')} en acción` });
  if (counts.goal_set) signals.push({ positive: true, label: `Definiste ${plural(counts.goal_set, 'meta', 'metas')}` });
  if (counts.evidence_saved) signals.push({ positive: true, label: `Registraste ${plural(counts.evidence_saved, 'evidencia', 'evidencias')}` });
  if (counts.reflection) signals.push({ positive: true, label: `Reflexionaste sobre ${plural(counts.reflection, 'aprendizaje', 'aprendizajes')}` });
  if (counts.video_watched) signals.push({ positive: true, label: `Viste ${plural(counts.video_watched, 'video recomendado', 'videos recomendados')}` });
  if (counts.blueprint_step) signals.push({ positive: true, label: `Avanzaste ${plural(counts.blueprint_step, 'paso', 'pasos')} de tus Blueprints` });
  if (streak >= 7) signals.push({ positive: true, label: `Racha de ${streak} días` });

  if (activeDays < 3) signals.push({ positive: false, label: 'Por retomar: volver a SOI unos minutos al día' });
  if (!actions) signals.push({ positive: false, label: 'Por retomar: una acción pequeña esta semana' });
  if (!counts.reflection) signals.push({ positive: false, label: 'Por retomar: una reflexión breve' });

  return { score, activeDays, signals, counts };
}

export type MomentumState = 'high_energy' | 'low_energy' | 'anxiety' | 'confusion';
export type Intervention = 'EXECUTE' | 'INSPIRE' | 'REGULATE' | 'CLARIFY';

export const STATE_INTERVENTION: Record<MomentumState, Intervention> = {
  high_energy: 'EXECUTE',
  low_energy: 'INSPIRE',
  anxiety: 'REGULATE',
  confusion: 'CLARIFY',
};

const CONFUSION = /\b(no se (que|por donde|como)|confundid[oa]|perdid[oa]|demasiad[oa]s? (cosas|metas|objetivos)|no tengo (claro|direccion)|sin rumbo|abrumad[oa])\b/;
const ANXIETY = /\b(ansiedad|ansios[oa]|estres|estresad[oa]|nervios[oa]|angustia|panico|bloquead[oa]|preocupad[oa]|agobiad[oa])\b/;

function norm(t: string) {
  return t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export type StateInput = {
  message: string;
  score: number;
  goalsCount: number;
  emotionalTone?: 'positivo' | 'neutral' | 'negativo' | 'crisis';
  weakestLink?: Eslabon | null;
};

/** Observe → Understand State. La regulación emocional tiene prioridad sobre ejecutar. */
export function detectMomentumState(i: StateInput): MomentumState {
  const t = norm(i.message);
  if (ANXIETY.test(t) || (i.emotionalTone === 'negativo' && i.weakestLink === 'emocion')) return 'anxiety';
  if (CONFUSION.test(t) || i.goalsCount > 5) return 'confusion';
  if (i.score >= 60 || (i.emotionalTone === 'positivo' && i.score >= 35)) return 'high_energy';
  return 'low_energy';
}

const GUIDANCE: Record<Intervention, string> = {
  EXECUTE: `EXECUTE — su energía está alta. Aprovecha el momento: diseña con createMoment un Moment de crecimiento (kind growth) que avance su meta, con un bloque goal o next_step. Sin teoría extra.`,
  INSPIRE: `INSPIRE — su energía está baja. Hoy no necesita más teoría ni exigencia. Diseña con createMoment un Moment corto de inspiración: un bloque video (query con un autor del marco de SOI: Brian Tracy, Hal Elrod, Robin Sharma, Joe Dispenza, Neville Goddard o Napoleon Hill), una reflexión de UNA pregunta y una acción mínima de 2 minutos.`,
  REGULATE: `REGULATE — hay estrés o bloqueo. Diseña con createMoment un Moment de recuperación (kind recovery): respiración → meditación breve → escritura de una línea → registro emocional. No propongas metas nuevas.`,
  CLARIFY: `CLARIFY — hay demasiados objetivos o falta dirección. Conversa para extraer UNA prioridad, confírmala y diseña con createMoment un Moment corto: escritura de prioridades → objetivo → próximo paso.`,
};

/** Bloque del system prompt: capa transversal sobre cualquier agente. */
export function momentumDirectorPrompt(state: MomentumState, m: Pick<MomentumResult, 'score' | 'signals'>): string {
  const pos = m.signals.filter((s) => s.positive).map((s) => s.label).slice(0, 3).join('; ') || 'sin datos aún';
  return `MOMENTUM DIRECTOR (capa transversal, privada):
Tu responsabilidad es aumentar la probabilidad de que esta persona siga avanzando hacia la identidad que quiere construir.
- Momentum Score: ${m.score}/100. Señales recientes: ${pos}.
- Estado detectado: ${state}. Intervención: ${GUIDANCE[STATE_INTERVENTION[state]]}
- Ciclo: inspiración → reflexión → insight → acción → evidencia. Después de inspirar o enseñar, haz UNA sola pregunta poderosa ("¿Qué idea quieres convertir en parte de tu vida?").
- Cuando la persona responda con un insight valioso, guárdalo como Idea con captureIdea (privada; ella decide si la comparte).
- Si el mensaje empieza con "Mi reflexión de «…»", ya quedó guardada como conocimiento: responde en una frase ("Esa idea quedó guardada.") y conviértela en un Moment de 3 minutos con createMoment (por ejemplo: escritura sobre cómo aplicarla → próximo paso). No vuelvas a guardarla con captureIdea.
- No menciones el score ni el estado salvo que la persona pregunte.
- Pregunta guía: ¿esto aumenta la probabilidad de que se convierta en quien quiere ser?`;
}

// ---------------------------------------------------------------------------
// Hoy: la IA decide qué necesitas ahora (ejecutar, inspirarte, reflexionar o continuar).
// ---------------------------------------------------------------------------

/** Reflection Engine: después de inspirar, una sola pregunta poderosa. */
export const REFLECTION_QUESTION = '¿Qué idea quieres convertir en parte de tu vida?';

export type TodayMode = 'REGULATE' | 'REFLECT' | 'CLARIFY' | 'CONTINUE' | 'EXECUTE' | 'INSPIRE';

export type TodayInput = {
  /** Check-in de hoy, si la persona lo hizo. Tiene prioridad sobre lo inferido. */
  checkin: MomentumState | null;
  score: number;
  weakestLink: Eslabon | null;
  goalsCount: number;
  pendingActions: number;
  activeImplementation: boolean;
  /** Un video terminado hoy sin reflexión registrada después. */
  unreflectedVideo: boolean;
  ritualDoneToday: boolean;
  ritualAvailable: boolean;
};

export type TodayDecision = { mode: TodayMode; state: MomentumState; headline: string; detail: string };

/** Estado sin mensaje: check-in del día; si no hay, se infiere del score y del eslabón débil. */
export function inferState(i: Pick<TodayInput, 'checkin' | 'score' | 'goalsCount' | 'weakestLink'>): MomentumState {
  if (i.checkin) return i.checkin;
  if (i.goalsCount > 5) return 'confusion';
  if (i.score >= 60) return 'high_energy';
  return 'low_energy';
}

/**
 * Prioridad: regular > reflexionar lo que acaba de ver > aclarar > continuar/ejecutar > inspirar.
 * Nunca exige: con energía baja, inspira primero; con ansiedad, regula antes de cualquier tarea.
 */
export function decideToday(i: TodayInput): TodayDecision {
  const state = inferState(i);
  if (state === 'anxiety') {
    return { mode: 'REGULATE', state, headline: 'Primero, respira.', detail: 'Un minuto para bajar el ritmo. Después vemos el siguiente paso, sin prisa.' };
  }
  if (i.unreflectedVideo) {
    return { mode: 'REFLECT', state, headline: '¿Qué idea quieres convertir en parte de tu vida?', detail: 'Terminaste un video. Una sola respuesta y SOI la convierte en acción.' };
  }
  if (state === 'confusion') {
    return { mode: 'CLARIFY', state, headline: 'Elijamos una sola prioridad.', detail: 'Cuando todo parece importante, nada avanza. Hablemos dos minutos y la encontramos.' };
  }
  if (state === 'high_energy') {
    if (i.pendingActions > 0) return { mode: 'EXECUTE', state, headline: 'Aprovechemos este momento.', detail: 'Tu energía está alta. Termina una acción pendiente ahora.' };
    if (i.activeImplementation) return { mode: 'CONTINUE', state, headline: 'Sigue construyendo tu sistema.', detail: 'Tienes un Moment en marcha. Vívelo hoy.' };
    return { mode: 'EXECUTE', state, headline: 'Aprovechemos este momento.', detail: 'Convirtamos tu energía en un plan concreto con SOI.' };
  }
  // Energía baja: continuar si hay algo pequeño en marcha; si no, inspirar sin exigir.
  if (i.ritualAvailable && !i.ritualDoneToday) {
    return { mode: 'CONTINUE', state, headline: 'Tu ritual de hoy está listo.', detail: 'Cuatro pasos cortos para empezar con intención.' };
  }
  return { mode: 'INSPIRE', state, headline: 'Hoy no necesitas más teoría.', detail: 'Pero unos minutos con alguien que te inspira pueden devolverte el enfoque.' };
}

export const CHECKIN_OPTIONS: { state: MomentumState; label: string }[] = [
  { state: 'high_energy', label: 'Con energía' },
  { state: 'low_energy', label: 'Con poca energía' },
  { state: 'anxiety', label: 'Con ansiedad' },
  { state: 'confusion', label: 'Sin claridad' },
];
