import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserProfile } from '@/types/database';
import type { MomentKind } from '@/config/actions';
import type { MomentumState } from '@/lib/momentum';
import { todayCheckin } from '@/lib/today';
import { summarizeRuns, type RunRow } from '@/lib/rewards';
import { anticipate, type OpenerInput } from '@/lib/opener';
import { getMoment, recommendMoment } from '@/lib/moments/server';
import { challengeLength, challengeState } from '@/lib/moments/challenge';
import { officialMoment } from '@/config/official-moments';
import { loadDayPlan } from '@/lib/day-plan';

const KINDS_FOR: Record<MomentumState, MomentKind[]> = {
  anxiety: ['recovery'],
  low_energy: ['recovery', 'daily'],
  high_energy: ['growth', 'challenge', 'daily'],
  confusion: ['growth', 'recovery'],
};

/**
 * Todo lo que el saludo necesita para anticipar y proponer: progreso (recompensas), check-in de hoy,
 * un reto con el día de hoy pendiente y el Moment que más le ayuda del tipo adecuado para cómo llega.
 */
export async function openerContext(
  supabase: SupabaseClient, userId: string, profile: UserProfile | null,
  base: Pick<OpenerInput, 'hour' | 'today' | 'onboardingCompleted' | 'name' | 'lastRitualDate' | 'ritualAvailable' | 'weakestLink' | 'lastConversationTitle'>,
  canRunMoments: boolean,
): Promise<Pick<OpenerInput, 'checkin' | 'dominantEmotion' | 'goal' | 'progress' | 'proposal'>> {
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const [{ data: runs }, checkin, { data: enrollments }] = await Promise.all([
    supabase.from('moment_runs').select('moment_id, moment_slug, started_at, completed_at, mood_before, mood_after, helped')
      .eq('user_id', userId).gte('started_at', since).order('started_at', { ascending: false }).limit(120),
    todayCheckin(supabase, userId, profile?.timezone),
    supabase.from('challenge_enrollments').select('moment_id, moment_slug, completed').eq('user_id', userId).eq('status', 'active').limit(5),
  ]);
  const progress = summarizeRuns((runs ?? []) as RunRow[], profile?.streak_current ?? 0);
  const ctx = {
    checkin, dominantEmotion: profile?.dominant_emotion ?? null, goal: profile?.goals?.[0] ?? null, progress,
  };
  if (!canRunMoments) return { ...ctx, proposal: null };

  // 1) Un reto con el día de hoy pendiente tiene prioridad: la constancia es la recompensa más grande.
  for (const e of enrollments ?? []) {
    const m = await getMoment(supabase, (e.moment_id as string | null) ?? (e.moment_slug as string));
    if (!m) continue;
    const st = challengeState((e.completed as Record<string, string>) ?? {}, challengeLength(m.blocks, m.duration_days), base.today);
    if (st.availableToday && st.currentDay) {
      return { ...ctx, proposal: { id: m.id, title: m.title, minutes: m.required_minutes, cover: m.cover, challengeDay: st.currentDay } };
    }
  }

  // 2) Lo que la persona planeó en "Mi día": su propia decisión pesa más que cualquier recomendación.
  const plan = await loadDayPlan(supabase, userId, profile?.timezone ?? 'America/Mexico_City');
  const planned = plan.items.find((i) => i.id === plan.next && !i.done);
  if (planned?.moment) {
    const m = planned.moment;
    return { ...ctx, proposal: { id: m.id, title: m.title, minutes: m.required_minutes, cover: m.cover, planned: true } };
  }

  // 3) El Moment que más le ha ayudado, si encaja con cómo llega hoy; si no, el recomendado para ese estado.
  const { state } = anticipate({ ...base, ...ctx });
  const kinds = KINDS_FOR[state];
  if (progress.best) {
    const key = progress.best.key;
    const m = key.startsWith('slug:') ? officialMoment(key.slice(5)) : await getMoment(supabase, key);
    if (m && m.status !== 'archived' && kinds.includes(m.kind)) {
      return { ...ctx, proposal: { id: m.id, title: m.title, minutes: m.required_minutes, cover: m.cover, helpedBefore: true, lift: progress.best.lift } };
    }
  }
  const rec = (await recommendMoment(supabase, userId, kinds)) ?? officialMoment('brian_tracy_5min');
  return { ...ctx, proposal: rec ? { id: rec.id, title: rec.title, minutes: rec.required_minutes, cover: rec.cover } : null };
}
