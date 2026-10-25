import { redirect } from 'next/navigation';

/** Antes había un chat del coach por persona: ahora Ale es una sola conversación de la lista. */
export default async function OldCoachPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ feedback?: string }> }) {
  const [{ id }, { feedback }] = await Promise.all([params, searchParams]);
  redirect(`/persons/coach?p=${encodeURIComponent(id)}${feedback === '1' ? '&feedback=1' : ''}`);
}
