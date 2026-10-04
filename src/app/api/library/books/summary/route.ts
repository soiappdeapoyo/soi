import { z } from 'zod/v3';
import { getSessionUser } from '@/lib/supabase/server';
import { isWorkKey, workDescription } from '@/lib/library/openlibrary';
import { bookSummary } from '@/lib/library/ai';

const Body = z.object({ key: z.string().refine(isWorkKey), title: z.string().trim().min(1).max(300), author: z.string().trim().max(200).nullable().optional() });

/** Resumen del libro (5 ideas + una práctica). Se genera una vez por libro y se comparte. */
export async function POST(req: Request) {
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return Response.json({ ok: false, message: 'Libro inválido.' }, { status: 400 });
  const { key, title, author } = parsed.data;
  const summary = await bookSummary(supabase, { key, title, author: author ?? null }, await workDescription(key));
  if (!summary) return Response.json({ ok: false, message: 'No pudimos preparar el resumen ahora. Intenta en un momento.' }, { status: 503 });
  return Response.json({ ok: true, summary });
}
