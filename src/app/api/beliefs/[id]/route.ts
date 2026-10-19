import { z } from 'zod/v3';
import { getSessionUser } from '@/lib/supabase/server';
import { setReplacement } from '@/lib/beliefs-server';

const Body = z.object({ next: z.string().trim().min(4).max(160) });

/** Cambiar la creencia nueva (con sus palabras). */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !z.string().uuid().safeParse(id).success) return Response.json({ ok: false }, { status: 400 });
  return Response.json({ ok: await setReplacement(supabase, user.id, id, parsed.data.next) });
}
