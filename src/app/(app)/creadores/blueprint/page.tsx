import { redirect } from 'next/navigation';

/** Crear Blueprint → crear Moment (con el mismo punto de partida si venía de una idea). */
export default async function NuevoBlueprintRedirect({ searchParams }: { searchParams: Promise<{ momento?: string }> }) {
  const { momento } = await searchParams;
  redirect(momento ? `/m/nuevo?idea=${momento}` : '/m/nuevo');
}
