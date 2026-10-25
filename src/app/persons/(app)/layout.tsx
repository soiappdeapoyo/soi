import { redirect } from 'next/navigation';
import { getPersonsSession } from '@/lib/persons/server';
import { getConsentState } from '@/lib/consent';
import { PersonsNotifier } from '@/components/persons/notifier';
import { AnalyticsProvider } from '@/components/providers/analytics';
import { buttonClass } from '@/components/ui/button';
import { PERSONS_BRAND } from '@/config/persons';

/** /persons con sesión: solo cuentas de este tipo (y administración). Consentimiento legal antes que nada. */
export default async function PersonsAppLayout({ children }: { children: React.ReactNode }) {
  const s = await getPersonsSession();
  if (s === 'signed_out') redirect('/persons/entrar');
  if (s === 'other_account') {
    return (
      <main id="main" className="flex min-h-dvh items-center justify-center bg-[#EFEAE2] px-4">
        <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-raised">
          <h1 className="text-xl font-semibold">Esta cuenta es de SOI</h1>
          <p className="mt-2 text-soi-muted">{PERSONS_BRAND} usa cuentas separadas. Cierra sesión y entra con otra cuenta de Google para practicar aquí.</p>
          <form action="/auth/signout" method="post" className="mt-5"><button type="submit" className={buttonClass('primary', 'md', 'w-full')}>Cerrar sesión</button></form>
          <a href="/hoy" className="mt-3 inline-block text-sm text-soi-muted underline underline-offset-2">Volver a SOI</a>
        </div>
      </main>
    );
  }
  const consent = await getConsentState(s.userId);
  if (consent.state !== 'ok') redirect('/consentimiento?next=/persons');

  return (
    <div className="min-h-dvh overflow-x-clip bg-[#F0F2F5] md:py-4">
      <AnalyticsProvider userId={s.userId} />
      <PersonsNotifier />
      <div className="relative mx-auto min-h-dvh w-full max-w-3xl overflow-x-clip bg-white md:min-h-[calc(100dvh-2rem)] md:overflow-hidden md:rounded-2xl md:shadow-soft">{children}</div>
    </div>
  );
}
