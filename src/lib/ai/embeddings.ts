import { embed } from 'ai';
import { google } from '@ai-sdk/google';

const model = google.textEmbeddingModel('text-embedding-004');

export async function embedText(text: string): Promise<number[] | null> {
  try {
    const { embedding } = await embed({ model, value: text.slice(0, 8000) });
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
