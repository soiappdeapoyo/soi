import type { SupabaseClient } from '@supabase/supabase-js';
import { RESUME_WINDOW_MS } from './progress';

export type Unfinished = { runId: string; progress: number; lastActiveAt: string };

/**
 * Moments que la persona dejó a medias (dentro de la ventana para retomar), por referencia `m:<uuid>` / `s:<slug>`.
 * El más reciente de cada uno. Si la migración 0031 aún no está aplicada, no hay nada a medias (nunca rompe la pantalla).
 */
export async function loadUnfinished(supabase: SupabaseClient, userId: string): Promise<Map<string, Unfinished>> {
  const { data, error } = await supabase.from('moment_runs').select('id, moment_id, moment_slug, progress, last_active_at')
    .eq('user_id', userId).is('completed_at', null).gt('progress', 0)
    .gte('last_active_at', new Date(Date.now() - RESUME_WINDOW_MS).toISOString())
    .order('last_active_at', { ascending: false }).limit(30);
  const out = new Map<string, Unfinished>();
  if (error) return out;
  for (const r of data ?? []) {
    const ref = r.moment_id ? `m:${r.moment_id}` : `s:${r.moment_slug}`;
    if (!out.has(ref)) out.set(ref, { runId: r.id as string, progress: r.progress as number, lastActiveAt: r.last_active_at as string });
  }
  return out;
}
