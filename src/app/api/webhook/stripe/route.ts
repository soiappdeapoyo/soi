import type Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/billing/stripe';
import { creatorShare } from '@/config/creators';

export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature');
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig!, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return new Response('Firma inválida', { status: 400 });
  }

  const db = createAdminClient();

  switch (event.type) {
    case 'checkout.session.completed': {
      const s = event.data.object as Stripe.Checkout.Session;
      const userId = s.client_reference_id ?? s.metadata?.user_id;

      // Compra única de un Blueprint premium: NO es una suscripción a SOI+.
      if (s.metadata?.kind === 'blueprint') {
        const blueprintId = s.metadata.blueprint_id;
        if (userId && blueprintId && s.payment_status === 'paid') {
          const { data: bp } = await db.from('soi_blueprints').select('creator_id, currency').eq('id', blueprintId).maybeSingle();
          if (bp) {
            const amount = s.amount_total ?? 0;
            const { error } = await db.from('blueprint_purchases').upsert({
              user_id: userId, blueprint_id: blueprintId, creator_id: bp.creator_id,
              amount_cents: amount, creator_share_cents: creatorShare(amount),
              currency: s.currency ?? bp.currency, stripe_session_id: s.id,
            }, { onConflict: 'stripe_session_id', ignoreDuplicates: true });
            if (error) console.error('[stripe] blueprint purchase', error.message);
          }
        }
        break;
      }

      if (userId && s.mode === 'subscription') {
        await db.from('user_profiles').update({
          plan: 'soi_plus',
          is_paywalled: false,
          stripe_customer_id: s.customer as string,
          stripe_subscription_id: s.subscription as string,
          subscription_status: 'active',
          subscription_ends_at: null,
        }).eq('user_id', userId);
      }
      break;
    }
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const active = ['active', 'trialing', 'past_due'].includes(sub.status);
      await db.from('user_profiles')
        .update({ subscription_status: sub.status, ...(active ? { plan: 'soi_plus' } : {}) })
        .eq('stripe_subscription_id', sub.id);
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      await db.from('user_profiles').update({
        plan: 'free',
        subscription_status: 'canceled',
        subscription_ends_at: new Date().toISOString(),
      }).eq('stripe_subscription_id', sub.id);
      break;
    }
  }
  return Response.json({ received: true });
}
