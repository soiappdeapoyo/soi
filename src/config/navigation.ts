export const MY_SPACE = [
  { href: '/ritual', label: 'Ritual diario', icon: 'Sunrise' },
  { href: '/evidencias', label: 'Muro de Evidencias', icon: 'Star' },
  { href: '/comunidad', label: 'Comunidad', icon: 'Users' },
  { href: '/perfil', label: 'Mi perfil', icon: 'User' },
] as const;

export const PROTECTED_PREFIXES = [
  '/chat', '/onboarding', '/rutinas', '/ritual', '/evidencias', '/comunidad', '/perfil', '/ajustes', '/planes',
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
