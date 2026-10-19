import { cache } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserProfile } from '@/types/database';
import { loadHillMemory } from '@/lib/ai/hill-memory';
import { enemyById, type Enemy } from '@/config/enemies';
import { loadHabits } from '@/lib/ai/habit-memory';
import { loadLifeMap, loadValues } from '@/lib/life-map-server';
import { buildMapView } from '@/lib/life-map';
import { loadLastReview, loadPlan } from '@/lib/life-plan-server';
import { currentWeek } from '@/lib/life-plan';
import { detectConflicts, type ValueConflict } from '@/lib/values';
import { loadBeliefs } from '@/lib/beliefs-server';
import { activeBelief, type Belief } from '@/lib/beliefs';
import { loadWhatWorks } from '@/lib/what-works-server';
import { whatWorksPrompt, type Drift } from '@/lib/what-works';
import { loadLearnings } from '@/lib/learning-server';
import { dueLearnings, type Learning } from '@/lib/learning';
import { todayISO } from '@/lib/utils';

/**
 * El "norte" de la persona: hacia dónde va (propósito o meta), quién está eligiendo ser (identidad principal)
 * y qué enemigo interior le ha aparecido últimamente; y desde Tu mapa: su visión, sus áreas de enfoque con la
 * distancia, el plan de 90 días, el foco de la semana y los hábitos que construye; sus valores (y si su tiempo va por
 * otro lado), la creencia que entrena, lo que le funciona, el hábito que se le cae y lo aprendido por revisar. Sin IA: lo usan Hoy, la Brújula
 * del ritual diario y TODOS los agentes del chat (`northPrompt`), para que todos trabajen hacia lo mismo.
 */
export type North = {
  /** Propósito de Hill, o su primera meta. */
  aim: string | null;
  aimSource: 'purpose' | 'goal' | null;
  obstacle: string | null;
  identity: { name: string; description: string | null } | null;
  /** El enemigo que más apareció en los últimos 14 días. */
  enemy: Enemy | null;
  /** Ya dibujó su mapa. */
  hasMap: boolean;
  vision: string | null;
  /** Áreas de enfoque: hoy, meta y la meta del plan (si la tiene). */
  focus: { label: string; current: number | null; target: number | null; goal: string | null; habit: string | null }[];
  /** El foco de esta semana (de la revisión semanal). */
  week: { label: string; one_thing: string } | null;
  /** Hábitos que construye (memoria del coach de hábitos). */
  habits: { name: string; cue: string | null; time: string | null }[];
  /** Sus valores (etiquetas). */
  values: string[];
  /** Lo que dice que le importa contra lo que hace (el más fuerte). */
  conflict: ValueConflict | null;
  /** La creencia que está entrenando (la más vista que aún no es suya). */
  belief: Belief | null;
  /** Lo que le funciona, para el prompt (vacío si aún no hay suficiente). */
  works: string;
  /** El hábito que se le está cayendo (nunca dos veces seguidas). */
  drift: Drift | null;
  /** Lo que aprendió y toca preguntar si funcionó. */
  learning: Learning | null;
};

const ENEMY_WINDOW_MS = 14 * 86_400_000;

/** Elige el enemigo más frecuente (a igualdad, el más reciente). Puro. */
export function topEnemy(events: { enemy: string; occurred_at: string }[]): Enemy | null {
  const score = new Map<string, { n: number; last: number }>();
  for (const e of events) {
    const s = score.get(e.enemy) ?? { n: 0, last: 0 };
    score.set(e.enemy, { n: s.n + 1, last: Math.max(s.last, Date.parse(e.occurred_at)) });
  }
  const best = [...score].sort((a, b) => b[1].n - a[1].n || b[1].last - a[1].last)[0];
  return best ? enemyById(best[0]) : null;
}

export const loadNorth = cache(async (supabase: SupabaseClient, userId: string, profile: UserProfile | null): Promise<North> => {
  const since = new Date(Date.now() - ENEMY_WINDOW_MS).toISOString();
  const tz = profile?.timezone ?? 'America/Mexico_City';
  const [hill, { data: ids }, { data: enemies }, life, plan, review, habits, values, beliefs, works, learnings] = await Promise.all([
    loadHillMemory(supabase, userId).catch(() => ({ id: null, memory: null })),
    supabase.from('identities').select('name, description').eq('user_id', userId).eq('status', 'active')
      .order('position').order('created_at').limit(1),
    supabase.from('enemy_events').select('enemy, occurred_at').eq('user_id', userId).gte('occurred_at', since).limit(200),
    loadLifeMap(supabase, userId).catch(() => ({ map: null, assessments: [] })),
    loadPlan(supabase, userId).catch(() => null),
    loadLastReview(supabase, userId).catch(() => ({ ok: false, review: null })),
    loadHabits(supabase, userId).catch(() => ({ id: null, memory: null })),
    loadValues(supabase, userId).catch(() => []),
    loadBeliefs(supabase, userId).catch(() => []),
    loadWhatWorks(supabase, userId, tz).catch(() => null),
    loadLearnings(supabase, userId, 10).catch(() => []),
  ]);
  const view = buildMapView(life.map, life.assessments);
  const week = currentWeek(review.review, profile?.timezone ?? 'America/Mexico_City');
  const purpose = hill.memory?.definite_chief_aim?.trim() || null;
  const goal = (profile?.goals ?? []).map((g) => g.trim()).find(Boolean) ?? null;
  const identity = (ids ?? [])[0] as { name: string; description: string | null } | undefined;
  return {
    aim: purpose ?? goal,
    aimSource: purpose ? 'purpose' : goal ? 'goal' : null,
    obstacle: hill.memory?.obstacle?.trim() || null,
    identity: identity ?? null,
    enemy: topEnemy((enemies ?? []) as { enemy: string; occurred_at: string }[]),
    hasMap: view.hasMap,
    vision: view.vision,
    focus: view.focus.map((a) => {
      const p = plan?.areas.find((x) => x.area === a.area.id);
      return { label: a.area.label, current: a.current, target: a.target, goal: p?.goal ?? a.want, habit: p ? `${p.habit.tiny} (${p.habit.cue})` : null };
    }),
    week: week ? { label: week.label, one_thing: week.one_thing } : null,
    habits: (habits.memory?.habits ?? []).filter((h) => h.status === 'active').slice(0, 4).map((h) => ({ name: h.name, cue: h.cue ?? null, time: h.time ?? null })),
    values: values.map((v) => v.label),
    // La evidencia por área no se carga aquí (la vista del mapa la trae); el conflicto "bajo" solo necesita calificaciones.
    conflict: detectConflicts(values, view.areas).find((c) => c.kind !== 'neglected') ?? null,
    belief: activeBelief(beliefs),
    works: works ? whatWorksPrompt(works.works) : '',
    drift: works?.drift[0] ?? null,
    learning: dueLearnings(learnings, todayISO(tz))[0] ?? null,
  };
});
