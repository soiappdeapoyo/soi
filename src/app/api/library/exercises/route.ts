import { getSessionUser } from '@/lib/supabase/server';
import { allExercises, filterExercises, listItem, type ExerciseKind } from '@/lib/library/exercises';

const KINDS = new Set<ExerciseKind>(['calistenia', 'gimnasio', 'estiramiento']);

export async function GET(req: Request) {
  const { user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const sp = new URL(req.url).searchParams;
  const kind = sp.get('tipo') as ExerciseKind | null;
  const exercises = filterExercises(await allExercises(), { kind: kind && KINDS.has(kind) ? kind : null, q: sp.get('q')?.slice(0, 60), limit: 40 });
  return Response.json({ exercises: exercises.map(listItem) });
}
