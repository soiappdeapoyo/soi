import { declinedFilter, lastDecline, loadDeclines, type Decline } from '@/lib/declines';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserProfile } from '@/types/database';
import type { MomentKind } from '@/config/actions';
import { todayCheckin } from '@/lib/today';
import { summarizeRuns, type RunRow } from '@/lib/rewards';
import type { OpenerInput, OpenerMemory } from '@/lib/opener';
import { getMoment, recommendMoment } from '@/lib/moments/server';
import { challengeLength, challengeState } from '@/lib/moments/challenge';
import { officialMoment } from '@/config/official-moments';
import { loadDayPlan, partOfDay, PART_SUGGEST, resolveRefs } from '@/lib/day-plan';
import { dateInTz, hourInTz } from '@/lib/utils';
import type { MomentFlow } from '@/lib/moments/types';

type Run = RunRow & { learning: string | null };

/** "hoy", "ayer", "jueves" (dentro de la semana) o null. En la zona horaria de la persona. */
export function dayLabelFor(iso: string, timeZone: string, now = new Date()) {
  const d = dateInTz(iso, timeZone);
  const today = dateInTz(now, timeZone);
  if (d === today) return 'hoy';
  if (d === dateInTz(new Date(now.getTime() - 86_400_000), timeZone)) return 'ayer';
  const days = Math.round((Date.parse(today) - Date.parse(d)) / 86_400_000);
  if (days < 7) return new Intl.DateTimeFormat('es', { weekday: 'long', timeZone }).format(new Date(iso));
  return null;
}

/**
 * Lo que el saludo necesita: evidencia concreta (qué hizo y cuándo, en su zona horaria), la parte del día
 * y una propuesta con su porqué: reto de hoy > lo planeado en Mi día > lo que ya le ayudó a esta hora > lo propio de la hora.
 */
export async function openerContext(
  supabase: SupabaseClient, userId: string, profile: UserProfile | null,
  base: Pick<OpenerInput, 'hour' | 'today'>, canRunMoments: boolean,
): Promise<Pick<OpenerInput, 'checkin' | 'goal' | 'progress' | 'proposal' | 'weekDays' | 'lastRun' | 'declined'>> {
  const tz = profile?.timezone ?? 'America/Mexico_City';
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const [{ data: rawRuns }, checkin, { data: enrollments }, declines] = await Promise.all([
    supabase.from('moment_runs').select('moment_id, moment_slug, started_at, completed_at, mood_before, mood_after, helped, learning')
      .eq('user_id', userId).gte('started_at', since).order('started_at', { ascending: false }).limit(120),
    todayCheckin(supabase, userId, tz),
    supabase.from('challenge_enrollments').select('moment_id, moment_slug, completed').eq('user_id', userId).eq('status', 'active').limit(5),
    loadDeclines(supabase, userId).catch(() => [] as Decline[]),
  ]);
  const runs = (rawRuns ?? []) as Run[];
  const progress = summarizeRuns(runs, profile?.streak_current ?? 0);
  const done = runs.filter((r) => r.completed_at);
  const refOf = (r: Run) => (r.moment_id ? `m:${r.moment_id}` : `s:${r.moment_slug}`);
  const byRef = await resolveRefs(supabase, [...new Set(done.slice(0, 40).map(refOf))]);

  const weekDays = new Set(done.filter((r) => Date.now() - Date.parse(r.completed_at!) < 7 * 86_400_000).map((r) => dateInTz(r.completed_at!, tz))).size;
  const memoryOf = (r: Run, m: MomentFlow): OpenerMemory | null => {
    const label = dayLabelFor(r.completed_at!, tz);
    return label ? { title: m.title, dayLabel: label, learning: r.learning, helped: r.helped, evening: hourInTz(tz, new Date(r.completed_at!)) >= 18 } : null;
  };
  const last = done[0];
  const lastMoment = last ? byRef.get(refOf(last)) : undefined;
  const lastRun = last && lastMoment ? memoryOf(last, lastMoment) : null;

  // "Ahora no": lo que rechazó no se repite y su último rechazo se reconoce en el saludo.
  const part = partOfDay(base.hour);
  const said = declinedFilter(declines, part);
  const lastNo = lastDecline(declines);
  const declined = lastNo ? { title: lastNo.title, dayLabel: dayLabelFor(lastNo.at, tz) ?? 'hace poco' } : null;
  const refFor = (m: MomentFlow) => (m.official ? `s:${m.slug}` : `m:${m.id}`);
  const ctx = { checkin, goal: profile?.goals?.[0] ?? null, progress, weekDays, lastRun, declined };
  if (!canRunMoments) return { ...ctx, proposal: null };
  const card = (m: MomentFlow, extra: Record<string, unknown> = {}) => ({ id: m.id, title: m.title, minutes: m.required_minutes, cover: m.cover, ...extra });

  // 1) Un reto con el día de hoy pendiente.
  for (const e of enrollments ?? []) {
    const m = await getMoment(supabase, (e.moment_id as string | null) ?? (e.moment_slug as string));
    if (!m) continue;
    const st = challengeState((e.completed as Record<string, string>) ?? {}, challengeLength(m.blocks, m.duration_days), base.today);
    if (st.availableToday && st.currentDay && said.allows(refFor(m), m.kind, true)) return { ...ctx, proposal: card(m, { challengeDay: st.currentDay }) };
  }

  // 2) Lo que la persona planeó en "Mi día" (su decisión pesa más que cualquier recomendación).
  const plan = await loadDayPlan(supabase, userId, tz);
  const planned = plan.items.find((i) => i.id === plan.next && !i.done);
  if (planned?.moment && said.allows(refFor(planned.moment), planned.moment.kind, true)) return { ...ctx, proposal: card(planned.moment, { planned: true }) };

  // 3) Por la hora del día (la ansiedad que dijo hoy manda): primero algo que ya le ayudó, con ese recuerdo.
  const allKinds: MomentKind[] = checkin === 'anxiety' ? ['recovery'] : PART_SUGGEST[part].kinds;
  const kinds = allKinds.filter((k) => said.allowsKind(k));
  if (!kinds.length) return { ...ctx, proposal: null };
  for (const r of done) {
    if (!(r.helped || (r.learning && r.learning.trim().length >= 6))) continue;
    const m = byRef.get(refOf(r));
    if (!m || !kinds.includes(m.kind) || m.status === 'archived' || !said.allows(refFor(m), m.kind)) continue;
    if (part === 'manana' && checkin !== 'anxiety' && m.kind === 'recovery') continue;
    return { ...ctx, proposal: card(m, { memory: memoryOf(r, m) }) };
  }
  // 4) Lo propio de esta hora: rituales de los autores en la mañana, SATS en la noche…
  const official = checkin === 'anxiety' ? null : PART_SUGGEST[part].slugs.map(officialMoment).find((m) => m && said.allows(refFor(m), m.kind));
  const recommended = official ?? (await recommendMoment(supabase, userId, kinds));
  const fallback = officialMoment('brian_tracy_5min');
  const rec = recommended && said.allows(refFor(recommended), recommended.kind) ? recommended
    : fallback && said.allows(refFor(fallback), fallback.kind) ? fallback : null;
  return { ...ctx, proposal: rec ? card(rec) : null };
}
