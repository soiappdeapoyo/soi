import { describe, it, expect, vi, beforeEach } from 'vitest';
import { simulateReadableStream } from 'ai';
import { MockLanguageModelV4 } from 'ai/test';

const usage = {
  inputTokens: { total: 3, noCache: 3, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 5, text: 5, reasoning: undefined },
};

function okModel(text: string) {
  return new MockLanguageModelV4({
    doGenerate: async () => ({ content: [{ type: 'text', text: 'ok' }], finishReason: { unified: 'stop', raw: undefined }, usage, warnings: [] }),
    doStream: async () => ({
      stream: simulateReadableStream({
        chunks: [
          { type: 'text-start', id: 't' },
          { type: 'text-delta', id: 't', delta: text },
          { type: 'text-end', id: 't' },
          { type: 'finish', finishReason: { unified: 'stop', raw: undefined }, usage },
        ],
      }),
    }),
  });
}

/** Simula un modelo retirado: la API responde 404 tanto al health check como al stream. */
function retiredModel() {
  const err = Object.assign(new Error('models/gemini-2.0-flash is not found'), { statusCode: 404 });
  return new MockLanguageModelV4({
    doGenerate: async () => { throw err; },
    doStream: async () => ({ stream: simulateReadableStream({ chunks: [{ type: 'error', error: err }] }) }),
  });
}

/** Pasa el health check pero el stream falla en la primera parte (p. ej. 429 a mitad de petición). */
function flakyModel() {
  const err = Object.assign(new Error('rate limited'), { statusCode: 429 });
  return new MockLanguageModelV4({
    doGenerate: async () => ({ content: [{ type: 'text', text: 'ok' }], finishReason: { unified: 'stop', raw: undefined }, usage, warnings: [] }),
    doStream: async () => ({ stream: simulateReadableStream({ chunks: [{ type: 'error', error: err }] }) }),
  });
}

const models = { gemini: retiredModel as () => MockLanguageModelV4, groq: () => okModel('hola desde groq') };

vi.mock('@ai-sdk/google', () => ({ google: () => models.gemini() }));
vi.mock('@ai-sdk/groq', () => ({ groq: () => models.groq() }));

async function readText(result: { textStream: AsyncIterable<string> }) {
  let out = '';
  for await (const t of result.textStream) out += t;
  return out;
}

describe('streamWithFallback', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test';
    process.env.GROQ_API_KEY = 'test';
    delete process.env.DEEPSEEK_API_KEY;
  });

  it('si Gemini está retirado, responde Groq', async () => {
    models.gemini = retiredModel;
    const { streamWithFallback } = await import('@/lib/ai/fallback');
    const { result, provider } = await streamWithFallback('sé amable', [{ role: 'user', content: 'hola' }]);
    expect(provider).toBe('groq');
    expect(await readText(result)).toBe('hola desde groq');
  });

  it('si el stream de Gemini falla en la primera parte, cambia a Groq antes de responder', async () => {
    models.gemini = flakyModel;
    const { streamWithFallback } = await import('@/lib/ai/fallback');
    const { result, provider } = await streamWithFallback('sé amable', [{ role: 'user', content: 'hola' }]);
    expect(provider).toBe('groq');
    expect(await readText(result)).toBe('hola desde groq');
  });

  it('Gemini sano responde primero y el cliente recibe el texto completo', async () => {
    models.gemini = () => okModel('hola desde gemini');
    const { streamWithFallback } = await import('@/lib/ai/fallback');
    const { result, provider } = await streamWithFallback('sé amable', [{ role: 'user', content: 'hola' }]);
    expect(provider).toBe('gemini');
    expect(await readText(result)).toBe('hola desde gemini');
  });

  it('sin claves configuradas lanza un error claro', async () => {
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    delete process.env.GROQ_API_KEY;
    const { streamWithFallback, AllProvidersFailedError } = await import('@/lib/ai/fallback');
    await expect(streamWithFallback('x', [{ role: 'user', content: 'hola' }])).rejects.toBeInstanceOf(AllProvidersFailedError);
  });

  it('objectWithFallback usa el siguiente proveedor si el primero falla', async () => {
    models.gemini = retiredModel;
    models.groq = () => new MockLanguageModelV4({
      doGenerate: async () => ({ content: [{ type: 'text', text: '{"ok":true}' }], finishReason: { unified: 'stop', raw: undefined }, usage, warnings: [] }),
    });
    const { objectWithFallback } = await import('@/lib/ai/fallback');
    const { z } = await import('zod/v3');
    const { object, provider } = await objectWithFallback({ schema: z.object({ ok: z.boolean() }), instructions: 'x', prompt: 'y' });
    expect(provider).toBe('groq');
    expect(object).toEqual({ ok: true });
  });
});
