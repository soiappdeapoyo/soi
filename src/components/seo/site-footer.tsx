import Link from 'next/link';
import { EMOTIONS } from '@/config/emotions';
import { AUTHORS, CATEGORY_SLUG, GUIDES, POST_CATEGORIES } from '@/config/content';
import { CRISIS_RESOURCES } from '@/config/crisis-resources';

/** Líneas de ayuda que se muestran en todo el contenido público (las más usadas por el público de SOI). */
const HELP = [
  { country: 'México', ...CRISIS_RESOURCES.MX![0]! },
  { country: 'España', ...CRISIS_RESOURCES.ES![0]! },
  { country: 'EE. UU.', phone: '988', name: '988 Lifeline (marca 988 y presiona 2)' },
];

const linkClass = 'hover:text-soi-ink hover:underline';

/**
 * Pie del contenido público (guías, blog y emociones): enlaza todas las páginas entre sí
 * (enlazado interno para buscadores), las líneas de ayuda y el aviso de que SOI no sustituye atención profesional.
 */
export function SeoFooter() {
  return (
    <footer className="border-t border-black/5 bg-soi-sidebar px-5 py-10 text-sm text-soi-muted">
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <nav aria-label="Guías">
            <p className="font-medium text-soi-ink"><Link href="/guias" className="hover:underline">Guías</Link></p>
            <ul className="mt-3 flex flex-col gap-2">
              {GUIDES.map((g) => <li key={g.slug}><Link href={`/${g.slug}`} className={linkClass}>{g.name}</Link></li>)}
            </ul>
          </nav>
          <nav aria-label="Emociones">
            <p className="font-medium text-soi-ink"><Link href="/emociones" className="hover:underline">Emociones</Link></p>
            <ul className="mt-3 flex flex-col gap-2">
              {EMOTIONS.map((e) => <li key={e.slug}><Link href={`/emociones/${e.slug}`} className={linkClass}>{e.name}</Link></li>)}
            </ul>
          </nav>
          <nav aria-label="Autores">
            <p className="font-medium text-soi-ink">Autores</p>
            <ul className="mt-3 flex flex-col gap-2">
              {AUTHORS.map((a) => <li key={a.slug}><Link href={`/${a.slug}`} className={linkClass}>{a.name}</Link></li>)}
            </ul>
          </nav>
          <nav aria-label="Blog">
            <p className="font-medium text-soi-ink"><Link href="/blog" className="hover:underline">Blog</Link></p>
            <ul className="mt-3 flex flex-col gap-2">
              {POST_CATEGORIES.map((c) => <li key={c}><Link href={`/blog#${CATEGORY_SLUG[c]}`} className={linkClass}>{c}</Link></li>)}
            </ul>
          </nav>
        </div>
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
  );
}

/** Contenedor común del contenido público: sin sesión ni la navegación de la app. */
export function SeoShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-soi-canvas">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2">Saltar al contenido</a>
      <main id="main" className="flex-1">{children}</main>
      <SeoFooter />
    </div>
  );
}
