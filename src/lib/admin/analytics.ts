import { createAdminClient } from '@/lib/supabase/server';
import { buildSessions, type NavEvent } from '@/lib/analytics/nav';

const PAGE = 1000;
const MAX_ROWS = 50_000;

/** Eventos de navegación de los últimos `days` días (paginado: PostgREST entrega de a 1000). */
export async function loadNavEvents({ days, userId }: { days: number; userId?: string }) {
  const a = createAdminClient();
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const rows: NavEvent[] = [];
  let error: string | null = null;
  for (let from = 0; from < MAX_ROWS; from += PAGE) {
    let q = a.from('nav_events').select('user_id, session_id, kind, path, at').gte('at', since)
      .order('at', { ascending: true }).range(from, from + PAGE - 1);
    if (userId) q = q.eq('user_id', userId);
    const { data, error: e } = await q;
    if (e) { error = e.message; break; }
    rows.push(...((data ?? []) as NavEvent[]));
    if (!data || data.length < PAGE) break;
  }
  return { events: rows, truncated: rows.length >= MAX_ROWS, error };
}

/** Sesiones de navegación de una persona (para su ficha en el panel). */
export async function userSessions(userId: string, days = 30, limit = 15) {
  const { events, error } = await loadNavEvents({ days, userId });
  return { sessions: buildSessions(events).slice(0, limit), error };
}

/** Correo de cada cuenta (para mostrar quién en las sesiones recientes). */
export async function emailsById(ids: string[]) {
  if (!ids.length) return new Map<string, string>();
  const { data } = await createAdminClient().auth.admin.listUsers({ page: 1, perPage: 1000 });
  const want = new Set(ids);
  return new Map((data?.users ?? []).filter((u) => want.has(u.id)).map((u) => [u.id, u.email ?? u.id]));
}
