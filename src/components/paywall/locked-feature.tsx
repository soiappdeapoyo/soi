import Link from 'next/link';
import { Lock } from 'lucide-react';
import { buttonClass } from '@/components/ui/button';

/** Candado + CTA para secciones bloqueadas en Free. */
export function LockedFeature({ title, description, preview }: { title: string; description: string; preview?: React.ReactNode }) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-black/10 bg-white p-6 text-center" aria-labelledby="locked-title">
      {preview && <div className="pointer-events-none select-none opacity-40 blur-sm" aria-hidden="true">{preview}</div>}
      <div className={preview ? 'absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/60 p-6' : 'flex flex-col items-center gap-3'}>
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-soi-gold/20"><Lock className="h-7 w-7" aria-hidden="true" /></span>
        <h2 id="locked-title" className="text-xl font-bold">{title}</h2>
        <p className="max-w-sm text-black/70">{description}</p>
        <Link href="/planes" className={buttonClass('gold')}>Pasar a SOI+</Link>
      </div>
    </section>
  );
}
