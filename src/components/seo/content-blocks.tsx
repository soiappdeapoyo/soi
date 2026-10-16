import Link from 'next/link';
import { ArrowRight, BookOpen, ChevronDown } from 'lucide-react';
import { anchorFor, plainText, type ContentSection, type Faq } from '@/config/content';
import { RichText } from './rich-text';

/** Ruta de migas visible (la versión JSON-LD va en cada página). */
export function Breadcrumbs({ items }: { items: { name: string; href?: string }[] }) {
  return (
    <nav aria-label="Ruta" className="text-sm text-soi-muted">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((it, i) => (
          <li key={it.name} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden="true">/</span>}
            {it.href ? <Link href={it.href} className="hover:text-soi-ink hover:underline">{it.name}</Link> : <span aria-current="page" className="text-soi-ink">{it.name}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Tabla de contenido con anclas (también ayuda a que Google muestre enlaces a secciones). */
export function TableOfContents({ items }: { items: { id: string; label: string }[] }) {
  return (
    <nav aria-labelledby="indice" className="rounded-[20px] bg-soi-sidebar p-5">
      <p id="indice" className="text-sm font-medium text-soi-ink">En esta página</p>
      <ol className="mt-3 flex flex-col gap-2 text-[15px]">
        {items.map((it) => <li key={it.id}><a href={`#${it.id}`} className="text-soi-muted hover:text-soi-ink hover:underline">{it.label}</a></li>)}
      </ol>
    </nav>
  );
}

/** Una sección de texto: título, párrafos, lista y fuente. */
export function ContentSectionView({ section }: { section: ContentSection }) {
  const id = anchorFor(section.h2);
  const List = section.ordered ? 'ol' : 'ul';
  return (
    <section className="scroll-mt-4" aria-labelledby={id}>
      <h2 id={id} className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">{section.h2}</h2>
      {section.paragraphs.map((p) => <p key={p} className="mt-4 text-pretty text-[17px] leading-relaxed text-soi-ink/85"><RichText text={p} /></p>)}
      {section.list && (
        <List className={section.ordered ? 'mt-4 flex list-decimal flex-col gap-2.5 pl-6 marker:font-medium marker:text-soi-accent' : 'mt-4 flex list-disc flex-col gap-2.5 pl-6 marker:text-soi-accent'}>
          {section.list.map((li) => <li key={li} className="pl-1 text-[17px] leading-relaxed text-soi-ink/85"><RichText text={li} /></li>)}
        </List>
      )}
      {section.source && (
        <p className="mt-4 flex gap-2 text-sm text-soi-muted">
          <BookOpen className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><span>Fuente: {section.source}.</span>
        </p>
      )}
    </section>
  );
}

/** Preguntas frecuentes plegables (el JSON-LD FAQPage lo arma la página). */
export function FaqList({ faq, id = 'preguntas' }: { faq: Faq[]; id?: string }) {
  return (
    <section className="scroll-mt-4" aria-labelledby={id}>
      <h2 id={id} className="text-2xl font-semibold tracking-tight sm:text-3xl">Preguntas frecuentes</h2>
      <div className="mt-5 flex flex-col gap-2.5">
        {faq.map((f) => (
          <details key={f.q} className="group rounded-[20px] bg-white shadow-ring">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-[17px] font-medium [&::-webkit-details-marker]:hidden">
              <h3>{f.q}</h3>
              <ChevronDown className="h-5 w-5 shrink-0 text-soi-muted transition-transform duration-(--dur-fast) ease-out-strong group-open:rotate-180" aria-hidden="true" />
            </summary>
            <p className="px-5 pb-5 text-[16px] leading-relaxed text-soi-muted">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

/** JSON-LD de preguntas frecuentes. */
export function faqJsonLd(faq: Faq[]) {
  return { '@type': 'FAQPage', mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: plainText(f.a) } })) };
}

/** Tarjeta de enlace a otra página del contenido. */
export function LinkCard({ href, title, text, eyebrow }: { href: string; title: string; text?: string; eyebrow?: string }) {
  return (
    <Link href={href} className="press group flex h-full flex-col rounded-[20px] bg-white p-4 shadow-ring hover:shadow-soft">
      {eyebrow && <span className="text-xs font-medium text-soi-accent">{eyebrow}</span>}
      <span className="mt-0.5 font-semibold">{title}</span>
      {text && <span className="mt-1 flex-1 text-sm text-soi-muted">{text}</span>}
      <ArrowRight className="mt-3 h-4 w-4 transition-transform duration-(--dur-fast) ease-out-strong group-hover:translate-x-0.5" aria-hidden="true" />
    </Link>
  );
}

/** «16 de octubre de 2026». */
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${iso}T12:00:00Z`));
}
