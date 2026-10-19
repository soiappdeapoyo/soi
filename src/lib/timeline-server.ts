import type { SupabaseClient } from '@supabase/supabase-js';
import { loadHabits } from '@/lib/ai/habit-memory';
import { loadBeliefs } from '@/lib/beliefs-server';
import { BELIEF_MILESTONE, practiceDays } from '@/lib/beliefs';
import { loadLearnings } from '@/lib/learning-server';
import { loadLifeMap } from '@/lib/life-map-server';
import { loadChapters } from '@/lib/chapters-server';
import { lifeArea } from '@/config/life-areas';
import { dateInTz } from '@/lib/utils';
import { DECISION_TAG, pauseEvents, type TimelineEvent } from '@/lib/timeline';

/** Todo lo que forma su historia, desde la base (pocas consultas, sin IA). */
export async function loadTimeline(supabase: SupabaseClient, userId: string, timeZone: string, createdAt: string | null): Promise<TimelineEvent[]> {
  const since = new Date(Date.now() - 3 * 365 * 86_400_000).toISOString();
  const [{ assessments }, chapters, { data: reviews }, { data: ids }, { data: runs }, { data: evidence }, { data: decisions }, beliefs, learnings, habits] = await Promise.all([
    loadLifeMap(supabase, userId),
    loadChapters(supabase, userId),
    supabase.from('life_reviews').select('week_start, next_area, one_thing, created_at').eq('user_id', userId).order('week_start', { ascending: false }).limit(60),
    supabase.from('identities').select('id, name, created_at').eq('user_id', userId).order('created_at').limit(30),
    supabase.from('moment_runs').select('completed_at').eq('user_id', userId).not('completed_at', 'is', null).gte('completed_at', since).order('completed_at').limit(3000),
    supabase.from('agent_knowledge').select('title, content, created_at').eq('user_id', userId).eq('category', 'evidencia').order('created_at', { ascending: false }).limit(60),
    supabase.from('agent_knowledge').select('title, content, metadata, created_at').eq('user_id', userId).eq('category', 'pensamiento')
      .contains('tags', [DECISION_TAG]).order('created_at', { ascending: false }).limit(60),
    loadBeliefs(supabase, userId).catch(() => []),
    loadLearnings(supabase, userId, 60).catch(() => []),
    loadHabits(supabase, userId).catch(() => ({ id: null, memory: null })),
  ]);
  const ev: TimelineEvent[] = [];
  if (createdAt) ev.push({ at: createdAt, kind: 'inicio', title: 'Empezaste con SOI' });

  const asc = [...assessments].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
  const first = asc.find((a) => a.kind === 'inicial');
  if (first) ev.push({ at: first.created_at, kind: 'mapa', title: 'Dibujaste tu mapa', detail: 'Tu punto de partida en cada área de tu vida.', href: '/mi-vida?tab=mapa' });
  for (const a of asc.filter((x) => x.kind === 'mensual')) ev.push({ at: a.created_at, kind: 'medicion', title: 'Tu chequeo del mes' });

  for (const c of chapters) {
    ev.push({ at: c.created_at, kind: 'capitulo', title: c.kind === 'anual' ? 'Cerraste tu año' : 'Cerraste un capítulo de 90 días',
      detail: c.proud || c.lesson || null, href: `/mapa/historia#c-${c.id}` });
  }
  for (const r of (reviews ?? []).slice(0, 24)) {
    const area = r.next_area ? lifeArea(r.next_area as string) : null;
    if (r.one_thing) ev.push({ at: r.created_at as string, kind: 'foco', title: `Tu foco de la semana${area ? ` · ${area.short}` : ''}`, detail: r.one_thing as string });
  }
  for (const i of ids ?? []) ev.push({ at: i.created_at as string, kind: 'identidad', title: `«${i.name}»`, href: `/mi-vida/yo/${i.id}` });

  const done = (runs ?? []).map((r) => r.completed_at as string);
  if (done[0]) ev.push({ at: done[0], kind: 'primer_moment', title: 'Viviste tu primer Moment' });
  ev.push(...pauseEvents(done.map((d) => dateInTz(d, timeZone))));

  for (const e of evidence ?? []) ev.push({ at: e.created_at as string, kind: 'evidencia', title: String(e.title).slice(0, 120), detail: String(e.content).slice(0, 200) });
  for (const d of decisions ?? []) {
    const why = (d.metadata as { why?: string } | null)?.why;
    ev.push({ at: d.created_at as string, kind: 'decision', title: String(d.title).slice(0, 160), detail: why ? `Por qué: ${why}` : null });
  }
  for (const b of beliefs) {
    ev.push({ at: b.created_at, kind: 'creencia', title: `«${b.old}»`, detail: b.next ? `La estás cambiando por «${b.next}».` : null, href: '/mi-vida?tab=nuevo-yo#creencias' });
    if (practiceDays(b) >= BELIEF_MILESTONE && b.next) {
      const at = [...new Set(b.practices.map((p) => p.at.slice(0, 10)))].sort()[BELIEF_MILESTONE - 1];
      if (at) ev.push({ at: `${at}T12:00:00.000Z`, kind: 'creencia_tuya', title: `«${b.next}»`, detail: `Antes: «${b.old}»` });
    }
  }
  for (const l of learnings.filter((x) => x.outcome === 'funciono')) {
    ev.push({ at: l.created_at, kind: 'aprendizaje', title: l.action ?? l.learned, detail: `De «${l.source}»` });
  }
  for (const h of (habits.memory?.habits ?? []).filter((x) => x.status === 'automatic' && x.updated_at)) {
    ev.push({ at: h.updated_at!, kind: 'habito', title: h.name, detail: h.identity ?? null });
  }
  return ev;
}
