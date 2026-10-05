import { z } from 'zod/v3';
import { getSessionUser, createAdminClient } from '@/lib/supabase/server';
import { isUserCover, reviewCover } from '@/lib/moments/cover';
import { MomentKindSchema } from '@/config/actions';
import { validBlocks, textOfBlocks, dbError } from '@/lib/moments/input';
import { moderateFields } from '@/lib/social/guard';
import { ownsDocuments, publishDocuments } from '@/lib/moments/library-blocks';
import type { ActionBlock } from '@/config/actions';

export const maxDuration = 60;

const Patch = z.object({
  title: z.string().trim().min(3).max(120).optional(),
  objective: z.string().trim().min(3).max(500).optional(),
  kind: MomentKindSchema.optional(),
  blocks: z.array(z.unknown()).min(1).max(20).optional(),
  status: z.enum(['private', 'draft', 'published', 'archived']).optional(),
  durationDays: z.number().int().min(1).max(365).optional(),
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
    if (!(await ownsDocuments(user.id, blocks))) return Response.json({ ok: false, message: 'Solo puedes usar documentos de tu biblioteca.' }, { status: 403 });
  }
  if (p.status === 'published') {
    // Lo publicado se ve en Impulso: la portada subida por la persona debe pasar la moderación.
    const { data: cov } = await supabase.from('soi_blueprints').select('cover_path').eq('id', id).eq('creator_id', user.id).maybeSingle();
    if (isUserCover(cov?.cover_path as string | null)) {
      const review = await reviewCover(cov!.cover_path as string);
      if (review.status === 'unavailable') return Response.json({ ok: false, message: 'No pudimos revisar la portada ahora. Intenta publicar en un momento.' }, { status: 503 });
      if (review.status === 'blocked' || review.status === 'missing') {
        await createAdminClient().from('soi_blueprints').update({ cover_path: null }).eq('id', id).eq('creator_id', user.id);
        if (review.status === 'blocked') return Response.json({ ok: false, message: `${review.message} Quitamos la portada; puedes publicar sin ella o elegir otra.` }, { status: 422 });
      }
    }
    const { data: full } = await supabase.rpc('get_moment_blocks', { p_id: id });
    // Documentos privados de la biblioteca → copia pública del Moment.
    const pub = await publishDocuments(user.id, (blocks ?? full ?? []) as ActionBlock[]);
    if (pub.error) return Response.json({ ok: false, message: pub.error }, { status: 400 });
    if (pub.changed) blocks = pub.blocks;
    const blocked = await moderateFields([p.title ?? current.title, p.objective ?? current.objective, current.source,
      ...textOfBlocks((blocks ?? full ?? []) as { title: string; config: Record<string, unknown> }[])]);
    if (blocked) return blocked;
  }

  const { error } = await supabase.from('soi_blueprints').update({
    ...(p.title ? { title: p.title } : {}), ...(p.objective ? { objective: p.objective } : {}),
    ...(p.kind ? { kind: p.kind } : {}), ...(blocks ? { blocks } : {}), ...(p.status ? { status: p.status } : {}),
    ...(p.durationDays ? { duration_days: p.durationDays } : {}),
    updated_at: new Date().toISOString(),
  }).eq('id', id).eq('creator_id', user.id);
  if (error) return dbError(error.message);
  return Response.json({ ok: true });
}
