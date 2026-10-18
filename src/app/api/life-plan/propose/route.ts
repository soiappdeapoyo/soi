import { getSessionUser } from '@/lib/supabase/server';
import { getProfile } from '@/lib/billing/check-access';
import { loadMapView } from '@/lib/life-map-server';
import { proposePlan } from '@/lib/life-plan-ai';

/** SOI propone el plan de 90 días desde el mapa (IA con respaldo por reglas). La persona lo edita antes de usarlo. */
export async function GET() {
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const profile = await getProfile(user.id);
  const view = await loadMapView(supabase, user.id, profile, profile?.timezone ?? 'America/Mexico_City');
  if (!view.hasMap || !view.focus.length) return Response.json({ ok: false, message: 'Primero dibuja tu mapa.' }, { status: 400 });
  const { areas, source } = await proposePlan(supabase, user.id, profile, view);
  return Response.json({ ok: true, areas, source });
}
