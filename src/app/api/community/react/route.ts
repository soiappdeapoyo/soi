import { z } from 'zod';
import { getSessionUser } from '@/lib/supabase/server';
import { canAccess } from '@/lib/billing/check-access';

const Body = z.object({ postId: z.string().uuid(), reaction: z.enum(['amen', 'fuerza', 'gracias', 'corazon']) });

export async function POST(req: Request) {
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  if (!(await canAccess(user.id, 'community')).allowed) return new Response('SOI+ requerido', { status: 402 });
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return new Response('Datos inválidos', { status: 400 });
  const { data, error } = await supabase.rpc('toggle_reaction', { p_post_id: parsed.data.postId, p_reaction: parsed.data.reaction });
  if (error) return Response.json({ ok: false }, { status: 500 });
  return Response.json({ ok: true, reactions: data });
}
