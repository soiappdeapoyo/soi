import Link from 'next/link';
import { Lock } from 'lucide-react';
import { buttonClass } from '@/components/ui/button';

/**
 * Candado + CTA para secciones bloqueadas en Free.
 * El candado no rebota ni sacude: sin urgencia falsa (DESIGN.md §5 · Paywall).
 */
export function LockedFeature({ title, description, preview }: { title: string; description: string; preview?: React.ReactNode }) {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-white p-6 text-center shadow-soft" aria-labelledby="locked-title">
      {preview && <div className="pointer-events-none select-none opacity-40 blur-sm" aria-hidden="true">{preview}</div>}
      <div className={preview ? 'absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/70 p-6' : 'flex flex-col items-center gap-3'}>
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-soi-tray"><Lock className="h-6 w-6" aria-hidden="true" /></span>
        <h2 id="locked-title" className="text-xl font-semibold">{title}</h2>
        <p className="max-w-sm text-soi-muted">{description}</p>
        <Link href="/planes" className={buttonClass('gold')}>Pasar a SOI+</Link>
      </div>
    </section>
  );
}
