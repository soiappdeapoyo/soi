import { notFound } from 'next/navigation';
import { getSessionUser, createAdminClient } from '@/lib/supabase/server';

/**
 * Administración: solo correos en ADMIN_EMAILS (variable de entorno, separados por coma). Para cualquier otra
 * persona el panel no existe (404), aunque conozca la ruta.
 */
export function isAdminEmail(email: string | null | undefined, list = process.env.ADMIN_EMAILS ?? ''): boolean {
  if (!email) return false;
  const allowed = list.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  return allowed.includes(email.trim().toLowerCase());
}

/** Para páginas del panel: devuelve la persona administradora o 404. */
export async function requireAdmin() {
  const { user } = await getSessionUser();
  if (!user || !isAdminEmail(user.email)) notFound();
  return user;
}

/** Para rutas API del panel: la persona administradora o null (responder 404). */
export async function adminFromRequest() {
  const { user } = await getSessionUser();
  return user && isAdminEmail(user.email) ? user : null;
}

/** Deja constancia de lo que se hizo o se miró en el panel. */
export async function audit(adminId: string, action: string, targetUser: string | null, detail: Record<string, unknown> = {}) {
  await createAdminClient().from('admin_audit').insert({ admin_id: adminId, action: action.slice(0, 60), target_user: targetUser, detail });
}
