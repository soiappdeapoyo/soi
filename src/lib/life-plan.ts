import { z } from 'zod/v3';
import type { ActionBlock } from '@/config/actions';
import { AREA_DEFAULTS, LIFE_AREA_IDS, MAX_FOCUS, lifeArea, type LifeAreaId } from '@/config/life-areas';
import { voteMessage } from '@/lib/moments/polish';
import { dateInTz, hourInTz } from '@/lib/utils';
import type { AreaView } from '@/lib/life-map';

/**
 * Plan de transformación (puro y testeado): la cadena visión → área de enfoque → meta a 90 días → identidad →
 * hábito clave (versión de 2 minutos con su señal) → hitos por mes. El foco de la semana sale de la revisión
 * semanal (life_reviews), así existe aunque todavía no haya plan. Al usarlo, cada hábito se vuelve un Moment diario en Mi día (con su alarma): el plan manda
 * sobre el día sin que la persona tenga que armarlo.
 */

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export const PlanHabitSchema = z.object({
  name: z.string().trim().min(2).max(80),
  tiny: z.string().trim().min(2).max(160),
  cue: z.string().trim().min(2).max(160),
  time: z.string().regex(TIME).optional(),
  /** El Moment diario que lo practica (lo crea el servidor al usar el plan). */
  moment_id: z.string().uuid().optional(),
});

export const PlanAreaSchema = z.object({
  area: z.enum(LIFE_AREA_IDS),
  goal: z.string().trim().min(4).max(200),
  identity: z.string().trim().min(4).max(60),
  habit: PlanHabitSchema,
  milestones: z.array(z.string().trim().min(2).max(160)).max(3).default([]),
});

export const PlanSchema = z.object({
  areas: z.array(PlanAreaSchema).min(1).max(MAX_FOCUS),
  starts_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  ends_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export type PlanHabit = z.infer<typeof PlanHabitSchema>;
export type PlanArea = z.infer<typeof PlanAreaSchema>;
export type WeekFocus = { start: string; area: LifeAreaId; one_thing: string };
export type LifePlan = z.infer<typeof PlanSchema>;

/** Lee un plan guardado (si viene de una versión anterior o está roto, como si no hubiera). */
export function readPlan(raw: unknown): LifePlan | null {
  const p = PlanSchema.safeParse(raw);
  return p.success ? p.data : null;
}

/** 90 días desde hoy (fechas locales). */
export function planDates(today: string): { starts_on: string; ends_on: string } {
  const end = new Date(`${today}T12:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 90);
  return { starts_on: today, ends_on: end.toISOString().slice(0, 10) };
}

/** El plan por reglas (si la IA no responde): lo que la persona escribió + el punto de partida de cada área. */
export function planByRules(focus: Pick<AreaView, 'area' | 'current' | 'target' | 'want'>[]): PlanArea[] {
  return focus.slice(0, MAX_FOCUS).map((a) => {
    const d = AREA_DEFAULTS[a.area.id];
    const target = a.target ?? Math.min(10, (a.current ?? 5) + 2);
    return {
      area: a.area.id,
      goal: (a.want?.trim() || `Llevar ${a.area.label.toLowerCase()} de ${a.current ?? '?'} a ${target}`).slice(0, 200),
      identity: d.identity,
      habit: { ...d.habit },
      milestones: [
        `Mes 1: «${d.habit.tiny}» al menos 5 días por semana`,
        'Mes 2: haz tu hábito un poco más grande, sin perder la facilidad',
        `Mes 3: llegar a ${target}/10 en ${a.area.short.toLowerCase()}`,
      ],
    };
  });
}

/** El Moment diario de un hábito del plan: la versión de 2 minutos con su señal y el voto por la identidad. */
export function habitMomentBlocks(h: Pick<PlanHabit, 'tiny' | 'cue'>, identity: string): ActionBlock[] {
  return [
    { id: 'tiny', type: 'timer', title: 'Tu versión de 2 minutos', minutes: 2, source: 'James Clear — Atomic Habits (2018), cap. 13',
      config: { instruction: `${h.cue}: ${h.tiny}. Hoy lo que cuenta es presentarte.` } },
    { id: 'vote', type: 'celebration', title: 'Tu voto de hoy', minutes: 1, source: 'James Clear — Atomic Habits (2018), cap. 2',
      config: { message: voteMessage(identity) } },
  ] as ActionBlock[];
}

/** Lunes (fecha local) de la semana de una fecha. */
export function mondayOf(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  const back = (d.getUTCDay() + 6) % 7; // lunes = 0
  d.setUTCDate(d.getUTCDate() - back);
  return d.toISOString().slice(0, 10);
}

/**
 * ¿Toca la revisión semanal? El domingo (todo el día) y el lunes hasta las 12:00, revisando la semana que termina.
 * `weekStart` es el lunes de esa semana (una revisión por semana).
 */
export function reviewWeek(timeZone: string, now = new Date()): { due: boolean; weekStart: string } {
  const today = dateInTz(now, timeZone);
  const dow = new Date(`${today}T12:00:00Z`).getUTCDay(); // 0 = domingo
  if (dow === 0) return { due: true, weekStart: mondayOf(today) };
  if (dow === 1 && hourInTz(timeZone, now) < 12) {
    const prev = new Date(`${today}T12:00:00Z`);
    prev.setUTCDate(prev.getUTCDate() - 7);
    return { due: true, weekStart: prev.toISOString().slice(0, 10) };
  }
  return { due: false, weekStart: mondayOf(today) };
}

/** La última revisión (lo que hace falta para el foco de la semana). */
export type LastReview = { week_start: string; next_area: string | null; one_thing: string | null };

/** El foco de la semana vigente: el que se fijó en la última revisión para la semana que empezaba. */
export function currentWeek(review: LastReview | null, timeZone: string, now = new Date()): (WeekFocus & { label: string }) | null {
  const area = review?.next_area ? lifeArea(review.next_area) : null;
  if (!review || !area || !review.one_thing) return null;
  const w: WeekFocus = { start: nextMonday(review.week_start), area: area.id, one_thing: review.one_thing };
  const thisMonday = mondayOf(dateInTz(now, timeZone));
  const age = (Date.parse(`${thisMonday}T12:00:00Z`) - Date.parse(`${w.start}T12:00:00Z`)) / 86_400_000;
  // La revisión del domingo fija el foco de la semana que empieza (start = lunes revisado + 7).
  if (age < -7 || age > 7) return null;
  return { ...w, label: area.label };
}

/** Siguiente lunes (la semana para la que se fija el foco en la revisión). */
export function nextMonday(weekStart: string): string {
  const d = new Date(`${weekStart}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 7);
  return d.toISOString().slice(0, 10);
}

export const ReviewBody = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  scores: z.record(z.enum(LIFE_AREA_IDS), z.number().int().min(1).max(10)).default({}),
  wins: z.string().trim().max(600).default(''),
  lesson: z.string().trim().max(600).default(''),
  area: z.enum(LIFE_AREA_IDS),
  oneThing: z.string().trim().min(2).max(200),
});
export type ReviewInput = z.infer<typeof ReviewBody>;

export type { LifeAreaId };
