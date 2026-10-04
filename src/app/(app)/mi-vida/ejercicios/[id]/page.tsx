import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowLeft } from 'lucide-react';
import { getSessionUser } from '@/lib/supabase/server';
import { getExercise, KIND_LABEL } from '@/lib/library/exercises';
import { ExerciseAnimation } from '@/components/library/exercise-animation';
import { ExerciseDetail } from '@/components/library/exercise-detail';

export const metadata: Metadata = { title: 'Ejercicio' };

export default async function EjercicioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getSessionUser();
  if (!user) redirect('/login');
  const e = await getExercise(id);
  if (!e) notFound();
  const { data: saved } = await supabase.from('library_items').select('id').eq('user_id', user.id).eq('kind', 'exercise').eq('external_id', id).maybeSingle();

  return (
    <div className="mx-auto max-w-2xl px-5 py-6 md:py-8">
      <Link href="/mi-vida/ejercicios" className="press inline-flex items-center gap-1 text-sm text-soi-muted hover:text-soi-ink"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Ejercicios</Link>
      <ExerciseAnimation frames={e.frames} name={e.name} className="mt-4 aspect-[4/3] rounded-[20px] shadow-ring" />
      <p className="mt-4 flex flex-wrap gap-1.5 text-xs">
        <span className="rounded-md bg-soi-accent-soft px-1.5 py-0.5 font-medium text-soi-accent">{KIND_LABEL[e.kind]}</span>
        <span className="rounded-md bg-soi-tray px-1.5 py-0.5">{e.level}</span>
        <span className="rounded-md bg-soi-tray px-1.5 py-0.5">{e.equipment}</span>
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">{e.name}</h1>
      <ExerciseDetail id={e.id} savedId={(saved?.id as string | undefined) ?? null} instructions={e.instructions} />
      <p className="mt-4 text-sm text-soi-muted">Músculos: {e.muscles.join(', ')}{e.secondary.length ? ` · también ${e.secondary.join(', ')}` : ''}</p>
      <p className="mt-4 text-xs text-soi-subtle">Fuente: free-exercise-db (dominio público). Escucha a tu cuerpo; si tienes una lesión o condición médica, consulta a un profesional.</p>
    </div>
  );
}
