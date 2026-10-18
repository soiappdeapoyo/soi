import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getSessionUser } from '@/lib/supabase/server';
import { getProfile } from '@/lib/billing/check-access';
import { loadLifeMap } from '@/lib/life-map-server';
import { buildMapView, type AreaScores } from '@/lib/life-map';
import { loadNorth } from '@/lib/north';
import { MapWizard } from '@/components/map/map-wizard';
import type { LifeAreaId } from '@/config/life-areas';

export const metadata: Metadata = { title: 'Tu mapa' };

/** El diagnóstico de Tu mapa: inicial la primera vez (o `?tipo=inicial` para rehacerlo); después, el chequeo mensual. */
export default async function MapDiagnosticPage({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
  const { supabase, user } = await getSessionUser();
  if (!user) redirect('/login?next=/mapa/diagnostico');
  const [{ tipo }, { map, assessments }, profile] = await Promise.all([searchParams, loadLifeMap(supabase, user.id), getProfile(user.id)]);
  const view = buildMapView(map, assessments);
  const mode = !view.hasMap || tipo === 'inicial' ? 'inicial' : 'mensual';
  const north = await loadNorth(supabase, user.id, profile);
  const previous: AreaScores = Object.fromEntries(view.areas.filter((a) => a.current !== null).map((a) => [a.area.id, a.current]));
  const targets: AreaScores = Object.fromEntries(view.areas.filter((a) => a.target !== null).map((a) => [a.area.id, a.target]));
  const wants = Object.fromEntries(view.areas.filter((a) => a.want).map((a) => [a.area.id, a.want])) as Partial<Record<LifeAreaId, string>>;
  const hint = north.identity?.name ? `Quiero ser alguien que… (${north.identity.name})` : north.aim ? `Quiero ser alguien que… (${north.aim})` : null;

  return (
    <div className="mx-auto max-w-xl px-5 pt-4 md:pt-10">
      <MapWizard mode={mode} previous={previous} prevFocus={map?.focus_areas ?? []} prevTargets={targets} prevWants={wants}
        prevVision={map?.vision ?? null} visionHint={hint} />
    </div>
  );
}
