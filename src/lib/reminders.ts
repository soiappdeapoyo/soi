import type { NextStep } from '@/lib/journey';

/**
 * Recordatorios para volver a SOI (puro y testeado). El programador corre cada 5 min; esto decide qué avisar:
 * - moment: la hora que la persona puso a un Moment de su día ("alarma": se queda en pantalla hasta tocarla).
 * - scheduled: un recordatorio que pidió en el chat (scheduleReminder).
 * - nudge: una invitación al día a su hora, con el SIGUIENTE PASO del loop (journey). Solo si hoy no ha venido,
 *   nunca de madrugada (salvo que esa hora la eligió ella) y sin culpa: invita, no reclama.
 */

export const DEFAULT_REMINDER_TIME = '09:00';
/** Ventana tras la hora exacta en la que todavía se avisa (el programador corre cada 5 min y puede retrasarse). */
export const WINDOW_MIN = 15;
const QUIET_FROM = 22 * 60;
const QUIET_TO = 7 * 60;

export type Notice = {
  kind: 'moment' | 'nudge' | 'scheduled';
  ref: string;
  title: string;
  body: string;
  url: string;
  /** Alarma: vibra más y se queda en pantalla hasta que la persona la toca. */
  alarm: boolean;
};

export type ReminderInput = {
  /** Minutos desde la medianoche, hora local de la persona. */
  localMinutes: number;
  /** Moments de su día con hora, y si ya los vivió hoy. */
  items: { id: string; time?: string | null; title: string; minutes: number; href: string; done: boolean }[];
  /** Su hora de recordatorio (null = por defecto). */
  reminderTime: string | null;
  /** Hoy ya vino (vivió un Moment o le escribió a SOI). */
  activeToday: boolean;
  /** Ya enviado hoy: `${kind}:${ref}`. */
  sent: Set<string>;
  step: NextStep;
  streak: number;
  pendingToday: number;
  /** Recordatorios pedidos en el chat cuya hora ya llegó (dentro de la ventana). */
  scheduled: { id: string; title: string }[];
};

export const toMinutes = (hhmm: string | null | undefined): number | null => {
  const m = hhmm?.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const v = Number(m[1]) * 60 + Number(m[2]);
  return v >= 0 && v < 24 * 60 ? v : null;
};

/** ¿Llegó la hora (y no han pasado más de WINDOW_MIN minutos)? Cruza la medianoche. */
export function inWindow(localMinutes: number, at: number): boolean {
  const diff = (localMinutes - at + 24 * 60) % (24 * 60);
  return diff < WINDOW_MIN;
}

const quiet = (m: number) => m >= QUIET_FROM || m < QUIET_TO;

/** El texto de la invitación diaria según el siguiente paso (sin cifras que presionen ni culpa). */
export function nudgeFor(step: NextStep, i: Pick<ReminderInput, 'streak' | 'pendingToday'>): Omit<Notice, 'kind' | 'ref' | 'alarm'> {
  switch (step.kind) {
    case 'resume': return { title: 'Lo dejaste a medias', body: `${step.title.replace(/^Lo dejaste a medias: /, '')} · sigue justo donde te quedaste.`, url: step.href };
    case 'first_moment': return { title: 'Tu primer Moment te espera', body: step.detail, url: step.href };
    case 'follow_up': return { title: '¿Cómo te fue con tu primer Moment?', body: 'Cuéntaselo a SOI: con eso aprende qué te ayuda.', url: step.href };
    case 'talk': return { title: '¿Cómo llegas hoy?', body: 'SOI te escucha. Con lo que le cuentes prepara tu primer Moment.', url: step.href };
    case 'keep_talking': return { title: 'SOI sigue aquí', body: 'Tu primer Moment está a un par de mensajes.', url: step.href };
    default:
      if (i.pendingToday > 0) return { title: 'Tu día está listo', body: `${i.pendingToday === 1 ? 'Un Moment te espera' : `${i.pendingToday} Moments te esperan`}. Dale play y SOI te guía.`, url: '/hoy' };
      if (i.streak > 1) return { title: `Llevas ${i.streak} días`, body: 'Un Moment de pocos minutos y sigues construyendo quién eres.', url: '/hoy' };
      return { title: 'Un momento para ti', body: '¿Cómo llegas hoy? Cuéntaselo a SOI.', url: '/hoy' };
  }
}

export function dueReminders(i: ReminderInput): Notice[] {
  const out: Notice[] = [];
  const fresh = (kind: Notice['kind'], ref: string) => !i.sent.has(`${kind}:${ref}`);

  // 1) La hora que puso a un Moment de su día: alarma.
  for (const it of i.items) {
    const at = toMinutes(it.time);
    if (at == null || it.done || !inWindow(i.localMinutes, at) || !fresh('moment', it.id)) continue;
    out.push({ kind: 'moment', ref: it.id, alarm: true, title: `Es hora de «${it.title}»`, body: `${it.minutes} min · toca para empezar.`, url: it.href });
  }

  // 2) Lo que pidió que le recordaran en el chat.
  for (const s of i.scheduled) {
    if (!fresh('scheduled', s.id)) continue;
    out.push({ kind: 'scheduled', ref: s.id, alarm: true, title: 'Te lo recuerdo', body: s.title, url: '/hoy' });
  }

  // 3) La invitación del día: una vez, a su hora, solo si hoy no vino y no le acabamos de avisar de un Moment.
  const chosen = toMinutes(i.reminderTime);
  const at = chosen ?? toMinutes(DEFAULT_REMINDER_TIME)!;
  const allowed = chosen != null || !quiet(i.localMinutes);
  if (allowed && !i.activeToday && inWindow(i.localMinutes, at) && fresh('nudge', 'daily') && !out.some((n) => n.kind === 'moment')) {
    out.push({ kind: 'nudge', ref: 'daily', alarm: false, ...nudgeFor(i.step, i) });
  }
  return out;
}

/** Minutos locales "ahora" en una zona horaria. */
export function localMinutesIn(timeZone: string, now = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const h = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  const m = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  return h * 60 + m;
}

/**
 * ¿Ya toca un recordatorio pedido en el chat? `when` llega como ISO "en la zona del usuario": con zona (Z o ±hh:mm)
 * se compara en tiempo absoluto; sin zona, es hora local de la persona (fecha de hoy y dentro de la ventana).
 */
export function scheduledDue(when: string, timeZone: string, now = new Date()): boolean {
  if (/(Z|[+-]\d{2}:?\d{2})$/.test(when.trim())) {
    const at = Date.parse(when);
    return Number.isFinite(at) && now.getTime() >= at && now.getTime() - at < WINDOW_MIN * 60_000;
  }
  const m = when.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})/);
  if (!m) return false;
  const today = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  return m[1] === today && inWindow(localMinutesIn(timeZone, now), Number(m[2]) * 60 + Number(m[3]));
}
