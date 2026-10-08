import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { LoginForm } from '@/components/auth/login-form';

export const metadata: Metadata = { title: 'Entrar' };

export default function LoginPage() {
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-5 py-10">
      <Link href="/" className="text-center text-4xl font-semibold">SOI.</Link>
      <p className="mb-8 mt-2 text-center text-soi-muted">Diseña tu identidad. Vive tu propósito.</p>
      <Suspense><LoginForm /></Suspense>
      <p className="mt-8 text-center text-xs text-soi-muted">
        Al entrar te pediremos aceptar los <Link href="/terminos" className="underline">Términos</Link> y el <Link href="/privacidad" className="underline">Aviso de privacidad</Link>, y confirmar que eres mayor de 18 años.
      </p>
    </main>
  );
}
