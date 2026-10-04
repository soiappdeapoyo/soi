import { z } from 'zod';
import { getSessionUser } from '@/lib/supabase/server';
import { canAccess } from '@/lib/billing/check-access';
import { rpcError } from '@/lib/social/guard';

const Body = z.object({ kind: z.enum(['resonance', 'save']) });

/** Resonancia ("Esto me ayudó") y Guardar para implementar. Sin likes de vanidad. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  if (!(await canAccess(user.id, 'community')).allowed) return new Response('SOI+ requerido', { status: 402 });
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return new Response('Datos inválidos', { status: 400 });
  const { data, error } = await supabase.rpc('toggle_moment_interaction', { p_moment_id: id, p_kind: parsed.data.kind });
  if (error) return rpcError(error.message);
  return Response.json({ ok: true, ...(data as object) });
}
