import { z } from 'zod';
import { adminFromRequest, audit } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { sendBroadcast } from '@/lib/notifications-server';

const Body = z.object({
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(2000),
  // Solo rutas de la app (sin enlaces de fuera).
  url: z.string().trim().max(300).regex(/^\/(?!\/)/).optional().or(z.literal('')),
  email: z.string().trim().email().optional().or(z.literal('')),
});

/** Aviso escrito a mano en el panel → la campanita de todas las cuentas de SOI o de una (por correo). Auditado. */
export async function POST(req: Request) {
  const admin = await adminFromRequest();
  if (!admin) return new Response('No encontrado', { status: 404 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false, message: 'Revisa el título, el texto y el enlace (debe empezar con /).' }, { status: 400 });
  const b = parsed.data;
  let userId: string | null = null;
  if (b.email) {
    const { data } = await createAdminClient().auth.admin.listUsers({ page: 1, perPage: 1000 });
    userId = data?.users.find((u) => u.email?.toLowerCase() === b.email!.toLowerCase())?.id ?? null;
    if (!userId) return Response.json({ ok: false, message: 'No encontramos una cuenta con ese correo.' }, { status: 404 });
  }
  try {
    const sent = await sendBroadcast({ title: b.title, body: b.body, url: b.url || null, userId, adminId: admin.id });
    await audit(admin.id, 'enviar_aviso', userId, { titulo: b.title, personas: sent });
    return Response.json({ ok: true, sent });
  } catch (e) {
    console.error('[avisos] no se pudo enviar', e instanceof Error ? e.message : e);
    return Response.json({ ok: false, message: 'No se pudo enviar.' }, { status: 500 });
  }
}
