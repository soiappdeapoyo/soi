/**
 * Las 5 pestañas principales (barra inferior en móvil, primer grupo del sidebar en escritorio).
 * `match`: prefijos de ruta que cuentan como "dentro" de la pestaña.
 */
export const PRIMARY_TABS = [
  { id: 'hoy', href: '/hoy', label: 'Hoy', icon: 'Sun', match: ['/hoy', '/ritual'] },
  { id: 'impulso', href: '/impulso', label: 'Impulso', icon: 'Zap', match: ['/impulso', '/m', '/p', '/u', '/actividad', '/mensajes', '/momentos', '/blueprints', '/comunidad', '/c/'] },
  { id: 'soi', href: '/chat', label: 'SOI', icon: 'MessageCircle', match: ['/chat'] },
  { id: 'mi-vida', href: '/mi-vida', label: 'Mi Vida', icon: 'Orbit', match: ['/mi-vida', '/ideas', '/implementaciones', '/rutinas'] },
  { id: 'yo', href: '/yo', label: 'Yo', icon: 'User', match: ['/yo', '/perfil', '/ajustes', '/planes', '/evidencias', '/creadores'] },
] as const;
export type PrimaryTab = (typeof PRIMARY_TABS)[number];

export function isTabActive(pathname: string, tab: { match: readonly string[] }) {
  return tab.match.some((m) => pathname === m || pathname.startsWith(m.endsWith('/') ? m : `${m}/`));
}

/** Pantallas inmersivas donde la barra inferior se oculta (ejecución de un Moment). */
export function hidesBottomNav(pathname: string) {
  return /^\/m\/[^/]+\/play$/.test(pathname) || /^\/rutinas\/[^/]+$/.test(pathname);
}

/** Accesos secundarios (sidebar y menú móvil). */
export const MY_SPACE = [
  { href: '/ritual', label: 'Ritual diario', icon: 'Sunrise' },
  { href: '/evidencias', label: 'Muro de Evidencias', icon: 'Star' },
  { href: '/comunidad', label: 'Comunidad', icon: 'Users' },
  { href: '/creadores', label: 'Estudio de creador', icon: 'PenLine' },
] as const;

export const PROTECTED_PREFIXES = [
  '/hoy', '/impulso', '/mi-vida', '/yo',
  '/chat', '/onboarding', '/rutinas', '/ritual', '/evidencias', '/comunidad', '/perfil', '/ajustes', '/planes',
  '/momentos', '/blueprints', '/implementaciones', '/creadores', '/m', '/ideas', '/p', '/u', '/actividad', '/mensajes',
];

export const STREAK_MILESTONES = [7, 21, 40, 90] as const;
export const EVIDENCE_MILESTONES = [10, 50, 100] as const;

export const RITUAL_PHASES = {
  chispa: { label: 'Chispa', desc: 'Descubrimiento' },
  vacio: { label: 'Vacío', desc: 'Cuestionamiento' },
  alineacion: { label: 'Alineación', desc: 'Coherencia' },
  manifestacion: { label: 'Manifestación', desc: 'Evidencia' },
} as const;
export type RitualPhase = keyof typeof RITUAL_PHASES;
