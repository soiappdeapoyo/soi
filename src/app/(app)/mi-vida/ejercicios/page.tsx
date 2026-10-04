import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowLeft } from 'lucide-react';
import { getSessionUser } from '@/lib/supabase/server';
import { allExercises, filterExercises, listItem } from '@/lib/library/exercises';
import { ExerciseBrowser } from '@/components/library/exercise-browser';

export const metadata: Metadata = { title: 'Ejercicios' };

export default async function EjerciciosPage() {
  const { user } = await getSessionUser();
  if (!user) redirect('/login');
  const initial = filterExercises(await allExercises(), { kind: 'calistenia', limit: 40 }).map(listItem);
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-5 md:py-8">
      <Link href="/mi-vida?tab=biblioteca" className="press inline-flex items-center gap-1 text-sm text-soi-muted hover:text-soi-ink"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Biblioteca</Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Ejercicios</h1>
      <p className="mb-4 text-soi-muted">Mueve tu cuerpo, cambia tu estado. Elige uno y guárdalo para tenerlo a mano.</p>
      <ExerciseBrowser initial={initial} initialKind="calistenia" />
    </div>
  );
}
