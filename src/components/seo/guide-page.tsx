import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BookOpen, Check, Clock, Sparkles } from 'lucide-react';
import { buttonClass } from '@/components/ui/button';
import { Cta } from '@/components/landing/cta';
import { EmotionsHeader, JsonLd } from '@/components/emotions/site-header';
import { ESLABON_LABEL, emotionBySlug } from '@/config/emotions';
import { GUIDE_WEEKS } from '@/config/content/guide-weeks';
import { GUIDES_UPDATED, anchorFor, guideBySlug, plainText, postBySlug } from '@/config/content';
import { getSettings } from '@/lib/settings';
import { appUrl } from '@/lib/utils';
import { Breadcrumbs, ContentSectionView, FaqList, LinkCard, TableOfContents, faqJsonLd, formatDate } from './content-blocks';
import { RichText } from './rich-text';

/** Metadatos de una guía de la raíz (`/ansiedad`, `/procrastinacion`…). */
export function guideMetadata(slug: string): Metadata {
  const g = guideBySlug(slug);
  if (!g) return {};
  return {
    title: g.title,
    description: g.description,
    alternates: { canonical: `/${g.slug}` },
    openGraph: { title: g.title, description: g.description, url: `/${g.slug}`, type: 'article', locale: 'es_MX' },
    twitter: { card: 'summary_large_image', title: g.title, description: g.description },
  };
}

/**
 * Guía SEO: ataca una búsqueda de dolor con respuesta corta (fragmento destacado), explicación con fuentes,
 * un método para hacer hoy, el Moment que SOI armaría y preguntas frecuentes. Server Component sin interactividad
 * propia (solo el `Cta` medido).
 */
export async function GuidePage({ slug }: { slug: string }) {
  const g = guideBySlug(slug);
  if (!g) notFound();
  const { trialDays } = await getSettings();
  const base = appUrl();
  const url = `${base}/${g.slug}`;
  const signup = `/login?next=${encodeURIComponent(`/chat?agent=${g.agent}`)}`;
  const totalMinutes = g.moment.blocks.reduce((n, b) => n + b.minutes, 0);
  const related = g.related.map(guideBySlug).filter((r) => r !== null);
  const emotions = g.emotions.map(emotionBySlug).filter((e) => e !== null);
  const posts = g.posts.map(postBySlug).filter((p) => p !== null);
  const week = GUIDE_WEEKS[g.slug] ?? [];
  const toc = [
    ...g.sections.map((s) => ({ id: anchorFor(s.h2), label: s.h2 })),
    { id: 'metodo', label: g.method.name },
    ...(week.length ? [{ id: 'plan-7-dias', label: 'Tu plan de 7 días' }] : []),
    { id: 'con-soi', label: g.cta.heading },
    { id: 'preguntas', label: 'Preguntas frecuentes' },
  ];

  return (
    <>
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Article', headline: g.h1, description: g.description, inLanguage: 'es', url, mainEntityOfPage: url,
            datePublished: GUIDES_UPDATED, dateModified: GUIDES_UPDATED,
            author: { '@type': 'Organization', name: 'SOI', url: base },
            publisher: { '@type': 'Organization', name: 'SOI', url: base, logo: { '@type': 'ImageObject', url: `${base}/icons/icon-512.png` } },
            image: `${base}/opengraph-image`,
            about: { '@type': 'Thing', name: g.name },
            keywords: g.keyword,
          },
          {
            '@type': 'HowTo', name: g.method.name, totalTime: `PT${g.method.minutes}M`, inLanguage: 'es',
            step: g.method.steps.map((s, i) => ({ '@type': 'HowToStep', position: i + 1, text: plainText(s) })),
          },
          faqJsonLd(g.faq),
          { '@type': 'BreadcrumbList', itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'SOI', item: base },
            { '@type': 'ListItem', position: 2, name: 'Guías', item: `${base}/guias` },
            { '@type': 'ListItem', position: 3, name: g.name, item: url },
          ] },
        ],
      }} />

      <EmotionsHeader />

      <article>
        {/* ---------- Encabezado + respuesta corta ---------- */}
        <header className="mx-auto max-w-3xl px-5 pb-8 pt-4 sm:pt-8">
          <Breadcrumbs items={[{ name: 'Inicio', href: '/' }, { name: 'Guías', href: '/guias' }, { name: g.name }]} />
          <p className="mt-6 flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex rounded-full bg-soi-accent-soft px-3 py-1 font-medium text-soi-accent">Eslabón: {ESLABON_LABEL[g.eslabon]}</span>
            <span className="text-soi-muted">Actualizado el <time dateTime={GUIDES_UPDATED}>{formatDate(GUIDES_UPDATED)}</time></span>
          </p>
          <h1 className="mt-3 text-balance text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">{g.h1}</h1>
          <div className="mt-6 rounded-[20px] bg-soi-ink p-5 text-white sm:p-6">
            <p className="text-sm font-medium text-soi-gold">La respuesta corta</p>
            <p className="mt-2 text-pretty text-[17px] leading-relaxed text-white/90">{g.answer}</p>
          </div>
          {g.intro.map((p) => <p key={p} className="mt-5 text-pretty text-lg leading-relaxed text-soi-muted"><RichText text={p} /></p>)}
          <a href="#metodo" className="press mt-6 inline-flex h-11 items-center gap-2 rounded-lg bg-soi-ink px-4 font-medium text-white">
            <Clock className="h-4 w-4" aria-hidden="true" />Ir al método · <span className="nums">{g.method.minutes} min</span>
          </a>
        </header>

        <div className="mx-auto max-w-3xl px-5">
          <TableOfContents items={toc} />
        </div>

        {/* ---------- Secciones ---------- */}
        <div className="mx-auto flex max-w-3xl flex-col gap-12 px-5 py-12">
          {g.sections.map((s) => <ContentSectionView key={s.h2} section={s} />)}
        </div>

        {/* ---------- El método ---------- */}
        <section id="metodo" className="mx-auto max-w-3xl scroll-mt-4 px-5 pb-12" aria-labelledby="metodo-h">
          <div className="rounded-[28px] bg-soi-tray p-2">
            <div className="rounded-[20px] bg-white p-5 shadow-ring sm:p-6">
              <p className="nums text-sm font-medium text-soi-accent">Hazlo hoy · {g.method.minutes} minutos</p>
              <h2 id="metodo-h" className="mt-1 text-2xl font-semibold tracking-tight">{g.method.name}</h2>
              <ol className="mt-5 flex flex-col gap-4">
                {g.method.steps.map((s, i) => (
                  <li key={s} className="flex gap-3">
                    <span className="nums grid h-7 w-7 shrink-0 place-items-center rounded-full bg-soi-accent-soft text-sm font-medium text-soi-accent">{i + 1}</span>
                    <span className="pt-0.5 text-[16px] leading-relaxed"><RichText text={s} /></span>
                  </li>
                ))}
              </ol>
              <p className="mt-5 flex gap-2 border-t border-black/5 pt-4 text-sm text-soi-muted">
                <BookOpen className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><span>Fuente: {g.method.source}.</span>
              </p>
            </div>
          </div>
        </section>

        {/* ---------- Plan de 7 días ---------- */}
        {week.length > 0 && (
          <section id="plan-7-dias" className="mx-auto max-w-3xl scroll-mt-4 px-5 pb-14" aria-labelledby="plan-h">
            <h2 id="plan-h" className="text-2xl font-semibold tracking-tight sm:text-3xl">Tu plan de 7 días</h2>
            <p className="mt-3 text-[17px] leading-relaxed text-soi-muted">Una semana para llevar esta guía a tu vida, un paso pequeño por día. Si un día no puedes, retoma al siguiente: no se empieza de cero.</p>
            <ol className="mt-5 grid gap-2.5">
              {week.map((d, i) => (
                <li key={d} className="flex gap-4 rounded-[20px] bg-white px-5 py-4 shadow-ring">
                  <span className="nums shrink-0 pt-0.5 text-sm font-medium text-soi-accent">Día {i + 1}</span>
                  <span className="text-[16px] leading-relaxed">{d}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* ---------- Con SOI: el Moment ---------- */}
        <section id="con-soi" className="scroll-mt-4 bg-soi-sidebar py-14 sm:py-16" aria-labelledby="con-soi-h">
          <div className="mx-auto grid max-w-5xl items-center gap-10 px-5 lg:grid-cols-[1fr_22rem]">
            <div>
              <h2 id="con-soi-h" className="text-balance text-3xl font-semibold tracking-tight">{g.cta.heading}</h2>
              <p className="mt-3 max-w-lg text-pretty text-lg text-soi-muted">{g.cta.text}</p>
              <Cta href={signup} where={`guia:${g.slug}`} className={buttonClass('primary', 'lg', 'mt-7 w-full sm:w-auto')}>{g.cta.button}</Cta>
              <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-soi-muted">
                <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4" aria-hidden="true" />{trialDays} días con todo incluido</span>
                <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4" aria-hidden="true" />Sin tarjeta</span>
                <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4" aria-hidden="true" />Guiado por voz</span>
              </p>
            </div>
            <figure className="rounded-[28px] bg-soi-tray p-2" aria-label={`Ejemplo de Moment: ${g.moment.title}`}>
              <div className="rounded-[20px] bg-white p-5 shadow-ring">
                <p className="flex items-center gap-1.5 text-xs font-medium text-soi-accent"><Sparkles className="h-3.5 w-3.5" aria-hidden="true" />Un Moment que SOI te prepararía</p>
                <p className="mt-2 text-lg font-semibold leading-snug">{g.moment.title}</p>
                <p className="nums mt-0.5 text-sm text-soi-muted">{totalMinutes} minutos · {g.moment.blocks.length} pasos</p>
                <ol className="mt-4 flex flex-col gap-2">
                  {g.moment.blocks.map((b, i) => (
                    <li key={b.label} className="flex items-center justify-between gap-3 rounded-xl bg-soi-sidebar px-3 py-2.5 text-[15px]">
                      <span className="flex items-center gap-2.5"><span className="nums text-xs font-medium text-soi-accent">{i + 1}</span>{b.label}</span>
                      <span className="nums shrink-0 text-xs text-soi-muted">{b.minutes} min</span>
                    </li>
                  ))}
                </ol>
              </div>
            </figure>
          </div>
        </section>

        {/* ---------- Preguntas + relacionadas ---------- */}
        <div className="mx-auto flex max-w-3xl flex-col gap-12 px-5 py-14">
          <FaqList faq={g.faq} />

          <nav aria-labelledby="relacionadas">
            <h2 id="relacionadas" className="text-2xl font-semibold tracking-tight">Sigue leyendo</h2>
            <ul className="mt-5 grid gap-3 sm:grid-cols-3">
              {related.map((r) => <li key={r.slug}><LinkCard href={`/${r.slug}`} eyebrow="Guía" title={r.name} text={r.title} /></li>)}
              {posts.map((p) => <li key={p.slug}><LinkCard href={`/blog/${p.slug}`} eyebrow={p.category} title={p.title} /></li>)}
              {emotions.map((e) => <li key={e.slug}><LinkCard href={`/emociones/${e.slug}`} eyebrow="Emociones" title={e.name} text={e.hook} /></li>)}
            </ul>
          </nav>
        </div>
      </article>
    </>
  );
}
