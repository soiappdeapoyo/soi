import { z } from 'zod/v3';
import { createAdminClient } from '@/lib/supabase/server';
import { adminFromRequest, audit } from '@/lib/admin/auth';
import { getSettings } from '@/lib/settings';

const Body = z.discriminatedUnion('action', [
  z.object({ action: z.literal('extend_trial'), days: z.number().int().min(1).max(90) }),
  z.object({ action: z.literal('set_plan'), plan: z.enum(['trial', 'free', 'soi_plus']) }),
  z.object({ action: z.literal('reset_queries') }),
]);

/** Acciones sobre una cuenta (extender prueba, cambiar plan, reponer consultas gratis). Solo administradores, auditadas. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await adminFromRequest();
  if (!admin) return new Response('No encontrado', { status: 404 });
  const { id } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false, message: 'Acción inválida.' }, { status: 400 });
  const a = createAdminClient();
  const { data: profile } = await a.from('user_profiles').select('plan, trial_ends_at, free_queries_remaining').eq('user_id', id).maybeSingle();
  if (!profile) return Response.json({ ok: false, message: 'Cuenta no encontrada.' }, { status: 404 });
  const b = parsed.data;
  let update: Record<string, unknown> = {};
  if (b.action === 'extend_trial') {
    const from = Math.max(Date.now(), Date.parse(profile.trial_ends_at as string));
    update = { plan: 'trial', trial_ends_at: new Date(from + b.days * 86_400_000).toISOString(), is_paywalled: false };
  } else if (b.action === 'set_plan') {
    update = { plan: b.plan, is_paywalled: false, ...(b.plan === 'free' ? { free_queries_remaining: (await getSettings()).freeQueryLimit } : {}) };
  } else {
    update = { free_queries_remaining: (await getSettings()).freeQueryLimit, is_paywalled: false };
  }
  const { error } = await a.from('user_profiles').update({ ...update, updated_at: new Date().toISOString() }).eq('user_id', id);
  if (error) return Response.json({ ok: false, message: 'No se pudo aplicar.' }, { status: 500 });
  await audit(admin.id, b.action, id, { antes: profile, ahora: update });
  return Response.json({ ok: true });
}
