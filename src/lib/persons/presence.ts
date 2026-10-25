import type { DayPlan, Slot, SlotState } from './spec';

/**
 * Presencia de una persona sintética: dónde está en su día ahora mismo, según su plan y su zona horaria.
 * Determinista (nunca IA): nunca "en línea" a las 3 de la mañana. Puro y testeable.
 */

export type Presence = {
  state: SlotState;
  activity?: string;
  /** Cuándo termina la franja actual (instante absoluto). */
  endsAt: Date;
};

/** Minuto del día (0–1439) y si es fin de semana, en la zona horaria dada. */
export function localClock(now: Date, timeZone: string) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', hour: 'numeric', minute: 'numeric', weekday: 'short' }).formatToParts(now);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '0';
    const weekday = get('weekday');
    return { minute: Number(get('hour')) * 60 + Number(get('minute')), weekend: weekday === 'Sat' || weekday === 'Sun' };
  } catch {
    return { minute: now.getUTCHours() * 60 + now.getUTCMinutes(), weekend: [0, 6].includes(now.getUTCDay()) };
  }
}

function slotsFor(plan: DayPlan, weekend: boolean): Slot[] {
  const slots = weekend ? plan.weekend : plan.weekday;
  return slots?.length ? slots : [{ from: 0, to: 1440, state: 'free' }];
}

export function presenceAt(plan: DayPlan, now: Date, timeZone: string): Presence {
  const { minute, weekend } = localClock(now, timeZone);
  const slots = slotsFor(plan, weekend);
  const slot = slots.find((s) => minute >= s.from && minute < s.to) ?? slots[slots.length - 1]!;
  let end = slot.to;
  // Franjas iguales seguidas (dormir de 23:30 a 7:00 cruza la medianoche) cuentan como una sola.
  if (end >= 1440) {
    const next = slotsFor(plan, localClock(new Date(now.getTime() + 86_400_000), timeZone).weekend)[0];
    if (next && next.state === slot.state) end = 1440 + next.to;
  }
  return { state: slot.state, activity: slot.activity, endsAt: new Date(now.getTime() + (end - minute) * 60_000 - now.getSeconds() * 1000) };
}

/** Última vez que estuvo conectada: lo más reciente entre su último mensaje y el final de su última franja disponible. */
export function lastSeenAt(plan: DayPlan, now: Date, timeZone: string, lastPersonaAt?: Date | null): Date {
  const { minute, weekend } = localClock(now, timeZone);
  const ended = slotsFor(plan, weekend).filter((s) => (s.state === 'online' || s.state === 'free') && s.to <= minute);
  const fromPlan = ended.length
    ? new Date(now.getTime() - (minute - Math.max(...ended.map((s) => s.to))) * 60_000)
    : new Date(now.getTime() - (minute + 30) * 60_000); // ayer a última hora
  return lastPersonaAt && lastPersonaAt > fromPlan && lastPersonaAt <= now ? lastPersonaAt : fromPlan;
}

function timeIn(d: Date, timeZone: string) {
  try {
    return new Intl.DateTimeFormat('es-MX', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d);
  } catch {
    return d.toISOString().slice(11, 16);
  }
}

function dayIn(d: Date, timeZone: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

/** Subtítulo del encabezado del chat, como en WhatsApp. */
export function presenceLabel(p: Presence, lastSeen: Date, now: Date, timeZone: string) {
  if (p.state === 'online') return 'en línea';
  const today = dayIn(now, timeZone);
  const yesterday = dayIn(new Date(now.getTime() - 86_400_000), timeZone);
  const day = dayIn(lastSeen, timeZone);
  const when = day === today ? 'hoy' : day === yesterday ? 'ayer' : 'hace unos días';
  return `últ. vez ${when} a las ${timeIn(lastSeen, timeZone)}`;
}
