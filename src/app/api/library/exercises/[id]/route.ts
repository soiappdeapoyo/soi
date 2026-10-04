import { getSessionUser } from '@/lib/supabase/server';
import { getExercise } from '@/lib/library/exercises';
import { exerciseInSpanish } from '@/lib/library/ai';

/** Instrucciones en español (se traducen una vez y se cachean). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const e = await getExercise(id);
  if (!e) return Response.json({ ok: false }, { status: 404 });
  return Response.json({ ok: true, es: await exerciseInSpanish(supabase, e) });
}
