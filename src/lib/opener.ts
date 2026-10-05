import type { AgentId, Eslabon } from '@/config/agents';
import type { MomentumState } from '@/lib/momentum';
import { pickCelebration, daySeed, type Progress } from '@/lib/rewards';

/**
 * Saludo con el que SOI abre cada conversación nueva (sin bloques ni formularios).
 * Determinista e instantáneo (sin esperar al modelo ni gastar consultas), pero agéntico:
 * 1) celebra un avance real (recompensa), 2) anticipa cómo llegas con lo que SOI ha aprendido de ti,
 * 3) propone algo concreto que puedes empezar con un toque, 4) lo conecta con tu meta, y deja respuestas rápidas.
 */
export type OpenerProposal = { id: string; title: string; minutes: number; cover: string | null; why: string; label: string };

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
  /** Lo nuevo: lo que SOI ya sabe. Todo opcional para no romper llamadas antiguas. */
  checkin?: MomentumState | null;
  dominantEmotion?: string | null;
  goal?: string | null;
  progress?: Progress | null;
  proposal?: Omit<OpenerProposal, 'why' | 'label'> & { helpedBefore?: boolean; lift?: number | null; challengeDay?: number | null } | null;
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
};

const STATE_PHRASE: Record<MomentumState, string> = {
  anxiety: 'con la mente acelerada',
  low_energy: 'con poca energía',
  high_energy: 'con ganas de avanzar',
  confusion: 'con muchas cosas en la cabeza',
};

const STATE_WHY: Record<MomentumState, string> = {
  anxiety: 'Primero bajamos el ritmo; con el cuerpo en calma todo lo demás se ve distinto.',
  low_energy: 'Es corto y no te exige: solo empezar ya cambia tu estado.',
  high_energy: 'Aprovechemos esta energía antes de que se disperse.',
  confusion: 'Te ayuda a elegir una sola cosa y soltar el resto por hoy.',
};

const REPLIES: Record<MomentumState, OpenerReply> = {
  anxiety: { label: 'Me siento con ansiedad', text: 'Hoy me siento con ansiedad.' },
  low_energy: { label: 'Tengo poca energía', text: 'Hoy tengo poca energía.' },
  high_energy: { label: 'Tengo energía', text: 'Hoy tengo energía y quiero avanzar.' },
  confusion: { label: 'Estoy sin claridad', text: 'Hoy me siento sin claridad, con muchas cosas en la cabeza.' },
};

export function greetingForHour(hour: number) {
  if (hour >= 5 && hour < 12) return 'Buenos días';
  if (hour >= 12 && hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function dayGap(from: string, to: string) {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
}

const ANXIOUS = /ansie|estr[eé]s|miedo|preocup|nervio|angust/i;
const LOW = /triste|cansa|agota|desmotiv|apat|vac[ií]o|sol[oa]/i;

/**
 * Lo que SOI anticipa (con humildad: "imagino"). Prioridad: el check-in de hoy, el ánimo con el que
 * llega a sus Moments, y la emoción dominante según la hora. Devuelve el estado y la evidencia que lo sugiere.
 */
export function anticipate(i: OpenerInput): { state: MomentumState; evidence: string } {
  if (i.checkin) return { state: i.checkin, evidence: 'por lo que me contaste hoy' };
  const mood = i.progress?.recentMood ?? null;
  const night = i.hour >= 20 || i.hour < 5;
  if (mood !== null && mood <= 2.5) {
    const emo = i.dominantEmotion ?? '';
    return { state: ANXIOUS.test(emo) ? 'anxiety' : 'low_energy', evidence: 'por cómo has llegado a tus últimos Moments' };
  }
  if (i.dominantEmotion && ANXIOUS.test(i.dominantEmotion) && (night || (mood !== null && mood < 3.5))) {
    return { state: 'anxiety', evidence: `${night ? 'a esta hora y ' : ''}porque la ${i.dominantEmotion.toLowerCase()} ha aparecido seguido` };
  }
  if (i.dominantEmotion && LOW.test(i.dominantEmotion)) {
    return { state: 'low_energy', evidence: `porque estos días ha aparecido ${i.dominantEmotion.toLowerCase()}` };
  }
  if (mood !== null && mood >= 4) return { state: 'high_energy', evidence: 'porque vienes llegando con buen ánimo' };
  if (i.progress && i.progress.weekRuns >= 3) return { state: 'high_energy', evidence: 'por el ritmo que traes esta semana' };
  if (i.hour >= 5 && i.hour < 10) return { state: 'high_energy', evidence: 'porque la mañana es tu mejor momento para empezar' };
  if (night) return { state: 'low_energy', evidence: 'porque es el final del día' };
  return { state: 'low_energy', evidence: 'por la hora del día' };
}

export function buildOpener(i: OpenerInput): Opener {
  const name = i.name.trim().split(/\s+/)[0] || '';
  const hello = `${greetingForHour(i.hour)}${name ? `, ${name}` : ''}.`;
  const seed = daySeed(i.today);

  if (i.agent && AGENT_OPENERS[i.agent]) {
    return { text: `${hello} ${AGENT_OPENERS[i.agent]}`, practice: null, proposal: null, replies: [] };
  }

  const { state, evidence } = anticipate(i);
  const p = i.progress ?? null;
  const missed = i.lastRitualDate ? dayGap(i.lastRitualDate, i.today) >= 2 : false;
  const away = p?.daysSinceLastRun ?? null;

  // 1) Recompensa: un avance real (o un regreso, que también cuenta).
  const win = (away !== null && away >= 2) || missed
    ? 'Ayer no te vimos, pero aquí seguimos. ¿Retomamos? Volver ya es una victoria: cada regreso le enseña a tu cerebro que puedes contar contigo.'
    : p ? pickCelebration(p, seed) : null;

  // 2) Anticipación (con humildad) y 3) propuesta concreta.
  const feel = i.onboardingCompleted || i.checkin
    ? `Imagino que hoy llegas ${STATE_PHRASE[state]}, ${evidence}.`
    : 'Soy SOI. Te acompaño a convertir lo que piensas y sientes en acciones que se notan.';

  let proposal: OpenerProposal | null = null;
  let offer = '';
  if (i.proposal) {
    const pr = i.proposal;
    const why = pr.challengeDay
      ? `Hoy toca el día ${pr.challengeDay}: un día a la vez.`
      : pr.helpedBefore && pr.lift && pr.lift > 0
        ? `La última vez te subió el ánimo ${pr.lift.toLocaleString('es')} ${pr.lift === 1 ? 'punto' : 'puntos'}. ${STATE_WHY[state]}`
        : STATE_WHY[state];
    proposal = { id: pr.id, title: pr.title, minutes: pr.minutes, cover: pr.cover, why, label: pr.challengeDay ? `Hacer el día ${pr.challengeDay}` : 'Empezar ahora' };
    offer = pr.challengeDay
      ? `Te propongo seguir con «${pr.title}». ${why} ¿Lo hacemos?`
      : `Te propongo «${pr.title}» (${pr.minutes} min). ${why} ¿Lo hacemos ahora?`;
  } else if (i.ritualAvailable && i.lastRitualDate !== i.today && i.hour >= 5 && i.hour < 12) {
    offer = 'Tu ritual de hoy está listo: cuatro pasos cortos para empezar con intención. ¿Lo hacemos?';
  } else {
    offer = state === 'anxiety' ? '¿Respiramos juntos un minuto y luego me cuentas?' : '¿Qué pequeño paso quieres dar hoy? Si quieres, lo diseño contigo ahora.';
  }

  // 4) Meta y corrección fácil.
  const goal = i.goal ? `Cada paso te acerca a «${i.goal}».` : '';
  const correct = i.lastConversationTitle
    ? `Si llegas distinto, dímelo y lo ajusto. O seguimos con «${i.lastConversationTitle}», lo que hablamos la última vez.`
    : 'Si llegas distinto, dímelo y lo ajusto.';

  const text = [[hello, win].filter(Boolean).join(' '), feel, offer, [goal, correct].filter(Boolean).join(' ')].filter(Boolean).join('\n\n');

  const replies: OpenerReply[] = [];
  if (proposal) replies.push({ label: proposal.label, href: `/m/${proposal.id}/play` });
  replies.push(...(Object.keys(REPLIES) as MomentumState[]).filter((s) => s !== state).slice(0, 2).map((s) => REPLIES[s]));
  replies.push({ label: 'Proponme otra cosa', text: 'Proponme otro Moment para ahora, distinto.' });
  if (i.lastConversationTitle) replies.push({ label: `Seguir con «${i.lastConversationTitle.slice(0, 28)}»`, text: `Sigamos con lo que hablamos: ${i.lastConversationTitle}.` });

  const practice = !proposal && i.ritualAvailable && i.lastRitualDate !== i.today && (missed || (i.hour >= 5 && i.hour < 12))
    ? ritualPractice(missed ? 'Volver con un paso pequeño.' : 'Empezar el día con intención.')
    : null;

  return { text, practice, proposal, replies: replies.slice(0, 4) };
}

function ritualPractice(reason: string): OpenerPractice {
  return { kind: 'ritual', href: '/ritual', label: 'Ritual de hoy', detail: 'Afirmación · visualización · acción · señal', reason, locked: false };
}
