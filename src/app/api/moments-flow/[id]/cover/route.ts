import { z } from 'zod/v3';
import { getSessionUser, createAdminClient } from '@/lib/supabase/server';
import { reviewCover } from '@/lib/moments/cover';

export const maxDuration = 60;

const Body = z.object({ path: z.string().regex(/^[0-9a-f-]{36}\/cover\/[0-9a-f-]{36}\.(webp|jpg|png)$/).nullable() });

/**
 * Portada de un Moment propio. La imagen ya está en moment-assets (carpeta propia); el cliente no puede
 * escribir cover_path. Privado: se guarda aunque la revisión no responda (solo la ve su dueño) y se rechaza
 * si la moderación la marca. Publicado: exige revisión. Al publicar o compartir se vuelve a revisar. null = quitar.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return Response.json({ ok: false, message: 'Imagen inválida.' }, { status: 400 });
  const { path } = parsed.data;

  const { data: m } = await supabase.from('soi_blueprints').select('id, cover_path, status').eq('id', id).eq('creator_id', user.id).maybeSingle();
  if (!m) return Response.json({ ok: false, message: 'No encontrado.' }, { status: 404 });
  const admin = createAdminClient();

  let reviewed = false;
  if (path) {
    if (!path.startsWith(`${user.id}/`)) return Response.json({ ok: false, message: 'Imagen inválida.' }, { status: 400 });
    const review = await reviewCover(path);
    if (review.status === 'missing') return Response.json({ ok: false, message: 'No encontramos la imagen. Súbela de nuevo.' }, { status: 400 });
    if (review.status === 'blocked') return Response.json({ ok: false, message: review.message }, { status: 422 });
    // Un Moment publicado se ve en Impulso: sin revisión no se cambia su portada.
    if (review.status === 'unavailable' && m.status === 'published') {
      return Response.json({ ok: false, message: 'No pudimos revisar la portada ahora. Intenta de nuevo en un momento.' }, { status: 503 });
    }
    reviewed = review.status === 'ok';
  }

  const { error } = await admin.from('soi_blueprints').update({ cover_path: path }).eq('id', id).eq('creator_id', user.id);
  if (error) return Response.json({ ok: false, message: 'No se pudo guardar la portada.' }, { status: 500 });
  // La portada anterior propia se borra (las de la app y las heredadas de otro no).
  const prev = m.cover_path as string | null;
  if (prev && prev !== path && prev.startsWith(`${user.id}/`)) await admin.storage.from('moment-assets').remove([prev]);
  return Response.json({ ok: true, reviewed });
}
