import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { LoginForm } from '@/components/auth/login-form';

export const metadata: Metadata = { title: 'Entrar' };

export default function LoginPage() {
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-5 py-10">
      <Link href="/" className="text-center text-4xl font-bold">SOI<span className="text-soi-gold">.</span></Link>
      <p className="mb-8 mt-2 text-center text-black/70">Diseña tu identidad. Vive tu propósito.</p>
      <Suspense><LoginForm /></Suspense>
      <p className="mt-8 text-center text-xs text-black/50">
        Al continuar aceptas los <Link href="/terminos" className="underline">Términos</Link> y la <Link href="/privacidad" className="underline">Política de privacidad</Link>.
      </p>
    </main>
  );
}
