import { getSessionUser } from '@/lib/supabase/server';
import { canAccess } from '@/lib/billing/check-access';
import { rpcError } from '@/lib/social/guard';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  if (!(await canAccess(user.id, 'community')).allowed) return Response.json({ ok: false, message: 'Interactuar en Impulso es parte de SOI+.' }, { status: 402 });
  const { data, error } = await supabase.rpc('toggle_post_like', { p_post: id });
  if (error) return rpcError(error.message);
  return Response.json({ ok: true, result: data });
}
