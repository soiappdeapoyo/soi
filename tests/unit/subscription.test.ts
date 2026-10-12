import { describe, it, expect } from 'vitest';
import type Stripe from 'stripe';
import { profileFields, subscriptionView } from '@/lib/billing/subscription';

const sub = (over: Partial<Stripe.Subscription> = {}) => ({
  id: 'sub_1', status: 'active', cancel_at_period_end: false, current_period_end: 1_800_000_000,
  items: { data: [{ price: { recurring: { interval: 'month' } } }] }, ...over,
}) as unknown as Stripe.Subscription;

describe('suscripción en Ajustes', () => {
  it('muestra el plan y la fecha de renovación', () => {
    expect(subscriptionView(sub())).toEqual({ id: 'sub_1', status: 'active', interval: 'month', periodEnd: new Date(1_800_000_000_000).toISOString(), cancelAtPeriodEnd: false });
  });
  it('una cancelación programada guarda cuándo termina SOI+; al reanudar se borra', () => {
    expect(profileFields(sub({ cancel_at_period_end: true }))).toEqual({ subscription_status: 'active', subscription_ends_at: new Date(1_800_000_000_000).toISOString() });
    expect(profileFields(sub())).toEqual({ subscription_status: 'active', subscription_ends_at: null });
  });
});
