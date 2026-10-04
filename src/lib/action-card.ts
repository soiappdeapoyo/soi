import { z } from 'zod/v3';

export const EslabonSchema = z.enum(['pensamiento', 'emocion', 'accion', 'resultado']);

export const ActionCardSchema = z.object({
  title: z.string().trim().min(3).max(120),
  minutes: z.number().int().min(1).max(240),
  detail: z.string().trim().max(400).optional(),
  eslabon: EslabonSchema.optional(),
});

export const ActionCardsSchema = z.array(ActionCardSchema).max(12);
