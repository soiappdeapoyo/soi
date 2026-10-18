import { cache } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserProfile } from '@/types/database';
import { loadHillMemory } from '@/lib/ai/hill-memory';
import { enemyById, type Enemy } from '@/config/enemies';
import { loadHabits } from '@/lib/ai/habit-memory';
import { loadLifeMap } from '@/lib/life-map-server';
import { buildMapView } from '@/lib/life-map';
import { loadLastReview, loadPlan } from '@/lib/life-plan-server';
import { currentWeek } from '@/lib/life-plan';

/**
 * El "norte" de la persona: hacia dónde va (propósito o meta), quién está eligiendo ser (identidad principal)
 * y qué enemigo interior le ha aparecido últimamente; y desde Tu mapa: su visión, sus áreas de enfoque con la
 * distancia, el plan de 90 días, el foco de la semana y los hábitos que construye. Sin IA: lo usan Hoy, la Brújula
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
  const [hill, { data: ids }, { data: enemies }, life, plan, review, habits] = await Promise.all([
    loadHillMemory(supabase, userId).catch(() => ({ id: null, memory: null })),
    supabase.from('identities').select('name, description').eq('user_id', userId).eq('status', 'active')
      .order('position').order('created_at').limit(1),
    supabase.from('enemy_events').select('enemy, occurred_at').eq('user_id', userId).gte('occurred_at', since).limit(200),
    loadLifeMap(supabase, userId).catch(() => ({ map: null, assessments: [] })),
    loadPlan(supabase, userId).catch(() => null),
    loadLastReview(supabase, userId).catch(() => ({ ok: false, review: null })),
    loadHabits(supabase, userId).catch(() => ({ id: null, memory: null })),
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
  };
});
