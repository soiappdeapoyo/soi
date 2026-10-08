import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getSessionUser } from '@/lib/supabase/server';
import { getConsentState, safeNext } from '@/lib/consent';
import { ConsentForm } from '@/components/legal/consent-form';
import { NavTracker } from '@/components/analytics/nav-tracker';
import { Suspense } from 'react';

export const metadata: Metadata = { title: 'Consentimiento legal', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

/** Antes de usar SOI: aceptar términos y aviso de privacidad y declarar ser mayor de 18 años. */
export default async function ConsentPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { user } = await getSessionUser();
  const next = safeNext((await searchParams).next);
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  const { state } = await getConsentState(user.id);
  if (state === 'ok') redirect(next);

  return (
    <main id="main" className="flex min-h-dvh items-center justify-center bg-soi-sidebar px-4 py-10">
      <Suspense fallback={null}><NavTracker /></Suspense>
      <div className="w-full max-w-md rounded-[24px] bg-white px-6 py-9 text-center shadow-ring sm:px-9">
        <p className="text-2xl font-semibold">SOI.</p>
        <h1 className="mt-5 text-[26px] font-semibold leading-tight">Consentimiento legal</h1>
        <p className="mt-2 text-soi-muted">
          {state === 'updated'
            ? 'Actualizamos nuestros términos. Léelos y acéptalos para continuar.'
            : 'Lee y acepta los términos para continuar.'}
        </p>
        <ConsentForm next={next} />
        <form action="/auth/signout" method="post" className="mt-6 text-sm text-soi-muted">
          ¿No eres tú? <button type="submit" className="font-medium text-soi-ink underline underline-offset-2">Cerrar sesión</button>
        </form>
      </div>
    </main>
  );
}
