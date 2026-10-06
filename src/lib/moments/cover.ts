import { createAdminClient } from '@/lib/supabase/server';
import { moderateImage, IMAGE_REASON_COPY } from '@/lib/ai/image-moderation';

export type CoverReview = { status: 'ok' } | { status: 'blocked'; message: string } | { status: 'unavailable' } | { status: 'missing' };

/** ¿Es una portada subida por una persona (Storage) y no una de la app ("/moments/…", "/demo/…")? */
export const isUserCover = (path: string | null | undefined): path is string => Boolean(path && !path.startsWith('/'));

/**
 * Revisa una portada de moment-assets con moderación de imagen.
 * - ok: se puede mostrar a otras personas. - blocked: la moderación la rechazó (se borra).
 * - unavailable: no se pudo revisar ahora (quien llama decide: privado sí, público no).
 */
export async function reviewCover(path: string): Promise<CoverReview> {
  const admin = createAdminClient();
  const { data: file, error } = await admin.storage.from('moment-assets').download(path);
  if (error || !file) return { status: 'missing' };
  const verdict = await moderateImage(new Uint8Array(await file.arrayBuffer()), file.type || 'image/webp');
  if (!verdict) return { status: 'unavailable' };
  if (!verdict.allowed) {
    // Las portadas automáticas (auto/…) son compartidas: no se borran, solo dejan de usarse.
    if (!path.startsWith('auto/')) await admin.storage.from('moment-assets').remove([path]);
    return { status: 'blocked', message: IMAGE_REASON_COPY[verdict.reason] || 'Esa imagen no cumple las reglas de la comunidad.' };
  }
  return { status: 'ok' };
}

/**
 * Imágenes de los bloques "Imagen": solo las propias (moment-assets/<uid>/images/). Al publicar se revisan en
 * estricto (sin revisión no se publica), igual que la portada.
 */
export async function checkBlockImages(userId: string, blocks: { type: string; config: Record<string, unknown> }[], publish: boolean): Promise<Response | null> {
  const paths = blocks.filter((b) => b.type === 'image').map((b) => String(b.config.path ?? ''));
  if (paths.some((p) => !p.startsWith(`${userId}/images/`))) return Response.json({ ok: false, message: 'Usa imágenes que subiste tú.' }, { status: 403 });
  if (!publish) return null;
  for (const p of [...new Set(paths)]) {
    const r = await reviewCover(p);
    if (r.status === 'blocked') return Response.json({ ok: false, message: r.message }, { status: 422 });
    if (r.status === 'missing') return Response.json({ ok: false, message: 'No encontramos una de las imágenes. Súbela de nuevo.' }, { status: 400 });
    if (r.status === 'unavailable') return Response.json({ ok: false, message: 'No pudimos revisar tus imágenes ahora. Intenta publicar en un momento.' }, { status: 503 });
  }
  return null;
}
