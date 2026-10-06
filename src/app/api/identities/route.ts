import { z } from 'zod/v3';
import { getSessionUser } from '@/lib/supabase/server';
import { isCapacity } from '@/config/capacities';
import { resetLinks } from '@/lib/identity/classify';

const Body = z.object({
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(240).optional(),
  capacities: z.array(z.string()).max(6).default([]),
});

/** Agregar una identidad que la persona está construyendo (confirmada por ella). */
export async function POST(req: Request) {
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false, message: 'Escribe un nombre de 2 a 60 caracteres.' }, { status: 400 });
  const { count } = await supabase.from('identities').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'active');
  if ((count ?? 0) >= 7) return Response.json({ ok: false, message: 'Enfócate en hasta 7 identidades. Archiva una para agregar otra.' }, { status: 400 });
  const { data, error } = await supabase.from('identities').insert({
    user_id: user.id, name: parsed.data.name, description: parsed.data.description || null,
    capacities: parsed.data.capacities.filter(isCapacity).slice(0, 6), status: 'active', position: count ?? 0,
  }).select('id').single();
  if (error) return Response.json({ ok: false, message: 'No se pudo guardar.' }, { status: 500 });
  await resetLinks(user.id); // los Moments se vuelven a conectar con el nuevo conjunto de identidades
  return Response.json({ ok: true, id: data.id });
}
