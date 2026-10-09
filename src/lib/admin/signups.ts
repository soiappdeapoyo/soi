import { createAdminClient } from '@/lib/supabase/server';
import { adminEmails } from '@/lib/admin/notify';
import type { FunnelRow } from '@/lib/analytics/funnel';

const isDemo = (e: string | null | undefined) => Boolean(e && /\.demo@soi\.app$/i.test(e));

export type Signup = {
  id: string; email: string | null; name: string | null; provider: string | null; createdAt: string;
  country: string | null; region: string | null; city: string | null;
};

/** Cuándo vio esta persona administradora las notificaciones por última vez (queda en la auditoría). */
export async function lastSeenNotifications(adminId: string): Promise<string | null> {
  const { data } = await createAdminClient().from('admin_audit').select('created_at')
    .eq('admin_id', adminId).eq('action', 'ver_notificaciones').order('created_at', { ascending: false }).limit(1).maybeSingle();
  return (data?.created_at as string | undefined) ?? null;
}

/** Registros de los últimos `days` días (sin cuentas demo ni administradores), con país y ciudad si se conocen. */
export async function recentSignups(days = 30): Promise<Signup[]> {
  const a = createAdminClient();
  const since = Date.now() - days * 86_400_000;
  const admins = new Set(adminEmails());
  const { data } = await a.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const users = (data?.users ?? [])
    .filter((u) => Date.parse(u.created_at) >= since && !isDemo(u.email) && !admins.has((u.email ?? '').toLowerCase()))
    .sort((x, y) => Date.parse(y.created_at) - Date.parse(x.created_at));
  if (!users.length) return [];
  const ids = users.map((u) => u.id);
  const [{ data: geo }, { data: profiles }] = await Promise.all([
    a.from('funnel_events').select('user_id, country, region, city').eq('event', 'signup').in('user_id', ids),
    a.from('user_profiles').select('user_id, display_name').in('user_id', ids),
  ]);
  const geoBy = new Map((geo ?? []).map((g) => [g.user_id as string, g]));
  const nameBy = new Map((profiles ?? []).map((p) => [p.user_id as string, p.display_name as string | null]));
  return users.map((u) => {
    const g = geoBy.get(u.id);
    return {
      id: u.id, email: u.email ?? null, name: nameBy.get(u.id) ?? (u.user_metadata?.full_name as string | undefined) ?? null,
      provider: (u.app_metadata?.provider as string | undefined) ?? null, createdAt: u.created_at,
      country: (g?.country as string | null) ?? null, region: (g?.region as string | null) ?? null, city: (g?.city as string | null) ?? null,
    };
  });
}

/** Registros nuevos desde la última vez que se vieron las notificaciones (para la campana del panel). */
export async function unseenSignups(adminId: string): Promise<number> {
  const [seen, list] = await Promise.all([lastSeenNotifications(adminId), recentSignups(30)]);
  const since = seen ? Date.parse(seen) : 0;
  return list.filter((s) => Date.parse(s.createdAt) > since).length;
}

/** Eventos del embudo de la landing del periodo (paginado: de a 1000). */
export async function loadFunnel(days: number) {
  const a = createAdminClient();
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const rows: FunnelRow[] = [];
  let error: string | null = null;
  for (let from = 0; from < 50_000; from += 1000) {
    const { data, error: e } = await a.from('funnel_events').select('visitor_id, event, detail, country, region, city, referrer, user_id, at')
      .gte('at', since).order('at', { ascending: true }).range(from, from + 999);
    if (e) { error = e.message; break; }
    rows.push(...((data ?? []) as FunnelRow[]));
    if (!data || data.length < 1000) break;
  }
  return { rows, error };
}
