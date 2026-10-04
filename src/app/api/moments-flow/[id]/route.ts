import { z } from 'zod/v3';
import { getSessionUser } from '@/lib/supabase/server';
import { MomentKindSchema } from '@/config/actions';
import { validBlocks, textOfBlocks, dbError } from '@/lib/moments/input';
import { moderateFields } from '@/lib/social/guard';

const Patch = z.object({
  title: z.string().trim().min(3).max(120).optional(),
  objective: z.string().trim().min(3).max(500).optional(),
  kind: MomentKindSchema.optional(),
  blocks: z.array(z.unknown()).min(1).max(20).optional(),
  status: z.enum(['private', 'draft', 'published', 'archived']).optional(),
});

/** Editar, publicar, despublicar o archivar un Moment propio. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const parsed = Patch.safeParse(await req.json());
  if (!parsed.success) return Response.json({ ok: false, message: 'Datos inválidos.' }, { status: 400 });
  const p = parsed.data;

  const { data: current } = await supabase.from('soi_blueprints').select('title, objective, source').eq('id', id).eq('creator_id', user.id).maybeSingle();
  if (!current) return Response.json({ ok: false, message: 'No encontrado.' }, { status: 404 });

  let blocks;
  if (p.blocks) {
    const v = validBlocks(p.blocks);
    if (!v.blocks) return Response.json({ ok: false, message: v.message }, { status: 400 });
    blocks = v.blocks;
  }
  if (p.status === 'published') {
    const { data: full } = await supabase.rpc('get_moment_blocks', { p_id: id });
    const blocked = await moderateFields([p.title ?? current.title, p.objective ?? current.objective, current.source,
      ...textOfBlocks((blocks ?? full ?? []) as { title: string; config: Record<string, unknown> }[])]);
    if (blocked) return blocked;
  }

  const { error } = await supabase.from('soi_blueprints').update({
    ...(p.title ? { title: p.title } : {}), ...(p.objective ? { objective: p.objective } : {}),
    ...(p.kind ? { kind: p.kind } : {}), ...(blocks ? { blocks } : {}), ...(p.status ? { status: p.status } : {}),
    updated_at: new Date().toISOString(),
  }).eq('id', id).eq('creator_id', user.id);
  if (error) return dbError(error.message);
  return Response.json({ ok: true });
}
