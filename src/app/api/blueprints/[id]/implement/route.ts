import { z } from 'zod';
import { getSessionUser } from '@/lib/supabase/server';
import { canAccess, getProfile } from '@/lib/billing/check-access';
import { adaptBlueprint } from '@/lib/social/adapt';
import { rpcError } from '@/lib/social/guard';
import { recordMomentum } from '@/lib/momentum-server';
import { remember } from '@/lib/ai/rag';
import type { SoiBlueprint } from '@/types/database';

const Body = z.object({ minutes: z.number().int().min(1).max(240), context: z.string().trim().max(300).optional() });

/** "Implementar": la interacción más importante. Adapta el Blueprint y lo agrega a tu SOI. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return new Response('Datos inválidos', { status: 400 });

  const { data: bp } = await supabase.from('soi_blueprints').select('*').eq('id', id).maybeSingle();
  if (!bp) return Response.json({ ok: false, message: 'No encontrado.' }, { status: 404 });
  const blueprint = bp as SoiBlueprint;

  // Gratis: ejecutar rutinas (SOI+/prueba). Premium: lo que se compró se puede usar en cualquier plan.
  if (blueprint.tier === 'free' && blueprint.creator_id !== user.id && !(await canAccess(user.id, 'routine_execution')).allowed) {
    return Response.json({ ok: false, message: 'Implementar Blueprints es parte de SOI+.' }, { status: 402 });
  }
  if (blueprint.tier === 'premium' && blueprint.creator_id !== user.id) {
    const { data: bought } = await supabase.from('blueprint_purchases').select('id').eq('blueprint_id', id).eq('user_id', user.id).maybeSingle();
    if (!bought) return Response.json({ ok: false, message: 'Este Blueprint es premium.', purchase: true }, { status: 402 });
  }

  const profile = await getProfile(user.id);
  const adapted = await adaptBlueprint(blueprint, profile, parsed.data.minutes, parsed.data.context);
  const { data: implId, error } = await supabase.rpc('implement_blueprint', {
    p_blueprint_id: id, p_adapted_steps: adapted.steps, p_adapted_minutes: adapted.minutes, p_note: adapted.note,
  });
  if (error) return rpcError(error.message);

  // Grafo de conocimiento: el sistema implementado entra a la memoria transversal como acción en progreso.
  await remember(supabase, {
    user_id: user.id, category: 'accion', title: `Blueprint: ${blueprint.title}`, content: blueprint.objective,
    tags: ['blueprint'], status: 'en_progreso', metadata: { eslabon_soi: blueprint.eslabon, blueprint_id: id, implementation_id: implId },
  });
  await recordMomentum(supabase, user.id, 'blueprint_implemented', { eslabon: blueprint.eslabon, metadata: { blueprint_id: id } });
  return Response.json({ ok: true, id: implId, note: adapted.note });
}
