/**
 * /persons: gimnasio de conversación con personas sintéticas, para otro tipo de cuenta (`user_profiles.app_role`).
 * Nombre visible y colores en un solo lugar (estilo WhatsApp, por diseño del producto).
 */
export const PERSONS_BRAND = 'Ensaya';
export const PERSONS_TAGLINE = 'Practica conversaciones con alguien que tiene una vida.';

/** Paleta tipo WhatsApp (contraste AA: el verde con texto blanco 5:1; la hora #556770 sobre las burbujas ≥ 4.5:1). */
export const WA = {
  header: '#008069',
  chatBg: '#EFEAE2',
  outBubble: '#D9FDD3',
  inBubble: '#FFFFFF',
  time: '#556770',
  badge: '#25D366',
  tick: '#1E88C7',
  system: '#FFF3C4',
} as const;

/** Cookie del modo ciego (la emoción del personaje no se muestra en el encabezado). */
export const BLIND_COOKIE = 'persons_blind';
export const BLIND_COOKIE_RE = /(?:^|;\s*)persons_blind=1(?:;|$)/;
