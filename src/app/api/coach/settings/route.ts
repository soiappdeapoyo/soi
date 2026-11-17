import { z } from 'zod/v3';
import { getSessionUser } from '@/lib/supabase/server';

const Body = z.object({ enabled: z.boolean() });

/** «SOI me escribe»: prende o apaga los mensajes que SOI escribe primero. */
export async function PATCH(req: Request) {
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response('Datos inválidos', { status: 400 });
  const { error } = await supabase.from('user_profiles').update({ coach_messages_enabled: parsed.data.enabled }).eq('user_id', user.id);
  return Response.json({ ok: !error });
}
