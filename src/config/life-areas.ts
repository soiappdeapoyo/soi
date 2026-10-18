import type { AgentId } from '@/config/agents';
import type { Capacity } from '@/config/capacities';

/**
 * Áreas de vida: DÓNDE quiere cambiar la persona (los eslabones dicen CÓMO interviene SOI; las capacidades,
 * QUÉ entrena cada Moment). Cada área se conecta con las capacidades que la mueven: así la evidencia de
 * Mi Nuevo Yo también cuenta para el área, sin clasificar nada dos veces.
 */
export const LIFE_AREAS = [
  {
    id: 'salud', label: 'Salud y energía', short: 'Salud', icon: 'Heart',
    question: '¿Cómo están tu cuerpo, tu descanso y tu energía?',
    capacities: ['Salud', 'Constancia'], agent: 'james_clear',
  },
  {
    id: 'emociones', label: 'Mundo emocional', short: 'Emociones', icon: 'Brain',
    question: '¿Cómo te sientes contigo la mayor parte del tiempo?',
    capacities: ['Calma', 'Paciencia', 'Gratitud', 'Confianza'], agent: 'meditacion',
  },
  {
    id: 'relaciones', label: 'Relaciones', short: 'Relaciones', icon: 'Users',
    question: '¿Cómo están tus vínculos: pareja, familia, amistades?',
    capacities: ['Comunicación', 'Paciencia', 'Gratitud'], agent: 'anti_sycophant',
  },
  {
    id: 'trabajo', label: 'Trabajo y estudio', short: 'Trabajo', icon: 'Target',
    question: '¿Cómo te sientes con lo que haces cada día para trabajar o aprender?',
    capacities: ['Enfoque', 'Disciplina', 'Aprendizaje', 'Liderazgo'], agent: 'brian_tracy',
  },
  {
    id: 'dinero', label: 'Dinero', short: 'Dinero', icon: 'TrendingUp',
    question: '¿Cómo está tu relación con el dinero?',
    capacities: ['Mentalidad de riqueza', 'Disciplina'], agent: 'riqueza',
  },
  {
    id: 'proposito', label: 'Propósito', short: 'Propósito', icon: 'Compass',
    question: '¿Qué tan claro tienes hacia dónde vas?',
    capacities: ['Claridad', 'Persistencia', 'Coraje', 'Creatividad'], agent: 'napoleon_hill',
  },
] as const satisfies readonly { id: string; label: string; short: string; icon: string; question: string; capacities: readonly Capacity[]; agent: AgentId }[];

export type LifeAreaId = (typeof LIFE_AREAS)[number]['id'];
export type LifeArea = (typeof LIFE_AREAS)[number];
export const LIFE_AREA_IDS = LIFE_AREAS.map((a) => a.id) as [LifeAreaId, ...LifeAreaId[]];

export function lifeArea(id: string): LifeArea | null {
  return LIFE_AREAS.find((a) => a.id === id) ?? null;
}

/** Áreas de enfoque a la vez: más de dos diluye la atención. */
export const MAX_FOCUS = 2;

/**
 * Punto de partida del plan por área cuando la IA no responde (y ejemplo para ella): una identidad y un hábito
 * clave en su versión de 2 minutos con su señal (James Clear, «Atomic Habits»). La persona lo edita antes de usarlo.
 */
export const AREA_DEFAULTS: Record<LifeAreaId, { identity: string; habit: { name: string; tiny: string; cue: string; time: string } }> = {
  salud: { identity: 'Soy alguien que cuida su cuerpo', habit: { name: 'Moverme cada mañana', tiny: 'Ponerme los tenis y caminar 2 minutos', cue: 'Después de lavarme la cara', time: '07:00' } },
  emociones: { identity: 'Soy alguien que se escucha con calma', habit: { name: 'Respirar antes de reaccionar', tiny: 'Un minuto de respiración lenta', cue: 'Después de servirme el café', time: '08:00' } },
  relaciones: { identity: 'Soy alguien presente con quien quiere', habit: { name: 'Un mensaje que acerca', tiny: 'Escribirle a una persona importante', cue: 'Después de comer', time: '14:00' } },
  trabajo: { identity: 'Soy alguien que termina lo importante', habit: { name: 'Mi tarea más importante primero', tiny: 'Abrir la tarea y trabajar 2 minutos', cue: 'Al sentarme a trabajar', time: '09:00' } },
  dinero: { identity: 'Soy alguien que decide con su dinero', habit: { name: 'Mirar mis números', tiny: 'Anotar lo que gasté hoy', cue: 'Después de cenar', time: '21:00' } },
  proposito: { identity: 'Soy alguien que avanza hacia lo que quiere', habit: { name: 'Leer mi declaración', tiny: 'Leer en voz alta mi meta principal', cue: 'Al despertar', time: '07:00' } },
};
