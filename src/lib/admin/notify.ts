import { createAdminClient } from '@/lib/supabase/server';
import { sendPush } from '@/lib/push/send';
import type { PushSubscription } from 'web-push';

/** Correos de administración (ADMIN_EMAILS). */
export function adminEmails(list = process.env.ADMIN_EMAILS ?? ''): string[] {
  return list.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
}

/**
 * Push a los administradores que activaron las notificaciones en la app (Ajustes → Notificaciones).
 * Nunca falla hacia afuera: es un aviso, no parte del flujo de la persona.
 */
export async function notifyAdmins(payload: { title: string; body: string; url?: string }) {
  try {
    const emails = new Set(adminEmails());
    if (!emails.size) return 0;
    const a = createAdminClient();
    const { data } = await a.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const ids = (data?.users ?? []).filter((u) => u.email && emails.has(u.email.toLowerCase())).map((u) => u.id);
    if (!ids.length) return 0;
    const { data: profiles } = await a.from('user_profiles').select('push_subscription').in('user_id', ids).not('push_subscription', 'is', null);
    let sent = 0;
    for (const p of (profiles ?? []) as { push_subscription: PushSubscription }[]) {
      if (await sendPush(p.push_subscription, payload)) sent++;
    }
    return sent;
  } catch (e) {
    console.error('[admin] no se pudo avisar', e instanceof Error ? e.message : e);
    return 0;
  }
}
