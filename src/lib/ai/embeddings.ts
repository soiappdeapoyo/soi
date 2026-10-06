import { embed } from 'ai';
import { google, type GoogleEmbeddingModelOptions } from '@ai-sdk/google';
import { EMBEDDING_DIMENSIONS, MODELS, hasKey } from './models';

// El mismo texto se pide varias veces en un mismo mensaje (memoria, continuidad): una sola llamada por minuto.
const memo = new Map<string, { at: number; p: Promise<number[] | null> }>();

/** Embeddings de 768 dimensiones (gemini-embedding-2 truncado con MRL) para la columna VECTOR(768). */
export function embedText(text: string): Promise<number[] | null> {
  const key = text.slice(0, 8000);
  const hit = memo.get(key);
  if (hit && Date.now() - hit.at < 60_000) return hit.p;
  const p = embedUncached(key);
  memo.set(key, { at: Date.now(), p });
  if (memo.size > 200) memo.delete(memo.keys().next().value!);
  return p;
}

async function embedUncached(text: string): Promise<number[] | null> {
  if (!hasKey('gemini')) return null;
  try {
    const { embedding } = await embed({
      model: google.embedding(MODELS.embedding),
      value: text.slice(0, 8000),
      providerOptions: { google: { outputDimensionality: EMBEDDING_DIMENSIONS } satisfies GoogleEmbeddingModelOptions },
    });
    return embedding;
  } catch (e) {
    console.error('[embed]', e);
    return null;
  }
}

/** pgvector espera '[0.1,0.2,...]' */
export function toVector(v: number[]) {
  return `[${v.join(',')}]`;
}
