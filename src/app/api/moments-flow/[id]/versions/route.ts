import { z } from 'zod/v3';
import { getSessionUser } from '@/lib/supabase/server';
import { getMoment, forkOfficial } from '@/lib/moments/server';
import { validBlocks } from '@/lib/moments/input';
import { rpcError } from '@/lib/social/guard';

const Body = z.object({ blocks: z.array(z.unknown()).min(1).max(20), note: z.string().trim().max(500).optional() });

/**
 * Aceptar la mejor versión. Sobre un Moment propio sube de versión (con historial).
 * Si es de otra persona u oficial, primero se guarda una copia tuya: el original nunca cambia.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return new Response('Datos inválidos', { status: 400 });
  const { blocks, message } = validBlocks(parsed.data.blocks);
  if (!blocks) return Response.json({ ok: false, message }, { status: 400 });

  const m = await getMoment(supabase, id);
  if (!m) return Response.json({ ok: false, message: 'No encontrado.' }, { status: 404 });

  let target = m.id;
  if (m.official) {
    try { target = await forkOfficial(supabase, user.id, m); }
    catch { return Response.json({ ok: false, message: 'No se pudo guardar tu versión.' }, { status: 500 }); }
  } else if (m.creator_id !== user.id) {
    const { data, error } = await supabase.rpc('fork_moment', { p_id: m.id });
    if (error) return rpcError(error.message);
    target = data as string;
  }
  const { data: version, error } = await supabase.rpc('save_moment_version', { p_id: target, p_blocks: blocks, p_note: parsed.data.note ?? null });
  if (error) return rpcError(error.message);
  return Response.json({ ok: true, id: target, version });
}
