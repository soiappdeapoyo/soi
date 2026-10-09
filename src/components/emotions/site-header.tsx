import Link from 'next/link';
import { cn } from '@/lib/utils';

/** Encabezado del hub de emociones (sobre fondo oscuro o claro). */
export function EmotionsHeader({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const dark = tone === 'dark';
  return (
    <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
      <Link href="/" className={cn('text-2xl font-semibold', dark ? 'text-white' : 'text-soi-ink')} aria-label="SOI, inicio">SOI.</Link>
      <Link href="/login" className={cn('press inline-flex h-9 items-center rounded-lg px-3 text-sm', dark ? 'text-white/80 ring-1 ring-white/20 hover:text-white' : 'text-soi-ink shadow-ring hover:bg-soi-tray')}>Entrar</Link>
    </header>
  );
}

/** JSON-LD (datos estructurados) para buscadores. */
export function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />;
}
