import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight } from 'lucide-react';
import { EmotionsHeader, JsonLd } from '@/components/emotions/site-header';
import { Breadcrumbs } from '@/components/seo/content-blocks';
import { CATEGORY_SLUG, POSTS, POST_CATEGORIES, postsByCategory, readingMinutes } from '@/config/content';
import { appUrl } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Blog: mentalidad, hábitos, manifestación y dinero',
  description: 'Artículos con fuentes sobre mentalidad, hábitos, manifestación y dinero. Menos consejos genéricos, más prácticas para construir tu identidad.',
  alternates: { canonical: '/blog' },
  openGraph: { title: 'Blog · SOI', description: 'Mentalidad, hábitos, manifestación y dinero, con fuentes y en español.', url: '/blog', type: 'website' },
};

export default function BlogIndex() {
  const base = appUrl();
  return (
    <>
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Blog', name: 'Blog de SOI', url: `${base}/blog`, inLanguage: 'es', description: metadata.description,
            blogPost: POSTS.map((p) => ({ '@type': 'BlogPosting', headline: p.h1, url: `${base}/blog/${p.slug}`, datePublished: p.published })),
          },
          { '@type': 'BreadcrumbList', itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'SOI', item: base },
            { '@type': 'ListItem', position: 2, name: 'Blog', item: `${base}/blog` },
          ] },
        ],
      }} />
      <EmotionsHeader />

      <header className="mx-auto max-w-5xl px-5 pb-6 pt-4 sm:pt-8">
        <Breadcrumbs items={[{ name: 'Inicio', href: '/' }, { name: 'Blog' }]} />
        <h1 className="mt-6 max-w-3xl text-balance text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">Lee menos consejos. Construye tu identidad.</h1>
        <p className="mt-4 max-w-2xl text-pretty text-lg text-soi-muted">Mentalidad, hábitos, manifestación y dinero, con fuentes y sin frases vacías. Cada artículo termina en algo que puedes hacer hoy.</p>
        <nav aria-label="Categorías" className="mt-6 flex flex-wrap gap-2">
          {POST_CATEGORIES.map((c) => <a key={c} href={`#${CATEGORY_SLUG[c]}`} className="press rounded-full bg-soi-tray px-3.5 py-2 text-sm hover:bg-soi-accent-soft">{c}</a>)}
        </nav>
      </header>

      <div className="mx-auto flex max-w-5xl flex-col gap-14 px-5 py-10">
        {POST_CATEGORIES.map((c) => (
          <section key={c} id={CATEGORY_SLUG[c]} className="scroll-mt-4" aria-labelledby={`${CATEGORY_SLUG[c]}-h`}>
            <h2 id={`${CATEGORY_SLUG[c]}-h`} className="text-2xl font-semibold tracking-tight">{c}</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {postsByCategory(c).map((p) => (
                <li key={p.slug}>
                  <Link href={`/blog/${p.slug}`} className="press group flex h-full flex-col rounded-[20px] bg-white p-5 shadow-ring hover:shadow-soft">
                    <span className="nums text-xs text-soi-muted">{readingMinutes(p)} min de lectura</span>
                    <span className="mt-1 text-lg font-semibold leading-snug">{p.h1}</span>
                    <span className="mt-2 flex-1 text-[15px] text-soi-muted">{p.description}</span>
                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium">
                      Leer <ArrowRight className="h-4 w-4 transition-transform duration-(--dur-fast) ease-out-strong group-hover:translate-x-0.5" aria-hidden="true" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
