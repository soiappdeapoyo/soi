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

export type ProviderName = 'gemini' | 'groq' | 'deepseek';
type Provider = { name: ProviderName; model: () => LanguageModel };

const ALL_PROVIDERS: Provider[] = [
  { name: 'gemini', model: () => google(MODELS.gemini) },
  { name: 'groq', model: () => groq(MODELS.groq) },
  { name: 'deepseek', model: () => createDeepSeek({ apiKey: process.env.DEEPSEEK_API_KEY ?? '' })(MODELS.deepseek) },
];

/** Cascada Gemini → Groq → DeepSeek, solo con los proveedores que tienen clave. */
function configuredProviders() {
  return ALL_PROVIDERS.filter((p) => hasKey(p.name));
}

const RETRYABLE = [408, 429, 500, 502, 503, 504];

// Proveedor sano cacheado 5 min. En producción: Upstash Redis / Vercel KV.
let cachedProvider: { name: ProviderName; until: number } | null = null;

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
    await generateText({ model: p.model(), prompt: 'ok', maxOutputTokens: 16, abortSignal: AbortSignal.timeout(6000) });
    return true;
  } catch (error) {
    logFailure(p.name, error);
    return false;
  }
}

async function orderedProviders(): Promise<Provider[]> {
  const providers = configuredProviders();
  if (!providers.length) {
    console.error('[ai] no hay proveedores configurados: define GOOGLE_GENERATIVE_AI_API_KEY, GROQ_API_KEY o DEEPSEEK_API_KEY');
    return [];
  }
  if (cachedProvider && cachedProvider.until > Date.now()) {
    const idx = providers.findIndex((p) => p.name === cachedProvider!.name);
    if (idx >= 0) return providers.slice(idx);
  }
  for (let i = 0; i < providers.length; i++) {
    if (await healthCheck(providers[i]!)) {
      cachedProvider = { name: providers[i]!.name, until: Date.now() + 5 * 60_000 };
      return providers.slice(i);
    }
  }
  return providers;
}

function forget(provider: ProviderName) {
  if (cachedProvider?.name === provider) cachedProvider = null;
}

function isRetryable(error: unknown) {
  const e = error as { status?: number; statusCode?: number };
  const status = e?.status ?? e?.statusCode;
  return !status || RETRYABLE.includes(status);
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
  for (const provider of await orderedProviders()) {
    try {
      const result = streamText({
        model: provider.model(),
        instructions,
        messages,
        tools,
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
      if (isRetryable(error)) continue;
      throw error;
    }
  }
  throw new AllProvidersFailedError(attempts);
}

/** Generación estructurada con cascada (router, onboarding, ritual, análisis, moderación, adaptación). */
export async function objectWithFallback<T extends z.ZodTypeAny>(opts: {
  schema: T; instructions: string; prompt: string; timeoutMs?: number;
}): Promise<{ object: z.infer<T>; provider: ProviderName }> {
  const attempts: { provider: ProviderName; error: string }[] = [];
  for (const provider of await orderedProviders()) {
    try {
      const { output } = await generateText({
        model: provider.model(),
        output: Output.object({ schema: opts.schema }),
        instructions: opts.instructions,
        prompt: opts.prompt,
        abortSignal: opts.timeoutMs ? AbortSignal.timeout(opts.timeoutMs) : undefined,
      });
      return { object: output as z.infer<T>, provider: provider.name };
    } catch (error) {
      logFailure(provider.name, error);
      attempts.push({ provider: provider.name, error: describeError(error) });
    }
  }
  throw new AllProvidersFailedError(attempts);
}
