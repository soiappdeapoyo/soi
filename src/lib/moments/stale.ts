import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Que la persona no se sature de Moments (puro + servidor). Nunca se borran: lo que SOI propuso y no se vivió en
 * STALE_DAYS se ARCHIVA solo (sale de Mi día y de Mi Vida → Moments) y se recupera desde «Archivados».
 * No se tocan: hábitos (kind daily), lo que tiene hora en Mi día, lo vivido alguna vez, copias, lo editado hace poco
 * ni lo publicado.
 */
export const STALE_DAYS = 7;
const DAY = 86_400_000;

export type StaleCandidate = { id: string; creator_id: string; kind: string; status: string; parent_id: string | null; created_at: string; updated_at: string };

export function staleIds(c: StaleCandidate[], lived: Set<string>, timed: Set<string>, now = Date.now()): string[] {
  const cutoff = now - STALE_DAYS * DAY;
  return c.filter((m) => m.status === 'private' && !m.parent_id && m.kind !== 'daily'
    && Date.parse(m.created_at) < cutoff && Date.parse(m.updated_at) < cutoff
    && !lived.has(m.id) && !timed.has(m.id)).map((m) => m.id);
}

type DayItem = { id: string; ref: string; time?: string | null };

/** Quita de Mi día los Moments archivados (los que no tienen hora). */
export function withoutArchived(items: DayItem[], archived: Set<string>): DayItem[] {
  return items.filter((i) => !(i.ref.startsWith('m:') && archived.has(i.ref.slice(2)) && !i.time));
}

/** Corre una vez al día (cron de expire-trials). Devuelve cuántos archivó. */
export async function archiveStaleMoments(db: SupabaseClient, now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - STALE_DAYS * DAY).toISOString();
  const { data: rows } = await db.from('soi_blueprints').select('id, creator_id, kind, status, parent_id, created_at, updated_at')
    .eq('status', 'private').is('parent_id', null).neq('kind', 'daily').lt('created_at', cutoff).lt('updated_at', cutoff).limit(500);
  const candidates = (rows ?? []) as StaleCandidate[];
  if (!candidates.length) return 0;
  const ids = candidates.map((c) => c.id);
  const users = [...new Set(candidates.map((c) => c.creator_id))];
  const [{ data: runs }, { data: plans }] = await Promise.all([
    db.from('moment_runs').select('moment_id').in('moment_id', ids).limit(5000),
    db.from('day_plans').select('user_id, items').in('user_id', users),
  ]);
  const lived = new Set((runs ?? []).map((r) => r.moment_id as string));
  const timed = new Set<string>();
  for (const p of plans ?? []) for (const i of (p.items as DayItem[] | null) ?? []) if (i.time && i.ref.startsWith('m:')) timed.add(i.ref.slice(2));
  const stale = staleIds(candidates, lived, timed, now.getTime());
  if (!stale.length) return 0;
  const { error } = await db.from('soi_blueprints').update({ status: 'archived' }).in('id', stale);
  if (error) { console.error('[stale] archivar', error.message); return 0; }
  const gone = new Set(stale);
  for (const p of plans ?? []) {
    const items = (p.items as DayItem[] | null) ?? [];
    const next = withoutArchived(items, gone);
    if (next.length !== items.length) await db.from('day_plans').update({ items: next, updated_at: now.toISOString() }).eq('user_id', p.user_id);
  }
  return stale.length;
}
