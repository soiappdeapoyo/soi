import { whenPhrase } from '@/lib/opener-hooks';
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

const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

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
  /** Su último "Ahora no" (2 días): el saludo lo reconoce y propone algo distinto. */
  declined?: { title: string; dayLabel: string } | null;
  /** Lo pendiente (últimos 3 días): el saludo lo retoma con sus palabras. quote null = tema sensible, sin citar. */
  thread?: { quote: string | null; dayLabel: string } | null;
  /** Nunca ha conversado ni vivido un Moment: presentación breve y una sola pregunta abierta. */
  firstTime?: boolean;
};

export type OpenerPractice = { kind: 'ritual'; href: string; label: string; detail: string; reason: string; locked: false };
export type OpenerReply = { label: string; text?: string; href?: string };
/** Para medir qué saludo funciona mejor (PostHog). */
export type OpenerKind = 'first' | 'thread' | 'checkin' | 'proposal' | 'agent' | 'run' | 'ai';
/**
 * replies: hasta 3 chips (lo principal, un toque). links: lo secundario, como enlaces discretos ("Proponme algo", el ritual).
 */
export type Opener = { text: string; practice: OpenerPractice | null; proposal: OpenerProposal | null; replies: OpenerReply[]; links: OpenerReply[]; kind: OpenerKind };

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

/** Al retomar lo pendiente: tres respuestas de un toque. */
const THREAD_REPLIES: OpenerReply[] = [
  { label: 'Mejor', text: 'Mejor, gracias por preguntar.' },
  { label: 'Sigue igual', text: 'Sigue igual.' },
  { label: 'Hoy es otra cosa', text: 'Hoy es otra cosa.' },
];

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
    return { text: `${hello} ${AGENT_OPENERS[i.agent]}`, practice: null, proposal: null, replies: [], links: [], kind: 'agent' };
  }

  // Primera vez: qué es SOI en una frase y una pregunta abierta. Sin chips: todavía no hay nada que elegir.
  if (i.firstTime) {
    return {
      text: `Hola${name ? `, ${name}` : ''}. Soy SOI: te acompaño a sentirte mejor con pequeños momentos para tu mente y tu día. Para empezar, ¿qué te trae por aquí hoy?`,
      practice: null, proposal: null, replies: [], links: [], kind: 'first',
    };
  }

  const missed = i.lastRitualDate ? dayGap(i.lastRitualDate, i.today) >= 2 : false;
  const away = i.progress?.daysSinceLastRun ?? null;

  // 1) Detectar / recordar: un regreso, o evidencia concreta. Nada genérico.
  // Si la propuesta ya trae el recuerdo de ese mismo Moment, no lo repetimos como evidencia.
  const sameMemory = Boolean(i.proposal?.memory && i.lastRun && i.proposal.memory.title === i.lastRun.title && i.proposal.memory.dayLabel === i.lastRun.dayLabel);
  // Lo que aprendió del último "Ahora no" va antes que la evidencia: es lo más reciente que dijo la persona.
  const when = i.declined ? (i.declined.dayLabel === 'hoy' ? 'Hace un rato' : cap(whenPhrase(i.declined.dayLabel))) : '';
  const declinedLine = i.declined
    ? (i.proposal
      ? `${when} preferiste dejar «${i.declined.title}» para otro momento; lo tomé en cuenta.`
      : `${when} preferiste dejar «${i.declined.title}» para otro momento, así que no te propongo nada: tú dime qué te gustaría.`)
    : null;
  const evidence = declinedLine ?? ((away !== null && away >= 2) || missed
    ? 'Ayer no te vimos, pero aquí seguimos. ¿Retomamos?'
    : sameMemory ? null : evidenceLine(i));

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
  // Lo pendiente manda: retomar lo que contó vale más que preguntar cómo llega (nunca las dos preguntas).
  const thread = i.thread
    ? (i.thread.quote
      ? `${cap(whenPhrase(i.thread.dayLabel))} me contaste: «${i.thread.quote}». ¿Cómo siguió?`
      : `${cap(whenPhrase(i.thread.dayLabel))} hablamos de algo importante para ti. ¿Cómo sigues hoy?`)
    : null;
  const text = thread
    ? [hello, declinedLine, suggest, thread].filter(Boolean).join(' ')
    : [hello, intro, evidence, said ?? maybe, suggest, ask].filter(Boolean).join(' ');

  // Máximo 3 chips (lo principal) y lo secundario como enlaces discretos. El botón de empezar vive en la tarjeta.
  const replies: OpenerReply[] = thread ? THREAD_REPLIES : !i.checkin ? CHECKIN_REPLIES : [];
  const links: OpenerReply[] = [proposal ? { label: 'Otra idea', text: 'Proponme otra cosa para ahora.' } : { label: 'Proponme algo', text: 'Proponme algo para ahora.' }];
  const ritualReady = !proposal && i.ritualAvailable && i.lastRitualDate !== i.today && (missed || part === 'manana');
  if (ritualReady) links.push({ label: 'Mi ritual de hoy', href: '/ritual' });

  // El ritual ya no es una tarjeta en el saludo: es un enlace (la persona decide).
  const practice = null;

  return { text, practice, proposal, replies: replies.slice(0, 3), links, kind: thread ? 'thread' : proposal ? 'proposal' : 'checkin' };
}

/**
 * Al venir de un Moment ("Hablar con SOI"): SOI ya sabe qué viviste y cómo te fue, y te deja hablar.
 * Sin preguntas de formulario: una sola, abierta, y respuestas de un toque.
 */
export function momentRunOpener(r: { title: string; helped: boolean | null; moodBefore: number | null; moodAfter: number | null; name?: string }): Opener {
  const first = (r.name ?? '').trim().split(/\s+/)[0];
  const hi = first ? `${first}, a` : 'A';
  const better = r.helped === true || (r.moodBefore !== null && r.moodAfter !== null && r.moodAfter > r.moodBefore);
  const text = r.helped === false
    ? `${hi}cabas de vivir «${r.title}». Me dijiste que no del todo, y está bien: eso también me enseña. ¿Qué sentiste que no encajó?`
    : better
    ? `${hi}cabas de vivir «${r.title}» y se nota que te hizo bien. ¿Qué quieres contarme de cómo te fue?`
    : `${hi}cabas de vivir «${r.title}». Aquí estoy. ¿Cómo te fue?`;
  const replies: OpenerReply[] = r.helped === false
    ? [
        { label: 'Fue muy largo', text: 'Se me hizo muy largo.' },
        { label: 'No era el momento', text: 'No era el momento para esto.' },
        { label: 'Hazme otro', text: 'Hazme otro Moment que me ayude más.' },
      ]
    : [
        { label: 'Me hizo bien', text: 'Me hizo bien. Te cuento qué funcionó.' },
        { label: 'Algo me costó', text: 'Algo me costó en este Moment.' },
        { label: 'Quiero repetirlo mañana', text: 'Quiero repetirlo mañana. ¿Me lo recuerdas?' },
      ];
  return { text, practice: null, proposal: null, replies, links: [], kind: 'run' };
}
