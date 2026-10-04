/**
 * SOI Creator Economy — reglas de negocio en un solo lugar.
 * Los creadores no venden acceso a contenido: venden transformaciones empaquetadas (Blueprints).
 */

/** Parte del precio que corresponde al creador (el resto cubre plataforma, IA y procesamiento de pagos). */
export const CREATOR_REVENUE_SHARE = 0.8;

export const BLUEPRINT_PRICE_MIN_CENTS = 100;
export const BLUEPRINT_PRICE_MAX_CENTS = 50_000;

export const DIFFICULTY_LABEL = { suave: 'Suave', media: 'Media', intensa: 'Intensa' } as const;
export type Difficulty = keyof typeof DIFFICULTY_LABEL;

export const TRIGGER_STATES = {
  motivation: 'Motivación', confusion: 'Confusión', anxiety: 'Ansiedad', discipline: 'Disciplina',
  finance: 'Finanzas', health: 'Salud', career: 'Carrera', relationships: 'Relaciones',
} as const;
export type TriggerState = keyof typeof TRIGGER_STATES;

export const SOURCE_TYPES = {
  personal_experience: 'Experiencia personal', book: 'Libro', video: 'Video', podcast: 'Podcast', ai_generated: 'Conversación con SOI',
} as const;
export type SourceType = keyof typeof SOURCE_TYPES;

export function creatorShare(amountCents: number) {
  return Math.floor(amountCents * CREATOR_REVENUE_SHARE);
}

export function formatPrice(cents: number, currency = 'usd') {
  return new Intl.NumberFormat('es', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100);
}

export type CreatorStats = { implementations: number; completions: number; active_last_14d: number; results_reported: number };

/**
 * Transformation Score: reputación por vidas cambiadas, no por seguidores.
 * Implementaciones + completitud + retención + resultados reportados.
 * Un creador con 5.000 seguidores que transforma puede superar a uno con 5 millones que no.
 */
export function transformationScore(s: CreatorStats): number {
  if (!s.implementations) return 0;
  const completion = s.completions / s.implementations;
  const retention = s.active_last_14d / s.implementations;
  const results = s.results_reported / s.implementations;
  const reach = Math.log10(1 + s.implementations) / 4; // 10.000 implementaciones ≈ 1
  return Math.round(Math.min(1, reach) * 40 + completion * 25 + retention * 20 + results * 15);
}

/** Impact Score de un Blueprint: transformación generada, no vistas. */
export function impactScore(b: { implementations_count: number; completions_count: number; steps_completed_count: number }) {
  return b.implementations_count + b.completions_count * 3 + Math.floor(b.steps_completed_count / 5);
}
