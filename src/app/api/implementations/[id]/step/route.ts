import { z } from 'zod';
import { getSessionUser } from '@/lib/supabase/server';
import { rpcError } from '@/lib/social/guard';
import { recordMomentum } from '@/lib/momentum-server';

const Body = z.union([
  z.object({ step: z.number().int().min(0).max(50) }),
  z.object({ resultNote: z.string().trim().min(3).max(1000) }),
]);

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return new Response('Datos inválidos', { status: 400 });

  if ('resultNote' in parsed.data) {
    const { error } = await supabase.rpc('set_implementation_result', { p_implementation_id: id, p_note: parsed.data.resultNote });
    if (error) return rpcError(error.message);
    await recordMomentum(supabase, user.id, 'evidence_saved', { eslabon: 'resultado', metadata: { implementation_id: id } });
    return Response.json({ ok: true });
  }

  const { data, error } = await supabase.rpc('toggle_implementation_step', { p_implementation_id: id, p_step: parsed.data.step });
  if (error) return rpcError(error.message);
  const r = data as { completed_steps: number[]; total: number; completed: boolean; added: boolean };
  if (r.added) await recordMomentum(supabase, user.id, r.completed ? 'blueprint_completed' : 'blueprint_step', { metadata: { implementation_id: id } });
  return Response.json({ ok: true, ...r });
}
