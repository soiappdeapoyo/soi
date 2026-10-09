import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArrowRight, BookOpen, ChevronDown, Clock } from 'lucide-react';
import { buttonClass } from '@/components/ui/button';
import { Cta } from '@/components/landing/cta';
import { HowItWorksFilm } from '@/components/emotions/how-it-works-film';
import { EmotionsHeader, JsonLd } from '@/components/emotions/site-header';
import { EMOTIONS, ESLABON_LABEL, emotionBySlug } from '@/config/emotions';
import { getSettings } from '@/lib/settings';
import { appUrl } from '@/lib/utils';

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;
/** Días de prueba del panel; la página se regenera cada 5 minutos. */
export const revalidate = 300;

export function generateStaticParams() {
  return EMOTIONS.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const e = emotionBySlug((await params).slug);
  if (!e) return {};
  return {
    title: e.title,
    description: e.description,
    alternates: { canonical: `/emociones/${e.slug}` },
    openGraph: { title: e.title, description: e.description, url: `/emociones/${e.slug}`, type: 'article' },
  };
}

const CYCLE = [
  { k: 'thought', label: 'Pensamiento' },
  { k: 'emotion', label: 'Emoción' },
  { k: 'action', label: 'Acción' },
  { k: 'result', label: 'Resultado' },
] as const;

export default async function EmotionPage({ params }: Props) {
  const e = emotionBySlug((await params).slug);
  if (!e) notFound();
  const { trialDays } = await getSettings();
  const base = appUrl();
  const url = `${base}/emociones/${e.slug}`;
  const signup = `/login?next=${encodeURIComponent(`/chat?agent=${e.agent}`)}`;
  const related = e.related.map(emotionBySlug).filter((r) => r !== null);

  return (
    <>
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Article', headline: e.h1, description: e.description, inLanguage: 'es', url, mainEntityOfPage: url,
            publisher: { '@type': 'Organization', name: 'SOI', url: base },
            about: { '@type': 'Thing', name: e.name },
          },
          {
            '@type': 'HowTo', name: e.technique.name, totalTime: `PT${e.technique.minutes}M`, inLanguage: 'es',
            step: e.technique.steps.map((s, i) => ({ '@type': 'HowToStep', position: i + 1, text: s })),
          },
          { '@type': 'FAQPage', mainEntity: e.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
          { '@type': 'BreadcrumbList', itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'SOI', item: base },
            { '@type': 'ListItem', position: 2, name: 'Emociones', item: `${base}/emociones` },
            { '@type': 'ListItem', position: 3, name: e.name, item: url },
          ] },
        ],
      }} />

      <EmotionsHeader />

      <article>
        {/* ---------- Encabezado ---------- */}
        <header className="mx-auto max-w-3xl px-5 pb-10 pt-4 sm:pt-8">
          <nav aria-label="Ruta" className="text-sm text-soi-muted">
            <ol className="flex items-center gap-1.5">
              <li><Link href="/emociones" className="hover:text-soi-ink hover:underline">Emociones</Link></li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-soi-ink">{e.name}</li>
            </ol>
          </nav>
          <p className="mt-6 inline-flex rounded-full bg-soi-accent-soft px-3 py-1 text-xs font-medium text-soi-accent">Eslabón: {ESLABON_LABEL[e.eslabon]}</p>
          <h1 className="mt-3 text-balance text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">{e.h1}</h1>
          <p className="mt-5 text-pretty text-lg leading-relaxed text-soi-muted">{e.intro}</p>
          <a href="#practica" className="press mt-6 inline-flex h-11 items-center gap-2 rounded-lg bg-soi-ink px-4 font-medium text-white">
            <Clock className="h-4 w-4" aria-hidden="true" />Practícalo ahora · <span className="nums">{e.technique.minutes} min</span>
          </a>
        </header>

        {/* ---------- Identificación ---------- */}
        <section className="mx-auto max-w-3xl px-5 py-8" aria-labelledby="se-siente">
          <h2 id="se-siente" className="text-2xl font-semibold tracking-tight sm:text-3xl">¿Te pasa esto?</h2>
          <ul className="mt-5 flex flex-col gap-2.5">
            {e.signs.map((s) => <li key={s} className="rounded-[20px] bg-white px-5 py-4 text-[17px] shadow-ring">{s}</li>)}
          </ul>
        </section>

        {/* ---------- El ciclo ---------- */}
        <section className="mx-auto max-w-3xl px-5 py-8" aria-labelledby="por-que">
          <h2 id="por-que" className="text-2xl font-semibold tracking-tight sm:text-3xl">Por qué pasa</h2>
          <p className="mt-2 text-lg text-soi-muted">Un pensamiento enciende una emoción, la emoción decide lo que haces y lo que haces trae un resultado que confirma el pensamiento. Así se ve con {e.name.toLowerCase()}:</p>
          <ol className="mt-5 grid gap-2.5 sm:grid-cols-2">
            {CYCLE.map((c, i) => (
              <li key={c.k} className="rounded-[20px] bg-soi-sidebar p-4">
                <span className="nums text-xs font-medium text-soi-accent">0{i + 1} · {c.label}</span>
                <p className="mt-1 text-[16px]">{e.cycle[c.k]}</p>
              </li>
            ))}
          </ol>
          {e.enemy && (
            <p className="mt-5 rounded-[20px] bg-soi-ink px-5 py-4 text-white">
              <span className="text-white/70">En SOI lo llamamos </span><span className="font-semibold">{e.enemy.name}</span>
              <span className="text-white/70">. Te susurra </span><span className="italic">«{e.enemy.whisper}»</span>
              <span className="text-white/70">. No eres tú: es un patrón, y se le puede ganar.</span>
            </p>
          )}
        </section>

        {/* ---------- La práctica ---------- */}
        <section id="practica" className="mx-auto max-w-3xl scroll-mt-4 px-5 py-8" aria-labelledby="practica-h">
          <div className="rounded-[28px] bg-soi-tray p-2">
            <div className="rounded-[20px] bg-white p-5 shadow-ring sm:p-6">
              <p className="nums text-sm font-medium text-soi-accent">Pruébalo ahora · {e.technique.minutes} minutos</p>
              <h2 id="practica-h" className="mt-1 text-2xl font-semibold tracking-tight">{e.technique.name}</h2>
              <ol className="mt-5 flex flex-col gap-4">
                {e.technique.steps.map((s, i) => (
                  <li key={s} className="flex gap-3">
                    <span className="nums grid h-7 w-7 shrink-0 place-items-center rounded-full bg-soi-accent-soft text-sm font-medium text-soi-accent">{i + 1}</span>
                    <span className="pt-0.5 text-[16px] leading-relaxed">{s}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-5 flex gap-2 border-t border-black/5 pt-4 text-sm text-soi-muted">
                <BookOpen className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><span>Fuente: {e.technique.source}.</span>
              </p>
            </div>
          </div>
        </section>

        {/* ---------- Así lo haría SOI ---------- */}
        <section className="my-8 bg-soi-sidebar py-14 sm:py-16" aria-labelledby="con-soi">
          <div className="mx-auto grid max-w-5xl items-center gap-10 px-5 lg:grid-cols-[1fr_auto]">
            <div>
              <h2 id="con-soi" className="text-balance text-3xl font-semibold tracking-tight">Así lo haría SOI contigo</h2>
              <p className="mt-3 max-w-lg text-pretty text-lg text-soi-muted">
                Una técnica genérica ayuda. Una hecha con lo que te pasa hoy, en tus palabras y con tu tiempo, se vive distinto.
                SOI te escucha, diseña un Moment solo para ti y te guía con voz, paso a paso.
              </p>
              <Cta href={signup} where={`emociones:${e.slug}`} className={buttonClass('primary', 'lg', 'mt-7 w-full sm:w-auto')}>Crear mi Moment para {e.name.toLowerCase()}</Cta>
              <p className="mt-3 text-sm text-soi-muted">{trialDays} días con todo incluido. Sin tarjeta.</p>
            </div>
            <HowItWorksFilm script={e.film} />
          </div>
        </section>

        {/* ---------- Hábitos ---------- */}
        <section className="mx-auto max-w-3xl px-5 py-8" aria-labelledby="ayuda">
          <h2 id="ayuda" className="text-2xl font-semibold tracking-tight sm:text-3xl">Lo que ayuda en el día a día</h2>
          <ul className="mt-5 flex flex-col gap-3">
            {e.habits.map((h) => (
              <li key={h.title} className="rounded-[20px] bg-white p-5 shadow-ring">
                <p className="text-lg font-semibold">{h.title}</p>
                <p className="mt-1 text-[16px] text-soi-muted">{h.text}</p>
                <p className="mt-2 text-xs text-soi-muted">Fuente: {h.source}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* ---------- Preguntas frecuentes ---------- */}
        <section className="mx-auto max-w-3xl px-5 py-8" aria-labelledby="faq">
          <h2 id="faq" className="text-2xl font-semibold tracking-tight sm:text-3xl">Preguntas frecuentes</h2>
          <div className="mt-5 flex flex-col gap-2.5">
            {e.faq.map((f) => (
              <details key={f.q} className="group rounded-[20px] bg-white shadow-ring">
                <summary className="flex min-h-14 list-none items-center justify-between gap-3 px-5 py-4 text-[17px] font-medium [&::-webkit-details-marker]:hidden">
                  <h3>{f.q}</h3>
                  <ChevronDown className="h-5 w-5 shrink-0 text-soi-muted transition-transform duration-(--dur-fast) ease-out-strong group-open:rotate-180" aria-hidden="true" />
                </summary>
                <p className="px-5 pb-5 text-[16px] leading-relaxed text-soi-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ---------- Relacionadas ---------- */}
        <nav className="mx-auto max-w-3xl px-5 pb-16 pt-8" aria-labelledby="relacionadas">
          <h2 id="relacionadas" className="text-2xl font-semibold tracking-tight">También te puede servir</h2>
          <ul className="mt-5 grid gap-3 sm:grid-cols-3">
            {related.map((r) => (
              <li key={r.slug}>
                <Link href={`/emociones/${r.slug}`} className="press group flex h-full flex-col rounded-[20px] bg-white p-4 shadow-ring hover:shadow-soft">
                  <span className="font-semibold">{r.name}</span>
                  <span className="mt-1 flex-1 text-sm text-soi-muted">{r.hook}</span>
                  <ArrowRight className="mt-3 h-4 w-4 transition-transform duration-(--dur-fast) ease-out-strong group-hover:translate-x-0.5" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/emociones" className="mt-6 inline-flex items-center gap-1 text-sm font-medium underline">Ver todas las emociones</Link>
        </nav>
      </article>
    </>
  );
}
