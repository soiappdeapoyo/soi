import { redirect } from 'next/navigation';

/** Cada rutina es un Moment oficial: se ejecuta en el reproductor de Moments. */
export default async function RutinaRedirect({ params }: { params: Promise<{ id: string }> }) {
  redirect(`/m/${(await params).id}/play`);
}
