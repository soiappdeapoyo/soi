import { getSessionUser } from '@/lib/supabase/server';
import { BeliefInput } from '@/lib/beliefs';
import { registerBelief } from '@/lib/beliefs-server';

/** Anotar a mano un pensamiento que frena (y, si quiere, la creencia nueva). La IA usa la misma función desde el chat. */
export async function POST(req: Request) {
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const parsed = BeliefInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false, message: 'Escribe el pensamiento en pocas palabras.' }, { status: 400 });
  const r = await registerBelief(supabase, user.id, parsed.data);
  return Response.json(r, { status: r.ok ? 200 : 500 });
}
