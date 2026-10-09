import { cache } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { officialMoment } from '@/config/official-moments';
import { loadUnfinished } from '@/lib/moments/unfinished';
import type { JourneyState } from '@/lib/journey';

/** Un Moment que SOI le preparó hace poco y aún no vive cuenta como "tu primer Moment está listo". */
const PROPOSAL_WINDOW_MS = 3 * 86_400_000;

/**
 * El estado del loop principal (para `nextStep`), con pocas consultas en paralelo y una vez por petición.
 * Si una consulta falla se asume lo conservador (ya conoce SOI): nunca se le presenta SOI a quien ya lo usa.
 */
export const loadJourney = cache(async (supabase: SupabaseClient, userId: string, canRun: boolean): Promise<JourneyState> => {
  const [msgs, done, firstRun, recentOwn, startedRuns, unfinished] = await Promise.all([
    supabase.from('messages').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('role', 'user'),
    supabase.from('moment_runs').select('id', { count: 'exact', head: true }).eq('user_id', userId).not('completed_at', 'is', null),
    supabase.from('moment_runs').select('id, completed_at').eq('user_id', userId).not('completed_at', 'is', null)
      .order('completed_at', { ascending: true }).limit(1).maybeSingle(),
    supabase.from('soi_blueprints').select('id, title, required_minutes').eq('creator_id', userId).neq('status', 'archived')
      .gte('created_at', new Date(Date.now() - PROPOSAL_WINDOW_MS).toISOString()).order('created_at', { ascending: false }).limit(5),
    supabase.from('moment_runs').select('moment_id').eq('user_id', userId).not('moment_id', 'is', null).limit(200),
    loadUnfinished(supabase, userId),
  ]);
  const failed = Boolean(msgs.error || done.error);
  const userMessages = failed ? 1 : msgs.count ?? 0;
  const completedRuns = failed ? 1 : done.count ?? 0;

  const firstCompleted = firstRun.data?.completed_at ? { runId: firstRun.data.id as string, completedAt: firstRun.data.completed_at as string } : null;
  // ¿Le escribió a SOI después de su primer Moment? (una consulta solo si hace falta)
  let followedUp = true;
  if (firstCompleted) {
    const { data, error } = await supabase.from('messages').select('id').eq('user_id', userId).eq('role', 'user')
      .gt('created_at', firstCompleted.completedAt).limit(1);
    followedUp = Boolean(error) || Boolean(data?.length);
  }

  const ran = new Set((startedRuns.data ?? []).map((r) => r.moment_id as string));
  const fresh = (recentOwn.data ?? []).find((m) => !ran.has(m.id as string));
  const proposal = fresh
    ? { id: fresh.id as string, title: fresh.title as string, minutes: (fresh.required_minutes as number) ?? 1, href: `/m/${fresh.id}/play?from=hoy` }
    : null;

  const [ref, u] = [...unfinished][0] ?? [];
  const um = ref ? (ref.startsWith('s:') ? officialMoment(ref.slice(2)) : null) : null;
  let unfinishedView: JourneyState['unfinished'] = null;
  if (ref && u) {
    const id = ref.slice(2);
    const title = um?.title ?? ((await supabase.from('soi_blueprints').select('title').eq('id', id).maybeSingle()).data?.title as string | undefined);
    if (title) unfinishedView = { title, href: `/m/${id}/play?from=hoy`, progress: u.progress };
  }

  return { userMessages, completedRuns, firstCompleted, followedUp, proposal, unfinished: unfinishedView, canRun };
});
