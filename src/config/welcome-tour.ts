import { PRIMARY_TABS, type PrimaryTab } from '@/config/navigation';

/**
 * Recorrido de bienvenida (`WelcomeTour`): enseña la barra de navegación. La pantalla se oscurece y solo queda
 * iluminada la pestaña que se explica (barra inferior en el teléfono, sidebar en la computadora), con una burbuja
 * de lo que se puede hacer ahí. Empieza con una bienvenida y termina iluminando SOI: el mejor primer paso.
 */
export type TourStep = {
  id: string;
  /** Pestaña que se ilumina (`data-tour` en la barra); sin ella, la tarjeta va al centro. */
  target: PrimaryTab['id'] | null;
  title: string;
  body: string;
};

/** Lo que se puede hacer en cada pestaña (en el orden de la barra). */
const TAB_COPY: Record<PrimaryTab['id'], { title: string; body: string }> = {
  hoy: { title: 'Hoy', body: 'Tu día en un solo lugar: lo que SOI te propone ahora y tus Moments en orden. Un toque y empiezas, guiado por voz.' },
  impulso: { title: 'Impulso', body: 'Moments y publicaciones de la comunidad para inspirarte y guardar los que te sirvan.' },
  soi: { title: 'SOI', body: 'Tu conversación. Cuéntale cómo llegas o lo que traes: te escucha y, si quieres, te diseña una práctica para este momento.' },
  'mi-vida': { title: 'Mi Vida', body: 'Tu mapa de vida, tu día, tus Moments guardados y cómo va tu bienestar semana a semana.' },
  yo: { title: 'Yo', body: 'Tu perfil, tus logros y Ajustes: tu plan, la voz, los avisos y este recorrido otra vez.' },
};

export const TOUR_STEPS: readonly TourStep[] = [
  { id: 'bienvenida', target: null, title: 'Te damos la bienvenida a SOI', body: 'Tu acompañante de bienestar con IA. Te muestro en 30 segundos dónde está cada cosa.' },
  ...PRIMARY_TABS.map((t): TourStep => ({ id: t.id, target: t.id, ...TAB_COPY[t.id] })),
  { id: 'empieza', target: 'soi', title: 'Empieza por aquí', body: 'Cuéntale a SOI cómo llegas hoy. Con eso te conoce y te propone lo que te sirva.' },
];

/** Pantallas donde nunca aparece sola: un Moment en marcha y los flujos de pantalla completa (ahí no hay barra). */
const NO_AUTO = [/^\/m\/[^/]+\/play$/, /^\/mapa\//, /^\/consentimiento/, /^\/rutinas\/[^/]+$/];

/** Aparece sola la primera vez (sin `tour_seen_at`), salvo en un Moment en marcha; entonces espera a la siguiente pantalla. */
export function shouldAutoShowTour(pathname: string, seenAt: string | null | undefined): boolean {
  return !seenAt && !NO_AUTO.some((r) => r.test(pathname));
}

export type Rect = { top: number; left: number; width: number; height: number };
export type Viewport = { width: number; height: number };

/**
 * Dónde va la burbuja: arriba de la pestaña si está abajo (barra del teléfono), a su derecha si está a la izquierda
 * (sidebar). Siempre dentro de la pantalla, con la flecha apuntando al centro de la pestaña.
 */
export function bubblePlacement(r: Rect, vp: Viewport, bubble = { width: 320, gap: 14, margin: 12 }) {
  const w = Math.min(bubble.width, vp.width - bubble.margin * 2);
  const cx = r.left + r.width / 2;
  if (r.top > vp.height / 2) {
    const left = Math.max(bubble.margin, Math.min(vp.width - w - bubble.margin, cx - w / 2));
    return { side: 'top' as const, left, bottom: vp.height - r.top + bubble.gap, width: w, arrow: cx - left };
  }
  const cy = r.top + r.height / 2;
  const top = Math.max(bubble.margin, cy - 40);
  return { side: 'right' as const, left: r.left + r.width + bubble.gap, top, width: w, arrow: cy - top };
}
