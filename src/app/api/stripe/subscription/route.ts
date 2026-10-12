import { z } from 'zod/v3';
import { createAdminClient, getSessionUser } from '@/lib/supabase/server';
import { getProfile } from '@/lib/billing/check-access';
import { getStripe } from '@/lib/billing/stripe';
import { loadSubscription, profileFields, subscriptionView } from '@/lib/billing/subscription';

const Body = z.object({ action: z.enum(['cancel', 'resume']) });

/**
 * Cancelar SOI+ desde Ajustes, sin depender de cómo esté configurado el portal de Stripe.
 * Cancela al final del periodo pagado (sigue con SOI+ hasta esa fecha; después pasa a Free con el webhook
 * `customer.subscription.deleted`). `resume` deshace la cancelación mientras el periodo siga vigente.
 */
export async function POST(req: Request) {
  const { user } = await getSessionUser();
  if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Datos inválidos' }, { status: 400 });

  const profile = await getProfile(user.id);
  try {
    const sub = await loadSubscription(profile?.stripe_customer_id, profile?.stripe_subscription_id);
    if (!sub) return Response.json({ error: 'No encontramos una suscripción activa.' }, { status: 404 });
    const updated = await getStripe().subscriptions.update(sub.id, { cancel_at_period_end: parsed.data.action === 'cancel' });
    await createAdminClient().from('user_profiles').update({ stripe_subscription_id: updated.id, ...profileFields(updated) }).eq('user_id', user.id);
    return Response.json({ subscription: subscriptionView(updated) });
  } catch (error) {
    console.error('[stripe] cancelar/reanudar', user.id, error instanceof Error ? error.message : error);
    return Response.json({ error: 'No pudimos actualizar tu suscripción. Inténtalo otra vez en un momento.' }, { status: 502 });
  }
}
