import { z } from 'zod/v3';
import type { SupabaseClient } from '@supabase/supabase-js';
import { objectWithFallback } from '@/lib/ai/fallback';
import { createAdminClient } from '@/lib/supabase/server';
import type { Exercise } from './exercises';

/** Caché compartido (content_cache): se genera una vez y lo leen todos. */
async function cached<T>(supabase: SupabaseClient, key: string, make: () => Promise<T | null>): Promise<T | null> {
  const { data } = await supabase.from('content_cache').select('value').eq('key', key).maybeSingle();
  if (data) return data.value as T;
  const value = await make();
  if (value) await createAdminClient().from('content_cache').upsert({ key, value });
  return value;
}

export const BookSummarySchema = z.object({
  premise: z.string().describe('De qué trata y para quién es, en 2 frases'),
  ideas: z.array(z.object({ title: z.string(), text: z.string() })).describe('5 ideas clave, en palabras propias, sin citas textuales'),
  practice: z.object({ title: z.string(), text: z.string(), eslabon: z.enum(['pensamiento', 'emocion', 'accion', 'resultado']) })
    .describe('Una práctica de 5 a 10 minutos para aplicar el libro hoy, y el eslabón SOI que fortalece'),
});
export type BookSummary = z.infer<typeof BookSummarySchema>;

export function bookSummary(supabase: SupabaseClient, book: { key: string; title: string; author: string | null }, description: string | null) {
  return cached<BookSummary>(supabase, `book:summary:${book.key}`, async () => {
    try {
      const { object } = await objectWithFallback({
        schema: BookSummarySchema,
        instructions: `Escribes resúmenes de libros para SOI, una app de bienestar en español neutro latinoamericano.
Reglas: resume con tus propias palabras (nunca copies frases textuales del libro), sé fiel a lo que el libro realmente propone,
no inventes datos ni capítulos. Si no conoces bien el libro, dilo en la premisa y limita las ideas a lo que describe la sinopsis.
Nada de consejos médicos. Tono cálido y concreto. 5 ideas, cada una de 1 a 3 frases.`,
        prompt: `Libro: ${book.title}${book.author ? ` — ${book.author}` : ''}\nSinopsis de Open Library: ${description ?? 'no disponible'}`,
        timeoutMs: 30_000,
      });
      return { ...object, ideas: object.ideas.slice(0, 7) };
    } catch {
      return null;
    }
  });
}

const ExerciseEsSchema = z.object({ name: z.string(), instructions: z.array(z.string()) });
export type ExerciseEs = z.infer<typeof ExerciseEsSchema>;

/** Nombre e instrucciones en español (la base original está en inglés). */
export function exerciseInSpanish(supabase: SupabaseClient, e: Exercise) {
  return cached<ExerciseEs>(supabase, `exercise:es:${e.id}`, async () => {
    try {
      const { object } = await objectWithFallback({
        schema: ExerciseEsSchema,
        instructions: 'Traduces ejercicios al español neutro latinoamericano. Nombre corto y reconocible (puedes dejar el término en inglés entre paréntesis si es el usual en gimnasios). Traduce cada instrucción con fidelidad, sin agregar ni quitar pasos. Usa "tú".',
        prompt: JSON.stringify({ name: e.name, instructions: e.instructions }),
        timeoutMs: 25_000,
      });
      return object.instructions.length ? object : null;
    } catch {
      return null;
    }
  });
}
