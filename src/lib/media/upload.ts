'use client';

import { createClient } from '@/lib/supabase/client';

export type Bucket = 'post-media' | 'moment-assets' | 'run-media' | 'library';

const MAX_IMAGE_SIDE = 1600;

/**
 * Comprime una imagen en el navegador (lado mayor 1600 px, WebP ~0.82) antes de subirla:
 * menos datos móviles, carga más rápida del feed y sin metadatos EXIF (ubicación) en lo publicado.
 */
export async function compressImage(file: Blob, maxSide = MAX_IMAGE_SIDE, quality = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo procesar la imagen'))), 'image/webp', quality));
}

function extFor(type: string) {
  return ({ 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png', 'audio/webm': 'webm', 'audio/mp4': 'm4a', 'audio/mpeg': 'mp3', 'audio/ogg': 'ogg', 'audio/wav': 'wav', 'application/pdf': 'pdf' } as Record<string, string>)[type] ?? 'bin';
}

/** Sube a <bucket>/<user_id>/<carpeta>/<uuid>.<ext>. Las políticas de Storage solo permiten la carpeta propia. */
export async function uploadMedia(bucket: Bucket, blob: Blob, folder = ''): Promise<{ path: string; publicUrl: string | null }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Inicia sesión para subir archivos.');
  const type = blob.type.split(';')[0] || 'application/octet-stream';
  const path = [user.id, folder, `${crypto.randomUUID()}.${extFor(type)}`].filter(Boolean).join('/');
  const { error } = await supabase.storage.from(bucket).upload(path, blob, { contentType: type, upsert: false });
  if (error) throw new Error(error.message.includes('mime') ? 'Ese tipo de archivo no está permitido.' : error.message.includes('size') ? 'El archivo es demasiado grande.' : 'No se pudo subir el archivo.');
  const publicUrl = bucket === 'run-media' || bucket === 'library' ? null : supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  return { path, publicUrl };
}

/** URL temporal para ver un archivo privado propio (run-media). */
export async function signedUrl(path: string, seconds = 3600) {
  const { data } = await createClient().storage.from('run-media').createSignedUrl(path, seconds);
  return data?.signedUrl ?? null;
}
