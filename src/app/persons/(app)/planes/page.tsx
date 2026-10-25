import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, Check } from 'lucide-react';
import { getPersonsSession } from '@/lib/persons/server';
import { getSettings } from '@/lib/settings';
import { UpgradeButtons } from '@/components/paywall/upgrade-buttons';

export const metadata: Metadata = { title: 'Plus' };

const FREE = ['2 personas a la vez', 'Mensajes del plan Free', 'Feedback al terminar cada sesión', 'Su emoción visible'];
const PLUS = ['Hasta 20 personas', 'Mensajes sin límite (uso justo)', 'Notas de voz de cada persona', 'Modo ciego: aprende a leer sus emociones', 'Crear y ajustar personajes cada día', 'Historial de todo tu feedback'];

/** Los mismos planes de SOI (misma suscripción en Stripe); aquí se llaman Plus. */
export default async function PersonsPlansPage() {
  const s = await getPersonsSession();
  if (typeof s === 'string') redirect('/persons/entrar');
  const settings = await getSettings();
  return (
    <main id="main" className="min-h-dvh bg-[#F0F2F5]">
      <header className="flex items-center gap-2 bg-[#008069] px-2 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-white">
        <Link href="/persons" aria-label="Volver a los chats" className="press flex h-11 w-11 items-center justify-center rounded-full"><ArrowLeft className="h-6 w-6" aria-hidden="true" /></Link>
        <h1 className="text-lg font-semibold">Plus</h1>
      </header>
      <div className="mx-auto max-w-2xl p-4">
        {s.plan === 'soi_plus' ? (
          <p className="rounded-2xl bg-white p-5 font-medium shadow-soft">Ya tienes Plus. Gracias por practicar aquí.</p>
        ) : (
          <>
            <p className="mb-4 text-soi-muted">Suscripción mensual o anual. Cancela cuando quieras desde tu cuenta. Tus conversaciones nunca se borran.</p>
            <UpgradeButtons from="persons" labels={{ soi_plus_monthly: 'Plus mensual', soi_plus_yearly: 'Plus anual' }}
              prices={{ soi_plus_monthly: settings.plans.monthly.price, soi_plus_yearly: settings.plans.yearly.price }} />
          </>
        )}
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {[{ t: 'Free', items: FREE }, { t: 'Plus', items: PLUS }].map((col) => (
            <section key={col.t} className="rounded-2xl bg-white p-5 shadow-soft">
              <h2 className="font-semibold">{col.t}</h2>
              <ul className="mt-3 flex flex-col gap-2 text-sm">{col.items.map((i) => <li key={i} className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-[#117A3E]" aria-hidden="true" />{i}</li>)}</ul>
            </section>
          ))}
        </div>
        <p className="mt-4 text-xs text-soi-muted">El cobro aparece como SOI+ (la misma suscripción).</p>
      </div>
    </main>
  );
}
