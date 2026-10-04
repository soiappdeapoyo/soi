import type { SupabaseClient } from '@supabase/supabase-js';
import { MOMENT_FIELDS, toMomentFlow, type MomentFlow } from './types';
import { officialMoment } from '@/config/official-moments';

export type MyMomentsFilter = 'todos' | 'mios' | 'guardados' | 'comprados' | 'retos';
export const MY_FILTERS: { id: MyMomentsFilter; label: string }[] = [
  { id: 'todos', label: 'Todos' }, { id: 'mios', label: 'Míos' }, { id: 'guardados', label: 'Guardados' },
  { id: 'comprados', label: 'Comprados' }, { id: 'retos', label: 'Retos' },
];

export type ContinueItem = { moment: MomentFlow; lastAt: string; label: string };

/**
 * Todo lo que la persona puede volver a vivir, ordenado por uso reciente:
 * - "Continúa": los últimos Moments que ejecutó y los retos activos (lo que más rápido la trae de vuelta).
 * - Colección: míos (creados por mí o por SOI para mí), guardados (mi versión de otro), comprados y retos.
 */
export async function loadMyMoments(supabase: SupabaseClient, userId: string) {
  const [{ data: own }, { data: purchases }, { data: runs }, { data: enrollments }] = await Promise.all([
    supabase.from('soi_blueprints').select(MOMENT_FIELDS).eq('creator_id', userId).neq('status', 'archived')
      .order('updated_at', { ascending: false }).limit(60),
    supabase.from('blueprint_purchases').select('blueprint_id').eq('user_id', userId).limit(60),
    supabase.from('moment_runs').select('moment_id, moment_slug, started_at, completed_at').eq('user_id', userId)
      .order('started_at', { ascending: false }).limit(60),
    supabase.from('challenge_enrollments').select('moment_id, moment_slug, completed, status, started_on').eq('user_id', userId).eq('status', 'active').limit(20),
  ]);
  const ownMoments = (own ?? []).map(toMomentFlow);
  const byId = new Map(ownMoments.map((m) => [m.id, m]));

  // Moments ajenos que aparecen en compras, ejecuciones o retos.
  const extraIds = new Set<string>();
  for (const p of purchases ?? []) extraIds.add(p.blueprint_id as string);
  for (const r of runs ?? []) if (r.moment_id) extraIds.add(r.moment_id as string);
  for (const e of enrollments ?? []) if (e.moment_id) extraIds.add(e.moment_id as string);
  for (const id of byId.keys()) extraIds.delete(id);
  if (extraIds.size) {
    const { data } = await supabase.from('soi_blueprints').select(MOMENT_FIELDS).in('id', [...extraIds]);
    for (const m of (data ?? []).map(toMomentFlow)) byId.set(m.id, m);
  }
  const resolve = (id: string | null, slug: string | null) => (id ? byId.get(id) ?? null : slug ? officialMoment(slug) : null);

  const bought = (purchases ?? []).map((p) => byId.get(p.blueprint_id as string)).filter(Boolean) as MomentFlow[];
  const mine = ownMoments.filter((m) => !m.parent_id && !m.parent_slug);
  const saved = ownMoments.filter((m) => m.parent_id || m.parent_slug);
  const challenges = (enrollments ?? []).map((e) => resolve(e.moment_id as string | null, e.moment_slug as string | null)).filter(Boolean) as MomentFlow[];

  const seen = new Set<string>();
  const cont: ContinueItem[] = [];
  for (const e of enrollments ?? []) {
    const m = resolve(e.moment_id as string | null, e.moment_slug as string | null);
    if (!m || seen.has(m.id)) continue;
    seen.add(m.id);
    const done = Object.keys((e.completed as Record<string, string>) ?? {}).length;
    cont.push({ moment: m, lastAt: (e.started_on as string) ?? '', label: `Reto · día ${done + 1}` });
  }
  for (const r of runs ?? []) {
    const m = resolve(r.moment_id as string | null, r.moment_slug as string | null);
    if (!m || seen.has(m.id)) continue;
    seen.add(m.id);
    cont.push({ moment: m, lastAt: r.started_at as string, label: r.completed_at ? 'Volver a vivirlo' : 'Sin terminar' });
    if (cont.length >= 8) break;
  }

  return { mine, saved, bought, challenges, continue: cont };
}

export function filterMyMoments(data: Awaited<ReturnType<typeof loadMyMoments>>, f: MyMomentsFilter): MomentFlow[] {
  if (f === 'mios') return data.mine;
  if (f === 'guardados') return data.saved;
  if (f === 'comprados') return data.bought;
  if (f === 'retos') return data.challenges.concat([...data.mine, ...data.saved].filter((m) => m.kind === 'challenge' && !data.challenges.some((c) => c.id === m.id)));
  const seen = new Set<string>();
  return [...data.mine, ...data.saved, ...data.bought].filter((m) => (seen.has(m.id) ? false : (seen.add(m.id), true)));
}
