import type { AgentId, Eslabon } from '@/config/agents';
import type { MomentumState } from '@/lib/momentum';
import type { Progress } from '@/lib/rewards';
import { partOfDay, type DayPart } from '@/lib/day-plan';

/**
 * Saludo con el que SOI abre cada conversación. Determinista e instantáneo, con arquitectura de copiloto:
 * DETECTAR (qué hora es, qué hiciste) → RECORDAR (evidencia concreta, en tus palabras) → SUGERIR (con el porqué)
 * → ACOMPAÑAR (pregunta cómo llegas; no lo supone). Sin frases motivacionales genéricas ni puntajes.
 */
export type OpenerProposal = { id: string; title: string; minutes: number; cover: string | null; why: string; label: string };

/** Un recuerdo concreto: qué Moment, qué día y, si lo escribió, sus palabras. */
export type OpenerMemory = { title: string; dayLabel: string; learning?: string | null; helped?: boolean | null; evening?: boolean };

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
  checkin?: MomentumState | null;
  goal?: string | null;
  progress?: Progress | null;
  /** Días distintos con un Moment completado esta semana (en su zona horaria). */
  weekDays?: number;
  /** Lo último que vivió (evidencia). */
  lastRun?: OpenerMemory | null;
  proposal?: (Omit<OpenerProposal, 'why' | 'label'> & { challengeDay?: number | null; planned?: boolean; memory?: OpenerMemory | null }) | null;
};

export type OpenerPractice = { kind: 'ritual'; href: string; label: string; detail: string; reason: string; locked: false };
export type OpenerReply = { label: string; text?: string; href?: string };
export type Opener = { text: string; practice: OpenerPractice | null; proposal: OpenerProposal | null; replies: OpenerReply[] };

const AGENT_OPENERS: Partial<Record<AgentId, string>> = {
  manifestacion: 'Hablemos de lo que quieres vivir como si ya fuera tuyo. ¿Qué deseo tienes presente hoy?',
  afirmacion: 'Las palabras que te dices marcan el tono del día. ¿Qué te gustaría creer sobre ti hoy?',
  meditacion: 'Hagamos una pausa juntos. ¿Qué necesitas calmar en este momento?',
  suenos: 'Cuéntame un sueño, de los de dormir o de los de vivir. ¿Qué recuerdas?',
  riqueza: 'Hablemos de tu relación con el dinero y tus metas. ¿Qué te gustaría que cambiara este año?',
  brian_tracy: 'Empecemos por lo importante. ¿Cuál es esa tarea que llevas días posponiendo?',
  anti_sycophant: 'Aquí te voy a hablar con cariño y con honestidad. ¿Qué quieres mirar de frente?',
  napoleon_hill: 'Empecemos por lo esencial: ¿qué quieres exactamente, y qué estás haciendo hoy para conseguirlo?',
};

const CHECKIN_REPLIES: OpenerReply[] = [
  { label: 'Con energía', text: 'Hoy llego con energía.' },
  { label: 'Neutral', text: 'Hoy llego neutral.' },
  { label: 'Con algo de carga', text: 'Hoy llego con algo de carga.' },
];

const CHECKIN_SAID: Record<MomentumState, string> = {
  high_energy: 'Me dijiste que hoy llegas con energía.',
  low_energy: 'Me dijiste que hoy llegas con poca energía; vamos sin exigirte.',
  anxiety: 'Me dijiste que hoy llegas con ansiedad; vamos con calma.',
  confusion: 'Me dijiste que hoy llegas con muchas cosas en la cabeza.',
};

const PART_INTRO: Record<DayPart, string> = { manana: 'Para empezar la mañana', tarde: 'Para esta tarde', noche: 'Para cerrar el día' };

export function greetingForHour(hour: number) {
  if (hour >= 5 && hour < 12) return 'Buenos días';
  if (hour >= 12 && hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function dayGap(from: string, to: string) {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
}

const quote = (t: string, max = 90) => {
  const s = t.trim().replace(/\s+/g, ' ');
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
};

/** "Ayer", "Hoy" o "El jueves". */
const when = (dayLabel: string) => (dayLabel === 'ayer' ? 'Ayer' : dayLabel === 'hoy' ? 'Hoy' : `El ${dayLabel}`);

/** Evidencia concreta (o nada): lo que hizo ayer u hoy, o cuántos días practicó esta semana. */
export function evidenceLine(i: Pick<OpenerInput, 'lastRun' | 'weekDays'>): string | null {
  const r = i.lastRun;
  if (r?.dayLabel === 'ayer') return r.evening ? `Ayer cerraste el día con «${r.title}».` : `Ayer hiciste «${r.title}».`;
  if (r?.dayLabel === 'hoy') return `Hoy ya hiciste «${r.title}».`;
  if ((i.weekDays ?? 0) >= 2) return `Esta semana ya practicaste ${i.weekDays} días.`;
  return null;
}

/** Recuerdo que explica la sugerencia: cuándo lo hizo y, si lo escribió, sus palabras. */
export function memoryLine(m: OpenerMemory | null | undefined): string {
  if (!m) return '';
  if (m.learning && m.learning.trim().length >= 6) return `${when(m.dayLabel)} lo hiciste y escribiste: «${quote(m.learning)}».`;
  if (m.helped) return `${when(m.dayLabel)} lo hiciste y marcaste que te ayudó.`;
  return '';
}

export function buildOpener(i: OpenerInput): Opener {
  const name = i.name.trim().split(/\s+/)[0] || '';
  const hello = `${greetingForHour(i.hour)}${name ? `, ${name}` : ''}.`;
  const part = partOfDay(i.hour);

  if (i.agent && AGENT_OPENERS[i.agent]) {
    return { text: `${hello} ${AGENT_OPENERS[i.agent]}`, practice: null, proposal: null, replies: [] };
  }

  const missed = i.lastRitualDate ? dayGap(i.lastRitualDate, i.today) >= 2 : false;
  const away = i.progress?.daysSinceLastRun ?? null;

  // 1) Detectar / recordar: un regreso, o evidencia concreta. Nada genérico.
  // Si la propuesta ya trae el recuerdo de ese mismo Moment, no lo repetimos como evidencia.
  const sameMemory = Boolean(i.proposal?.memory && i.lastRun && i.proposal.memory.title === i.lastRun.title && i.proposal.memory.dayLabel === i.lastRun.dayLabel);
  const evidence = (away !== null && away >= 2) || missed
    ? 'Ayer no te vimos, pero aquí seguimos. ¿Retomamos?'
    : sameMemory ? null : evidenceLine(i);

  // 2) Cómo llega: solo lo que dijo hoy; con evidencia de ánimo bajo, "quizá" (nunca afirmarlo).
  const said = i.checkin ? CHECKIN_SAID[i.checkin] : null;
  const recentMood = i.progress?.recentMood ?? null;
  const maybe = !i.checkin && recentMood !== null && recentMood <= 2.5
    ? 'Viendo cómo has llegado a tus últimos Moments, quizá hoy te venga bien empezar suave.' : null;

  // 3) Sugerir, con el porqué (la hora, tu plan o tu historia).
  let proposal: OpenerProposal | null = null;
  let suggest = '';
  if (i.proposal) {
    const pr = i.proposal;
    const memory = memoryLine(pr.memory);
    const why = pr.challengeDay ? 'Un día a la vez.' : pr.planned ? 'Es lo que planeaste en Mi día.' : memory || `${PART_INTRO[part]}.`;
    proposal = { id: pr.id, title: pr.title, minutes: pr.minutes, cover: pr.cover, why, label: pr.challengeDay ? `Hacer el día ${pr.challengeDay}` : 'Empezar' };
    suggest = pr.challengeDay
      ? `Hoy toca el día ${pr.challengeDay} de «${pr.title}».`
      : pr.planned
        ? `En tu día sigue «${pr.title}».`
        : `${PART_INTRO[part]}, te propongo «${pr.title}» (${pr.minutes} min).${memory ? ` ${memory}` : ''}`;
  } else if (i.ritualAvailable && i.lastRitualDate !== i.today && part === 'manana') {
    suggest = 'Tu ritual de hoy está listo: cuatro pasos cortos para empezar con intención.';
  }

  // 4) Acompañar: autonomía. Si no sabemos cómo llega, se lo preguntamos.
  const ask = i.checkin
    ? (proposal ? '¿Lo hacemos?' : '¿Qué te gustaría mover hoy?')
    : proposal || suggest ? '¿O cómo llegas hoy: con energía, neutral o con algo de carga?' : '¿Cómo llegas hoy: con energía, neutral o con algo de carga?';

  const intro = i.onboardingCompleted || i.checkin ? null : 'Soy SOI y estoy aquí para acompañarte.';
  const text = [hello, intro, evidence, said ?? maybe, suggest, ask].filter(Boolean).join(' ');

  const replies: OpenerReply[] = [];
  if (proposal) replies.push({ label: proposal.label, href: `/m/${proposal.id}/play` });
  if (!i.checkin) replies.push(...CHECKIN_REPLIES);
  else replies.push({ label: 'Otra idea', text: 'Proponme otra cosa para ahora.' });
  if (i.lastConversationTitle) replies.push({ label: `Seguir con «${i.lastConversationTitle.slice(0, 28)}»`, text: `Sigamos con lo que hablamos: ${i.lastConversationTitle}.` });

  const practice = !proposal && i.ritualAvailable && i.lastRitualDate !== i.today && (missed || part === 'manana')
    ? ritualPractice(missed ? 'Volver con un paso pequeño.' : 'Empezar el día con intención.')
    : null;

  return { text, practice, proposal, replies: replies.slice(0, 5) };
}

function ritualPractice(reason: string): OpenerPractice {
  return { kind: 'ritual', href: '/ritual', label: 'Ritual de hoy', detail: 'Afirmación · visualización · acción · señal', reason, locked: false };
}
