import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getSessionUser } from '@/lib/supabase/server';
import { canAccess } from '@/lib/billing/check-access';
import { MomentForm } from '@/components/social/moment-form';

export const metadata: Metadata = { title: 'Nuevo momento' };

export default async function NuevoMomentoPage() {
  const { user } = await getSessionUser();
  if (!user) redirect('/login');
  const share = await canAccess(user.id, 'community');
  return (
    <div className="mx-auto max-w-2xl px-5 py-8">
      <h1 className="text-3xl font-semibold tracking-tight">Nuevo momento</h1>
      <p className="mb-5 text-soi-muted">Convierte una idea, emoción o aprendizaje en una acción concreta.</p>
      <MomentForm canShare={share.allowed} />
    </div>
  );
}
