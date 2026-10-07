import type Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * Activa SOI+ a partir de una sesión de Checkout de suscripción ya pagada.
 * La usan el webhook y /checkout/success (por si el webhook no llega o tarda). Idempotente.
 */
export async function activateFromCheckout(s: Stripe.Checkout.Session): Promise<boolean> {
  const userId = s.client_reference_id ?? s.metadata?.user_id;
  if (!userId || s.mode !== 'subscription' || s.status !== 'complete') return false;
  if (s.payment_status !== 'paid' && s.payment_status !== 'no_payment_required') return false;

  const customer = typeof s.customer === 'string' ? s.customer : s.customer?.id;
  const subscription = typeof s.subscription === 'string' ? s.subscription : s.subscription?.id;
  const { error } = await createAdminClient().from('user_profiles').update({
    plan: 'soi_plus',
    is_paywalled: false,
    stripe_customer_id: customer ?? null,
    stripe_subscription_id: subscription ?? null,
    subscription_status: 'active',
    subscription_ends_at: null,
  }).eq('user_id', userId);
  if (error) {
    console.error('[stripe] no se pudo activar SOI+', userId, error.message);
    return false;
  }
  return true;
}
