import { getSessionUser } from '@/lib/supabase/server';
import { getProfile } from '@/lib/billing/check-access';
import { getStripe } from '@/lib/billing/stripe';
import { appUrl } from '@/lib/utils';

export async function POST() {
  const { user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const profile = await getProfile(user.id);
  if (!profile?.stripe_customer_id) return Response.json({ error: 'No encontramos tu suscripción.' }, { status: 400 });
  try {
    const session = await getStripe().billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: appUrl('/ajustes'),
      locale: 'es-419',
    });
    return Response.json({ url: session.url });
  } catch (error) {
    // Típico: el portal no está configurado en modo live (Stripe → Settings → Billing → Customer portal).
    console.error('[stripe] portal', user.id, error instanceof Error ? error.message : error);
    return Response.json({ error: 'No pudimos abrir el portal de pagos. Inténtalo otra vez en un momento.' }, { status: 502 });
  }
}
