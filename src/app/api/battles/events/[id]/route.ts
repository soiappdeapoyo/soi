import { getSessionUser } from '@/lib/supabase/server';

/** Borrar un registro que la persona no reconoce (la IA lo registra sola; ella tiene la última palabra). */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const { error } = await supabase.from('enemy_events').delete().eq('id', id).eq('user_id', user.id);
  return Response.json({ ok: !error });
}
