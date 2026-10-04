import { getSessionUser } from '@/lib/supabase/server';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const { error } = await supabase.rpc('mark_dm_read', { p_thread: id });
  return Response.json({ ok: !error });
}
