import { Suspense } from 'react';
import type { Metadata } from 'next';
import { MessageCircle } from 'lucide-react';
import { LoginForm } from '@/components/auth/login-form';
import { PERSONS_BRAND, PERSONS_TAGLINE } from '@/config/persons';

export const metadata: Metadata = { title: 'Entrar' };

const POINTS = [
  'Personas sintéticas con su propio día: a veces contestan al momento, a veces cuando salen del trabajo.',
  'Sus emociones cambian con lo que dices, y se notan como en un chat real.',
  'Al terminar, un coach te dice qué funcionó y qué probar la próxima vez.',
];

/** Entrada de /persons: otro tipo de cuenta (no es la de SOI), con Google. */
export default function PersonsLoginPage() {
  return (
    <main id="main" className="flex min-h-dvh flex-col bg-[#EFEAE2]">
      <div className="bg-[#008069] px-5 pb-16 pt-[max(2.5rem,env(safe-area-inset-top))] text-white">
        <div className="mx-auto max-w-sm">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15"><MessageCircle className="h-7 w-7" aria-hidden="true" /></span>
          <h1 className="mt-4 text-3xl font-semibold">{PERSONS_BRAND}</h1>
          <p className="mt-1 text-white/90">{PERSONS_TAGLINE}</p>
        </div>
      </div>
      <div className="mx-auto -mt-10 w-full max-w-sm px-4 pb-10">
        <div className="rounded-3xl bg-white p-5 shadow-raised">
          <ul className="flex flex-col gap-3 text-[15px]">
            {POINTS.map((p) => <li key={p} className="flex gap-2"><span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#008069]" />{p}</li>)}
          </ul>
          <div className="mt-6"><Suspense><LoginForm role="persons" /></Suspense></div>
          <p className="mt-5 text-center text-xs text-soi-muted">
            Todas las personas son ficticias.
          </p>
        </div>
      </div>
    </main>
  );
}
