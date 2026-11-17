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
  // Puertas (src/config/doors.ts): su práctica del día y el botón de un toque para el momento difícil.
  // `quick`: ayuda ahora (sin preguntas previas); el saludo es tal cual.
  { id: 'autoconcepto', door: true, label: 'Mi autoconcepto', icon: 'Heart', agent: 'manifestacion', message: 'Quiero una práctica para trabajar cómo me veo y sentirme en calma en el amor.', opener: 'Diseñemos tu práctica de hoy para el amor: empieza por cómo te ves tú.' },
  { id: 'duda', door: true, label: 'Me entró la duda', icon: 'Heart', agent: 'manifestacion', quick: true, message: 'Me entró la duda y no puedo soltarla. Ayúdame ahora, algo de 2 o 3 minutos.', opener: 'Aquí estoy. La duda llega, pero no eres tú. Vamos a bajarla juntas en un par de minutos. ¿Empezamos?' },
  { id: 'ansiedad_ahora', door: true, label: 'Me está ganando la ansiedad', icon: 'Wind', agent: 'meditacion', quick: true, message: 'Me está ganando la ansiedad ahorita. Ayúdame a calmarme, algo de 2 o 3 minutos.', opener: 'Aquí estoy contigo. Primero el cuerpo: vamos a bajar la ansiedad en un par de minutos. ¿Empezamos?' },
  { id: 'miedo_dinero', door: true, label: 'Me entró el miedo', icon: 'TrendingUp', agent: 'riqueza', quick: true, message: 'Me entró el miedo por el dinero. Ayúdame a calmarme y a ver qué sí puedo hacer hoy.', opener: 'Aquí estoy. El miedo al dinero aprieta, pero no decide por ti. Primero calma, luego un paso. ¿Empezamos?' },
  { id: 'meta_dinero', door: true, label: 'Mi meta de dinero', icon: 'Target', agent: 'riqueza', message: 'Quiero una práctica para tener clara mi meta de dinero y dar el paso de hoy.', opener: 'Diseñemos tu práctica de hoy: una meta clara y el paso que más te acerca.' },
  { id: 'habito', door: true, label: 'Mi hábito', icon: 'Repeat', agent: 'james_clear', message: 'Quiero crear un hábito y esta vez sostenerlo.', opener: 'Elijamos tu hábito y hagámoslo tan pequeño que no puedas fallar.' },
  { id: 'hoy_no_puedo', door: true, label: 'Hoy no puedo', icon: 'Repeat', agent: 'james_clear', quick: true, message: 'Hoy no tengo ganas ni energía para mi hábito. Ayúdame con la versión mínima.', opener: 'Está bien, hay días así. No se trata de hacerlo perfecto: hagamos la versión mínima y no fallas dos veces. ¿Va?' },
] as const satisfies readonly { id: string; label: string; icon: string; agent: AgentId; message: string; opener: string; quick?: boolean; door?: boolean }[];

export type SituationId = (typeof SITUATIONS)[number]['id'];

export function situationById(id: string | undefined | null) {
  return SITUATIONS.find((s) => s.id === id) ?? null;
}
