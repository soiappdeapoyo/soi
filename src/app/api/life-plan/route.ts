import { z } from 'zod/v3';
import { getSessionUser } from '@/lib/supabase/server';
import { getProfile } from '@/lib/billing/check-access';
import { PlanAreaSchema } from '@/lib/life-plan';
import { MAX_FOCUS } from '@/config/life-areas';
import { applyPlan, loadPlan } from '@/lib/life-plan-server';

const Body = z.object({ areas: z.array(PlanAreaSchema).min(1).max(MAX_FOCUS) });

/** Usar el plan (o ajustarlo): identidades, Moments de hábito en Mi día y memoria de hábitos. */
export async function POST(req: Request) {
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false, message: 'Revisa tu plan: a cada área le falta algo.' }, { status: 400 });
  if (new Set(parsed.data.areas.map((a) => a.area)).size !== parsed.data.areas.length) return Response.json({ ok: false, message: 'Un área aparece dos veces.' }, { status: 400 });
  const { data: map } = await supabase.from('life_maps').select('user_id').eq('user_id', user.id).maybeSingle();
  if (!map) return Response.json({ ok: false, message: 'Primero dibuja tu mapa.' }, { status: 400 });
  const profile = await getProfile(user.id);
  const plan = await applyPlan(supabase, user.id, parsed.data.areas, profile?.timezone ?? 'America/Mexico_City', await loadPlan(supabase, user.id));
  if (!plan) return Response.json({ ok: false, message: 'No se pudo guardar tu plan.' }, { status: 500 });
  return Response.json({ ok: true, plan });
}
