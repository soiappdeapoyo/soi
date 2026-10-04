import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserProfile } from '@/types/database';
import type { Eslabon } from '@/config/agents';
import { decideToday, type MomentumState, type TodayDecision } from './momentum';
import { loadMomentum } from './momentum-server';
import { todayISO } from './utils';

export type PendingAction = { id: string; title: string; minutes: number; area: string | null };
export type WatchedVideo = { id: string; title: string; channel: string };

function startOfDayUTC() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

/** Check-in más reciente de hoy (o null). */
export async function todayCheckin(supabase: SupabaseClient, userId: string): Promise<MomentumState | null> {
  const { data } = await supabase.from('momentum_events').select('metadata').eq('user_id', userId).eq('kind', 'checkin')
    .gte('created_at', startOfDayUTC()).order('created_at', { ascending: false }).limit(1).maybeSingle();
  return ((data?.metadata as { state?: MomentumState } | null)?.state) ?? null;
}

/** Todo lo que "Hoy" necesita para que el Director decida. */
export async function loadToday(supabase: SupabaseClient, userId: string, profile: UserProfile | null, ritualAvailable: boolean) {
  const since = startOfDayUTC();
  const [momentum, checkin, { data: actions }, { data: impl }, { data: videos }, { data: reflections }] = await Promise.all([
    loadMomentum(supabase, userId, profile?.streak_current ?? 0),
    todayCheckin(supabase, userId),
    supabase.from('agent_knowledge').select('id, title, metadata').eq('user_id', userId).eq('category', 'accion')
      .contains('tags', ['action_card']).eq('status', 'en_progreso').order('created_at', { ascending: false }).limit(3),
    supabase.from('blueprint_implementations').select('id, adapted_steps, completed_steps, blueprint:soi_blueprints(title)')
      .eq('user_id', userId).eq('status', 'active').order('last_activity_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('momentum_events').select('metadata, created_at').eq('user_id', userId).eq('kind', 'video_watched')
      .gte('created_at', since).order('created_at', { ascending: false }).limit(5),
    supabase.from('momentum_events').select('metadata').eq('user_id', userId).eq('kind', 'reflection').gte('created_at', since),
  ]);

  const reflectedVideos = new Set((reflections ?? []).map((r) => (r.metadata as { video_id?: string } | null)?.video_id).filter(Boolean));
  const lastVideo = (videos ?? [])
    .map((v) => v.metadata as { video_id?: string; title?: string; channel?: string } | null)
    .find((m) => m?.video_id && !reflectedVideos.has(m.video_id));
  const unreflectedVideo: WatchedVideo | null = lastVideo?.video_id
    ? { id: lastVideo.video_id, title: lastVideo.title ?? 'el video', channel: lastVideo.channel ?? '' }
    : null;

  const pending: PendingAction[] = (actions ?? []).map((a) => {
    const m = (a.metadata ?? {}) as { minutes?: number; area?: string | null };
    return { id: a.id as string, title: a.title as string, minutes: m.minutes ?? 5, area: m.area ?? null };
  });

  const activeImpl = impl
    ? {
        id: impl.id as string,
        title: (impl.blueprint as unknown as { title: string } | null)?.title ?? 'Blueprint',
        done: (impl.completed_steps as number[]).length,
        total: (impl.adapted_steps as unknown[]).length,
      }
    : null;

  const tz = profile?.timezone ?? 'America/Mexico_City';
  const decision: TodayDecision = decideToday({
    checkin,
    score: momentum.score,
    weakestLink: (profile?.weakest_link as Eslabon | null) ?? null,
    goalsCount: profile?.goals?.length ?? 0,
    pendingActions: pending.length,
    activeImplementation: Boolean(activeImpl),
    unreflectedVideo: Boolean(unreflectedVideo),
    ritualDoneToday: profile?.last_ritual_date === todayISO(tz),
    ritualAvailable,
  });

  return { momentum, checkin, pending, activeImpl, unreflectedVideo, decision };
}
