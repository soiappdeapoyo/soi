import { z } from 'zod/v3';
import { createServerClient, getSessionUser } from '@/lib/supabase/server';
import { deleteUserAccount } from '@/lib/account/server';
import { deleteConfirmed } from '@/lib/account/rules';

export const maxDuration = 60;

const Body = z.object({ confirm: z.string().max(40) });

/** La persona borra su propia cuenta (escribe BORRAR para confirmar). Cierra la sesión al terminar. */
export async function DELETE(req: Request) {
  const { user } = await getSessionUser();
  if (!user) return Response.json({ ok: false, message: 'Inicia sesión.' }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !deleteConfirmed(parsed.data.confirm)) return Response.json({ ok: false, message: 'Escribe BORRAR para confirmar.' }, { status: 400 });

  const r = await deleteUserAccount(user.id);
  if (!r.ok) return Response.json(r, { status: 409 });
  await (await createServerClient()).auth.signOut().catch(() => undefined);
  return Response.json({ ok: true });
}
