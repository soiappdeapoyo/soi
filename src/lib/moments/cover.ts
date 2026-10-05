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
    await admin.storage.from('moment-assets').remove([path]);
    return { status: 'blocked', message: IMAGE_REASON_COPY[verdict.reason] || 'Esa imagen no cumple las reglas de la comunidad.' };
  }
  return { status: 'ok' };
}
