import { streamText, generateText, generateObject, type CoreMessage, type LanguageModel } from 'ai';
import { google } from '@ai-sdk/google';
import { groq } from '@ai-sdk/groq';
import { createDeepSeek } from '@ai-sdk/deepseek';
import type { z } from 'zod';

const deepseek = createDeepSeek({ apiKey: process.env.DEEPSEEK_API_KEY ?? '' });

export type ProviderName = 'gemini' | 'groq' | 'deepseek';

const PROVIDERS: { name: ProviderName; model: () => LanguageModel }[] = [
  { name: 'gemini', model: () => google('gemini-2.0-flash') },
  { name: 'groq', model: () => groq('llama-3.3-70b-versatile') },
  { name: 'deepseek', model: () => deepseek('deepseek-chat') },
];

const RETRYABLE = [429, 500, 502, 503, 504];

// Proveedor sano cacheado 5 min. En producción: Upstash Redis / Vercel KV.
let cachedProvider: { name: ProviderName; until: number } | null = null;

async function healthCheck(p: (typeof PROVIDERS)[number]): Promise<boolean> {
  try {
    await generateText({ model: p.model(), prompt: 'ok', maxTokens: 1, abortSignal: AbortSignal.timeout(4000) });
    return true;
  } catch {
    return false;
  }
}

async function orderedProviders() {
  if (cachedProvider && cachedProvider.until > Date.now()) {
    const idx = PROVIDERS.findIndex((p) => p.name === cachedProvider!.name);
    return PROVIDERS.slice(Math.max(idx, 0));
  }
  for (let i = 0; i < PROVIDERS.length; i++) {
    if (await healthCheck(PROVIDERS[i]!)) {
      cachedProvider = { name: PROVIDERS[i]!.name, until: Date.now() + 5 * 60_000 };
      return PROVIDERS.slice(i);
    }
  }
  return PROVIDERS;
}

function isRetryable(error: unknown) {
  const e = error as { status?: number; statusCode?: number };
  const status = e?.status ?? e?.statusCode;
  return !status || RETRYABLE.includes(status);
}

export async function streamWithFallback(
  system: string,
  messages: CoreMessage[],
  tools?: Parameters<typeof streamText>[0]['tools'],
  onFinish?: (args: { text: string; provider: ProviderName; tokens?: number; toolCalls?: unknown; toolResults?: unknown }) => Promise<void> | void,
) {
  let lastError: unknown;
  for (const provider of await orderedProviders()) {
    try {
      const result = streamText({
        model: provider.model(),
        system,
        messages,
        tools,
        maxSteps: 5,
        onError: ({ error }) => {
          console.error(`[${provider.name}]`, error);
          if (cachedProvider?.name === provider.name) cachedProvider = null;
        },
        onFinish: async ({ text, usage, toolCalls, toolResults }) =>
          onFinish?.({ text, provider: provider.name, tokens: usage?.totalTokens, toolCalls, toolResults }),
      });
      return { result, provider: provider.name };
    } catch (error: unknown) {
      lastError = error;
      if (isRetryable(error)) continue;
      throw error;
    }
  }
  throw lastError ?? new Error('Todos los proveedores fallaron');
}

/** Generación estructurada con cascada (onboarding, ritual, análisis, moderación). */
export async function objectWithFallback<T extends z.ZodTypeAny>(opts: {
  schema: T; system: string; prompt: string;
}): Promise<{ object: z.infer<T>; provider: ProviderName }> {
  let lastError: unknown;
  for (const provider of await orderedProviders()) {
    try {
      const { object } = await generateObject({ model: provider.model(), schema: opts.schema, system: opts.system, prompt: opts.prompt });
      return { object: object as z.infer<T>, provider: provider.name };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error('Todos los proveedores fallaron');
}
