import type { Metadata } from 'next';
import { Check, X } from 'lucide-react';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/supabase/server';
import { getAccessMap } from '@/lib/billing/check-access';
import { UpgradeButtons } from '@/components/paywall/upgrade-buttons';
import { SOI_PLUS_BENEFITS } from '@/config/plans';

export const metadata: Metadata = { title: 'SOI+' };

const FREE = [
  { t: 'Chat con IA (20 consultas en total)', ok: true },
  { t: 'Onboarding y perfil', ok: true },
  { t: 'Recomendación de rutinas', ok: true },
  { t: 'Rutinas guiadas con temporizador', ok: false },
  { t: 'Voz (TTS)', ok: false },
  { t: 'Muro de Evidencias y PDF', ok: false },
  { t: 'Comunidad', ok: false },
  { t: 'Ritual diario', ok: false },
];

export default async function PlanesPage() {
  const { user } = await getSessionUser();
  if (!user) redirect('/login');
  const { plan } = await getAccessMap(user.id);

  return (
    <div className="mx-auto max-w-3xl px-5 py-8">
      <h1 className="text-3xl font-semibold">Pasa a SOI+</h1>
      <p className="mt-1 text-soi-muted">Suscripción mensual o anual. Cancela cuando quieras. Sin pagos únicos.</p>

      {plan === 'soi_plus' ? (
        <p className="mt-6 rounded-3xl bg-soi-gold/15 p-5 font-medium">Ya eres SOI+ ✨ Gracias por ser parte.</p>
      ) : (
        <div className="mt-6"><UpgradeButtons /></div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <section className="rounded-3xl bg-white shadow-soft p-5">
          <h2 className="font-semibold">Free</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {FREE.map((f) => (
              <li key={f.t} className="flex gap-2">
                {f.ok ? <Check className="h-4 w-4 text-green-700" aria-label="Incluido" /> : <X className="h-4 w-4 text-soi-muted" aria-label="No incluido" />}{f.t}
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-3xl bg-white p-5 shadow-[0_0_0_2px_var(--color-soi-gold),0_8px_24px_rgb(0_0_0/0.05)]">
          <h2 className="font-semibold">SOI+</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {SOI_PLUS_BENEFITS.map((b) => <li key={b} className="flex gap-2"><Check className="h-4 w-4 text-green-700" aria-label="Incluido" />{b}</li>)}
          </ul>
        </section>
      </div>
    </div>
  );
}
