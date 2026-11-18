import { createAdminClient } from '@/lib/supabase/server';
import { rewardEligible, rewardNotification } from '@/lib/trial-reward';

/** La campanita de la app: avisos de administración y automáticos. Solo escribe el servidor (service role). */

export type AppNotification = { id: string; kind: string; title: string; body: string; url: string | null; read: boolean; createdAt: string };

export async function unreadNotifications(userId: string): Promise<number> {
  const { count, error } = await createAdminClient().from('user_notifications')
    .select('id', { count: 'exact', head: true }).eq('user_id', userId).is('read_at', null);
  return error ? 0 : count ?? 0;
}

export async function listNotifications(userId: string, limit = 30): Promise<AppNotification[]> {
  const { data } = await createAdminClient().from('user_notifications')
    .select('id, kind, title, body, url, read_at, created_at').eq('user_id', userId)
    .order('created_at', { ascending: false }).limit(limit);
  return (data ?? []).map((r) => ({
    id: r.id as string, kind: r.kind as string, title: r.title as string, body: r.body as string,
    url: (r.url as string | null) ?? null, read: Boolean(r.read_at), createdAt: r.created_at as string,
  }));
}

export async function markNotificationsRead(userId: string, ids?: string[]) {
  let q = createAdminClient().from('user_notifications').update({ read_at: new Date().toISOString() }).eq('user_id', userId).is('read_at', null);
  if (ids?.length) q = q.in('id', ids);
  await q;
}

/**
 * Al terminar la prueba, «Usa SOI un mes gratis» llega a la campanita (uno por cada vez que termina: `ref`). Se crea al
 * entrar a la app; si ya existe, el índice único lo ignora.
 */
export async function ensureRewardNotification(userId: string, profile: { plan: string | null; trial_ends_at: string | null; feedback_reward_days?: number | null } | null) {
  if (!profile?.trial_ends_at || !rewardEligible(profile)) return;
  const n = rewardNotification({ trial_ends_at: profile.trial_ends_at, feedback_reward_days: profile.feedback_reward_days });
  const { error } = await createAdminClient().from('user_notifications').insert({ user_id: userId, ...n });
  if (error && error.code !== '23505') console.error('[notificaciones] aviso de la prueba', error.message);
}

/** Cuentas de SOI que reciben un aviso «a todas»: sin Háblame ni demo. */
async function soiAccounts(): Promise<string[]> {
  const a = createAdminClient();
  // Las cuentas demo se reconocen por su correo (`*.demo@soi.app`).
  const demo = new Set<string>();
  for (let page = 1; ; page++) {
    const { data, error } = await a.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(error.message);
    for (const u of data.users) if (/\.demo@soi\.app$/i.test(u.email ?? '')) demo.add(u.id);
    if (data.users.length < 1000) break;
  }
  const ids: string[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await a.from('user_profiles').select('user_id').neq('app_role', 'persons').range(from, from + 999);
    if (error) throw new Error(error.message);
    ids.push(...(data ?? []).map((r) => r.user_id as string).filter((id) => !demo.has(id)));
    if (!data || data.length < 1000) return ids;
  }
}

/** Envía un aviso escrito en el panel a todas las cuentas de SOI o a una. Devuelve cuántas lo recibieron. */
export async function sendBroadcast(input: { title: string; body: string; url: string | null; userId: string | null; adminId: string }) {
  const a = createAdminClient();
  const recipients = input.userId ? [input.userId] : await soiAccounts();
  const { data: b, error } = await a.from('notification_broadcasts').insert({
    title: input.title, body: input.body, url: input.url, audience: input.userId ? 'user' : 'all',
    target_user: input.userId, recipients: recipients.length, created_by: input.adminId,
  }).select('id').single();
  if (error || !b) throw new Error(error?.message ?? 'sin id');
  for (let i = 0; i < recipients.length; i += 500) {
    const rows = recipients.slice(i, i + 500).map((user_id) => ({ user_id, kind: 'admin', title: input.title, body: input.body, url: input.url, broadcast_id: b.id }));
    const { error: e } = await a.from('user_notifications').insert(rows);
    if (e) throw new Error(e.message);
  }
  return recipients.length;
}

/** Lo enviado desde el panel, con cuántas personas ya lo vieron. */
export async function recentBroadcasts(limit = 30) {
  const a = createAdminClient();
  const { data } = await a.from('notification_broadcasts').select('id, title, body, url, audience, recipients, created_at')
    .order('created_at', { ascending: false }).limit(limit);
  const rows = data ?? [];
  const reads = await Promise.all(rows.map((r) => a.from('user_notifications').select('id', { count: 'exact', head: true })
    .eq('broadcast_id', r.id).not('read_at', 'is', null)));
  return rows.map((r, i) => ({
    id: r.id as string, title: r.title as string, body: r.body as string, url: (r.url as string | null) ?? null,
    audience: r.audience as string, recipients: r.recipients as number, read: reads[i]?.count ?? 0, createdAt: r.created_at as string,
  }));
}
