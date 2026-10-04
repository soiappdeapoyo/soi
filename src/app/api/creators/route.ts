import { z } from 'zod/v3';
import { getSessionUser } from '@/lib/supabase/server';
import { moderateFields } from '@/lib/social/guard';

const Body = z.object({
  handle: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,30}$/, 'Usa 3 a 30 letras, números o guion bajo.'),
  displayName: z.string().trim().min(2).max(60),
  bio: z.string().trim().max(400).optional(),
  methodology: z.string().trim().max(3000).optional(),
  principles: z.array(z.string().trim().min(2).max(160)).max(10).default([]),
  boundaries: z.array(z.string().trim().min(2).max(160)).max(10).default([]),
});

/** Crear o actualizar el perfil de Transformation Creator (incluye su método para la IA). */
export async function POST(req: Request) {
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return Response.json({ ok: false, message: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 });
  const c = parsed.data;

  const blocked = await moderateFields([c.displayName, c.bio, c.methodology, ...c.principles]);
  if (blocked) return blocked;

  const { data: existing } = await supabase.from('creator_profiles').select('user_id').eq('user_id', user.id).maybeSingle();
  const fields = {
    display_name: c.displayName, bio: c.bio ?? null, methodology: c.methodology ?? null,
    principles: c.principles, boundaries: c.boundaries,
  };
  const { error } = existing
    ? await supabase.from('creator_profiles').update({ ...fields, updated_at: new Date().toISOString() }).eq('user_id', user.id)
    : await supabase.from('creator_profiles').insert({ user_id: user.id, handle: c.handle, ...fields });

  if (error) {
    const taken = error.code === '23505';
    return Response.json({ ok: false, message: taken ? 'Ese nombre de usuario ya está en uso.' : 'No se pudo guardar.' }, { status: taken ? 409 : 500 });
  }
  return Response.json({ ok: true });
}
