import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getSessionUser } from '@/lib/supabase/server';
import { getProfile } from '@/lib/billing/check-access';
import { loadMapView } from '@/lib/life-map-server';
import { loadPlan } from '@/lib/life-plan-server';
import { reviewWeek } from '@/lib/life-plan';
import { WeeklyReview, type WeekSummary } from '@/components/map/weekly-review';
import { dateInTz } from '@/lib/utils';

export const metadata: Metadata = { title: 'Tu semana' };

const addDays = (d: string, n: number) => { const x = new Date(`${d}T12:00:00Z`); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const fmt = (d: string, opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('es-MX', { ...opts, timeZone: 'UTC' }).format(new Date(`${d}T12:00:00Z`));

/** La revisión de la semana (la que termina el domingo, o la actual si se abre otro día). */
export default async function WeekReviewPage() {
  const { supabase, user } = await getSessionUser();
  if (!user) redirect('/login?next=/mapa/semana');
  const profile = await getProfile(user.id);
  const tz = profile?.timezone ?? 'America/Mexico_City';
  const { weekStart } = reviewWeek(tz);
  const end = addDays(weekStart, 6);
  const [view, plan, { data: runs }] = await Promise.all([
    loadMapView(supabase, user.id, profile, tz),
    loadPlan(supabase, user.id),
    supabase.from('moment_runs').select('moment_id, completed_at').eq('user_id', user.id).not('completed_at', 'is', null)
      .gte('completed_at', `${addDays(weekStart, -1)}T00:00:00Z`).lte('completed_at', `${addDays(end, 1)}T23:59:59Z`).limit(500),
  ]);
  if (!view.hasMap) redirect('/mapa/diagnostico');

  // Solo lo de esta semana en su zona horaria.
  const inWeek = (runs ?? []).filter((r) => { const d = dateInTz(r.completed_at as string, tz); return d >= weekStart && d <= end; });
  const daysOf = (id?: string) => new Set(inWeek.filter((r) => id && r.moment_id === id).map((r) => dateInTz(r.completed_at as string, tz))).size;
  const sameMonth = weekStart.slice(5, 7) === end.slice(5, 7);
  const summary: WeekSummary = {
    weekStart,
    range: sameMonth ? `${fmt(weekStart, { day: 'numeric' })} al ${fmt(end, { day: 'numeric', month: 'long' })}` : `${fmt(weekStart, { day: 'numeric', month: 'long' })} al ${fmt(end, { day: 'numeric', month: 'long' })}`,
    moments: inWeek.length,
    habits: (plan?.areas ?? []).map((a) => ({ name: a.habit.name, days: daysOf(a.habit.moment_id) })),
    focus: view.focus.map((f) => ({ area: f.area.id, evidence: f.evidence7, current: f.current })),
  };

  return (
    <div className="mx-auto max-w-xl px-5 pt-4 md:pt-10">
      <WeeklyReview s={summary} />
    </div>
  );
}
