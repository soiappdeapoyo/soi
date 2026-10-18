import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowLeft } from 'lucide-react';
import { getSessionUser } from '@/lib/supabase/server';
import { loadLifeMap } from '@/lib/life-map-server';
import { buildMapView } from '@/lib/life-map';
import { loadPlan } from '@/lib/life-plan-server';
import { PlanEditor } from '@/components/map/plan-editor';

export const metadata: Metadata = { title: 'Tu plan de 90 días' };

/** El plan de 90 días: la propuesta de SOI (se pide desde el cliente: nada de IA en el camino de la pantalla) o el actual para ajustarlo. */
export default async function PlanPage() {
  const { supabase, user } = await getSessionUser();
  if (!user) redirect('/login?next=/mapa/plan');
  const [{ map, assessments }, plan] = await Promise.all([loadLifeMap(supabase, user.id), loadPlan(supabase, user.id)]);
  const view = buildMapView(map, assessments);
  if (!view.hasMap) redirect('/mapa/diagnostico');
  // Si cambió su enfoque, el plan anterior solo sirve para las áreas que siguen.
  const kept = plan?.areas.filter((a) => view.focus.some((f) => f.area.id === a.area)) ?? [];
  const initial = kept.length === view.focus.length && kept.length > 0 ? kept : null;

  return (
    <div className="mx-auto max-w-xl px-5 pt-4 md:pt-10">
      <Link href="/mi-vida?tab=mapa" className="press tap-target -ml-2 inline-flex h-9 items-center gap-1 rounded-lg px-2 text-sm text-soi-muted hover:bg-black/[0.04]">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Mi mapa
      </Link>
      <h1 className="mt-3 text-balance text-[28px] font-semibold leading-tight tracking-tight">{initial ? 'Ajusta tu plan' : 'Tu plan de 90 días'}</h1>
      <p className="mb-6 mt-2 text-pretty text-[17px] leading-relaxed text-soi-muted">
        Por cada área de enfoque: una meta, quién eliges ser y un hábito pequeño que lo construye cada día. Cambia lo que no sea tuyo.
      </p>
      <PlanEditor initial={initial} />
    </div>
  );
}
