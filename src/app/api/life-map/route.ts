import { getSessionUser } from '@/lib/supabase/server';
import { loadLifeMap } from '@/lib/life-map-server';
import { AssessmentBody, MapPatch, mergeAreaGoals } from '@/lib/life-map';

/**
 * Tu mapa. POST = una medición (inicial, mensual o semanal) y, si llegan, visión, enfoque y metas.
 * PATCH = cambiar visión, enfoque o metas sin medir. Cada quien solo escribe lo suyo (RLS).
 */
export async function POST(req: Request) {
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const parsed = AssessmentBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false, message: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }, { status: 400 });
  const b = parsed.data;

  const { error } = await supabase.from('life_assessments').insert({ user_id: user.id, kind: b.kind, scores: b.scores });
  if (error) return Response.json({ ok: false, message: 'No se pudo guardar tu mapa.' }, { status: 500 });

  const saved = await saveMap(supabase, user.id, { vision: b.vision, focus: b.focus, targets: b.targets, wants: b.wants });
  return Response.json({ ok: saved });
}

export async function PATCH(req: Request) {
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const parsed = MapPatch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false, message: 'Datos inválidos.' }, { status: 400 });
  return Response.json({ ok: await saveMap(supabase, user.id, parsed.data) });
}

type Sb = Awaited<ReturnType<typeof getSessionUser>>['supabase'];

async function saveMap(supabase: Sb, userId: string, p: { vision?: string | null; focus?: string[]; targets?: Record<string, number>; wants?: Record<string, string> }) {
  if (p.vision === undefined && !p.focus && !p.targets && !p.wants) return true;
  const { map } = await loadLifeMap(supabase, userId);
  const row = {
    user_id: userId,
    vision: p.vision === undefined ? map?.vision ?? null : p.vision?.trim() || null,
    focus_areas: p.focus ?? map?.focus_areas ?? [],
    areas: mergeAreaGoals(map?.areas ?? {}, p.targets, p.wants),
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from('life_maps').upsert(row);
  return !error;
}
