import Link from 'next/link';
import { buttonClass } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main id="main" className="mx-auto max-w-md px-5 py-20 text-center">
      <h1 className="text-3xl font-semibold">Esta página no existe</h1>
      <p className="mt-2 text-soi-muted">Pero tu camino sí. Volvamos.</p>
      <Link href="/chat" className={buttonClass('gold', 'md', 'mt-6')}>Ir a SOI</Link>
    </main>
  );
}
