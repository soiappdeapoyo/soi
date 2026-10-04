import { getSessionUser } from '@/lib/supabase/server';
import { recordMomentum } from '@/lib/momentum-server';
import type { Eslabon } from '@/config/agents';

/** Marca una Action Card como hecha → evidencia de movimiento para el Momentum Score. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });

  const { data, error } = await supabase.from('agent_knowledge')
    .update({ status: 'completado' })
    .eq('id', id).eq('user_id', user.id).eq('category', 'accion').contains('tags', ['action_card']).neq('status', 'completado')
    .select('metadata').maybeSingle();
  if (error) return Response.json({ ok: false }, { status: 500 });
  if (data) {
    const eslabon = ((data.metadata as { eslabon_soi?: Eslabon } | null)?.eslabon_soi) ?? 'accion';
    await recordMomentum(supabase, user.id, 'action_completed', { eslabon, metadata: { action_id: id } });
  }
  return Response.json({ ok: true });
}
