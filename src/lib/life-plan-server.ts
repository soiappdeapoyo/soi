import { cache } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { lifeArea } from '@/config/life-areas';
import { saveHabit } from '@/lib/ai/habit-memory';
import { resetLinks } from '@/lib/identity/classify';
import { scheduleAutoCover } from '@/lib/moments/auto-cover';
import { DayItemsSchema, partOfTime, placeInDay } from '@/lib/day-plan';
import { loadLifeMap } from '@/lib/life-map-server';
import { buildMapView } from '@/lib/life-map';
import { currentWeek, habitMomentBlocks, planDates, readPlan, reviewWeek, type LastReview, type LifePlan, type PlanArea } from '@/lib/life-plan';
import { todayISO } from '@/lib/utils';

/** La revisión semanal más reciente (ok = false si la tabla aún no existe: entonces no se pide revisión). */
export const loadLastReview = cache(async (supabase: SupabaseClient, userId: string): Promise<{ ok: boolean; review: LastReview | null }> => {
  const { data, error } = await supabase.from('life_reviews').select('week_start, next_area, one_thing').eq('user_id', userId)
    .order('week_start', { ascending: false }).limit(1).maybeSingle();
  return { ok: !error, review: (data as LastReview | null) ?? null };
});

/** El plan guardado (consulta aparte: si la columna aún no existe, como si no hubiera plan). */
export const loadPlan = cache(async (supabase: SupabaseClient, userId: string): Promise<LifePlan | null> => {
  const { data, error } = await supabase.from('life_maps').select('plan').eq('user_id', userId).maybeSingle();
  return error ? null : readPlan(data?.plan);
});

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

/**
 * Usar el plan: cada identidad queda en Mi Nuevo Yo (si no existe ya), cada hábito se vuelve un Moment diario
 * (versión de 2 minutos + voto) que entra a Mi día a su hora (alarma) y a la memoria del coach de hábitos.
 * Lo que ya existía se reutiliza (re-usar el plan no duplica Moments ni identidades).
 */
export async function applyPlan(supabase: SupabaseClient, userId: string, areas: PlanArea[], timeZone: string, prev: LifePlan | null): Promise<LifePlan | null> {
  const { data: ids } = await supabase.from('identities').select('id, name').eq('user_id', userId).eq('status', 'active');
  const active = (ids ?? []) as { id: string; name: string }[];
  let addedIdentity = false;
  const { data: dp } = await supabase.from('day_plans').select('items').eq('user_id', userId).maybeSingle();
  const parsedDay = DayItemsSchema.safeParse(dp?.items ?? []);
  let day = parsedDay.success ? parsedDay.data : [];

  const out: PlanArea[] = [];
  for (const a of areas) {
    const area = lifeArea(a.area)!;
    // 1) Identidad (máx. 7 activas, sin repetir).
    if (!active.some((i) => norm(i.name) === norm(a.identity)) && active.length < 7) {
      const { data } = await supabase.from('identities').insert({
        user_id: userId, name: a.identity, description: a.goal.slice(0, 240), capacities: [...area.capacities].slice(0, 6), status: 'active', position: active.length,
      }).select('id, name').single();
      if (data) { active.push(data as { id: string; name: string }); addedIdentity = true; }
    }
    // 2) El Moment diario del hábito (el del plan anterior para la misma área y hábito, si existe).
    const before = prev?.areas.find((p) => p.area === a.area && norm(p.habit.name) === norm(a.habit.name))?.habit.moment_id;
    let momentId = a.habit.moment_id ?? before;
    const blocks = habitMomentBlocks(a.habit, a.identity);
    if (momentId) {
      const { data: own } = await supabase.from('soi_blueprints').select('id').eq('id', momentId).eq('creator_id', userId).neq('status', 'archived').maybeSingle();
      if (own) await supabase.rpc('save_moment_version', { p_id: momentId, p_blocks: blocks, p_note: 'Plan de 90 días' });
      else momentId = undefined;
    }
    if (!momentId) {
      const { data } = await supabase.from('soi_blueprints').insert({
        creator_id: userId, title: a.habit.name, objective: `Tu hábito de 2 minutos para: ${a.goal}`.slice(0, 300), kind: 'daily',
        source: 'Diseñado por SOI · basado en James Clear (Atomic Habits)', blocks, steps: [], status: 'private',
      }).select('id').single();
      momentId = (data?.id as string | undefined) ?? undefined;
      if (momentId) scheduleAutoCover(momentId, { title: a.habit.name, objective: a.goal, kind: 'daily', blocks, context: `${area.label}. ${a.goal}`, part: partOfTime(a.habit.time) ?? 'manana' });
    }
    // 3) Memoria del coach de hábitos y Mi día (con su hora → alarma diaria).
    await saveHabit(supabase, userId, { name: a.habit.name, mode: 'build', identity: a.identity, tiny: a.habit.tiny, cue: a.habit.cue, time: a.habit.time, status: 'active', ...(momentId ? { moment_id: momentId } : {}) }).catch(() => false);
    if (momentId) day = placeInDay(day, `m:${momentId}`, a.habit.time, `p${a.area.slice(0, 3)}${Date.now().toString(36)}`);
    out.push({ ...a, habit: { ...a.habit, ...(momentId ? { moment_id: momentId } : {}) } });
  }

  await supabase.from('day_plans').upsert({ user_id: userId, items: day, updated_at: new Date().toISOString() });
  if (addedIdentity) await resetLinks(userId).catch(() => undefined);

  const dates = prev?.starts_on && prev.ends_on && Date.parse(prev.ends_on) > Date.now() ? { starts_on: prev.starts_on, ends_on: prev.ends_on } : planDates(todayISO(timeZone));
  const plan: LifePlan = { areas: out, ...dates };
  const { error } = await supabase.from('life_maps').update({ plan, plan_updated_at: new Date().toISOString() }).eq('user_id', userId);
  return error ? null : plan;
}

/**
 * Lo que Hoy necesita del sistema (sin IA, pocas consultas): si tiene mapa, si toca el chequeo del mes o la
 * revisión de la semana, su plan y el foco de esta semana.
 */
export const loadOsToday = cache(async (supabase: SupabaseClient, userId: string, timeZone: string) => {
  const [{ map, assessments }, plan, last] = await Promise.all([loadLifeMap(supabase, userId), loadPlan(supabase, userId), loadLastReview(supabase, userId)]);
  const view = buildMapView(map, assessments);
  const rw = reviewWeek(timeZone);
  const reviewDue = view.hasMap && rw.due && last.ok && last.review?.week_start !== rw.weekStart;
  return { hasMap: view.hasMap, checkinDue: view.checkinDue, plan, week: currentWeek(last.review, timeZone), reviewDue, weekStart: rw.weekStart, focus: view.focus };
});
