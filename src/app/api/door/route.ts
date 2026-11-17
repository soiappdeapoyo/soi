import { z } from 'zod/v3';
import { revalidatePath } from 'next/cache';
import { createAdminClient, getSessionUser } from '@/lib/supabase/server';
import { getProfile } from '@/lib/billing/check-access';
import { DOOR_IDS } from '@/config/doors';

const Body = z.discriminatedUnion('action', [
  // Elegir su puerta principal (si llegó sin elegir, o para cambiarla).
  z.object({ action: z.literal('choose'), door: z.enum(DOOR_IDS) }),
  // Sumar otra puerta («también me pasa…»): la memoria es la misma.
  z.object({ action: z.literal('add'), door: z.enum(DOOR_IDS) }),
  z.object({ action: z.literal('remove'), door: z.enum(DOOR_IDS) }),
  // Abrir SOI Full o volver a la app enfocada (misma cuenta).
  z.object({ action: z.literal('mode'), mode: z.enum(['full', 'door']) }),
]);

/** Puertas de SOI (src/config/doors.ts). Solo el servidor escribe estas columnas. */
export async function POST(req: Request) {
  const { user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response('Datos inválidos', { status: 400 });
  const b = parsed.data;
  const profile = await getProfile(user.id);
  if (!profile || profile.app_role === 'persons') return new Response('No disponible', { status: 403 });

  const extra = (profile.extra_doors ?? []).filter((d) => d !== profile.door);
  let patch: Record<string, unknown>;
  if (b.action === 'choose') {
    // La anterior pasa a "también trabajo"; la nueva deja de estar repetida.
    const keep = [...new Set([...(profile.door && profile.door !== b.door ? [profile.door] : []), ...extra])].filter((d) => d !== b.door);
    patch = { door: b.door, extra_doors: keep };
  } else if (b.action === 'add') {
    if (!profile.door) patch = { door: b.door };
    else if (b.door === profile.door || extra.includes(b.door)) return Response.json({ ok: true });
    else patch = { extra_doors: [...extra, b.door].slice(0, 3) };
  } else if (b.action === 'remove') {
    patch = { extra_doors: extra.filter((d) => d !== b.door) };
  } else {
    patch = { ui_mode: b.mode };
  }
  const { error } = await createAdminClient().from('user_profiles').update(patch).eq('user_id', user.id);
  if (error) return Response.json({ ok: false }, { status: 500 });
  revalidatePath('/', 'layout');
  return Response.json({ ok: true });
}
