import { getSessionUser } from '@/lib/supabase/server';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  if (id === user.id) return Response.json({ ok: false }, { status: 400 });
  const { data, error } = await supabase.rpc('toggle_follow', { p_user: id });
  return Response.json({ ok: !error, following: data });
}
