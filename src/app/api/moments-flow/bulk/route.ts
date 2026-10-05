import { z } from 'zod/v3';
import { getSessionUser } from '@/lib/supabase/server';

const Body = z.object({
  action: z.enum(['archive', 'restore']),
  items: z.array(z.object({ id: z.string().uuid(), status: z.enum(['private', 'draft', 'published']).optional() })).min(1).max(100),
});

/**
 * Eliminar Moments propios desde Mi Vida (uno o varios). Se archivan: desaparecen de tu colección e Impulso,
 * pero tu historial de ejecuciones y las compras de otras personas se conservan. "Deshacer" los restaura.
 */
export async function POST(req: Request) {
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return Response.json({ ok: false, message: 'Datos inválidos.' }, { status: 400 });
  const { action, items } = parsed.data;
  const ids = items.map((i) => i.id);

  if (action === 'archive') {
    const { data: prev } = await supabase.from('soi_blueprints').select('id, status').eq('creator_id', user.id).in('id', ids).neq('status', 'archived');
    const own = (prev ?? []) as { id: string; status: 'private' | 'draft' | 'published' }[];
    if (!own.length) return Response.json({ ok: false, message: 'No encontramos esos Moments.' }, { status: 404 });
    const { error } = await supabase.from('soi_blueprints').update({ status: 'archived', updated_at: new Date().toISOString() }).eq('creator_id', user.id).in('id', own.map((o) => o.id));
    if (error) return Response.json({ ok: false, message: 'No se pudieron eliminar.' }, { status: 500 });
    return Response.json({ ok: true, archived: own });
  }

  // Restaurar al estado anterior (publicar de nuevo exige perfil de creador: lo aplica RLS).
  let restored = 0;
  for (const it of items) {
    const { error } = await supabase.from('soi_blueprints').update({ status: it.status ?? 'private', updated_at: new Date().toISOString() })
      .eq('id', it.id).eq('creator_id', user.id).eq('status', 'archived');
    if (!error) restored++;
  }
  return Response.json({ ok: restored > 0, restored });
}
