import type { LifeAreaId } from '@/config/life-areas';

/**
 * Valores: lo que a la persona le importa de verdad (elige de 3 a 5). Cada valor vive en una o más áreas de vida:
 * así SOI puede comparar lo que dice que le importa con dónde pone su tiempo (conflictos internos), sin IA.
 * Inspirado en el trabajo de valores de la Terapia de Aceptación y Compromiso (Steven Hayes) y en el «comenzar con
 * un fin en mente» de Stephen Covey (*Los 7 hábitos de la gente altamente efectiva*, 1989).
 */
export const VALUES = [
  { id: 'familia', label: 'Familia', areas: ['relaciones'] },
  { id: 'amor', label: 'Amor', areas: ['relaciones', 'emociones'] },
  { id: 'amistad', label: 'Amistad', areas: ['relaciones'] },
  { id: 'salud', label: 'Salud', areas: ['salud'] },
  { id: 'equilibrio', label: 'Equilibrio', areas: ['salud', 'emociones'] },
  { id: 'paz', label: 'Paz interior', areas: ['emociones', 'espiritualidad'] },
  { id: 'fe', label: 'Fe', areas: ['espiritualidad'] },
  { id: 'gratitud', label: 'Gratitud', areas: ['espiritualidad', 'emociones'] },
  { id: 'autenticidad', label: 'Autenticidad', areas: ['emociones', 'proposito'] },
  { id: 'libertad', label: 'Libertad', areas: ['dinero', 'proposito'] },
  { id: 'seguridad', label: 'Seguridad', areas: ['dinero'] },
  { id: 'abundancia', label: 'Abundancia', areas: ['dinero'] },
  { id: 'crecimiento', label: 'Crecimiento', areas: ['trabajo', 'proposito'] },
  { id: 'aprendizaje', label: 'Aprendizaje', areas: ['trabajo'] },
  { id: 'excelencia', label: 'Excelencia', areas: ['trabajo'] },
  { id: 'disciplina', label: 'Disciplina', areas: ['salud', 'trabajo'] },
  { id: 'creatividad', label: 'Creatividad', areas: ['proposito', 'trabajo'] },
  { id: 'servicio', label: 'Servicio', areas: ['proposito', 'relaciones'] },
  { id: 'valentia', label: 'Valentía', areas: ['proposito'] },
  { id: 'honestidad', label: 'Honestidad', areas: ['relaciones'] },
  { id: 'aventura', label: 'Aventura', areas: ['proposito'] },
  { id: 'legado', label: 'Legado', areas: ['proposito', 'espiritualidad'] },
] as const satisfies readonly { id: string; label: string; areas: readonly LifeAreaId[] }[];

export type ValueId = (typeof VALUES)[number]['id'];
export type Value = (typeof VALUES)[number];
export const VALUE_IDS = VALUES.map((v) => v.id) as [ValueId, ...ValueId[]];

export const MIN_VALUES = 3;
export const MAX_VALUES = 5;

export function valueById(id: string): Value | null {
  return VALUES.find((v) => v.id === id) ?? null;
}
