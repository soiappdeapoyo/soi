import { cache } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { loadHabits } from '@/lib/ai/habit-memory';
import { loadBeliefs } from '@/lib/beliefs-server';
import { beliefStage } from '@/lib/beliefs';
import { loadLearnings } from '@/lib/learning-server';
import { loadLifeMap } from '@/lib/life-map-server';
import { dateInTz, todayISO } from '@/lib/utils';
import { chapterDue, type ChapterPeriod, type ChapterRow, type ChapterSnapshot } from '@/lib/chapters';
import type { AreaScores } from '@/lib/life-map';

/** Sus capítulos cerrados (si la tabla aún no existe, ninguno). */
export const loadChapters = cache(async (supabase: SupabaseClient, userId: string): Promise<ChapterRow[]> => {
  const { data, error } = await supabase.from('life_chapters').select('id, kind, period_start, period_end, proud, lesson, letting_go, next_vision, letter, snapshot, created_at')
    .eq('user_id', userId).order('period_end', { ascending: false }).limit(40);
  return error ? [] : ((data ?? []) as ChapterRow[]);
});

/** El capítulo que toca cerrar hoy (o null) y el día en que empezó su mapa. */
export const loadChapterDue = cache(async (supabase: SupabaseClient, userId: string, timeZone: string): Promise<{ due: ChapterPeriod | null; mapStart: string | null; ok: boolean }> => {
  const [{ assessments }, { data, error }] = await Promise.all([
    loadLifeMap(supabase, userId),
    supabase.from('life_chapters').select('period_end').eq('user_id', userId).limit(60),
  ]);
  const first = [...assessments].filter((a) => a.kind !== 'semanal').sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))[0];
  const mapStart = first ? dateInTz(first.created_at, timeZone) : null;
  if (error) return { due: null, mapStart, ok: false };
  return { due: chapterDue(mapStart, (data ?? []).map((r) => r.period_end as string), todayISO(timeZone)), mapStart, ok: true };
});

/** La foto del capítulo: cómo empezó y cómo termina, y lo que hizo en medio. */
export async function buildSnapshot(supabase: SupabaseClient, userId: string, p: Pick<ChapterPeriod, 'period_start' | 'period_end'>, scoresEnd: AreaScores, timeZone: string): Promise<ChapterSnapshot> {
  const from = `${p.period_start}T00:00:00Z`;
  const [{ assessments }, { data: runs }, { count: evidence }, beliefs, learnings, habits] = await Promise.all([
    loadLifeMap(supabase, userId),
    supabase.from('moment_runs').select('completed_at').eq('user_id', userId).not('completed_at', 'is', null).gte('completed_at', from).limit(2000),
    supabase.from('agent_knowledge').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('category', 'evidencia').gte('created_at', from),
    loadBeliefs(supabase, userId).catch(() => []),
    loadLearnings(supabase, userId, 100).catch(() => []),
    loadHabits(supabase, userId).catch(() => ({ id: null, memory: null })),
  ]);
  // Calificación al empezar: la última completa antes del inicio (o la primera de todas).
  const full = [...assessments].filter((a) => a.kind !== 'semanal').sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
  const start = [...full].reverse().find((a) => Date.parse(a.created_at) <= Date.parse(from) + 86_400_000) ?? full[0];
  const done = (runs ?? []).map((r) => r.completed_at as string);
  return {
    scores_start: (start?.scores ?? {}) as Record<string, number>,
    scores_end: scoresEnd as Record<string, number>,
    moments: done.length,
    practice_days: new Set(done.map((d) => dateInTz(d, timeZone))).size,
    evidence: evidence ?? 0,
    beliefs_training: beliefs.filter((b) => ['entrenando', 'creciendo'].includes(beliefStage(b))).length,
    beliefs_owned: beliefs.filter((b) => beliefStage(b) === 'tuya').length,
    learnings_worked: learnings.filter((l) => l.outcome === 'funciono' && l.created_at >= from).length,
    habits_automatic: (habits.memory?.habits ?? []).filter((h) => h.status === 'automatic').length,
  };
}
