import {
  streamText,
  generateText,
  Output,
  isStepCount,
  type ModelMessage,
  type LanguageModel,
  type ToolSet,
} from 'ai';
import { google } from '@ai-sdk/google';
import { groq } from '@ai-sdk/groq';
import { createDeepSeek } from '@ai-sdk/deepseek';
import type { z } from 'zod/v3';
import { MODELS, hasKey } from './models';
import { relaxTools } from './relax-schema';

/**
 * Groq en modo estricto exige que todo campo del esquema sea obligatorio (rompe los `.optional()`/`.default()`).
 * Sin modo estricto respeta el esquema igual y validamos con zod del lado del servidor.
 */
const PROVIDER_OPTIONS = { groq: { strictJsonSchema: false } };

export type ProviderName = 'gemini' | 'groq' | 'deepseek';
type Provider = { name: ProviderName; model: () => LanguageModel };

const ALL_PROVIDERS: Provider[] = [
  { name: 'gemini', model: () => google(MODELS.gemini) },
  { name: 'groq', model: () => groq(MODELS.groq) },
  { name: 'deepseek', model: () => createDeepSeek({ apiKey: process.env.DEEPSEEK_API_KEY ?? '' })(MODELS.deepseek) },
];

const NAMES: ProviderName[] = ['gemini', 'groq', 'deepseek'];

/** Orden de la cascada desde una variable ("deepseek,gemini,groq"); lo que falte se agrega al final. */
export function parseOrder(value: string | undefined, fallback: ProviderName[]): ProviderName[] {
  const listed = (value ?? '').split(',').map((x) => x.trim()).filter((x): x is ProviderName => (NAMES as string[]).includes(x));
  const base = listed.length ? listed : fallback;
  return [...new Set([...base, ...NAMES])];
}

/** Chat: DeepSeek primero (más económico). Tareas estructuradas (router, contenido, moderación): Gemini primero. */
export const CHAT_ORDER = parseOrder(process.env.AI_CHAT_ORDER, ['deepseek', 'gemini', 'groq']);
export const TASK_ORDER = parseOrder(process.env.AI_TASK_ORDER, ['gemini', 'groq', 'deepseek']);
/** Clasificaciones cortas que bloquean la respuesta (router): el proveedor más rápido primero. */
export const FAST_ORDER = parseOrder(process.env.AI_FAST_ORDER, ['groq', 'deepseek', 'gemini']);

/** Proveedores con clave, en el orden pedido. */
function configuredProviders(order: ProviderName[]) {
  return order.map((n) => ALL_PROVIDERS.find((p) => p.name === n)!).filter((p) => hasKey(p.name));
}


export function describeError(error: unknown) {
  const e = error as { statusCode?: number; status?: number; message?: string; responseBody?: string };
  const status = e?.statusCode ?? e?.status;
  const body = typeof e?.responseBody === 'string' ? ` ${e.responseBody.slice(0, 300)}` : '';
  return `${status ?? 'sin status'} ${e?.message ?? String(error)}${body}`;
}

function logFailure(provider: ProviderName, error: unknown) {
  console.error(`[ai] proveedor ${provider} (${MODELS[provider]}) falló: ${describeError(error)}`);
}

// Sin "prueba de salud" previa (era un viaje extra antes de responder): se intenta directo y, si un proveedor
// falló hace poco, pasa al final de la fila durante 2 minutos. Los fallos igual caen al siguiente (firstPartIsError).
const recentFailure = new Map<ProviderName, number>();
const FAILURE_TTL = 2 * 60_000;

async function orderedProviders(order: ProviderName[] = TASK_ORDER): Promise<Provider[]> {
  const providers = configuredProviders(order);
  if (!providers.length) {
    console.error('[ai] no hay proveedores configurados: define GOOGLE_GENERATIVE_AI_API_KEY, GROQ_API_KEY o DEEPSEEK_API_KEY');
    return [];
  }
  const failed = (p: Provider) => (recentFailure.get(p.name) ?? 0) > Date.now();
  return [...providers.filter((p) => !failed(p)), ...providers.filter(failed)];
}

function forget(provider: ProviderName) {
  recentFailure.set(provider, Date.now() + FAILURE_TTL);
}

export class AllProvidersFailedError extends Error {
  constructor(public readonly attempts: { provider: ProviderName; error: string }[]) {
    super(attempts.length
      ? `Todos los proveedores fallaron: ${attempts.map((a) => `${a.provider} → ${a.error}`).join(' | ')}`
      : 'No hay proveedores de IA configurados');
    this.name = 'AllProvidersFailedError';
  }
}

type StreamResult = ReturnType<typeof streamText>;

// Partes que indican que el modelo ya respondió (o terminó) sin error.
const CONTENT_PARTS = new Set(['text-start', 'text-delta', 'tool-input-start', 'tool-call', 'tool-result', 'finish-step', 'finish', 'abort']);

/**
 * `streamText` no lanza excepciones: los errores del proveedor llegan como partes `error` del stream.
 * Leemos una copia (`result.stream` crea una copia en cada acceso) hasta la primera parte con contenido:
 * si es un error, probamos el siguiente proveedor antes de responder al cliente.
 */
async function firstPartIsError(result: StreamResult): Promise<unknown | null> {
  const reader = result.stream.getReader();
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) return null;
      if (value.type === 'error') return value.error ?? new Error('stream error');
      if (CONTENT_PARTS.has(value.type)) return null;
    }
  } catch (error) {
    return error;
  } finally {
    reader.cancel().catch(() => {});
  }
}

export type StreamEnd = { text: string; provider: ProviderName; tokens?: number; toolCalls?: unknown; toolResults?: unknown };

export async function streamWithFallback(
  instructions: string,
  messages: ModelMessage[],
  tools?: ToolSet,
  onEnd?: (args: StreamEnd) => Promise<void> | void,
  /** Tope de tokens por respuesta (panel; 0 o ausente = el del proveedor). */
  maxOutputTokens?: number,
) {
  const attempts: { provider: ProviderName; error: string }[] = [];
  for (const provider of await orderedProviders(CHAT_ORDER)) {
    try {
      const result = streamText({
        model: provider.model(),
        instructions,
        messages,
        tools: tools ? relaxTools(tools) : undefined,
        providerOptions: PROVIDER_OPTIONS,
        stopWhen: isStepCount(5),
        ...(maxOutputTokens ? { maxOutputTokens } : {}),
        onError: ({ error }) => {
          logFailure(provider.name, error);
          forget(provider.name);
        },
        onEnd: async ({ text, usage, toolCalls, toolResults }) =>
          onEnd?.({ text, provider: provider.name, tokens: usage?.totalTokens, toolCalls, toolResults }),
      });
      const error = await firstPartIsError(result);
      if (error) {
        attempts.push({ provider: provider.name, error: describeError(error) });
        forget(provider.name);
        continue;
      }
      console.info(`[ai] chat respondido por ${provider.name} (${MODELS[provider.name]})`);
      return { result, provider: provider.name };
    } catch (error: unknown) {
      logFailure(provider.name, error);
      attempts.push({ provider: provider.name, error: describeError(error) });
      forget(provider.name);
      // Cualquier fallo de un proveedor (incluida una clave inválida o un modelo retirado) pasa al siguiente.
    }
  }
  throw new AllProvidersFailedError(attempts);
}

/** Prueba cada proveedor configurado con una llamada mínima (para /api/ai/diagnostico). Nunca expone claves. */
export async function diagnoseProviders() {
  return Promise.all(ALL_PROVIDERS.map(async (p) => {
    if (!hasKey(p.name)) return { provider: p.name, model: MODELS[p.name], configured: false, ok: false, error: null as string | null, ms: 0 };
    const t0 = Date.now();
    try {
      await generateText({ model: p.model(), prompt: 'Responde solo: ok', maxOutputTokens: 16, abortSignal: AbortSignal.timeout(12_000) });
      return { provider: p.name, model: MODELS[p.name], configured: true, ok: true, error: null, ms: Date.now() - t0 };
    } catch (error) {
      return { provider: p.name, model: MODELS[p.name], configured: true, ok: false, error: describeError(error).slice(0, 400), ms: Date.now() - t0 };
    }
  }));
}

/** Generación estructurada con cascada (router, onboarding, ritual, análisis, moderación, adaptación). */
export async function objectWithFallback<T extends z.ZodTypeAny>(opts: {
  schema: T; instructions: string; prompt: string; timeoutMs?: number;
  /** Orden de proveedores (por defecto TASK_ORDER; FAST_ORDER para lo que bloquea la respuesta). */
  order?: ProviderName[];
  maxOutputTokens?: number;
}): Promise<{ object: z.infer<T>; provider: ProviderName }> {
  const attempts: { provider: ProviderName; error: string }[] = [];
  for (const provider of await orderedProviders(opts.order ?? TASK_ORDER)) {
    try {
      const { output } = await generateText({
        model: provider.model(),
        output: Output.object({ schema: opts.schema }),
        instructions: opts.instructions,
        prompt: opts.prompt,
        providerOptions: PROVIDER_OPTIONS,
        ...(opts.maxOutputTokens ? { maxOutputTokens: opts.maxOutputTokens } : {}),
        // Con tiempo límite, sin reintentos: si un proveedor no responde, pasamos al siguiente.
        ...(opts.timeoutMs ? { maxRetries: 0, abortSignal: AbortSignal.timeout(opts.timeoutMs) } : {}),
      });
      return { object: output as z.infer<T>, provider: provider.name };
    } catch (error) {
      logFailure(provider.name, error);
      forget(provider.name);
      attempts.push({ provider: provider.name, error: describeError(error) });
    }
  }
  throw new AllProvidersFailedError(attempts);
}
