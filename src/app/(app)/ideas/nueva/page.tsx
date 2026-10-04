import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getSessionUser } from '@/lib/supabase/server';
import { canAccess } from '@/lib/billing/check-access';
import { IdeaForm } from '@/components/social/idea-form';

export const metadata: Metadata = { title: 'Nueva idea' };

export default async function NuevaIdeaPage() {
  const { user } = await getSessionUser();
  if (!user) redirect('/login');
  const share = await canAccess(user.id, 'community');
  return (
    <div className="mx-auto max-w-2xl px-5 py-8">
      <h1 className="text-3xl font-semibold tracking-tight">Nueva idea</h1>
      <p className="mb-5 text-soi-muted">Convierte una idea, emoción o aprendizaje en una acción concreta.</p>
      <IdeaForm canShare={share.allowed} />
    </div>
  );
}
