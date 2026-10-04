import { z } from 'zod/v3';
import { detectCrisis } from './crisis';
import { objectWithFallback } from './fallback';

export const RouterSchema = z.object({
  agent: z.enum([
    'manifestacion', 'afirmacion', 'meditacion', 'suenos',
    'riqueza', 'rutinas', 'brian_tracy', 'evidencias',
    'anti_sycophant', 'crisis',
  ]),
  confidence: z.number().min(0).max(1),
  emotionalTone: z.enum(['positivo', 'neutral', 'negativo', 'crisis']),
  weakestLink: z.enum(['pensamiento', 'emocion', 'accion', 'resultado']).optional()
    .describe('Eslabón SOI que parece estar roto en este momento'),
  suggestedRoutine: z.enum([
    'brian_tracy_5min', 'miracle_morning', 'five_am_club',
    'dispenza_protocol', 'neville_sats', 'none',
  ]).default('none'),
});

export type RouterResult = z.infer<typeof RouterSchema>;

export async function classifyIntent(message: string, history: string[] = []): Promise<RouterResult> {
  // Atajo determinista: la crisis nunca depende del LLM.
  if (detectCrisis(message)) {
    return { agent: 'crisis', confidence: 1, emotionalTone: 'crisis', suggestedRoutine: 'none' };
  }
  try {
    const { object } = await objectWithFallback({
      schema: RouterSchema,
      instructions: `Clasificas mensajes en SOI, una app de manifestación y rutinas.
Aplicas el principio: pensamientos → emociones → acciones → resultados.
Detecta el eslabón más débil y elige el agente adecuado:
pensamiento→afirmacion/manifestacion, emocion→meditacion/suenos, accion→rutinas/brian_tracy/riqueza, resultado→evidencias.
Si el usuario pide validación sin acción o se contradice, usa anti_sycophant.
Si hay ideación suicida, autolesión o violencia: agent='crisis' sin excepción.`,
      prompt: `Historial reciente:\n${history.slice(-4).join('\n')}\n\nMensaje: ${message}`,
      timeoutMs: 12_000,
    });
    return object;
  } catch {
    return { agent: 'anti_sycophant', confidence: 0, emotionalTone: 'neutral', suggestedRoutine: 'none' };
  }
}
