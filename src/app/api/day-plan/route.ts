import { z } from 'zod/v3';
import { getSessionUser } from '@/lib/supabase/server';
import { DayItemsSchema, resolveRefs } from '@/lib/day-plan';

const Body = z.object({ items: DayItemsSchema });

/** Guardar "Mi día" (orden, horas). Solo Moments que la persona puede ver (propios, comprados, publicados u oficiales). */
export async function PUT(req: Request) {
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false, message: 'Plan inválido.' }, { status: 400 });
  const known = await resolveRefs(supabase, parsed.data.items.map((i) => i.ref));
  const items = parsed.data.items.filter((i) => known.has(i.ref));
  const { error } = await supabase.from('day_plans').upsert({ user_id: user.id, items, updated_at: new Date().toISOString() });
  if (error) return Response.json({ ok: false, message: 'No se pudo guardar.' }, { status: 500 });
  return Response.json({ ok: true, items });
}
