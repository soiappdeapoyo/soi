import { embed } from 'ai';
import { google, type GoogleEmbeddingModelOptions } from '@ai-sdk/google';
import { EMBEDDING_DIMENSIONS, MODELS, hasKey } from './models';

/** Embeddings de 768 dimensiones (gemini-embedding-2 truncado con MRL) para la columna VECTOR(768). */
export async function embedText(text: string): Promise<number[] | null> {
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
