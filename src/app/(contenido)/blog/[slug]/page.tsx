import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Check } from 'lucide-react';
import { buttonClass } from '@/components/ui/button';
import { Cta } from '@/components/landing/cta';
import { EmotionsHeader, JsonLd } from '@/components/emotions/site-header';
import { Breadcrumbs, ContentSectionView, FaqList, LinkCard, TableOfContents, faqJsonLd, formatDate } from '@/components/seo/content-blocks';
import { RichText } from '@/components/seo/rich-text';
import { CATEGORY_SLUG, POSTS, anchorFor, guideBySlug, plainText, postBySlug, postsByCategory, readingMinutes } from '@/config/content';
import { getSettings } from '@/lib/settings';
import { appUrl } from '@/lib/utils';

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;
/** Días de prueba del panel; la página se regenera cada 5 minutos. */
export const revalidate = 300;

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = postBySlug((await params).slug);
  if (!p) return {};
  return {
    title: p.title,
    description: p.description,
    alternates: { canonical: `/blog/${p.slug}` },
    openGraph: { title: p.title, description: p.description, url: `/blog/${p.slug}`, type: 'article', locale: 'es_MX', publishedTime: p.published, modifiedTime: p.updated ?? p.published, section: p.category },
    twitter: { card: 'summary_large_image', title: p.title, description: p.description },
  };
}

export default async function BlogPost({ params }: Props) {
  const p = postBySlug((await params).slug);
  if (!p) notFound();
  const { trialDays } = await getSettings();
  const base = appUrl();
  const url = `${base}/blog/${p.slug}`;
  const minutes = readingMinutes(p);
  const guides = p.guides.map(guideBySlug).filter((g) => g !== null);
  const more = postsByCategory(p.category).filter((o) => o.slug !== p.slug);
  const toc = [
    ...p.sections.map((s) => ({ id: anchorFor(s.h2), label: s.h2 })),
    ...(p.faq?.length ? [{ id: 'preguntas', label: 'Preguntas frecuentes' }] : []),
  ];

  return (
    <>
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'BlogPosting', headline: p.h1, description: p.description, inLanguage: 'es', url, mainEntityOfPage: url,
            datePublished: p.published, dateModified: p.updated ?? p.published, articleSection: p.category,
            wordCount: minutes * 200,
            author: { '@type': 'Organization', name: 'SOI', url: base },
            publisher: { '@type': 'Organization', name: 'SOI', url: base, logo: { '@type': 'ImageObject', url: `${base}/icons/icon-512.png` } },
            image: `${base}/opengraph-image`,
            abstract: p.takeaways.map(plainText).join(' '),
          },
          ...(p.faq?.length ? [faqJsonLd(p.faq)] : []),
          { '@type': 'BreadcrumbList', itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'SOI', item: base },
            { '@type': 'ListItem', position: 2, name: 'Blog', item: `${base}/blog` },
            { '@type': 'ListItem', position: 3, name: p.title, item: url },
          ] },
        ],
      }} />

      <EmotionsHeader />

      <article>
        <header className="mx-auto max-w-3xl px-5 pb-8 pt-4 sm:pt-8">
          <Breadcrumbs items={[{ name: 'Inicio', href: '/' }, { name: 'Blog', href: '/blog' }, { name: p.category, href: `/blog#${CATEGORY_SLUG[p.category]}` }]} />
          <p className="mt-6 flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex rounded-full bg-soi-accent-soft px-3 py-1 font-medium text-soi-accent">{p.category}</span>
            <span className="text-soi-muted"><time dateTime={p.updated ?? p.published}>{formatDate(p.updated ?? p.published)}</time> · <span className="nums">{minutes}</span> min de lectura</span>
          </p>
          <h1 className="mt-3 text-balance text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">{p.h1}</h1>
          {p.intro.map((t) => <p key={t} className="mt-5 text-pretty text-lg leading-relaxed text-soi-muted"><RichText text={t} /></p>)}
        </header>

        <div className="mx-auto flex max-w-3xl flex-col gap-4 px-5">
          <aside className="rounded-[20px] bg-soi-ink p-5 text-white sm:p-6" aria-labelledby="esencial">
            <p id="esencial" className="text-sm font-medium text-soi-gold">Lo esencial</p>
            <ul className="mt-3 flex flex-col gap-2.5">
              {p.takeaways.map((t) => (
                <li key={t} className="flex gap-2.5 text-[16px] leading-relaxed text-white/90"><Check className="mt-1 h-4 w-4 shrink-0 text-soi-gold" aria-hidden="true" />{t}</li>
              ))}
            </ul>
          </aside>
          <TableOfContents items={toc} />
        </div>

        <div className="mx-auto flex max-w-3xl flex-col gap-12 px-5 py-12">
          {p.sections.map((s) => <ContentSectionView key={s.h2} section={s} />)}
        </div>

        {/* ---------- Cierre de todo artículo ---------- */}
        <section className="bg-soi-ink py-14 text-white sm:py-16" aria-labelledby="prueba-soi">
          <div className="mx-auto max-w-3xl px-5 text-center">
            <h2 id="prueba-soi" className="text-balance text-3xl font-black uppercase leading-tight tracking-tight sm:text-4xl">
              Lee menos consejos. Construye tu identidad. <span className="text-soi-gold">Prueba SOI gratis.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-pretty text-lg text-white/75">
              Cuéntale a SOI qué te pasa. Te escucha, diseña un Moment hecho para ti y te guía con voz, paso a paso. {trialDays} días con todo incluido, sin tarjeta.
            </p>
            <Cta href="/login" where={`blog:${p.slug}`.slice(0, 60)} className={buttonClass('gold', 'lg', 'mt-8 w-full sm:w-auto')}>Probar SOI gratis</Cta>
          </div>
        </section>

        <div className="mx-auto flex max-w-3xl flex-col gap-12 px-5 py-14">
          {p.faq?.length ? <FaqList faq={p.faq} /> : null}

          <nav aria-labelledby="guias-rel">
            <h2 id="guias-rel" className="text-2xl font-semibold tracking-tight">Guías para llevarlo a la práctica</h2>
            <ul className="mt-5 grid gap-3 sm:grid-cols-3">
              {guides.map((g) => <li key={g.slug}><LinkCard href={`/${g.slug}`} eyebrow="Guía" title={g.name} text={g.title} /></li>)}
            </ul>
          </nav>

          {more.length > 0 && (
            <nav aria-labelledby="mas">
              <h2 id="mas" className="text-2xl font-semibold tracking-tight">Más de {p.category}</h2>
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {more.map((o) => <li key={o.slug}><LinkCard href={`/blog/${o.slug}`} title={o.h1} text={o.description} /></li>)}
              </ul>
            </nav>
          )}
        </div>
      </article>
    </>
  );
}
