import { getSessionUser } from '@/lib/supabase/server';
import { getMoment, forkOfficial } from '@/lib/moments/server';
import { rpcError } from '@/lib/social/guard';

/** "Guardar mi versión": duplica el Moment para modificarlo. Premium exige compra. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const m = await getMoment(supabase, id);
  if (!m) return Response.json({ ok: false, message: 'No encontrado.' }, { status: 404 });
  if (m.official) {
    try { return Response.json({ ok: true, id: await forkOfficial(supabase, user.id, m) }); }
    catch { return Response.json({ ok: false, message: 'No se pudo guardar tu versión.' }, { status: 500 }); }
  }
  const { data, error } = await supabase.rpc('fork_moment', { p_id: id });
  if (error) return rpcError(error.message);
  return Response.json({ ok: true, id: data });
}
