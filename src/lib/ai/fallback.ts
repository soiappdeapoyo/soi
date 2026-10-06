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

/** Proveedores con clave, en el orden pedido. */
function configuredProviders(order: ProviderName[]) {
  return order.map((n) => ALL_PROVIDERS.find((p) => p.name === n)!).filter((p) => hasKey(p.name));
}

// Proveedor sano cacheado 5 min, por orden (el del chat no se mezcla con el de las tareas). En producción: Upstash / Vercel KV.
const cachedProvider = new Map<string, { name: ProviderName; until: number }>();

export function describeError(error: unknown) {
  const e = error as { statusCode?: number; status?: number; message?: string; responseBody?: string };
  const status = e?.statusCode ?? e?.status;
  const body = typeof e?.responseBody === 'string' ? ` ${e.responseBody.slice(0, 300)}` : '';
  return `${status ?? 'sin status'} ${e?.message ?? String(error)}${body}`;
}

function logFailure(provider: ProviderName, error: unknown) {
  console.error(`[ai] proveedor ${provider} (${MODELS[provider]}) falló: ${describeError(error)}`);
}

async function healthCheck(p: Provider): Promise<boolean> {
  try {
    // Sin reintentos: si el tiempo se agota durante la espera de un reintento solo veríamos "Delay was aborted".
    await generateText({ model: p.model(), prompt: 'ok', maxOutputTokens: 64, maxRetries: 0, abortSignal: AbortSignal.timeout(10_000) });
    return true;
  } catch (error) {
    logFailure(p.name, error);
    return false;
  }
}

async function orderedProviders(order: ProviderName[] = TASK_ORDER): Promise<Provider[]> {
  const providers = configuredProviders(order);
  const key = order.join(',');
  if (!providers.length) {
    console.error('[ai] no hay proveedores configurados: define GOOGLE_GENERATIVE_AI_API_KEY, GROQ_API_KEY o DEEPSEEK_API_KEY');
    return [];
  }
  const cached = cachedProvider.get(key);
  if (cached && cached.until > Date.now()) {
    // El sano va primero, pero los demás siguen como respaldo (antes se descartaban).
    const idx = providers.findIndex((p) => p.name === cached.name);
    if (idx >= 0) return [...providers.slice(idx), ...providers.slice(0, idx)];
  }
  for (let i = 0; i < providers.length; i++) {
    if (await healthCheck(providers[i]!)) {
      cachedProvider.set(key, { name: providers[i]!.name, until: Date.now() + 5 * 60_000 });
      return [...providers.slice(i), ...providers.slice(0, i)];
    }
  }
  return providers;
}

function forget(provider: ProviderName) {
  for (const [key, c] of cachedProvider) if (c.name === provider) cachedProvider.delete(key);
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
}): Promise<{ object: z.infer<T>; provider: ProviderName }> {
  const attempts: { provider: ProviderName; error: string }[] = [];
  for (const provider of await orderedProviders(TASK_ORDER)) {
    try {
      const { output } = await generateText({
        model: provider.model(),
        output: Output.object({ schema: opts.schema }),
        instructions: opts.instructions,
        prompt: opts.prompt,
        providerOptions: PROVIDER_OPTIONS,
        // Con tiempo límite, sin reintentos: si un proveedor no responde, pasamos al siguiente.
        ...(opts.timeoutMs ? { maxRetries: 0, abortSignal: AbortSignal.timeout(opts.timeoutMs) } : {}),
      });
      return { object: output as z.infer<T>, provider: provider.name };
    } catch (error) {
      logFailure(provider.name, error);
      attempts.push({ provider: provider.name, error: describeError(error) });
    }
  }
  throw new AllProvidersFailedError(attempts);
}
