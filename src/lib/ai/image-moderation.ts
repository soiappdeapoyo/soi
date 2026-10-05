import { generateText, Output } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod/v3';
import { MODELS, hasKey } from './models';

const ImageVerdict = z.object({
  allowed: z.boolean(),
  reason: z.enum(['ok', 'sexual', 'violencia', 'autolesion', 'odio', 'venta', 'datos_personales', 'otro']),
});
export type ImageVerdict = z.infer<typeof ImageVerdict>;

/**
 * Reduce la imagen (lado mayor 768 px, JPEG) antes de revisarla: una portada PNG de 3 MB desde Safari
 * tardaba demasiado y la revisión se agotaba. Si sharp no está disponible, se envía la original.
 */
export async function prepareForModeration(bytes: Uint8Array, mediaType: string): Promise<{ data: Uint8Array; mediaType: string }> {
  try {
    const sharp = (await import('sharp')).default;
    const out = await sharp(bytes).rotate().resize({ width: 768, height: 768, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
    return { data: new Uint8Array(out), mediaType: 'image/jpeg' };
  } catch {
    return { data: bytes, mediaType };
  }
}

/**
 * Moderación de imágenes con Gemini (visión). Devuelve null si no se pudo revisar: quien llama decide
 * (lo público falla en cerrado; una portada privada se guarda igual).
 */
export async function moderateImage(bytes: Uint8Array, mediaType: string): Promise<ImageVerdict | null> {
  if (!hasKey('gemini')) return null;
  try {
    const img = await prepareForModeration(bytes, mediaType);
    const { output } = await generateText({
      model: google(MODELS.gemini),
      output: Output.object({ schema: ImageVerdict }),
      maxRetries: 1,
      abortSignal: AbortSignal.timeout(25_000),
      instructions: `Moderas imágenes de una comunidad de bienestar personal en español (puede haber menores).
Rechaza: desnudos o contenido sexual, violencia o sangre, autolesiones, símbolos de odio, publicidad o venta de productos,
capturas con datos personales visibles (teléfonos, direcciones, documentos). Permite: fotos cotidianas, naturaleza, escritura a mano,
dibujos, comida, deporte, lugares, libros, personas vestidas.`,
      messages: [{ role: 'user', content: [
        { type: 'text', text: '¿Esta imagen se puede publicar?' },
        { type: 'file', mediaType: img.mediaType, data: img.data },
      ] }],
    });
    return output as ImageVerdict;
  } catch (e) {
    console.error('[moderation:image]', e);
    return null;
  }
}

export const IMAGE_REASON_COPY: Record<ImageVerdict['reason'], string> = {
  ok: '',
  sexual: 'Esa imagen no se puede publicar en SOI.',
  violencia: 'Esa imagen muestra violencia y no se puede publicar.',
  autolesion: 'Notamos que puedes estar pasando por un momento difícil. Escríbele a SOI en el chat: ahí tienes líneas de ayuda.',
  odio: 'Esa imagen no cumple las reglas de la comunidad.',
  venta: 'En Impulso no se permiten ventas ni publicidad.',
  datos_personales: 'La imagen muestra datos personales. Quítalos para cuidarte.',
  otro: 'Esa imagen no cumple las reglas de la comunidad.',
};
