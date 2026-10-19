import { cache } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { loadHabits } from '@/lib/ai/habit-memory';
import { resolveRefs } from '@/lib/day-plan';
import { dateInTz, hourInTz, todayISO } from '@/lib/utils';
import { detectDrift, whatWorks, type Drift, type RunSample, type WhatWorks } from '@/lib/what-works';

const DAY = 86_400_000;

/**
 * Lo que te funciona y los hábitos que se están cayendo, una vez por petición (pocas consultas, sin IA).
 * Últimos 120 días de Moments (empezados y terminados) y la memoria de hábitos.
 */
export const loadWhatWorks = cache(async (supabase: SupabaseClient, userId: string, timeZone: string): Promise<{ works: WhatWorks; drift: Drift[] }> => {
  const since = new Date(Date.now() - 120 * DAY).toISOString();
  const [{ data }, habits] = await Promise.all([
    supabase.from('moment_runs').select('moment_id, moment_slug, started_at, completed_at, mood_before, mood_after, helped')
      .eq('user_id', userId).gte('started_at', since).order('started_at', { ascending: false }).limit(300),
    loadHabits(supabase, userId).catch(() => ({ id: null, memory: null })),
  ]);
  const rows = (data ?? []) as { moment_id: string | null; moment_slug: string | null; started_at: string; completed_at: string | null; mood_before: number | null; mood_after: number | null; helped: boolean | null }[];
  const refOf = (r: (typeof rows)[number]) => (r.moment_id ? `m:${r.moment_id}` : r.moment_slug ? `s:${r.moment_slug}` : null);
  const refs = [...new Set(rows.map(refOf).filter((x): x is string => Boolean(x)))].slice(0, 120);
  const moments = refs.length ? await resolveRefs(supabase, refs).catch(() => new Map()) : new Map();

  const samples: RunSample[] = [];
  for (const r of rows) {
    const ref = refOf(r);
    const m = ref ? moments.get(ref) : null;
    if (!m) continue;
    samples.push({
      started_at: r.started_at, completed_at: r.completed_at, hour: hourInTz(timeZone, new Date(r.started_at)),
      minutes: m.required_minutes ?? 5, types: m.blocks.map((b: { type: string }) => b.type),
      mood_before: r.mood_before, mood_after: r.mood_after, helped: r.helped,
    });
  }

  const tracks = (habits.memory?.habits ?? []).filter((h) => h.status === 'active' && h.moment_id).map((h) => ({
    name: h.name, tiny: h.tiny ?? null, moment_id: h.moment_id!,
    days: rows.filter((r) => r.completed_at && r.moment_id === h.moment_id).map((r) => dateInTz(r.completed_at!, timeZone)),
  }));
  return { works: whatWorks(samples), drift: detectDrift(tracks, todayISO(timeZone)) };
});
