import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getPersonsSession } from '@/lib/persons/server';
import { trialDaysLeft } from '@/lib/billing/access-rules';
import { loadSubscription, subscriptionView } from '@/lib/billing/subscription';
import { SubscriptionSection } from '@/components/settings/subscription-section';
import { AccountData } from '@/components/settings/account-data';
import { buttonClass } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Tu cuenta' };
export const dynamic = 'force-dynamic';

/** Plan, suscripción (cancelar o reanudar, como en SOI), tus datos y cerrar sesión. */
export default async function PersonsAccountPage() {
  const s = await getPersonsSession();
  if (typeof s === 'string') redirect('/persons/entrar');
  const p = s.profile;
  const sub = p.stripe_customer_id
    ? await loadSubscription(p.stripe_customer_id, p.stripe_subscription_id).catch((e: unknown) => { console.error('[stripe] persons cuenta', e instanceof Error ? e.message : e); return null; })
    : null;
  const planLine = s.plan === 'soi_plus' ? 'Plus' : s.plan === 'trial' ? `Prueba · ${trialDaysLeft(p)} días restantes` : 'Free';

  return (
    <main id="main" className="min-h-dvh bg-[#F0F2F5] md:min-h-[calc(100dvh-2rem)]">
      <header className="flex items-center gap-2 bg-[#008069] px-2 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-white">
        <Link href="/persons" aria-label="Volver a los chats" className="press flex h-11 w-11 items-center justify-center rounded-full"><ArrowLeft className="h-6 w-6" aria-hidden="true" /></Link>
        <h1 className="text-lg font-semibold">Tu cuenta</h1>
      </header>
      <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4">
        <section className="rounded-2xl bg-white p-5 shadow-soft">
          <p className="font-semibold">{p.display_name ?? s.email}</p>
          <p className="text-sm text-soi-muted">{s.email}</p>
          <p className="mt-3 text-sm">Plan: <span className="font-medium">{planLine}</span></p>
          <div className="mt-3 flex flex-wrap gap-2">
            {s.plan !== 'soi_plus' && <Link href="/persons/planes" className={buttonClass('primary', 'sm', 'bg-[#008069] hover:bg-[#006E5A]')}>Ver Plus</Link>}
            <Link href="/persons/invitar" className={buttonClass('outline', 'sm')}>Invita y gana días</Link>
          </div>
        </section>
        {p.stripe_customer_id && (
          <section className="rounded-2xl bg-white p-5 shadow-soft">
            <SubscriptionSection subscription={sub ? subscriptionView(sub) : null} hasCustomer timezone={s.timezone} />
          </section>
        )}
        <AccountData />
        <section className="rounded-2xl bg-white p-5 text-sm shadow-soft">
          <p className="text-soi-muted">Las personas de aquí son ficticias, creadas con IA para practicar. No sustituyen a una persona real ni a la terapia.</p>
          <p className="mt-3 flex gap-4"><Link href="/terminos" className="underline">Términos</Link><Link href="/privacidad" className="underline">Aviso de privacidad</Link></p>
          <form action="/auth/signout" method="post" className="mt-4"><button type="submit" className={buttonClass('outline', 'md', 'w-full')}>Cerrar sesión</button></form>
        </section>
      </div>
    </main>
  );
}
