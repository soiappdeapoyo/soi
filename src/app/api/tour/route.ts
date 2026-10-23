import { z } from 'zod/v3';
import { createAdminClient, getSessionUser } from '@/lib/supabase/server';

const Body = z.object({ outcome: z.enum(['completed', 'skipped']) });

/** La persona terminó o saltó la introducción de bienvenida: no se vuelve a mostrar sola (se repite desde Ajustes). */
export async function POST(req: Request) {
  const { user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response('Datos inválidos', { status: 400 });
  const { error } = await createAdminClient().from('user_profiles').update({ tour_seen_at: new Date().toISOString() }).eq('user_id', user.id);
  if (error) return Response.json({ ok: false }, { status: 500 });
  return Response.json({ ok: true });
}
