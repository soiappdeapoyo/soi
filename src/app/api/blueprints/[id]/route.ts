import { z } from 'zod';
import { getSessionUser } from '@/lib/supabase/server';
import { moderateFields } from '@/lib/social/guard';
import type { ActionCard } from '@/types/database';

const Patch = z.object({ status: z.enum(['draft', 'published', 'archived']) });

/** Publicar, despublicar o archivar. Archivar conserva las implementaciones y compras existentes. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const parsed = Patch.safeParse(await req.json());
  if (!parsed.success) return new Response('Datos inválidos', { status: 400 });

  const { data: bp } = await supabase.from('soi_blueprints').select('title, objective, source, steps')
    .eq('id', id).eq('creator_id', user.id).maybeSingle();
  if (!bp) return Response.json({ ok: false, message: 'No encontrado.' }, { status: 404 });

  if (parsed.data.status === 'published') {
    const steps = (bp.steps as ActionCard[]) ?? [];
    const blocked = await moderateFields([bp.title, bp.objective, bp.source, ...steps.map((s) => `${s.title} ${s.detail ?? ''}`)]);
    if (blocked) return blocked;
  }
  const { error } = await supabase.from('soi_blueprints')
    .update({ status: parsed.data.status, updated_at: new Date().toISOString() }).eq('id', id).eq('creator_id', user.id);
  return Response.json({ ok: !error });
}
