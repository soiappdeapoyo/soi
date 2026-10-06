import { z } from 'zod/v3';
import { objectWithFallback } from './fallback';
import { detectCrisis } from './crisis';

const LINK = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|io|app|mx|co|es|ly|me)\b)/i;
const SALES = /(vendo|compra(lo|r)? ya|precio|descuento|promo|whats?app|inbox|dm me|link en (mi )?bio)/i;

const ModerationSchema = z.object({
  allowed: z.boolean(),
  reason: z.enum(['ok', 'venta', 'link', 'consejo_medico', 'odio', 'acoso', 'sexual', 'spam', 'crisis']),
});

export type ModerationResult = z.infer<typeof ModerationSchema>;

/** Filtros duros sin IA (rápidos, para mensajes directos): enlaces y ventas. */
export function hardFilter(content: string): 'link' | 'venta' | null {
  if (LINK.test(content)) return 'link';
  if (SALES.test(content)) return 'venta';
  return null;
}

/** Contacto fuera de SOI (en perfiles de creador lo único que se bloquea del lado comercial). */
const OFF_PLATFORM = /(whats?app|telegram|inbox|dm me|escr[ií]beme (al|por)|link en (mi )?bio|\+?\d[\d\s-]{8,}\d)/i;

/**
 * Contexto: `community` (publicaciones, Ideas, Moments compartidos) o `creator` (perfil de creador y Moments que
 * publica). Presentarse, contar su método y su experiencia NO es autopromoción: es justo lo que un perfil de creador
 * debe hacer. Lo que se vende, se vende dentro de SOI; se bloquea sacar a la gente de SOI (enlaces, contacto) y lo médico.
 */
export type ModerationContext = 'community' | 'creator';

/** Regla dura: nada de ventas, links externos, ni consejos médicos. */
export async function moderatePost(content: string, context: ModerationContext = 'community'): Promise<ModerationResult> {
  if (detectCrisis(content)) return { allowed: false, reason: 'crisis' };
  if (LINK.test(content)) return { allowed: false, reason: 'link' };
  if (context === 'creator' ? OFF_PLATFORM.test(content) : SALES.test(content)) return { allowed: false, reason: 'venta' };
  try {
    const { object } = await objectWithFallback({
      schema: ModerationSchema,
      instructions: context === 'creator'
        ? `Moderas el perfil o el contenido de una persona creadora en una app de bienestar en español. PERMITE que se presente,
cuente su experiencia, su método, sus credenciales y a quién acompaña (eso no es autopromoción). Rechaza solo: invitar a
contactar o comprar FUERA de la app (WhatsApp, teléfono, redes, "escríbeme"), links, promesas de curación o consejos médicos
(dosis, medicamentos, diagnósticos, dejar tratamientos), odio, acoso, contenido sexual, spam.`
        : `Moderas una comunidad de bienestar en español. Rechaza: ventas o autopromoción, links, consejos médicos
(dosis, medicamentos, diagnósticos, dejar tratamientos), odio, acoso, contenido sexual, spam. Permite testimonios, peticiones de apoyo y preguntas sobre prácticas.`,
      prompt: content.slice(0, 2000),
    });
    return object;
  } catch {
    // Si la IA no responde, publicamos (ya pasó filtros duros) y queda pendiente de revisión.
    return { allowed: true, reason: 'ok' };
  }
}

/** Mensajes visibles cuando un contenido no pasa la moderación. */
export const MODERATION_COPY: Record<string, string> = {
  link: 'En la comunidad no se permiten enlaces externos.',
  venta: 'En la comunidad no se permiten ventas ni autopromoción.',
  venta_creator: 'Tu trabajo se ofrece dentro de SOI: quita las invitaciones a contactarte o comprar fuera de la app (WhatsApp, teléfono, «escríbeme»).',
  consejo_medico: 'No compartimos consejos médicos. Consulta a un profesional de salud.',
  crisis: 'Notamos que puedes estar pasando por un momento difícil. Escríbele a SOI en el chat: ahí tienes líneas de ayuda.',
};
