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
 * Moderación de imágenes de Impulso con Gemini (visión). Falla en cerrado: si no hay modelo disponible,
 * la imagen no se publica (es una app de bienestar; preferimos pedir que se reintente).
 */
export async function moderateImage(bytes: Uint8Array, mediaType: string): Promise<ImageVerdict | null> {
  if (!hasKey('gemini')) return null;
  try {
    const { output } = await generateText({
      model: google(MODELS.gemini),
      output: Output.object({ schema: ImageVerdict }),
      abortSignal: AbortSignal.timeout(20_000),
      instructions: `Moderas imágenes de una comunidad de bienestar personal en español (puede haber menores).
Rechaza: desnudos o contenido sexual, violencia o sangre, autolesiones, símbolos de odio, publicidad o venta de productos,
capturas con datos personales visibles (teléfonos, direcciones, documentos). Permite: fotos cotidianas, naturaleza, escritura a mano,
dibujos, comida, deporte, lugares, libros, personas vestidas.`,
      messages: [{ role: 'user', content: [
        { type: 'text', text: '¿Esta imagen se puede publicar?' },
        { type: 'file', mediaType, data: bytes },
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
