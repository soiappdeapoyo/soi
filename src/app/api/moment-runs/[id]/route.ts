import { z } from 'zod/v3';
import { getSessionUser } from '@/lib/supabase/server';

const Body = z.object({ outputs: z.record(z.unknown()) });

/** Guarda lo que la persona escribe o marca en cada bloque (se puede retomar si cierra la app). */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success || JSON.stringify(parsed.data.outputs).length > 20_000) return new Response('Datos inválidos', { status: 400 });
  const { error } = await supabase.from('moment_runs').update({ outputs: parsed.data.outputs })
    .eq('id', id).eq('user_id', user.id).is('completed_at', null);
  return Response.json({ ok: !error });
}
