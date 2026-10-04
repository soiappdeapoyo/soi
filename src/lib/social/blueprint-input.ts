import { z } from 'zod';
import { ActionCardSchema, EslabonSchema } from '@/lib/action-card';
import { BLUEPRINT_PRICE_MAX_CENTS, BLUEPRINT_PRICE_MIN_CENTS } from '@/config/creators';

export const BlueprintInput = z.object({
  momentId: z.string().uuid().optional(),
  title: z.string().trim().min(3).max(120),
  objective: z.string().trim().min(3).max(500),
  requiredMinutes: z.number().int().min(1).max(240),
  durationDays: z.number().int().min(1).max(365).default(7),
  difficulty: z.enum(['suave', 'media', 'intensa']).default('suave'),
  eslabon: EslabonSchema.default('accion'),
  targetStates: z.array(z.string().max(30)).max(4).default([]),
  steps: z.array(ActionCardSchema).min(1).max(12),
  source: z.string().trim().min(2).max(200),
  tier: z.enum(['free', 'premium']).default('free'),
  priceCents: z.number().int().min(0).max(BLUEPRINT_PRICE_MAX_CENTS).default(0),
  status: z.enum(['draft', 'published']).default('draft'),
}).refine((b) => (b.tier === 'free' ? b.priceCents === 0 : b.priceCents >= BLUEPRINT_PRICE_MIN_CENTS), {
  message: 'Un Blueprint premium cuesta al menos 1 USD; uno gratuito no tiene precio.',
});

export type BlueprintInputT = z.infer<typeof BlueprintInput>;

export function toRow(b: BlueprintInputT) {
  return {
    moment_id: b.momentId ?? null, title: b.title, objective: b.objective, required_minutes: b.requiredMinutes,
    duration_days: b.durationDays, difficulty: b.difficulty, eslabon: b.eslabon, target_states: b.targetStates,
    steps: b.steps, source: b.source, tier: b.tier, price_cents: b.tier === 'free' ? 0 : b.priceCents, status: b.status,
  };
}

export function textOf(b: BlueprintInputT) {
  return [b.title, b.objective, b.source, ...b.steps.map((s) => `${s.title} ${s.detail ?? ''}`)];
}
