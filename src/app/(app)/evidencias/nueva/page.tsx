import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getSessionUser } from '@/lib/supabase/server';
import { canAccess } from '@/lib/billing/check-access';
import { EvidenceForm } from '@/components/evidence/evidence-form';
import { LockedFeature } from '@/components/paywall/locked-feature';
import { ROUTINES, isRoutineId } from '@/config/routines';

export const metadata: Metadata = { title: 'Nueva evidencia' };

export default async function NuevaEvidenciaPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const { from } = await searchParams;
  const { user } = await getSessionUser();
  if (!user) redirect('/login');
  const access = await canAccess(user.id, 'evidence_save');

  const defaultTitle = isRoutineId(from) ? `Completé: ${ROUTINES[from].label}` : from === 'ritual' ? 'Completé mi ritual diario' : '';

  return (
    <div className="mx-auto max-w-xl px-5 py-8">
      <h1 className="mb-1 text-3xl font-semibold">Nueva evidencia</h1>
      <p className="mb-6 text-soi-muted">Los resultados son la prueba de tu nueva identidad.</p>
      {access.allowed
        ? <EvidenceForm defaultTitle={defaultTitle} />
        : <LockedFeature title="Guardar evidencias" description="El Muro de Evidencias es parte de SOI+." />}
    </div>
  );
}
