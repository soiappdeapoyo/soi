import { z } from 'zod/v3';
import { getSessionUser } from '@/lib/supabase/server';
import { OutcomeBody } from '@/lib/learning';
import { closeLearning } from '@/lib/learning-server';

/** ¿Funcionó? (funcionó, a medias o no lo hizo, y lo que notó). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const parsed = OutcomeBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !z.string().uuid().safeParse(id).success) return Response.json({ ok: false }, { status: 400 });
  return Response.json({ ok: await closeLearning(supabase, user.id, id, parsed.data.outcome, parsed.data.note) });
}
