import type { AgentId, Eslabon } from '@/config/agents';

/**
 * Saludo con el que SOI abre cada conversación nueva (sin bloques ni formularios).
 * Determinista e instantáneo: se arma en el servidor con lo que SOI ya sabe de la persona,
 * para que la conversación empiece sin esperar al modelo ni gastar consultas.
 */
export type OpenerInput = {
  name: string;
  hour: number;
  today: string;
  agent?: AgentId;
  onboardingCompleted: boolean;
  lastRitualDate: string | null;
  ritualAvailable: boolean;
  weakestLink: Eslabon | null;
  lastConversationTitle: string | null;
};

export type OpenerPractice = { kind: 'ritual'; href: string; label: string; detail: string; reason: string; locked: false };
export type Opener = { text: string; practice: OpenerPractice | null };

const AGENT_OPENERS: Partial<Record<AgentId, string>> = {
  manifestacion: 'Hablemos de lo que quieres vivir como si ya fuera tuyo. ¿Qué deseo tienes presente hoy?',
  afirmacion: 'Las palabras que te dices marcan el tono del día. ¿Qué te gustaría creer sobre ti hoy?',
  meditacion: 'Hagamos una pausa juntos. ¿Qué necesitas calmar en este momento?',
  suenos: 'Cuéntame un sueño, de los de dormir o de los de vivir. ¿Qué recuerdas?',
  riqueza: 'Hablemos de tu relación con el dinero y tus metas. ¿Qué te gustaría que cambiara este año?',
  brian_tracy: 'Empecemos por lo importante. ¿Cuál es esa tarea que llevas días posponiendo?',
  anti_sycophant: 'Aquí te voy a hablar con cariño y con honestidad. ¿Qué quieres mirar de frente?',
};

const LINK_QUESTION: Record<Eslabon, string> = {
  pensamiento: '¿Qué te estás diciendo hoy sobre ti?',
  emocion: '¿Cómo te sientes en este momento, de verdad?',
  accion: '¿Qué pequeño paso quieres dar hoy?',
  resultado: '¿Qué avance, aunque sea pequeño, notaste esta semana?',
};

export function greetingForHour(hour: number) {
  if (hour >= 5 && hour < 12) return 'Buenos días';
  if (hour >= 12 && hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function dayGap(from: string, to: string) {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
}

export function buildOpener(i: OpenerInput): Opener {
  const name = i.name.trim().split(/\s+/)[0] || '';
  const hello = `${greetingForHour(i.hour)}${name ? `, ${name}` : ''}.`;

  if (i.agent && AGENT_OPENERS[i.agent]) return { text: `${hello} ${AGENT_OPENERS[i.agent]}`, practice: null };

  if (!i.onboardingCompleted) {
    return {
      text: `${hello} Soy SOI. Te acompaño a convertir lo que piensas y sientes en acciones que se notan. ¿Cómo llegas hoy?`,
      practice: null,
    };
  }

  const ritualDone = i.lastRitualDate === i.today;
  const missed = i.lastRitualDate ? dayGap(i.lastRitualDate, i.today) >= 2 : false;

  if (missed) {
    return { text: `${hello} Ayer no te vimos, pero aquí seguimos. ¿Retomamos? ${LINK_QUESTION[i.weakestLink ?? 'emocion']}`, practice: ritualPractice(i, 'Volver con un paso pequeño.') };
  }

  if (!ritualDone && i.ritualAvailable && i.hour >= 5 && i.hour < 12) {
    return { text: `${hello} Tu ritual de hoy está listo, cuando quieras. O cuéntame cómo amaneciste.`, practice: ritualPractice(i, 'Empezar el día con intención.') };
  }

  if (i.lastConversationTitle) {
    return { text: `${hello} La última vez hablamos de «${i.lastConversationTitle}». ¿Cómo sigue eso?`, practice: null };
  }

  return { text: `${hello} ${LINK_QUESTION[i.weakestLink ?? 'emocion']}`, practice: null };
}

function ritualPractice(i: OpenerInput, reason: string): OpenerPractice | null {
  if (!i.ritualAvailable) return null;
  return { kind: 'ritual', href: '/ritual', label: 'Ritual de hoy', detail: 'Afirmación · visualización · acción · señal', reason, locked: false };
}
