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
const deepseekModel = { current: () => okModel('hola desde deepseek') };
vi.mock('@ai-sdk/deepseek', () => ({ createDeepSeek: () => () => deepseekModel.current() }));

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

  it('si el proveedor sano falla, vuelve a probar los anteriores (no los descarta)', async () => {
    // Caso real: Gemini no pasó el health check (lento) y quedó Groq; Groq rechazó la petición.
    const slow = Object.assign(new Error('timeout'), { statusCode: 504 });
    models.gemini = () => new MockLanguageModelV4({
      doGenerate: async () => { throw slow; },
      doStream: okModel('hola desde gemini').doStream,
    });
    const bad = Object.assign(new Error('Tool call validation failed'), { statusCode: 400 });
    models.groq = () => new MockLanguageModelV4({
      doGenerate: async () => ({ content: [{ type: 'text', text: 'ok' }], finishReason: { unified: 'stop', raw: undefined }, usage, warnings: [] }),
      doStream: async () => ({ stream: simulateReadableStream({ chunks: [{ type: 'error', error: bad }] }) }),
    });
    const { streamWithFallback } = await import('@/lib/ai/fallback');
    const { result, provider } = await streamWithFallback('sé amable', [{ role: 'user', content: 'hola' }]);
    expect(provider).toBe('gemini');
    expect(await readText(result)).toBe('hola desde gemini');
    models.groq = () => okModel('hola desde groq');
  });

  it('una llamada a herramienta fuera de rango no rompe la respuesta: el modelo recibe el error y sigue', async () => {
    let step = 0;
    models.gemini = () => new MockLanguageModelV4({
      doGenerate: async () => ({ content: [{ type: 'text', text: 'ok' }], finishReason: { unified: 'stop', raw: undefined }, usage, warnings: [] }),
      doStream: async () => ({
        stream: simulateReadableStream({
          chunks: step++ === 0
            ? [
              { type: 'tool-call', toolCallId: 'c1', toolName: 'reto', input: JSON.stringify({ days: 1 }) },
              { type: 'finish', finishReason: { unified: 'tool-calls', raw: undefined }, usage },
            ]
            : [
              { type: 'text-start', id: 't' }, { type: 'text-delta', id: 't', delta: 'listo' }, { type: 'text-end', id: 't' },
              { type: 'finish', finishReason: { unified: 'stop', raw: undefined }, usage },
            ] as never[],
        }),
      }),
    });
    const { streamWithFallback } = await import('@/lib/ai/fallback');
    const { tool } = await import('ai');
    const { z } = await import('zod/v3');
    const execute = vi.fn(async () => ({ ok: true }));
    const tools = { reto: tool({ description: 'x', inputSchema: z.object({ days: z.number().int().min(2).max(30) }), execute }) };
    const { result, provider } = await streamWithFallback('x', [{ role: 'user', content: 'hola' }], tools);
    expect(provider).toBe('gemini');
    expect(await readText(result)).toBe('listo');
    expect(execute).not.toHaveBeenCalled();
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

  it('objectWithFallback con tope de tokens pide poco razonamiento (si no, la respuesta llega vacía)', async () => {
    const calls: unknown[] = [];
    models.gemini = retiredModel;
    models.groq = () => new MockLanguageModelV4({
      doGenerate: async (opts) => {
        calls.push(opts.providerOptions);
        return { content: [{ type: 'text', text: '{"ok":true}' }], finishReason: { unified: 'stop', raw: undefined }, usage, warnings: [] };
      },
    });
    const { objectWithFallback } = await import('@/lib/ai/fallback');
    const { z } = await import('zod/v3');
    await objectWithFallback({ schema: z.object({ ok: z.boolean() }), instructions: 'x', prompt: 'y', maxOutputTokens: 400 });
    await objectWithFallback({ schema: z.object({ ok: z.boolean() }), instructions: 'x', prompt: 'y' });
    expect(calls[0]).toMatchObject({ groq: { reasoningEffort: 'low' }, deepseek: { thinking: { type: 'disabled' } } });
    expect(calls[1]).toEqual({ groq: { strictJsonSchema: false } });
  });
});

describe('orden de proveedores', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test';
    process.env.GROQ_API_KEY = 'test';
    process.env.DEEPSEEK_API_KEY = 'test';
    models.gemini = () => okModel('hola desde gemini');
    models.groq = () => okModel('hola desde groq');
    deepseekModel.current = () => okModel('hola desde deepseek');
  });
  it('el chat usa DeepSeek primero; las tareas estructuradas siguen con Gemini', async () => {
    const { streamWithFallback, objectWithFallback } = await import('@/lib/ai/fallback');
    const { provider } = await streamWithFallback('x', [{ role: 'user', content: 'hola' }]);
    expect(provider).toBe('deepseek');
    models.gemini = () => new MockLanguageModelV4({
      doGenerate: async () => ({ content: [{ type: 'text', text: '{"ok":true}' }], finishReason: { unified: 'stop', raw: undefined }, usage, warnings: [] }),
    });
    const { z } = await import('zod/v3');
    expect((await objectWithFallback({ schema: z.object({ ok: z.boolean() }), instructions: 'x', prompt: 'y' })).provider).toBe('gemini');
  });
  it('si DeepSeek falla, el chat sigue con Gemini', async () => {
    deepseekModel.current = () => new MockLanguageModelV4({
      doGenerate: async () => { throw Object.assign(new Error('402 saldo insuficiente'), { statusCode: 402 }); },
      doStream: async () => { throw Object.assign(new Error('402 saldo insuficiente'), { statusCode: 402 }); },
    });
    const { streamWithFallback } = await import('@/lib/ai/fallback');
    const { provider, result } = await streamWithFallback('x', [{ role: 'user', content: 'hola' }]);
    expect(provider).toBe('gemini');
    expect(await readText(result)).toBe('hola desde gemini');
  });
  it('sin prueba de salud: el que falló pasa al final de la fila por 2 minutos', async () => {
    let calls = 0;
    deepseekModel.current = () => new MockLanguageModelV4({
      doStream: async () => { calls++; throw Object.assign(new Error('caído'), { statusCode: 503 }); },
    });
    const { streamWithFallback } = await import('@/lib/ai/fallback');
    expect((await streamWithFallback('x', [{ role: 'user', content: 'hola' }])).provider).toBe('gemini');
    expect((await streamWithFallback('x', [{ role: 'user', content: 'hola' }])).provider).toBe('gemini');
    expect(calls).toBe(1); // la segunda vez ya no se intentó primero con DeepSeek
  });
  it('el router usa el orden rápido (Groq primero)', async () => {
    const { FAST_ORDER } = await import('@/lib/ai/fallback');
    expect(FAST_ORDER[0]).toBe('groq');
  });
  it('el orden se puede cambiar con una variable', async () => {
    const { parseOrder } = await import('@/lib/ai/fallback');
    expect(parseOrder('groq, deepseek', ['gemini'])).toEqual(['groq', 'deepseek', 'gemini']);
    expect(parseOrder('', ['deepseek', 'gemini', 'groq'])).toEqual(['deepseek', 'gemini', 'groq']);
    expect(parseOrder('openai,gemini', ['deepseek'])).toEqual(['gemini', 'groq', 'deepseek']);
  });
});

describe('relaxTools', () => {
  it('envía el esquema sin límites pero valida con el estricto', async () => {
    const { relaxTools, stripConstraints } = await import('@/lib/ai/relax-schema');
    const { tool, asSchema } = await import('ai');
    const { z } = await import('zod/v3');
    const tools = relaxTools({ t: tool({ inputSchema: z.object({ n: z.number().min(2).max(30), s: z.string().min(3).max(5) }), execute: async () => 1 }) });
    const schema = asSchema(tools.t.inputSchema);
    const json = JSON.stringify(await schema.jsonSchema);
    expect(json).not.toMatch(/minimum|maximum|minLength|maxLength/);
    expect((await schema.validate!({ n: 1, s: 'abcd' })).success).toBe(false);
    expect((await schema.validate!({ n: 3, s: 'abcd' })).success).toBe(true);
    expect(stripConstraints({ type: 'array', minItems: 1, items: { type: 'string', pattern: 'x' } })).toEqual({ type: 'array', items: { type: 'string' } });
  });
});
