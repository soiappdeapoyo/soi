import type { ResponseProfile } from './spec';
import type { Presence } from './presence';
import type { EmotionState } from './emotion';

/**
 * Cuándo y cómo responde la persona sintética (latencia realista). Determinista: recibe `rand` para que cada turno sea
 * reproducible. Puro y testeable.
 *
 * - en línea: 8–60 s · disponible: 1–15 min · ocupada: al terminar lo que hace (o, si es largo o importante, un
 *   "ando en el trabajo, te escribo al rato" primero) · dormida: al despertar.
 * - Nunca más de 4 h de espera (salvo dormida: a su hora de despertar). Nunca deja en visto para siempre.
 * - El retraso nunca se usa para castigar: con algo vulnerable y ocupada, el aviso es cálido y honesto.
 * - Ritmo (`paceFor`): al inicio (los primeros mensajes) contesta en segundos, para que la charla arranque; y si ya
 *   están platicando (contestó hace poco), se queda en el chat y sigue rápido.
 */

export type Delivery = { content: string; kind: 'text' | 'voice'; deliverAt: Date; meta?: Record<string, unknown> };
export type Plan = { items: Delivery[]; readAt: Date };

const MAX_WAIT_MS = 4 * 3_600_000;
const between = (rand: () => number, lo: number, hi: number) => lo + (hi - lo) * rand();

/** Segundos de "escribiendo…" según el largo (y de "grabando audio…" según la duración). */
export function typingSeconds(text: string, kind: 'text' | 'voice' = 'text') {
  if (kind === 'voice') return Math.min(25, Math.max(4, Math.round(voiceSeconds(text) * 0.9)));
  return Math.min(8, Math.max(2, Math.round(2 + text.length / 18)));
}

/** Duración estimada de una nota de voz (≈ 14 caracteres por segundo hablando natural). */
export function voiceSeconds(text: string) {
  return Math.min(45, Math.max(3, Math.round(text.length / 14)));
}

const VOICE_ACTIVITIES = /corriendo|manejando|en bici|caminando|cocinando|en el cami[oó]n/;

export function wantsVoice(o: { allowed: boolean; boundary: boolean; text: string; presence: Presence; emotion: EmotionState; rand: () => number }) {
  if (!o.allowed || o.boundary || o.text.length > 180 || o.text.length < 12) return false;
  // En un "no" la voz suena a presión: los límites siempre van por escrito.
  if (o.presence.activity && VOICE_ACTIVITIES.test(o.presence.activity)) return o.rand() < 0.75;
  return o.presence.state === 'online' && o.emotion.valence > 0.2 && o.emotion.trust >= 0.35 && o.rand() < 0.15;
}

const ACK: Record<string, string[]> = {
  warm: ['ando {a}, te escribo al rato 🙏', 'ay, ando {a}! en un rato te contesto bien', 'te leí! ando {a}, al rato te escribo'],
  plain: ['ando {a}, te escribo al rato', 'estoy {a}, luego te contesto', 'ahorita ando {a}, al rato te escribo'],
};

/** El aviso de "te escribo al rato" (sin IA). Con algo vulnerable, siempre cálido. */
export function ackMessage(activity: string | undefined, warm: boolean, rand: () => number, regional?: { warm: string[]; plain: string[] }) {
  const a = (activity ?? 'con pendientes').trim();
  const list = regional ? (warm ? regional.warm : regional.plain) : warm ? ACK.warm! : ACK.plain!;
  return list[Math.floor(rand() * list.length) % list.length]!.replace('{a}', a);
}

/** Mensajes propios con los que la charla todavía "arranca" (respuesta en segundos, haga lo que haga). */
export const START_TURNS = 6;
/** Si contestó hace menos que esto, sigue en el chat. */
export const ENGAGED_MS = 6 * 60_000;

export type Pace = 'start' | 'engaged' | 'normal';

export function paceFor(o: { userTurns: number; lastPersonaAt: Date | null; now: Date; presence: Presence }): Pace {
  if (o.userTurns < START_TURNS) return 'start';
  if (o.presence.state !== 'asleep' && o.lastPersonaAt && o.now.getTime() - o.lastPersonaAt.getTime() < ENGAGED_MS) return 'engaged';
  return 'normal';
}

const PROFILE_FACTOR: Record<ResponseProfile, (rand: () => number) => number> = {
  fast: () => 0.6,
  slow: () => 1.6,
  professional: () => 1,
  bursty: (rand) => (rand() < 0.5 ? 0.4 : 1.8),
};

export function planDelivery(o: {
  now: Date;
  presence: Presence;
  emotion: EmotionState;
  profile: ResponseProfile;
  userText: string;
  replies: string[];
  boundary: boolean;
  voiceAllowed: boolean;
  /** Lo que la persona contó es vulnerable: si hay aviso, cálido. */
  vulnerable?: boolean;
  /** Ritmo de la charla (por defecto, el de su día). */
  pace?: Pace;
  /** Cómo dice "te escribo al rato" alguien de su país. */
  ack?: { warm: string[]; plain: string[] };
  rand: () => number;
}): Plan {
  const { now, presence, emotion, rand } = o;
  const replies = o.replies.map((r) => r.trim()).filter(Boolean).slice(0, 3);
  const factor = PROFILE_FACTOR[o.profile](rand) * (emotion.energy < 0.35 ? 1.4 : 1) * (emotion.openness > 0.7 && emotion.energy > 0.6 ? 0.7 : 1);
  const t0 = now.getTime();
  const untilEnd = Math.max(0, presence.endsAt.getTime() - t0);

  let firstAt: number;
  let ack: Delivery | null = null;
  const pace = o.pace ?? 'normal';
  if (pace === 'start') {
    firstAt = t0 + between(rand, 3, 10) * 1000;
  } else if (pace === 'engaged') {
    firstAt = t0 + between(rand, 4, 30) * 1000 * Math.min(1.3, factor);
  } else switch (presence.state) {
    case 'online':
      firstAt = t0 + between(rand, 8, 60) * 1000 * factor;
      break;
    case 'free':
      firstAt = t0 + between(rand, 1, 15) * 60_000 * factor;
      break;
    case 'busy': {
      const important = o.userText.length > 160 || Boolean(o.vulnerable) || (/\?/.test(o.userText) && emotion.trust > 0.4);
      const glance = !important && rand() < 0.25;
      if (glance) {
        // Vio el teléfono un momento entre una cosa y otra.
        firstAt = t0 + between(rand, 2, 8) * 60_000;
      } else {
        firstAt = Math.min(t0 + untilEnd + between(rand, 2, 20) * 60_000, t0 + MAX_WAIT_MS);
        firstAt = Math.max(firstAt, t0 + 3 * 60_000);
        if (important && !o.boundary && untilEnd > 20 * 60_000) {
          ack = { content: ackMessage(presence.activity, Boolean(o.vulnerable) || emotion.valence > 0.2, rand, o.ack), kind: 'text', deliverAt: new Date(t0 + between(rand, 1, 5) * 60_000), meta: { ack: true } };
        }
      }
      break;
    }
    case 'asleep':
    default:
      // Al despertar (entre 5 y 45 min después), nunca de madrugada.
      firstAt = t0 + untilEnd + between(rand, 5, 45) * 60_000;
      break;
  }
  if (presence.state !== 'asleep') firstAt = Math.min(firstAt, t0 + MAX_WAIT_MS);

  // Una nota de voz reemplaza las burbujas (dice lo mismo, en una).
  const joined = replies.join(' ');
  const voice = wantsVoice({ allowed: o.voiceAllowed, boundary: o.boundary, text: joined, presence, emotion, rand });
  const items: Delivery[] = [];
  if (ack) items.push(ack);
  if (voice) {
    items.push({ content: joined, kind: 'voice', deliverAt: new Date(Math.max(firstAt, (ack?.deliverAt.getTime() ?? 0) + 60_000)) });
  } else {
    let at = Math.max(firstAt, (ack?.deliverAt.getTime() ?? 0) + 60_000);
    replies.forEach((content, i) => {
      if (i > 0) at += (typingSeconds(content) + between(rand, 1, 4)) * 1000;
      items.push({ content, kind: 'text', deliverAt: new Date(at) });
    });
  }

  // "Lee" (doble check azul) justo antes de empezar a escribir: con el aviso o con la respuesta.
  const first = items[0];
  const readAt = first
    ? new Date(Math.max(t0 + 2000, first.deliverAt.getTime() - (typingSeconds(first.content, first.kind) + between(rand, 3, 20)) * 1000))
    : new Date(t0 + 2000);
  return { items, readAt };
}
