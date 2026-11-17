import Link from 'next/link';
import type { Metadata } from 'next';
import { ChevronDown, Mic } from 'lucide-react';
import { HowItWorksFilm } from '@/components/emotions/how-it-works-film';
import { JsonLd } from '@/components/emotions/site-header';
import type { FilmScript } from '@/config/emotions';
import { FunnelBeacon } from '@/components/landing/funnel-beacon';
import { LandingChat } from '@/components/landing/landing-chat';
import { HeroQuestions } from '@/components/landing/hero-questions';
import { CHALLENGE_SLUGS } from '@/config/official-challenges';
import { officialMoment } from '@/config/official-moments';

export const metadata: Metadata = {
  title: 'SOI · Cuéntale qué te pasa. Te diseña tu práctica ahora.',
  description: 'Cuéntale a SOI qué te pasa y te diseña una práctica de minutos, guiada por voz y en español, con las técnicas de Neville Goddard, Brian Tracy y Napoleon Hill.',
};

const CHALLENGES = (Object.keys(CHALLENGE_SLUGS) as (keyof typeof CHALLENGE_SLUGS)[]).map((key) => ({ key, m: officialMoment(CHALLENGE_SLUGS[key])! }));

/** La animación de la landing: quien llega desde un video de Neville lo vive esa misma noche (SATS). */
const FILM: FilmScript = {
  message: 'Vi un video de Neville sobre dormirse con el deseo cumplido, pero no sé cómo hacerlo.',
  reply: 'Qué bueno que quieras practicarlo. ¿Qué deseo te gustaría sentir cumplido esta noche?',
  chip: 'Un trabajo nuevo',
  chips: ['Un trabajo nuevo', 'Paz conmigo', 'Solo hablar'],
  momentTitle: 'SATS: mi trabajo nuevo',
  minutes: 15,
  blocks: [
    { icon: 'wind', label: 'Respiración 4-7-8', minutes: 2 },
    { icon: 'brain', label: 'Relaja tu cuerpo', minutes: 3 },
    { icon: 'eye', label: 'La escena del deseo cumplido', minutes: 8 },
    { icon: 'sparkles', label: 'Repítela hasta dormir', minutes: 2 },
  ],
  playing: { label: 'La escena del deseo cumplido', cue: ['Ya es tuyo…', 'Siéntelo ahora…'] },
  moodBefore: 4,
  moodAfter: 8,
  capacity: 'Confianza',
};

const SOURCES = [
  'Neville Goddard — Sentir es el secreto',
  'Neville Goddard — Fuera de este mundo',
  'Brian Tracy — ¡Metas!',
  'Brian Tracy — ¡Tráguese ese sapo!',
  'Napoleon Hill — Piense y hágase rico',
];

/**
 * Landing para quien llega desde TikTok con un autor en la cabeza (Neville, Brian Tracy, Napoleon Hill).
 * Oferta: el reto de 7 días de ESE autor, con resultado concreto y el día 1 hoy. Sin precios ni planes: el pago
 * aparece en la app al terminar la prueba. Persuasión ética: identificación, una elección de un toque, el valor
 * completo a la vista, autoridad con fuentes y respuesta a las dudas. Sin cifras ni testimonios inventados, sin imágenes de los autores.
 */
export default async function LandingPage() {
  const FAQ = [
    { q: '¿Tengo que saber meditar?', a: 'No. SOI te guía por voz paso a paso, como si alguien te acompañara. Si prefieres, también puedes leerlo.' },
    { q: '¿Cuánto tiempo necesito al día?', a: CHALLENGES.map(({ m }) => `${m.title}: unos ${m.required_minutes} min`).join(' · ') + '.' },
    { q: '¿Y si un día no puedo?', a: 'No pasa nada. El reto no se reinicia ni te castiga: al volver, sigues en el día donde ibas.' },
    { q: '¿Qué pasa al terminar?', a: 'Puedes seguir con otro reto o con las prácticas de Joe Dispenza, Hal Elrod y Robin Sharma, y seguir conversando con SOI.' },
    { q: '¿SOI es de Neville, Brian Tracy o Napoleon Hill?', a: 'No. SOI no está afiliado a los autores: usa sus libros como fuente de las prácticas y cita cada una.' },
    { q: '¿Funciona en mi teléfono?', a: 'Sí, en iPhone y Android, directo desde el navegador. Si quieres, la agregas a tu pantalla de inicio como una app.' },
  ];

  return (
    <main id="main" className="bg-soi-canvas">
      <FunnelBeacon event="landing_view" />
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }} />

      {/* ---------- Héroe estilo chat de IA: texto grande, resumen corto y el chat. Debajo, la animación. ---------- */}
      <section className="relative isolate overflow-hidden bg-soi-ink text-white">
        <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
          <span className="text-2xl font-semibold">SOI.</span>
          <Link href="/login" className="press inline-flex h-9 items-center rounded-lg px-3 text-sm text-white/80 ring-1 ring-white/20 hover:text-white">Entrar</Link>
        </header>

        {/* El halo de respiración: la única expresividad de la página (estático con movimiento reducido). */}
        <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-24 -z-10 h-[28rem] w-[28rem] -translate-x-1/2 animate-breathe rounded-full bg-soi-accent-fill/25 blur-3xl" />

        <div id="crea" className="mx-auto max-w-2xl scroll-mt-4 px-5 pb-14 pt-6 text-center sm:pb-20 sm:pt-14">
          {/* Preguntas que rotan con la respuesta de SOI debajo (el título fijo queda para lectores y buscadores). */}
          <HeroQuestions title="Cuéntale a SOI qué te pasa. Te diseña tu práctica ahora." />
          <div className="mt-5 text-left sm:mt-7">
            <LandingChat />
          </div>
        </div>

        {/* La animación «cómo funciona SOI», justo debajo del chat. */}
        <div className="mx-auto flex max-w-5xl justify-center px-5 pb-16 sm:pb-20">
          <HowItWorksFilm script={FILM} tone="dark" trackAs="landing" />
        </div>
      </section>

      {/* ---------- Escucha primero (cómo se siente SOI) ---------- */}
      <section className="bg-soi-sidebar py-16 sm:py-20" aria-labelledby="escucha">
        <div className="mx-auto grid max-w-5xl items-center gap-10 px-5 sm:grid-cols-2">
          <div>
            <h2 id="escucha" className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">No es otro video. Tampoco otra app de tareas.</h2>
            <p className="mt-3 text-pretty text-lg text-soi-muted">
              SOI te escucha. Recuerda lo que le contaste, te pregunta cómo siguió y ajusta la práctica a lo que vives.
              Si hoy no es el día, dices «ahora no» y lo entiende.
            </p>
            <p className="mt-4 flex items-center gap-2 text-[15px] text-soi-muted"><Mic className="h-4 w-4 text-soi-accent" aria-hidden="true" />Guiado por voz: cierras los ojos y te lleva.</p>
          </div>
          {/* Una conversación de ejemplo (ilustrativa). */}
          <figure aria-label="Ejemplo de conversación con SOI" className="rounded-[28px] bg-white p-2 shadow-soft">
            <div className="flex flex-col gap-3 rounded-[20px] p-4">
              <p className="text-[15px] leading-relaxed">Buenas noches, Ana. Vas en la noche 3 de Neville. Ayer me contaste que te costó sentir la escena. ¿Cómo te fue?</p>
              <div className="flex flex-wrap gap-2" aria-hidden="true">
                {['Mejor', 'Sigue igual', 'Hoy es otra cosa'].map((c) => <span key={c} className="rounded-full bg-white px-3 py-1.5 text-sm shadow-ring">{c}</span>)}
              </div>
              <p className="ml-auto max-w-[80%] rounded-[14px] bg-soi-tray px-3.5 py-2 text-[15px]">Sigue igual. La veo, pero no la siento.</p>
              <p className="text-[15px] leading-relaxed">Es muy común al principio. Esta noche probemos algo: antes de la escena, nombra la emoción que tendrías si ya fuera tuyo. ¿Cuál sería?</p>
            </div>
            <figcaption className="px-4 pb-2 text-xs text-soi-muted">Conversación de ejemplo.</figcaption>
          </figure>
        </div>
      </section>

      {/* ---------- Identidad (lo que queda después de los 7 días) ---------- */}
      <section className="mx-auto max-w-3xl px-5 py-16 sm:py-20" aria-labelledby="identidad">
        <h2 id="identidad" className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">No coleccionas videos. Coleccionas evidencia.</h2>
        <p className="mt-3 text-pretty text-lg text-soi-muted">Cada día que practicas es una prueba de quién te estás convirtiendo. SOI te lo muestra.</p>
        <div className="mt-6 rounded-[20px] bg-soi-ink p-5 text-white" aria-hidden="true">
          <p className="text-sm text-white/70">Te estás convirtiendo en</p>
          <p className="mt-1 text-xl font-semibold">Una persona constante</p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full w-3/5 origin-left rounded-full bg-white" /></div>
          <p className="nums mt-2 text-sm text-white/80">Nivel 3 · 12 evidencias</p>
        </div>
      </section>

      {/* ---------- Autoridad con fuentes ---------- */}
      <section className="bg-soi-sidebar py-16" aria-labelledby="fuentes">
        <div className="mx-auto max-w-5xl px-5">
          <h2 id="fuentes" className="text-balance text-2xl font-semibold tracking-tight">Cada práctica cita su libro</h2>
          <p className="mt-2 text-soi-muted">Nada inventado: lo que enseñan en sus libros, convertido en algo que se practica.</p>
          <ul className="mt-5 flex flex-wrap gap-2">
            {SOURCES.map((s) => <li key={s} className="rounded-full bg-white px-3.5 py-2 text-sm shadow-ring">{s}</li>)}
          </ul>
        </div>
      </section>

      {/* ---------- Dudas ---------- */}
      <section className="mx-auto max-w-3xl px-5 pb-16 sm:pb-20" aria-labelledby="faq">
        <h2 id="faq" className="text-balance text-3xl font-semibold tracking-tight">Preguntas frecuentes</h2>
        <div className="mt-6 flex flex-col gap-2">
          {FAQ.map((f) => (
            <details key={f.q} className="group rounded-[20px] bg-white shadow-ring">
              <summary className="press flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-[17px] font-medium [&::-webkit-details-marker]:hidden">
                {f.q}
                <ChevronDown className="h-5 w-5 shrink-0 text-soi-muted transition-transform duration-[var(--dur-base)] ease-[var(--ease-out-strong)] group-open:rotate-180" aria-hidden="true" />
              </summary>
              <p className="px-5 pb-4 text-[15px] text-soi-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="px-5 py-8 text-center text-sm text-soi-muted">
        <nav className="flex flex-wrap justify-center gap-x-4 gap-y-2" aria-label="Legal">
          <Link href="/privacidad" className="underline">Privacidad</Link>
          <Link href="/terminos" className="underline">Términos</Link>
          <Link href="/emociones" className="underline">Emociones</Link>
          <Link href="/guias" className="underline">Guías</Link>
          <Link href="/blog" className="underline">Blog</Link>
        </nav>
        <p className="mx-auto mt-3 max-w-2xl">
          SOI no está afiliado ni respaldado por los autores citados; sus enseñanzas se usan como fuente de las prácticas.
          SOI acompaña y no sustituye la atención psicológica ni médica profesional.
        </p>
      </footer>
    </main>
  );
}
