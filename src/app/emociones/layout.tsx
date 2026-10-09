import Link from 'next/link';
import { EMOTIONS } from '@/config/emotions';
import { CRISIS_RESOURCES } from '@/config/crisis-resources';

/** Líneas de ayuda que se muestran en todo el hub (las más usadas por el público de SOI). */
const HELP = [
  { country: 'México', ...CRISIS_RESOURCES.MX![0]! },
  { country: 'España', ...CRISIS_RESOURCES.ES![0]! },
  { country: 'EE. UU.', phone: '988', name: '988 Lifeline (marca 988 y presiona 2)' },
];

/** Hub público de contenido (SEO): sin sesión, sin la navegación de la app. */
export default function EmotionsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-soi-canvas">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2">Saltar al contenido</a>
      <main id="main" className="flex-1">{children}</main>
      <footer className="border-t border-black/5 bg-soi-sidebar px-5 py-10 text-sm text-soi-muted">
        <div className="mx-auto max-w-5xl">
          <nav aria-label="Emociones">
            <p className="font-medium text-soi-ink"><Link href="/emociones" className="hover:underline">Emociones</Link></p>
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
              {EMOTIONS.map((e) => <li key={e.slug}><Link href={`/emociones/${e.slug}`} className="hover:text-soi-ink hover:underline">{e.name}</Link></li>)}
            </ul>
          </nav>
          <div className="mt-8 rounded-[20px] bg-white p-4 shadow-ring">
            <p className="font-medium text-soi-ink">Si sientes que no puedes más o piensas en hacerte daño, pide ayuda ahora.</p>
            <ul className="mt-2 flex flex-col gap-1">
              {HELP.map((h) => (
                <li key={h.country}>{h.country}: {h.name} — <a href={`tel:${h.phone.replace(/[^\d*+]/g, '')}`} className="nums font-medium text-soi-ink underline">{h.phone}</a></li>
              ))}
            </ul>
          </div>
          <p className="mt-6 max-w-3xl">
            SOI acompaña y no sustituye la atención psicológica ni médica profesional. SOI no está afiliado ni respaldado por los
            autores citados; sus enseñanzas se usan como fuente de las prácticas.
          </p>
          <nav className="mt-4 flex gap-4" aria-label="Legal">
            <Link href="/" className="underline">Inicio</Link>
            <Link href="/privacidad" className="underline">Privacidad</Link>
            <Link href="/terminos" className="underline">Términos</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
