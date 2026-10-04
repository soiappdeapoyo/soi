import { getSessionUser } from '@/lib/supabase/server';
import { MomentInput, validBlocks, textOfBlocks, dbError } from '@/lib/moments/input';
import { moderateFields } from '@/lib/social/guard';

/** Crear un Moment (constructor). Privado por defecto; publicar exige perfil de creador (RLS). */
export async function POST(req: Request) {
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const parsed = MomentInput.safeParse(await req.json());
  if (!parsed.success) return Response.json({ ok: false, message: parsed.error.issues[0]?.message ?? 'Revisa los campos.' }, { status: 400 });
  const m = parsed.data;
  const { blocks, message } = validBlocks(m.blocks);
  if (!blocks) return Response.json({ ok: false, message }, { status: 400 });

  if (m.status === 'published') {
    const blocked = await moderateFields([m.title, m.objective, m.source, ...textOfBlocks(blocks)]);
    if (blocked) return blocked;
  }
  const { data, error } = await supabase.from('soi_blueprints').insert({
    creator_id: user.id, title: m.title, objective: m.objective, kind: m.kind, eslabon: m.eslabon, source: m.source,
    blocks, steps: [], status: m.status, tier: m.tier, price_cents: m.tier === 'premium' ? m.priceCents : 0,
  }).select('id').single();
  if (error) return dbError(error.message);
  return Response.json({ ok: true, id: data.id });
}
