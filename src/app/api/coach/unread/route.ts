import { getSessionUser } from '@/lib/supabase/server';
import { unreadCount } from '@/lib/coach/proactive-server';

/** Mensajes de SOI sin leer (la burbuja de la pestaña SOI). */
export async function GET() {
  const { supabase, user } = await getSessionUser();
  if (!user) return Response.json({ unread: 0 }, { status: 401 });
  return Response.json({ unread: await unreadCount(supabase, user.id).catch(() => 0) }, { headers: { 'Cache-Control': 'no-store' } });
}
