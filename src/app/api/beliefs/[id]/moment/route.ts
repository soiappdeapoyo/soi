import { z } from 'zod/v3';
import { getSessionUser } from '@/lib/supabase/server';
import { ensureBeliefMoment } from '@/lib/beliefs-server';

/** El Moment para practicar una creencia (se crea la primera vez; después, el mismo). */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  if (!z.string().uuid().safeParse(id).success) return Response.json({ ok: false }, { status: 400 });
  const momentId = await ensureBeliefMoment(supabase, user.id, id);
  return momentId ? Response.json({ ok: true, id: momentId }) : Response.json({ ok: false }, { status: 404 });
}
