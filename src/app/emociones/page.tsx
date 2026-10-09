import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight, Check } from 'lucide-react';
import { buttonClass } from '@/components/ui/button';
import { Cta } from '@/components/landing/cta';
import { HowItWorksFilm } from '@/components/emotions/how-it-works-film';
import { EmotionsHeader, JsonLd } from '@/components/emotions/site-header';
import { EMOTIONS, ESLABON_LABEL, HUB_FILM } from '@/config/emotions';
import type { Eslabon } from '@/config/agents';
import { getSettings } from '@/lib/settings';
import { appUrl } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Emociones: entiende lo que sientes y qué hacer hoy',
  description: 'Ansiedad, estrés, desmotivación, falta de enfoque, baja autoestima, estancamiento y procrastinación: qué son, por qué pasan y prácticas de 5 minutos con fuente.',
  alternates: { canonical: '/emociones' },
  openGraph: { title: 'Emociones · SOI', description: 'Entiende lo que sientes y conviértelo en un Moment de minutos, guiado por voz y en español.', url: '/emociones', type: 'website' },
};

/** Días de prueba del panel; la página se regenera cada 5 minutos. */
export const revalidate = 300;

const ORDER: Eslabon[] = ['pensamiento', 'emocion', 'accion', 'resultado'];
const CHAIN: Record<Eslabon, string> = {
  pensamiento: 'Lo que crees sobre ti y tu realidad.',
  emocion: 'Cómo te hace sentir eso que piensas.',
  accion: 'Lo que haces como consecuencia.',
  resultado: 'La evidencia que obtienes.',
};

export default async function EmotionsHub() {
  const { trialDays } = await getSettings();
  const base = appUrl();
  return (
    <>
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'CollectionPage', name: 'Emociones', url: `${base}/emociones`, inLanguage: 'es',
            description: metadata.description,
            mainEntity: { '@type': 'ItemList', itemListElement: EMOTIONS.map((e, i) => ({ '@type': 'ListItem', position: i + 1, name: e.name, url: `${base}/emociones/${e.slug}` })) },
          },
          { '@type': 'BreadcrumbList', itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'SOI', item: base },
            { '@type': 'ListItem', position: 2, name: 'Emociones', item: `${base}/emociones` },
          ] },
        ],
      }} />

      {/* ---------- Héroe + la animación ---------- */}
      <section className="relative isolate overflow-hidden bg-soi-ink text-white">
        <EmotionsHeader tone="dark" />
        <span aria-hidden="true" className="pointer-events-none absolute -left-32 top-40 -z-10 h-[28rem] w-[28rem] animate-breathe rounded-full bg-soi-accent-fill/25 blur-3xl" />
        <div className="mx-auto grid max-w-5xl items-center gap-12 px-5 pb-16 pt-6 lg:grid-cols-[1fr_auto] lg:pb-24 lg:pt-12">
          <div>
            <p className="text-sm font-medium text-white/70">Emociones</p>
            <h1 className="mt-3 text-balance text-[2.5rem] font-black uppercase leading-[0.95] tracking-tight sm:text-6xl">
              ¿Cómo te sientes <span className="text-soi-gold">hoy?</span>
            </h1>
            <p className="mt-6 max-w-xl text-pretty text-lg text-white/80">
              Lo que sientes no es un defecto: es una señal. Aquí entiendes qué te está pasando y por qué. En SOI lo conviertes,
              en minutos, en una práctica hecha para ti.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Cta href="/login" where="emociones:hero" className={buttonClass('gold', 'lg', 'w-full sm:w-auto')}>Pruébalo {trialDays} días gratis</Cta>
              <a href="#elige" className="press inline-flex h-12 items-center justify-center gap-1.5 rounded-lg px-4 text-white/80 hover:text-white">Elige lo que sientes <ArrowRight className="h-4 w-4" aria-hidden="true" /></a>
            </div>
            <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/60">
              <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4" aria-hidden="true" />Sin tarjeta</span>
              <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4" aria-hidden="true" />Desde 5 minutos</span>
              <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4" aria-hidden="true" />Guiado por voz</span>
            </p>
          </div>
          <section aria-labelledby="como-funciona">
            <h2 id="como-funciona" className="sr-only">Cómo funciona SOI</h2>
            <HowItWorksFilm script={HUB_FILM} tone="dark" />
          </section>
        </div>
      </section>

      {/* ---------- Elige lo que sientes ---------- */}
      <section id="elige" className="mx-auto max-w-5xl scroll-mt-4 px-5 py-16 sm:py-20" aria-labelledby="elige-h">
        <h2 id="elige-h" className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">Elige lo que sientes</h2>
        <p className="mt-2 text-lg text-soi-muted">Qué es, por qué aparece y una práctica que puedes hacer ahora, con su fuente.</p>
        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {EMOTIONS.map((e) => (
            <li key={e.slug}>
              <Link href={`/emociones/${e.slug}`} className="press group flex h-full flex-col rounded-[20px] bg-white p-5 shadow-ring hover:shadow-soft">
                <span className="text-xs font-medium text-soi-accent">{ESLABON_LABEL[e.eslabon]}</span>
                <span className="mt-1 text-xl font-semibold">{e.name}</span>
                <span className="mt-1 flex-1 text-[15px] text-soi-muted">{e.hook}</span>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium">
                  Entenderla <ArrowRight className="h-4 w-4 transition-transform duration-(--dur-fast) ease-out-strong group-hover:translate-x-0.5" aria-hidden="true" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ---------- El principio SOI ---------- */}
      <section className="bg-soi-sidebar py-16 sm:py-20" aria-labelledby="principio">
        <div className="mx-auto max-w-5xl px-5">
          <h2 id="principio" className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">Por qué no basta con «pensar positivo»</h2>
          <p className="mt-3 max-w-2xl text-pretty text-lg text-soi-muted">
            Los pensamientos lideran las emociones. Las emociones lideran las acciones. Las acciones lideran los resultados.
            Lo que sientes casi siempre viene de un eslabón que se rompió. SOI interviene justo ahí.
          </p>
          <ol className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {ORDER.map((k, i) => {
              const list = EMOTIONS.filter((e) => e.eslabon === k);
              return (
                <li key={k} className="flex flex-col rounded-[20px] bg-white p-5 shadow-ring">
                  <span className="nums text-sm font-medium text-soi-accent">0{i + 1}</span>
                  <span className="mt-1 text-lg font-semibold">{ESLABON_LABEL[k]}</span>
                  <span className="mt-1 text-[15px] text-soi-muted">{CHAIN[k]}</span>
                  {list.length > 0 && (
                    <span className="mt-4 flex flex-wrap gap-1.5">
                      {list.map((e) => <Link key={e.slug} href={`/emociones/${e.slug}`} className="press rounded-full bg-soi-tray px-3 py-1.5 text-sm hover:bg-soi-accent-soft">{e.name}</Link>)}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* ---------- Cierre ---------- */}
      <section className="mx-auto max-w-3xl px-5 py-16 text-center sm:py-20" aria-labelledby="cierre">
        <h2 id="cierre" className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">Leer te ayuda a entender. Practicar te cambia.</h2>
        <p className="mx-auto mt-3 max-w-xl text-pretty text-lg text-soi-muted">
          Cuéntale a SOI cómo llegas hoy y vive tu primer Moment en minutos. {trialDays} días con todo incluido, sin tarjeta.
        </p>
        <Cta href="/login" where="emociones:cierre" className={buttonClass('primary', 'lg', 'mt-8 w-full sm:w-auto')}>Crear mi primer Moment</Cta>
      </section>
    </>
  );
}
