import { z } from 'zod/v3';
import { MomentKindSchema, parseBlocks } from '@/config/actions';
import { EslabonSchema } from '@/lib/action-card';
import { BLUEPRINT_PRICE_MAX_CENTS, BLUEPRINT_PRICE_MIN_CENTS } from '@/config/creators';

export const MomentInput = z.object({
  title: z.string().trim().min(3).max(120),
  objective: z.string().trim().min(3).max(500),
  kind: MomentKindSchema.default('growth'),
  eslabon: EslabonSchema.default('accion'),
  source: z.string().trim().min(2).max(200),
  blocks: z.array(z.unknown()).min(1).max(20),
  status: z.enum(['private', 'draft', 'published']).default('private'),
  tier: z.enum(['free', 'premium']).default('free'),
  priceCents: z.number().int().min(0).max(BLUEPRINT_PRICE_MAX_CENTS).default(0),
  durationDays: z.number().int().min(1).max(365).default(1),
}).refine((m) => (m.tier === 'free' ? m.priceCents === 0 : m.priceCents >= BLUEPRINT_PRICE_MIN_CENTS), {
  message: 'Un Moment premium cuesta al menos 1 USD; uno gratuito no tiene precio.',
});

/** Valida bloques del catálogo. Devuelve un mensaje legible si alguno no es válido. */
export function validBlocks(raw: unknown[]) {
  const { blocks, errors } = parseBlocks(raw);
  if (errors.length || !blocks.length) return { blocks: null, message: errors[0] ?? 'Agrega al menos una acción.' };
  return { blocks, message: null };
}

export function textOfBlocks(blocks: { title: string; config: Record<string, unknown> }[]) {
  return blocks.map((b) => `${b.title} ${Object.values(b.config).filter((v) => typeof v === 'string').join(' ')}`);
}

export function dbError(message: string) {
  if (message.includes('fork_of_premium')) return Response.json({ ok: false, message: 'Un Moment basado en uno premium no se puede publicar.' }, { status: 409 });
  if (message.includes('row-level security')) return Response.json({ ok: false, message: 'Para publicar necesitas un perfil de creador.' }, { status: 403 });
  return Response.json({ ok: false, message: 'No se pudo guardar el Moment.' }, { status: 500 });
}
