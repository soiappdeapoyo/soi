import { z } from 'zod/v3';
import { getSessionUser, createAdminClient } from '@/lib/supabase/server';
import { moderateImage, IMAGE_REASON_COPY } from '@/lib/ai/image-moderation';

const Body = z.object({ path: z.string().regex(/^[0-9a-f-]{36}\/cover\/[0-9a-f-]{36}\.(webp|jpg|png)$/).nullable() });

/**
 * Portada de un Moment propio. La imagen ya está en moment-assets (carpeta propia); aquí se modera
 * y solo entonces se asigna (el cliente no puede escribir cover_path directamente). null = quitar.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return Response.json({ ok: false, message: 'Imagen inválida.' }, { status: 400 });
  const { path } = parsed.data;

  const { data: m } = await supabase.from('soi_blueprints').select('id, cover_path').eq('id', id).eq('creator_id', user.id).maybeSingle();
  if (!m) return Response.json({ ok: false, message: 'No encontrado.' }, { status: 404 });
  const admin = createAdminClient();

  if (path) {
    if (!path.startsWith(`${user.id}/`)) return Response.json({ ok: false, message: 'Imagen inválida.' }, { status: 400 });
    const { data: file, error } = await admin.storage.from('moment-assets').download(path);
    if (error || !file) return Response.json({ ok: false, message: 'No encontramos la imagen. Súbela de nuevo.' }, { status: 400 });
    const verdict = await moderateImage(new Uint8Array(await file.arrayBuffer()), file.type || 'image/webp');
    if (!verdict) return Response.json({ ok: false, message: 'No pudimos revisar la portada ahora. Intenta de nuevo en un momento.' }, { status: 503 });
    if (!verdict.allowed) {
      await admin.storage.from('moment-assets').remove([path]);
      return Response.json({ ok: false, reason: verdict.reason, message: IMAGE_REASON_COPY[verdict.reason] }, { status: 422 });
    }
  }

  const { error } = await admin.from('soi_blueprints').update({ cover_path: path }).eq('id', id).eq('creator_id', user.id);
  if (error) return Response.json({ ok: false, message: 'No se pudo guardar la portada.' }, { status: 500 });
  // La portada anterior propia se borra (las de la app y las heredadas de otro no).
  const prev = m.cover_path as string | null;
  if (prev && prev !== path && prev.startsWith(`${user.id}/`)) await admin.storage.from('moment-assets').remove([prev]);
  return Response.json({ ok: true });
}
