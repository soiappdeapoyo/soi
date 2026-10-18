import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArrowRight, BookOpen, Check } from 'lucide-react';
import { buttonClass } from '@/components/ui/button';
import { Cta } from '@/components/landing/cta';
import { EmotionsHeader, JsonLd } from '@/components/emotions/site-header';
import { AUTHORS, GUIDES_UPDATED, anchorFor, authorBySlug, guideBySlug, plainText, postBySlug } from '@/config/content';
import { CHALLENGE_SLUGS, dayMinutes } from '@/config/official-challenges';
import { officialMoment } from '@/config/official-moments';
import { getSettings } from '@/lib/settings';
import { appUrl } from '@/lib/utils';
import { Breadcrumbs, ContentSectionView, FaqList, LinkCard, TableOfContents, faqJsonLd, formatDate } from './content-blocks';
import { RichText } from './rich-text';

/** Metadatos de una página de autor (`/neville-goddard`, `/brian-tracy`, `/napoleon-hill`). */
export function authorMetadata(slug: string): Metadata {
  const a = authorBySlug(slug);
  if (!a) return {};
  return {
    title: a.title,
    description: a.description,
    alternates: { canonical: `/${a.slug}` },
    openGraph: { title: a.title, description: a.description, url: `/${a.slug}`, type: 'article', locale: 'es_MX' },
    twitter: { card: 'summary_large_image', title: a.title, description: a.description },
  };
}

/**
 * Página de autor: el centro de su clúster. Quién fue, sus ideas con fuente, lo que dice la evidencia,
 * sus libros y su reto de 7 días (sale de los bloques del reto oficial, nunca escrito a mano). Al crear la
 * cuenta, la persona entra directo al día 1, igual que desde la landing.
 */
export async function AuthorPage({ slug }: { slug: string }) {
  const a = authorBySlug(slug);
  if (!a) notFound();
  const challenge = officialMoment(CHALLENGE_SLUGS[a.key]);
  if (!challenge) notFound();
  const { trialDays } = await getSettings();
  const base = appUrl();
  const url = `${base}/${a.slug}`;
  const signup = `/login?next=${encodeURIComponent(`/m/${challenge.slug}/play`)}`;
  const daily = challenge.blocks.filter((b) => !b.day).map((b) => b.title);
  const days = Array.from({ length: 7 }, (_, i) => ({
    day: i + 1,
    minutes: Math.round(dayMinutes(challenge.blocks, i + 1)),
    titles: challenge.blocks.filter((b) => b.day === i + 1 && b.type !== 'celebration').map((b) => b.title),
  }));
  const guides = a.guides.map(guideBySlug).filter((g) => g !== null);
  const posts = a.posts.map(postBySlug).filter((p) => p !== null);
  const others = AUTHORS.filter((o) => o.slug !== a.slug);
  const toc = [
    ...a.sections.map((s) => ({ id: anchorFor(s.h2), label: s.h2 })),
    { id: 'libros', label: 'Sus libros principales' },
    { id: 'reto', label: a.cta.heading },
    { id: 'preguntas', label: 'Preguntas frecuentes' },
  ];

  return (
    <>
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Article', headline: a.h1, description: a.description, inLanguage: 'es', url, mainEntityOfPage: url,
            datePublished: GUIDES_UPDATED, dateModified: GUIDES_UPDATED,
            author: { '@type': 'Organization', name: 'SOI', url: base },
            publisher: { '@type': 'Organization', name: 'SOI', url: base, logo: { '@type': 'ImageObject', url: `${base}/icons/icon-512.png` } },
            image: `${base}/opengraph-image`,
            about: { '@type': 'Person', name: a.name, description: plainText(a.answer), sameAs: a.sameAs },
          },
          faqJsonLd(a.faq),
          { '@type': 'BreadcrumbList', itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'SOI', item: base },
            { '@type': 'ListItem', position: 2, name: 'Guías', item: `${base}/guias` },
            { '@type': 'ListItem', position: 3, name: a.name, item: url },
          ] },
        ],
      }} />

      <EmotionsHeader />

      <article>
        {/* ---------- Encabezado: quién fue, en corto ---------- */}
        <header className="mx-auto max-w-3xl px-5 pb-8 pt-4 sm:pt-8">
          <Breadcrumbs items={[{ name: 'Inicio', href: '/' }, { name: 'Guías', href: '/guias' }, { name: a.name }]} />
          <p className="mt-6 flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex rounded-full bg-soi-accent-soft px-3 py-1 font-medium text-soi-accent">Autor</span>
            <span className="text-soi-muted">Actualizado el <time dateTime={GUIDES_UPDATED}>{formatDate(GUIDES_UPDATED)}</time></span>
          </p>
          <h1 className="mt-3 text-balance text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">{a.h1}</h1>
          <div className="mt-6 rounded-[20px] bg-soi-ink p-5 text-white sm:p-6">
            <p className="text-sm font-medium text-soi-gold">En pocas palabras</p>
            <p className="mt-2 text-pretty text-[17px] leading-relaxed text-white/90">{plainText(a.answer)}</p>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {a.facts.map((f) => (
              <div key={f.label} className="rounded-[16px] bg-white px-4 py-3 shadow-ring">
                <dt className="text-xs text-soi-muted">{f.label}</dt>
                <dd className="mt-0.5 text-[15px] font-medium leading-snug">{f.value}</dd>
              </div>
            ))}
          </dl>
          {a.intro.map((p) => <p key={p} className="mt-5 text-pretty text-lg leading-relaxed text-soi-muted"><RichText text={p} /></p>)}
          <a href="#reto" className="press mt-6 inline-flex h-11 items-center gap-2 rounded-lg bg-soi-ink px-4 font-medium text-white">
            Ver el reto de 7 días<ArrowRight className="h-4 w-4" aria-hidden="true" />
          </a>
        </header>

        <div className="mx-auto max-w-3xl px-5">
          <TableOfContents items={toc} />
        </div>

        {/* ---------- Sus ideas ---------- */}
        <div className="mx-auto flex max-w-3xl flex-col gap-12 px-5 py-12">
          {a.sections.map((s) => <ContentSectionView key={s.h2} section={s} />)}
        </div>

        {/* ---------- Libros ---------- */}
        <section id="libros" className="mx-auto max-w-3xl scroll-mt-4 px-5 pb-14" aria-labelledby="libros-h">
          <h2 id="libros-h" className="text-2xl font-semibold tracking-tight sm:text-3xl">Sus libros principales</h2>
          <ul className="mt-5 grid gap-2.5">
            {a.books.map((b) => (
              <li key={b.title} className="flex gap-4 rounded-[20px] bg-white px-5 py-4 shadow-ring">
                <BookOpen className="mt-1 h-4 w-4 shrink-0 text-soi-accent" aria-hidden="true" />
                <span>
                  <span className="block font-semibold">{b.title} <span className="nums font-normal text-soi-muted">({b.year})</span></span>
                  <span className="mt-0.5 block text-[16px] leading-relaxed text-soi-muted">{b.idea}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* ---------- Su reto de 7 días ---------- */}
        <section id="reto" className="scroll-mt-4 bg-soi-sidebar py-14 sm:py-16" aria-labelledby="reto-h">
          <div className="mx-auto grid max-w-5xl items-start gap-10 px-5 lg:grid-cols-[1fr_24rem]">
            <div>
              <h2 id="reto-h" className="text-balance text-3xl font-semibold tracking-tight">{a.cta.heading}</h2>
              <p className="mt-3 max-w-lg text-pretty text-lg text-soi-muted">{a.cta.text}</p>
              <Cta href={signup} where={`autor:${a.key}`} className={buttonClass('primary', 'lg', 'mt-7 w-full sm:w-auto')}>{a.cta.button}</Cta>
              <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-soi-muted">
                <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4" aria-hidden="true" />{trialDays} días con todo incluido</span>
                <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4" aria-hidden="true" />Sin tarjeta</span>
                <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4" aria-hidden="true" />Guiado por voz</span>
              </p>
            </div>
            <figure className="rounded-[28px] bg-soi-tray p-2" aria-label={`Los 7 días de ${challenge.title}`}>
              <div className="overflow-hidden rounded-[20px] bg-white shadow-ring">
                {challenge.cover && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={challenge.cover} alt="" width={384} height={168} loading="lazy" className="h-[168px] w-full object-cover" />
                )}
                <div className="p-5">
                  <p className="text-lg font-semibold leading-snug">{challenge.title}</p>
                  <p className="mt-1 text-sm text-soi-muted">Cada día: {daily.join(' · ')}</p>
                  <ol className="mt-4 flex flex-col gap-2">
                    {days.map((d) => (
                      <li key={d.day} className="flex items-start justify-between gap-3 rounded-xl bg-soi-sidebar px-3 py-2.5 text-[15px]">
                        <span className="flex gap-2.5"><span className="nums shrink-0 text-xs font-medium leading-6 text-soi-accent">Día {d.day}</span>{d.titles.join(' · ') || 'La práctica completa'}</span>
                        <span className="nums shrink-0 text-xs leading-6 text-soi-muted">{d.minutes} min</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </figure>
          </div>
        </section>

        {/* ---------- Preguntas + clúster ---------- */}
        <div className="mx-auto flex max-w-3xl flex-col gap-12 px-5 py-14">
          <FaqList faq={a.faq} />

          <nav aria-labelledby="relacionadas">
            <h2 id="relacionadas" className="text-2xl font-semibold tracking-tight">{a.name} en la práctica</h2>
            <ul className="mt-5 grid gap-3 sm:grid-cols-3">
              {guides.map((g) => <li key={g.slug}><LinkCard href={`/${g.slug}`} eyebrow="Guía" title={g.name} text={g.title} /></li>)}
              {posts.map((p) => <li key={p.slug}><LinkCard href={`/blog/${p.slug}`} eyebrow={p.category} title={p.title} /></li>)}
            </ul>
          </nav>

          <nav aria-labelledby="otros-autores">
            <h2 id="otros-autores" className="text-2xl font-semibold tracking-tight">Otros autores</h2>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {others.map((o) => <li key={o.slug}><LinkCard href={`/${o.slug}`} eyebrow="Autor" title={o.name} text={o.title} /></li>)}
            </ul>
          </nav>
        </div>
      </article>
    </>
  );
}
