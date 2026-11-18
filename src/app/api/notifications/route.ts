import { z } from 'zod';
import { getSessionUser } from '@/lib/supabase/server';
import { listNotifications, markNotificationsRead } from '@/lib/notifications-server';

/** La campanita: los avisos de la persona (los más recientes primero). */
export async function GET() {
  const { user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const items = await listNotifications(user.id);
  return Response.json({ items, unread: items.filter((i) => !i.read).length });
}

const Body = z.object({ ids: z.array(z.string().uuid()).max(50).optional() });

/** Marca como vistos (todos o los indicados). */
export async function POST(req: Request) {
  const { user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return new Response('Datos inválidos', { status: 400 });
  await markNotificationsRead(user.id, parsed.data.ids);
  return Response.json({ ok: true });
}
