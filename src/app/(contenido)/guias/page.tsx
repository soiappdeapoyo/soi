import type { Metadata } from 'next';
import { buttonClass } from '@/components/ui/button';
import { Cta } from '@/components/landing/cta';
import { EmotionsHeader, JsonLd } from '@/components/emotions/site-header';
import { Breadcrumbs, LinkCard } from '@/components/seo/content-blocks';
import { ESLABON_LABEL } from '@/config/emotions';
import { AUTHORS, GUIDES, POSTS } from '@/config/content';
import type { Eslabon } from '@/config/agents';
import { getSettings } from '@/lib/settings';
import { appUrl } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Guías de desarrollo personal: hábitos, mente y propósito',
  description: 'Guías prácticas y con fuentes para dejar de procrastinar, crear hábitos, tener disciplina, manifestar, encontrar tu propósito y mejorar tu autoestima.',
  alternates: { canonical: '/guias' },
  openGraph: { title: 'Guías de desarrollo personal · SOI', description: 'Guías prácticas y con fuentes, en español, para pasar de la idea a la acción.', url: '/guias', type: 'website' },
};

/** Días de prueba del panel; la página se regenera cada 5 minutos. */
export const revalidate = 300;

const ORDER: Eslabon[] = ['pensamiento', 'emocion', 'accion', 'resultado'];

export default async function GuidesHub() {
  const { trialDays } = await getSettings();
  const base = appUrl();
  return (
    <>
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'CollectionPage', name: 'Guías', url: `${base}/guias`, inLanguage: 'es', description: metadata.description,
            mainEntity: { '@type': 'ItemList', itemListElement: GUIDES.map((g, i) => ({ '@type': 'ListItem', position: i + 1, name: g.h1, url: `${base}/${g.slug}` })) },
          },
          { '@type': 'BreadcrumbList', itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'SOI', item: base },
            { '@type': 'ListItem', position: 2, name: 'Guías', item: `${base}/guias` },
          ] },
        ],
      }} />
      <EmotionsHeader />

      <header className="mx-auto max-w-5xl px-5 pb-6 pt-4 sm:pt-8">
        <Breadcrumbs items={[{ name: 'Inicio', href: '/' }, { name: 'Guías' }]} />
        <h1 className="mt-6 max-w-3xl text-balance text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">Guías para pasar de la idea a la acción</h1>
        <p className="mt-4 max-w-2xl text-pretty text-lg text-soi-muted">
          Los pensamientos lideran las emociones, las emociones lideran las acciones y las acciones lideran los resultados.
          Cada guía ataca un eslabón, cita sus fuentes y termina con algo que puedes hacer hoy.
        </p>
      </header>

      <div className="mx-auto flex max-w-5xl flex-col gap-12 px-5 py-10">
        {ORDER.map((k) => {
          const list = GUIDES.filter((g) => g.eslabon === k);
          if (list.length === 0) return null;
          return (
            <section key={k} aria-labelledby={`eslabon-${k}`}>
              <h2 id={`eslabon-${k}`} className="text-2xl font-semibold tracking-tight">{ESLABON_LABEL[k]}</h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((g) => <li key={g.slug}><LinkCard href={`/${g.slug}`} title={g.h1} text={g.description} /></li>)}
              </ul>
            </section>
          );
        })}

        <section aria-labelledby="autores-h">
          <h2 id="autores-h" className="text-2xl font-semibold tracking-tight">Por autor</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {AUTHORS.map((a) => <li key={a.slug}><LinkCard href={`/${a.slug}`} eyebrow="Autor" title={a.name} text={a.description} /></li>)}
          </ul>
        </section>

        <section aria-labelledby="blog-h">
          <h2 id="blog-h" className="text-2xl font-semibold tracking-tight">Del blog</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {POSTS.slice(0, 6).map((p) => <li key={p.slug}><LinkCard href={`/blog/${p.slug}`} eyebrow={p.category} title={p.title} /></li>)}
          </ul>
        </section>
      </div>

      <section className="mx-auto max-w-3xl px-5 py-16 text-center" aria-labelledby="cierre">
        <h2 id="cierre" className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">Leer te ayuda a entender. Practicar te cambia.</h2>
        <p className="mx-auto mt-3 max-w-xl text-pretty text-lg text-soi-muted">Cuéntale a SOI qué te pasa y vive tu primer Moment en minutos. {trialDays} días con todo incluido, sin tarjeta.</p>
        <Cta href="/login" where="guias:cierre" className={buttonClass('primary', 'lg', 'mt-8 w-full sm:w-auto')}>Crear mi primer Moment</Cta>
      </section>
    </>
  );
}
