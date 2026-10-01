import Link from 'next/link';
import type { Metadata } from 'next';
import { buttonClass } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Bienvenida a SOI+' };

export default function CheckoutSuccessPage() {
  return (
    <main id="main" className="mx-auto max-w-md px-5 py-16 text-center">
      <p className="text-5xl" aria-hidden="true">✨</p>
      <h1 className="mt-3 text-3xl font-bold">¡Bienvenida a SOI+!</h1>
      <p className="mt-3 text-black/70">Tu suscripción está activa. Todo está desbloqueado. (Puede tardar unos segundos en reflejarse.)</p>
      <div className="mt-8 flex flex-wrap justify-center gap-2">
        <Link href="/ritual" className={buttonClass('gold')}>Ver mi ritual de hoy</Link>
        <Link href="/rutinas" className={buttonClass('outline')}>Rutinas</Link>
      </div>
    </main>
  );
}
