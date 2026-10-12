import type Stripe from 'stripe';
import { getStripe } from '@/lib/billing/stripe';

/** Lo que Ajustes muestra de la suscripción a SOI+ (Stripe es la fuente de verdad). */
export type SubscriptionView = {
  id: string;
  status: Stripe.Subscription.Status;
  interval: 'month' | 'year' | null;
  /** Fin del periodo pagado (ISO): se renueva ese día o, si se canceló, ahí termina SOI+. */
  periodEnd: string;
  cancelAtPeriodEnd: boolean;
};

export function subscriptionView(sub: Stripe.Subscription): SubscriptionView {
  const interval = sub.items.data[0]?.price.recurring?.interval;
  return {
    id: sub.id,
    status: sub.status,
    interval: interval === 'month' || interval === 'year' ? interval : null,
    periodEnd: new Date(sub.current_period_end * 1000).toISOString(),
    cancelAtPeriodEnd: sub.cancel_at_period_end,
  };
}

/** Columnas del perfil que reflejan la suscripción (webhook y cancelación propia). */
export function profileFields(sub: Stripe.Subscription) {
  return {
    subscription_status: sub.status,
    subscription_ends_at: sub.cancel_at_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
  };
}

const LIVE = new Set<Stripe.Subscription.Status>(['active', 'trialing', 'past_due', 'unpaid', 'incomplete']);

/**
 * La suscripción viva de la persona: la guardada en el perfil o, si falta (perfiles anteriores), la del cliente.
 * Solo devuelve una suscripción de SU cliente de Stripe.
 */
export async function loadSubscription(customerId: string | null | undefined, subscriptionId: string | null | undefined): Promise<Stripe.Subscription | null> {
  if (!customerId) return null;
  const stripe = getStripe();
  if (subscriptionId) {
    const sub = await stripe.subscriptions.retrieve(subscriptionId).catch(() => null);
    const owner = typeof sub?.customer === 'string' ? sub.customer : sub?.customer.id;
    if (sub && owner === customerId && LIVE.has(sub.status)) return sub;
  }
  const { data } = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 10 });
  return data.find((s) => LIVE.has(s.status)) ?? null;
}
