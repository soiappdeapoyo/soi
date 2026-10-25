import type { EffectivePlan } from '@/lib/billing/access-rules';

/**
 * Qué puede hacer una cuenta de /persons según su plan (los mismos planes de SOI: prueba, Free y SOI+).
 * Los mensajes en Free salen del mismo pool de consultas que el chat de SOI (`consume_chat_query`): una cuenta de
 * /persons no usa el chat de SOI, así que el pool es todo suyo. Puro y testeable.
 */

export type PersonsLimits = {
  /** Personajes activos (sin archivar). */
  maxActive: number;
  /** Notas de voz del personaje (generan audio: lo mismo que la voz guía de SOI). */
  voice: boolean;
  /** Personajes generados o ajustados por descripción al día. */
  generationsPerDay: number;
  /** Tope de uso justo por día (contra la dependencia y el costo). */
  messagesPerDay: number;
  /** Modo ciego: la emoción no se muestra en el encabezado. */
  blindMode: boolean;
};

export const MAX_PERSONAS = 20;

export function personsLimits(plan: EffectivePlan): PersonsLimits {
  if (plan === 'trial' || plan === 'soi_plus') {
    return { maxActive: MAX_PERSONAS, voice: true, generationsPerDay: 20, messagesPerDay: 300, blindMode: true };
  }
  return { maxActive: 2, voice: false, generationsPerDay: 3, messagesPerDay: 300, blindMode: false };
}

export type PersonsGate = { ok: true } | { ok: false; reason: 'person_limit' | 'generation_limit' | 'daily_limit' };

export function canCreatePersona(limits: PersonsLimits, active: number): PersonsGate {
  return active < limits.maxActive ? { ok: true } : { ok: false, reason: 'person_limit' };
}

export function canGenerate(limits: PersonsLimits, today: number): PersonsGate {
  return today < limits.generationsPerDay ? { ok: true } : { ok: false, reason: 'generation_limit' };
}

export function canSendToday(limits: PersonsLimits, sentToday: number): PersonsGate {
  return sentToday < limits.messagesPerDay ? { ok: true } : { ok: false, reason: 'daily_limit' };
}

export const GATE_COPY: Record<'person_limit' | 'generation_limit' | 'daily_limit' | 'exhausted', string> = {
  person_limit: 'En el plan Free puedes practicar con 2 personas a la vez. Archiva una o pasa a SOI+ para tener más.',
  generation_limit: 'Llegaste al límite de personajes creados por hoy. Mañana puedes crear más.',
  daily_limit: 'Por hoy fue suficiente práctica. Descansa y retoma mañana: así se aprende mejor.',
  exhausted: 'Tus mensajes del plan Free se terminaron. Tu conversación está guardada.',
};

// ── Prueba e invitaciones ────────────────────────────────────────────────────────────────────────────────────────

/** La prueba de /persons dura menos que la de SOI: 3 días con todo. */
export const PERSONS_TRIAL_DAYS = 3;
/** Días que gana quien invita por su primera invitación activa, y por cada una después. */
export const REFERRAL_FIRST_DAYS = 7;
export const REFERRAL_NEXT_DAYS = 2;
/** Una invitación cuenta cuando la persona invitada ya practicó: sus primeros mensajes a un personaje. */
export const REFERRAL_ACTIVATION_MESSAGES = 3;
/** Tope de invitaciones con premio (contra el abuso). */
export const REFERRAL_MAX_REWARDED = 30;

/** Días por la siguiente invitación activa (igual que `activate_referral` en la base). */
export function referralReward(rewardedSoFar: number) {
  if (rewardedSoFar >= REFERRAL_MAX_REWARDED) return 0;
  return rewardedSoFar === 0 ? REFERRAL_FIRST_DAYS : REFERRAL_NEXT_DAYS;
}

/** Código de invitación válido (lo que llega en ?ref=). */
export const REFERRAL_CODE_RE = /^[a-z0-9]{8}$/;
