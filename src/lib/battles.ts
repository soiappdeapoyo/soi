import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserProfile } from '@/types/database';
import { ENEMIES, enemyById, type Enemy } from '@/config/enemies';
import { createAdminClient } from '@/lib/supabase/server';
import { hourInTz } from '@/lib/utils';
import { partOfDay, type DayPart } from '@/lib/day-plan';
import { loadIdentityView } from '@/lib/identity/view';
import type { Capacity } from '@/config/capacities';

const DAY = 86_400_000;
export type EnemyEvent = { id: string; enemy: string; source: string; evidence: string | null; goal: string | null; occurred_at: string };
export type RunLite = { id: string; at: string; title: string; capacities: Capacity[] };

/** Registra que apareció un enemigo (sin duplicar el mismo en 6 horas). Solo servidor. */
export async function recordEnemy(userId: string, enemy: string, opts: { source: 'chat' | 'signals' | 'manual'; evidence?: string | null; goal?: string | null }) {
  if (!enemyById(enemy)) return false;
  const admin = createAdminClient();
  if (opts.source !== 'manual') {
    const { count } = await admin.from('enemy_events').select('id', { count: 'exact', head: true })
      .eq('user_id', userId).eq('enemy', enemy).gte('occurred_at', new Date(Date.now() - 6 * 3_600_000).toISOString());
    if (count) return false;
  }
  const { error } = await admin.from('enemy_events').insert({
    user_id: userId, enemy, source: opts.source, evidence: opts.evidence?.slice(0, 300) ?? null, goal: opts.goal?.slice(0, 160) ?? null,
  });
  return !error;
}

/** ¿Este Moment combate a este enemigo? Su Moment "Contra …" o uno que entrena a sus aliados. */
export function fights(enemy: Enemy, run: Pick<RunLite, 'title' | 'capacities'>) {
  return run.title.startsWith(`Contra ${enemy.name}`) || run.capacities.some((c) => enemy.allies.includes(c));
}

/**
 * Victorias: una aparición se vence si en los 3 días siguientes se vivió un Moment que combate a ese enemigo.
 * Cada aparición se vence una sola vez; un Moment puede vencer a varios enemigos distintos.
 */
export function pairVictories(events: EnemyEvent[], runs: RunLite[]): Map<string, RunLite> {
  const won = new Map<string, RunLite>();
  const used = new Set<string>();
  const sortedRuns = [...runs].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  for (const ev of [...events].sort((a, b) => Date.parse(a.occurred_at) - Date.parse(b.occurred_at))) {
    const enemy = enemyById(ev.enemy);
    if (!enemy) continue;
    const t = Date.parse(ev.occurred_at);
    const run = sortedRuns.find((r) => {
      const rt = Date.parse(r.at);
      return rt >= t && rt <= t + 3 * DAY && !used.has(`${ev.enemy}|${r.id}`) && fights(enemy, r);
    });
    if (run) { won.set(ev.id, run); used.add(`${ev.enemy}|${run.id}`); }
  }
  return won;
}

/** Intensidad reciente: sube con cada aparición y baja con cada victoria (decae con los días). */
export function intensity(appearances: string[], victories: string[], now = Date.now()) {
  const w = (iso: string) => Math.exp(-Math.max(0, now - Date.parse(iso)) / (10 * DAY));
  const raw = appearances.reduce((a, t) => a + w(t), 0) - 0.6 * victories.reduce((a, t) => a + w(t), 0);
  return Math.max(0, Math.round(raw * 10) / 10);
}

export function intensityLabel(v: number) {
  return v >= 2 ? 'Fuerte' : v >= 0.8 ? 'Presente' : v > 0 ? 'Débil' : 'Sin aparecer';
}

const PART_TEXT: Record<DayPart, string> = { manana: 'por la mañana', tarde: 'por las tardes', noche: 'por las noches' };

/** ¿Cambió el momento del día en que aparece? Últimos 30 días vs. los 30 anteriores (3+ apariciones en cada uno). */
export function timePattern(events: EnemyEvent[], timeZone: string, now = Date.now()): string | null {
  const dominant = (xs: EnemyEvent[]) => {
    if (xs.length < 3) return null;
    const c = new Map<DayPart, number>();
    for (const e of xs) { const p = partOfDay(hourInTz(timeZone, new Date(e.occurred_at))); c.set(p, (c.get(p) ?? 0) + 1); }
    return [...c.entries()].sort((a, b) => b[1] - a[1])[0]![0];
  };
  const recent = dominant(events.filter((e) => now - Date.parse(e.occurred_at) < 30 * DAY));
  const prior = dominant(events.filter((e) => { const a = now - Date.parse(e.occurred_at); return a >= 30 * DAY && a < 60 * DAY; }));
  if (recent && prior && recent !== prior) return `Últimamente aparece ${PART_TEXT[recent]}. Antes aparecía ${PART_TEXT[prior]}.`;
  if (recent && !prior) return `Suele aparecer ${PART_TEXT[recent]}.`;
  return null;
}

/** Todo lo de "Batallas": enemigos con intensidad, victorias, patrones, jefes por meta y aliados. */
export async function loadBattles(supabase: SupabaseClient, userId: string, profile: UserProfile | null, timeZone: string, now = Date.now()) {
  const [{ data: rows }, identity] = await Promise.all([
    supabase.from('enemy_events').select('id, enemy, source, evidence, goal, occurred_at').eq('user_id', userId)
      .gte('occurred_at', new Date(now - 90 * DAY).toISOString()).order('occurred_at', { ascending: false }).limit(1000),
    loadIdentityView(supabase, userId, profile, timeZone),
  ]);
  const events = (rows ?? []) as EnemyEvent[];
  const runs: RunLite[] = identity.evidence.filter((e) => e.kind === 'moment' || e.kind === 'reflexion')
    .map((e) => ({ id: e.id, at: e.at, title: e.title, capacities: e.capacities }));
  const won = pairVictories(events, runs);
  const in30 = (iso: string) => now - Date.parse(iso) < 30 * DAY;
  const inPrior = (iso: string) => { const a = now - Date.parse(iso); return a >= 30 * DAY && a < 60 * DAY; };

  const enemies = ENEMIES.map((enemy) => {
    const mine = events.filter((e) => e.enemy === enemy.id);
    const wins = mine.filter((e) => won.has(e.id));
    return {
      enemy,
      appearances30: mine.filter((e) => in30(e.occurred_at)).length,
      appearancesPrior: mine.filter((e) => inPrior(e.occurred_at)).length,
      victories30: wins.filter((e) => in30(e.occurred_at)).length,
      intensity: intensity(mine.filter((e) => in30(e.occurred_at)).map((e) => e.occurred_at), wins.filter((e) => in30(e.occurred_at)).map((e) => won.get(e.id)!.at), now),
      pattern: timePattern(mine, timeZone, now),
      events: mine.map((e) => ({ ...e, defeatedBy: won.get(e.id)?.title ?? null, defeatedById: won.get(e.id)?.id ?? null })),
    };
  });
  const active = enemies.filter((e) => e.appearances30 > 0 || e.intensity > 0).sort((a, b) => b.intensity - a.intensity || b.appearances30 - a.appearances30);
  const defeated = enemies.filter((e) => e.victories30 > 0).sort((a, b) => b.victories30 - a.victories30);
  const mostFrequent = [...enemies].sort((a, b) => b.appearances30 - a.appearances30)[0];

  // Jefes por meta: los enemigos que más aparecen alrededor de cada meta importante.
  const goals = [...new Set([identity.vision.aim, ...identity.vision.goals].filter(Boolean) as string[])].slice(0, 5);
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const bosses = goals.map((goal) => {
    const related = events.filter((e) => e.goal && (norm(goal).includes(norm(e.goal)) || norm(e.goal).includes(norm(goal))));
    const counts = new Map<string, number>();
    for (const e of related) counts.set(e.enemy, (counts.get(e.enemy) ?? 0) + 1);
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([id, n]) => ({ enemy: enemyById(id)!, count: n }));
    return { goal, top };
  }).filter((b) => b.top.length);

  return {
    enemies, active, defeated,
    mostFrequent: mostFrequent && mostFrequent.appearances30 > 0 ? mostFrequent : null,
    bosses,
    allies: identity.capacities,
    totalEvents30: events.filter((e) => in30(e.occurred_at)).length,
  };
}

/** Enemigos que este Moment acaba de vencer (para la pantalla final). `runEvidenceId` = "<ref>@<completed_at>". */
export async function battleWins(supabase: SupabaseClient, userId: string, profile: UserProfile | null, runEvidenceId: string): Promise<string[]> {
  const b = await loadBattles(supabase, userId, profile, profile?.timezone ?? 'America/Mexico_City');
  return b.enemies.filter((e) => e.events.some((ev) => ev.defeatedById === runEvidenceId)).map((e) => e.enemy.name);
}
