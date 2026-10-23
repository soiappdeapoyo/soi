/**
 * Introducción de bienvenida (`WelcomeTour`): qué es SOI y a dónde ir, en 4 pantallas que se deslizan.
 * Cada pantalla nombra la pestaña donde vive lo que explica, con su mismo icono, para que la persona sepa a dónde ir.
 */
export type TourSlide = {
  id: 'que-es' | 'soi' | 'hoy' | 'mi-vida';
  title: string;
  body: string;
  /** Pestaña donde vive (icono y nombre de `PRIMARY_TABS`). */
  tab?: { label: string; icon: string };
};

export const TOUR_SLIDES: readonly TourSlide[] = [
  {
    id: 'que-es',
    title: 'Te damos la bienvenida a SOI',
    body: 'Tu acompañante de bienestar con IA. Te escucha, te diseña prácticas de pocos minutos y te muestra cómo vas cambiando.',
  },
  {
    id: 'soi',
    title: 'Cuéntale a SOI lo que traes',
    body: 'Escribe como le escribirías a alguien de confianza. SOI te escucha primero y, si quieres, te propone algo para este momento.',
    tab: { label: 'SOI', icon: 'MessageCircle' },
  },
  {
    id: 'hoy',
    title: 'Vive tus Moments',
    body: 'Un Moment es una práctica corta guiada por voz: respirar, visualizar, escribir. En Hoy tienes lo que toca, en orden, con un toque.',
    tab: { label: 'Hoy', icon: 'Sun' },
  },
  {
    id: 'mi-vida',
    title: 'Mira cómo cambias',
    body: 'Tu mapa de vida, tus hábitos y tu bienestar. SOI te muestra tu avance con evidencia, no con promesas.',
    tab: { label: 'Mi Vida', icon: 'Orbit' },
  },
];

/** Pantallas donde nunca aparece sola: un Moment en marcha (quien llega de la landing a su reto) y flujos de pantalla completa. */
const NO_AUTO = [/^\/m\/[^/]+\/play$/, /^\/mapa\//, /^\/consentimiento/];

/** Aparece sola la primera vez (sin `tour_seen_at`), salvo en un Moment en marcha; entonces espera a la siguiente pantalla. */
export function shouldAutoShowTour(pathname: string, seenAt: string | null | undefined): boolean {
  return !seenAt && !NO_AUTO.some((r) => r.test(pathname));
}
