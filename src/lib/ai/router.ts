import { z } from 'zod/v3';
import { detectCrisis } from './crisis';
import { FAST_ORDER, objectWithFallback } from './fallback';

export const RouterSchema = z.object({
  agent: z.enum([
    'manifestacion', 'afirmacion', 'meditacion', 'suenos',
    'riqueza', 'rutinas', 'brian_tracy', 'napoleon_hill', 'james_clear', 'stephen_covey', 'jim_rohn', 'evidencias',
    'anti_sycophant', 'crisis',
  ]),
  confidence: z.number().min(0).max(1),
  emotionalTone: z.enum(['positivo', 'neutral', 'negativo', 'crisis']),
  weakestLink: z.enum(['pensamiento', 'emocion', 'accion', 'resultado']).optional()
    .describe('Eslabón SOI que parece estar roto en este momento'),
  suggestedRoutine: z.enum([
    'brian_tracy_5min', 'miracle_morning', 'five_am_club',
    'dispenza_protocol', 'neville_sats', 'cierre_del_dia', 'none',
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
pensamiento→afirmacion/manifestacion, emocion→meditacion/suenos, accion→rutinas/brian_tracy/james_clear/riqueza, resultado→evidencias.
james_clear cuando quiere crear o dejar un hábito o no logra ser constante, aunque no lo nombre: "quiero empezar a leer/meditar/hacer ejercicio todos los días", "empiezo y a las dos semanas lo dejo", "no soy constante", "quiero dejar el celular/de comer de noche", "¿cómo hago para no fallar?". rutinas es para elegir una rutina de mañana o noche ya hecha.
napoleon_hill (capa de coaching superior) cuando el problema es propósito, logro, decisión, persistencia o empezar a crear riqueza, aunque no lo nombre: "no sé qué quiero hacer con mi vida", "tengo una meta pero no tengo disciplina", "quiero hacerme rico y no sé por dónde empezar", "no dejo de cambiar de objetivo", "ayúdame a decidir", "crea una afirmación para mi objetivo".
stephen_covey cuando el tema son prioridades y valores ("no me alcanza el tiempo para lo importante", "vivo apagando incendios", "no sé qué es lo más importante para mí"), su misión personal, o una relación difícil que quiere manejar mejor ("no me entiendo con mi pareja/mi jefe").
jim_rohn cuando busca una filosofía de vida, perspectiva de largo plazo o disciplina diaria sin un hábito concreto ("siento que mi vida no avanza", "estoy en una mala racha", "quiero ser mejor persona", "cómo dejo de culpar a las circunstancias").
Si el usuario pide validación sin acción o se contradice, usa anti_sycophant.
Si hay ideación suicida, autolesión o violencia: agent='crisis' sin excepción.`,
      prompt: `Historial reciente:\n${history.slice(-4).join('\n')}\n\nMensaje: ${message}`,
      timeoutMs: 10_000,
      // Bloquea la respuesta del chat: el proveedor más rápido primero y salida corta.
      order: FAST_ORDER,
      maxOutputTokens: 400,
    });
    return object;
  } catch {
    return { agent: 'anti_sycophant', confidence: 0, emotionalTone: 'neutral', suggestedRoutine: 'none' };
  }
}
