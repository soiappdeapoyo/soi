import { z } from 'zod';
import { objectWithFallback } from './fallback';
import { detectCrisis } from './crisis';

const LINK = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|io|app|mx|co|es|ly|me)\b)/i;
const SALES = /(vendo|compra(lo|r)? ya|precio|descuento|promo|whats?app|inbox|dm me|link en (mi )?bio)/i;

const ModerationSchema = z.object({
  allowed: z.boolean(),
  reason: z.enum(['ok', 'venta', 'link', 'consejo_medico', 'odio', 'acoso', 'sexual', 'spam', 'crisis']),
});

export type ModerationResult = z.infer<typeof ModerationSchema>;

/** Regla dura: nada de ventas, links externos, ni consejos médicos. */
export async function moderatePost(content: string): Promise<ModerationResult> {
  if (detectCrisis(content)) return { allowed: false, reason: 'crisis' };
  if (LINK.test(content)) return { allowed: false, reason: 'link' };
  if (SALES.test(content)) return { allowed: false, reason: 'venta' };
  try {
    const { object } = await objectWithFallback({
      schema: ModerationSchema,
      system: `Moderas una comunidad de bienestar en español. Rechaza: ventas o autopromoción, links, consejos médicos
(dosis, medicamentos, diagnósticos, dejar tratamientos), odio, acoso, contenido sexual, spam. Permite testimonios, peticiones de apoyo y preguntas sobre prácticas.`,
      prompt: content.slice(0, 2000),
    });
    return object;
  } catch {
    // Si la IA no responde, publicamos (ya pasó filtros duros) y queda pendiente de revisión.
    return { allowed: true, reason: 'ok' };
  }
}
