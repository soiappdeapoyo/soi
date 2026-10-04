import { getSessionUser } from '@/lib/supabase/server';

/** Bloquear o desbloquear: corta los mensajes en ambas direcciones y deja de seguirse mutuamente. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  if (id === user.id) return Response.json({ ok: false }, { status: 400 });
  const { data, error } = await supabase.rpc('toggle_block', { p_user: id });
  return Response.json({ ok: !error, blocked: data });
}
