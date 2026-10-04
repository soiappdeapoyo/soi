import { getSessionUser } from '@/lib/supabase/server';

/** Borrar un mensaje propio (queda como "Mensaje eliminado"). */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const { error } = await supabase.rpc('delete_dm', { p_message: id });
  return Response.json({ ok: !error });
}
