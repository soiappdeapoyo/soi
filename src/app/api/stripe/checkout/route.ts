import { getSessionUser } from '@/lib/supabase/server';
import { getProfile } from '@/lib/billing/check-access';
import { getStripe } from '@/lib/billing/stripe';
import { PLANS, type PlanKey } from '@/config/plans';
import { appUrl } from '@/lib/utils';

export async function POST(req: Request) {
  const { user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });

  const { plan } = (await req.json()) as { plan: PlanKey };
  const cfg = PLANS[plan];
  if (!cfg) return new Response('Plan inválido', { status: 400 });
  const price = process.env[cfg.priceEnv];
  if (!price) return new Response('Precio no configurado', { status: 500 });

  const profile = await getProfile(user.id);
  const session = await getStripe().checkout.sessions.create({
    mode: 'subscription', // Sin pago único: solo suscripciones.
    ...(profile?.stripe_customer_id ? { customer: profile.stripe_customer_id } : { customer_email: user.email }),
    line_items: [{ price, quantity: 1 }],
    client_reference_id: user.id,
    metadata: { user_id: user.id },
    subscription_data: { metadata: { user_id: user.id } },
    allow_promotion_codes: true,
    success_url: appUrl('/checkout/success?session_id={CHECKOUT_SESSION_ID}'),
    cancel_url: appUrl('/planes'),
    locale: 'es-419',
  });

  return Response.json({ url: session.url });
}
