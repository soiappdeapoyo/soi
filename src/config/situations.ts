import type { AgentId } from '@/config/agents';

/**
 * Rutinas por situación: la puerta de un toque a una rutina hecha a la medida de la persona. No son rutinas
 * fijas: abren el chat con el agente adecuado y SOI la diseña con lo que sabe de ella (hora, lo que le funciona,
 * su norte). `message` es lo que la persona envía al tocar "Empezar".
 */
export const SITUATIONS = [
  { id: 'manana', label: 'Mañana', icon: 'Sunrise', agent: 'rutinas', message: 'Quiero una rutina de mañana hecha para mí.', opener: 'Diseñemos tu rutina de mañana, a tu medida y con el tiempo que de verdad tienes.' },
  { id: 'noche', label: 'Noche', icon: 'Moon', agent: 'rutinas', message: 'Quiero una rutina de noche para cerrar bien el día.', opener: 'Diseñemos tu rutina de noche: cerrar el día, soltar lo pendiente y descansar.' },
  { id: 'ansiedad', label: 'Ansiedad', icon: 'Wind', agent: 'meditacion', message: 'Quiero una rutina para cuando me gana la ansiedad.', opener: 'Diseñemos una rutina corta para cuando llega la ansiedad, que puedas hacer en cualquier lugar.' },
  { id: 'enfoque', label: 'Enfoque', icon: 'Target', agent: 'brian_tracy', message: 'Quiero una rutina para enfocarme y avanzar en lo importante.', opener: 'Diseñemos tu rutina de enfoque: entrar rápido en lo importante y sostenerlo.' },
  { id: 'vender', label: 'Vender', icon: 'TrendingUp', agent: 'riqueza', message: 'Quiero una rutina para prepararme antes de vender o presentar.', opener: 'Diseñemos tu rutina antes de vender o presentar: claridad, seguridad y una acción concreta.' },
  { id: 'estudiar', label: 'Estudiar', icon: 'BookOpen', agent: 'james_clear', message: 'Quiero una rutina para estudiar con constancia.', opener: 'Diseñemos tu rutina para estudiar: fácil de empezar y fácil de repetir.' },
  { id: 'manifestar', label: 'Manifestar', icon: 'Sparkles', agent: 'manifestacion', message: 'Quiero una rutina para manifestar lo que deseo, con acción.', opener: 'Diseñemos tu rutina para manifestar: claridad, sentir el deseo cumplido y una acción de hoy.' },
  { id: 'dormir', label: 'Dormir mejor', icon: 'Moon', agent: 'meditacion', message: 'Quiero una rutina para dormir mejor.', opener: 'Diseñemos tu rutina para dormir mejor: bajar el ritmo y soltar el día.' },
] as const satisfies readonly { id: string; label: string; icon: string; agent: AgentId; message: string; opener: string }[];

export type SituationId = (typeof SITUATIONS)[number]['id'];

export function situationById(id: string | undefined | null) {
  return SITUATIONS.find((s) => s.id === id) ?? null;
}
