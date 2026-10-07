import Link from 'next/link';
import type { Metadata } from 'next';
import { buttonClass } from '@/components/ui/button';
import { getSessionUser } from '@/lib/supabase/server';
import { getStripe } from '@/lib/billing/stripe';
import { activateFromCheckout } from '@/lib/billing/activate';

export const metadata: Metadata = { title: 'Bienvenida a SOI+' };

/** Confirma el pago con Stripe sin esperar al webhook. Solo activa la cuenta dueña de la sesión. */
async function confirmCheckout(sessionId: string | undefined): Promise<boolean> {
  if (!sessionId?.startsWith('cs_')) return false;
  const { user } = await getSessionUser();
  if (!user) return false;
  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    if ((session.client_reference_id ?? session.metadata?.user_id) !== user.id) return false;
    return await activateFromCheckout(session);
  } catch (err) {
    console.error('[stripe] no se pudo confirmar el checkout', (err as Error).message);
    return false;
  }
}

export default async function CheckoutSuccessPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id } = await searchParams;
  const active = await confirmCheckout(session_id);

  return (
    <main id="main" className="mx-auto max-w-md px-5 py-16 text-center">
      <p className="text-5xl" aria-hidden="true">✨</p>
      <h1 className="mt-3 text-3xl font-semibold">¡Bienvenida a SOI+!</h1>
      <p className="mt-3 text-soi-muted">
        {active
          ? 'Tu suscripción está activa. Todo está desbloqueado.'
          : 'Recibimos tu pago. Tu suscripción puede tardar unos segundos en reflejarse.'}
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-2">
        <Link href="/hoy" className={buttonClass('gold')}>Ir a Hoy</Link>
        <Link href="/chat" className={buttonClass('outline')}>Hablar con SOI</Link>
      </div>
    </main>
  );
}
