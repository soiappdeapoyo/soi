import { z } from 'zod/v3';
import { getSessionUser } from '@/lib/supabase/server';

const Time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const Subscription = z.object({ endpoint: z.string().url().max(1000), keys: z.object({ p256dh: z.string().max(200), auth: z.string().max(100) }) }).passthrough();
const Post = z.object({ subscription: Subscription, reminderTime: Time.optional() });
const Patch = z.object({ reminderTime: Time.nullable().optional(), enabled: z.boolean().optional() });

/** Activa los avisos en este dispositivo (y, si viene, la hora del recordatorio diario). */
export async function POST(req: Request) {
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const raw = await req.json().catch(() => null);
  // Compatibilidad: antes llegaba la suscripción sola.
  const parsed = Post.safeParse(raw?.subscription ? raw : { subscription: raw });
  if (!parsed.success) return new Response('Suscripción inválida', { status: 400 });
  const { error } = await supabase.from('user_profiles').update({
    push_subscription: parsed.data.subscription, reminders_enabled: true,
    ...(parsed.data.reminderTime ? { reminder_time: parsed.data.reminderTime } : {}),
  }).eq('user_id', user.id);
  return Response.json({ ok: !error });
}

/** Cambia la hora del recordatorio diario o lo pausa sin quitar el permiso. */
export async function PATCH(req: Request) {
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response('Datos inválidos', { status: 400 });
  const { reminderTime, enabled } = parsed.data;
  const { error } = await supabase.from('user_profiles').update({
    ...(reminderTime !== undefined ? { reminder_time: reminderTime } : {}),
    ...(enabled !== undefined ? { reminders_enabled: enabled } : {}),
  }).eq('user_id', user.id);
  return Response.json({ ok: !error });
}

export async function DELETE() {
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  await supabase.from('user_profiles').update({ push_subscription: null }).eq('user_id', user.id);
  return Response.json({ ok: true });
}
