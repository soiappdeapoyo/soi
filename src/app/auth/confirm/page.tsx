import type { Metadata } from 'next';
import { ConfirmSession } from '@/components/auth/confirm-session';

export const metadata: Metadata = { title: 'Entrando', robots: { index: false, follow: false } };

/** El enlace del correo llega aquí (en cualquier navegador): guarda la sesión y sigue a /auth/finish. */
export default function ConfirmPage() {
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center px-5 text-center">
      <p className="text-4xl font-semibold">SOI.</p>
      <ConfirmSession />
    </main>
  );
}
