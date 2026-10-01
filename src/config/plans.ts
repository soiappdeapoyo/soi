export const PLANS = {
  soi_plus_monthly: { label: 'SOI+ Mensual', price: 4.99, interval: 'month', priceEnv: 'STRIPE_PRICE_SOI_PLUS_MONTHLY' },
  soi_plus_yearly: { label: 'SOI+ Anual', price: 29.99, interval: 'year', priceEnv: 'STRIPE_PRICE_SOI_PLUS_YEARLY', badge: '50% dto.' },
} as const;

export type PlanKey = keyof typeof PLANS;
export const FREE_QUERY_LIMIT = 20;
export const TRIAL_DAYS = 7;
export const PAYWALL_MESSAGE = 'Alcanzaste el límite del plan Free. Pasa a SOI+ para seguir.';

export const SOI_PLUS_BENEFITS = [
  'Chat ilimitado con todos los agentes',
  'Rutinas ilimitadas con temporizador y guía de voz',
  'TTS premium (voces neuronales)',
  'Muro de Evidencias ilimitado + exportación a PDF',
  'Comunidad completa (publicar, reaccionar)',
  'Ritual diario personalizado',
  'YouTube embebido en el chat',
  'Análisis psicológico profundo y arquetipos',
  'Acceso prioritario a nuevos agentes',
] as const;
