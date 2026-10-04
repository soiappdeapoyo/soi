import { redirect } from 'next/navigation';

/** Lo que antes se llamaba "momento" ahora es una Idea. */
export default async function MomentoRedirect({ params }: { params: Promise<{ id: string }> }) {
  redirect(`/ideas/${(await params).id}`);
}
