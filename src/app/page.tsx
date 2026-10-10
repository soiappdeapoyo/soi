import Link from 'next/link';
import type { Metadata } from 'next';
import { Check, ChevronDown, Mic } from 'lucide-react';
import { buttonClass } from '@/components/ui/button';
import { Cta } from '@/components/landing/cta';
import { AuthorPicker, type LandingOffer } from '@/components/landing/author-picker';
import { HowItWorksFilm } from '@/components/emotions/how-it-works-film';
import { JsonLd } from '@/components/emotions/site-header';
import type { FilmScript } from '@/config/emotions';
import { FunnelBeacon } from '@/components/landing/funnel-beacon';
import { CHALLENGE_SLUGS } from '@/config/official-challenges';
import { officialMoment } from '@/config/official-moments';
import { getSettings } from '@/lib/settings';
import type { MomentFlow } from '@/lib/moments/types';

export const metadata: Metadata = {
  title: 'SOI · Ya viste el video. Ahora vívelo 7 días.',
  description: 'Neville Goddard, Brian Tracy o Napoleon Hill: elige al autor de tu video y practica su técnica real 7 días, guiado por voz y en español. Gratis y sin tarjeta.',
};

const signup = (next?: string) => `/login${next ? `?next=${encodeURIComponent(next)}` : ''}`;

/**
 * La oferta de cada autor: el reto de 7 días (src/config/official-challenges.ts) con su resultado concreto.
 * Al crear la cuenta, la persona entra directo al día 1.
 */
const OFFER_COPY: Record<LandingOffer['key'], { promise: string; when: string }> = {
  neville: { promise: 'Duérmete cada noche sintiendo tu deseo ya cumplido.', when: 'cada noche' },
  tracy: { promise: 'Termina la semana con tu meta principal, tu plan y tu primer sapo comido.', when: 'cada mañana' },
  hill: { promise: 'Convierte tu deseo en un propósito con cantidad, fecha, plan y declaración.', when: 'al día' },
};

const CHALLENGES = (Object.keys(CHALLENGE_SLUGS) as LandingOffer['key'][]).map((key) => ({ key, m: officialMoment(CHALLENGE_SLUGS[key])! }));

const MIN_MINUTES = Math.min(...CHALLENGES.map(({ m }) => m.required_minutes));

const OFFERS: LandingOffer[] = CHALLENGES.map(({ key, m }) => ({
  key, author: m.author ?? '', title: m.title, promise: OFFER_COPY[key].promise,
  when: `${m.required_minutes} min ${OFFER_COPY[key].when}`, cover: m.cover!, href: signup(`/m/${m.slug}/play`),
}));

/** Los 7 días de un reto: lo que se repite cada día y lo nuevo de cada día (sin la celebración final). */
function weekOf(m: MomentFlow) {
  const daily = m.blocks.filter((b) => !b.day).map((b) => b.title);
  const days = Array.from({ length: 7 }, (_, i) => ({
    day: i + 1,
    titles: m.blocks.filter((b) => b.day === i + 1 && b.type !== 'celebration').map((b) => b.title),
  }));
  return { daily, days };
}

/** Lo que se reconoce de sí misma la persona que llega desde TikTok (identificación, sin culpa). */
const PAINS = [
  'Guardas el video. Nunca lo vuelves a abrir.',
  'Te motivas a las 11 de la noche y a las 9 de la mañana ya se te olvidó.',
  'Sabes lo que dice Neville, Tracy o Hill… pero no lo practicas.',
  'Antes de dormir, tu mente no se calla.',
];

/** Lo que trae cualquier reto: el valor completo, no solo "una prueba". */
const INCLUDED = [
  ['La técnica real del autor', 'Cada paso cita su libro. Nada inventado.'],
  ['Guiado por voz, en español', 'Cierras los ojos y SOI te lleva. También puedes leerlo.'],
  ['Lo que escribes se queda', 'Tu deseo, tu meta y tu escena quedan guardados y SOI los recuerda.'],
  ['Un aviso cada día, si quieres', 'A la hora que elijas, para que no se te pase.'],
  ['Sin castigo si fallas un día', 'El reto no se reinicia: sigues donde ibas.'],
  ['SOI te escucha', 'Si algo se mueve en ti, se lo cuentas y te acompaña.'],
] as const;

const STEPS = [
  { n: '01', t: 'Elige al autor de tu video', d: 'Neville, Brian Tracy o Napoleon Hill. Cada uno con su reto de 7 días.' },
  { n: '02', t: 'Vive tu día 1 hoy mismo', d: `Desde ${MIN_MINUTES} minutos, guiado por voz. Una cosa a la vez.` },
  { n: '03', t: 'Un día por día', d: 'Cada día suma una enseñanza nueva del autor. Al día 7 ya no es un video: es tu práctica.' },
];

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

/** Lanzamiento: la tarjeta de Neville abierta, que es la de la animación. */
const OPEN_FIRST: LandingOffer['key'] = 'neville';

/**
 * Landing para quien llega desde TikTok con un autor en la cabeza (Neville, Brian Tracy, Napoleon Hill).
 * Oferta: el reto de 7 días de ESE autor, con resultado concreto, el día 1 hoy y la prueba que dura lo mismo que el
 * reto. Persuasión ética: identificación, una elección de un toque, el valor completo a la vista, autoridad con fuentes,
 * respuesta a las dudas y prueba sin riesgo. Sin cifras ni testimonios inventados, sin imágenes de los autores.
 */
/** Tarifas y días de prueba del panel; la página se regenera cada 5 minutos. */
export const revalidate = 300;

export default async function LandingPage() {
  const { trialDays: TRIAL_DAYS, plans } = await getSettings();
  const trialCoversChallenge = TRIAL_DAYS >= 7;
  const FAQ = [
    { q: '¿Tengo que saber meditar?', a: 'No. SOI te guía por voz paso a paso, como si alguien te acompañara. Si prefieres, también puedes leerlo.' },
    { q: '¿Cuánto tiempo necesito al día?', a: CHALLENGES.map(({ m }) => `${m.title}: unos ${m.required_minutes} min`).join(' · ') + '.' },
    { q: '¿Y si un día no puedo?', a: 'No pasa nada. El reto no se reinicia ni te castiga: al volver, sigues en el día donde ibas.' },
    { q: '¿Necesito tarjeta?', a: `No. Tienes ${TRIAL_DAYS} días con todo incluido${trialCoversChallenge ? ', lo que dura tu reto' : ''}. Después decides.` },
    { q: '¿Qué pasa al terminar?', a: `Puedes seguir con otro reto o con las prácticas de Joe Dispenza, Hal Elrod y Robin Sharma con SOI+ (${plans.monthly.price} USD al mes). Si no te suscribes, pasas al plan gratuito: sigues conversando con SOI, pero las prácticas guiadas son de SOI+.` },
    { q: '¿SOI es de Neville, Brian Tracy o Napoleon Hill?', a: 'No. SOI no está afiliado a los autores: usa sus libros como fuente de las prácticas y cita cada una.' },
    { q: '¿Funciona en mi teléfono?', a: 'Sí, en iPhone y Android, directo desde el navegador. Si quieres, la agregas a tu pantalla de inicio como una app.' },
  ];

  return (
    <main id="main" className="bg-soi-canvas">
      <FunnelBeacon event="landing_view" />
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }} />

      {/* ---------- Héroe: el mundo de los videos + la elección de un toque ---------- */}
      <section className="relative isolate overflow-hidden bg-soi-ink text-white">
        <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
          <span className="text-2xl font-semibold">SOI.</span>
          <Link href="/login" className="press inline-flex h-9 items-center rounded-lg px-3 text-sm text-white/80 ring-1 ring-white/20 hover:text-white">Entrar</Link>
        </header>

        {/* El halo de respiración: la única expresividad de la página (estático con movimiento reducido). */}
        <span aria-hidden="true" className="pointer-events-none absolute -right-24 top-24 -z-10 h-[28rem] w-[28rem] animate-breathe rounded-full bg-soi-accent-fill/25 blur-3xl sm:right-0" />

        <div id="elige" className="mx-auto grid max-w-5xl scroll-mt-4 gap-10 px-5 pb-16 pt-4 sm:pb-24 sm:pt-12 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          <div>
            <p className="text-sm font-medium text-white/70">¿Viste un video de Neville, Brian Tracy o Napoleon Hill?</p>
            <h1 className="mt-3 text-balance text-[2.6rem] font-black uppercase leading-[0.95] tracking-tight sm:text-7xl">
              Ya viste el video.<br /><span className="text-soi-gold">Ahora vívelo 7&nbsp;días.</span>
            </h1>
            <p className="mt-5 max-w-xl text-pretty text-lg text-white/80">
              Su técnica real, guiada por voz y en español. Desde {MIN_MINUTES} minutos al día. Empiezas hoy.
            </p>
          </div>
          <div>
            <h2 className="mb-3 text-lg font-semibold">¿De quién era el video?</h2>
            <AuthorPicker offers={OFFERS} where="hero" />
            <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/60">
              <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4" aria-hidden="true" />Gratis {TRIAL_DAYS} días</span>
              <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4" aria-hidden="true" />Sin tarjeta</span>
              <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4" aria-hidden="true" />En español</span>
            </p>
          </div>
        </div>
      </section>

      {/* ---------- Identificación ---------- */}
      <section className="mx-auto max-w-3xl px-5 py-16 sm:py-20" aria-labelledby="te-pasa">
        <h2 id="te-pasa" className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">¿Te pasa esto?</h2>
        <ul className="mt-6 flex flex-col gap-2.5">
          {PAINS.map((p) => (
            <li key={p} className="rounded-[20px] bg-white px-5 py-4 text-[17px] shadow-ring">{p}</li>
          ))}
        </ul>
        <p className="mt-6 text-pretty text-lg text-soi-muted">
          No es falta de disciplina. Un video te inspira un minuto; <span className="font-medium text-soi-ink">una técnica cambia algo cuando la practicas varios días seguidos</span>.
          Por eso son 7, y por eso SOI te acompaña en cada uno.
        </p>
      </section>

      {/* ---------- La oferta completa: la semana de cada autor, día por día ---------- */}
      <section className="bg-soi-sidebar py-16 sm:py-20" aria-labelledby="semana">
        <div className="mx-auto max-w-3xl px-5">
          <h2 id="semana" className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">Tu semana, día por día</h2>
          <p className="mt-2 text-lg text-soi-muted">Cada día repites la práctica del autor y sumas una enseñanza suya.</p>
          <div className="mt-6 flex flex-col gap-2.5">
            {CHALLENGES.map(({ key, m }) => {
              const w = weekOf(m);
              return (
                <details key={key} open={key === OPEN_FIRST} className="group rounded-[20px] bg-white shadow-ring">
                  <summary className="press flex cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-medium text-soi-accent">{m.author}</span>
                      <span className="block text-lg font-semibold leading-snug">{m.title}</span>
                      <span className="mt-0.5 block text-[15px] text-soi-muted">{OFFER_COPY[key].promise}</span>
                    </span>
                    <ChevronDown className="h-5 w-5 shrink-0 text-soi-muted transition-transform duration-[var(--dur-base)] ease-[var(--ease-out-strong)] group-open:rotate-180" aria-hidden="true" />
                  </summary>
                  <div className="px-4 pb-4">
                    <p className="rounded-[14px] bg-soi-tray px-3.5 py-2.5 text-sm"><span className="font-medium">Cada {key === 'neville' ? 'noche' : key === 'tracy' ? 'mañana' : 'día'}:</span> {w.daily.join(' · ')}</p>
                    <ol className="mt-3 flex flex-col">
                      {w.days.map((d) => (
                        <li key={d.day} className="flex gap-3 border-b border-black/5 py-2.5 last:border-0">
                          <span className="nums w-12 shrink-0 text-sm font-medium text-soi-muted">Día {d.day}</span>
                          <span className="text-[15px]">{d.titles.join(' · ')}</span>
                        </li>
                      ))}
                    </ol>
                    <p className="mt-2 text-xs text-soi-muted">Fuente: {m.source}</p>
                    <Cta href={signup(`/m/${m.slug}/play`)} where={`reto:${key}`} className={buttonClass('primary', 'lg', 'mt-4 w-full sm:w-auto')}>
                      Empezar mi día 1 gratis
                    </Cta>
                  </div>
                </details>
              );
            })}
          </div>

          <h3 className="mt-12 text-xl font-semibold">Incluido en tu reto</h3>
          <ul className="mt-4 grid rounded-[20px] bg-white px-4 shadow-ring sm:grid-cols-2 sm:gap-x-6">
            {INCLUDED.map(([t, d]) => (
              <li key={t} className="flex gap-3 border-b border-black/5 py-3.5 last:border-0 sm:[&:nth-last-child(2)]:border-0">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-soi-accent" aria-hidden="true" />
                <span><span className="block font-medium">{t}</span><span className="block text-[15px] text-soi-muted">{d}</span></span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------- Cómo funciona: los pasos y la animación con la UI real ---------- */}
      <section className="mx-auto max-w-5xl px-5 py-16 sm:py-20" aria-labelledby="como">
        <h2 id="como" className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">Del video a tu vida</h2>
        {/* En el teléfono la animación va antes de los pasos; en escritorio, a la derecha. */}
        <div className="mt-8 grid items-center gap-10 lg:grid-cols-[1fr_auto] lg:gap-12">
          <HowItWorksFilm script={FILM} className="lg:order-last" trackAs="landing" />
          <div>
            <ol className="flex flex-col gap-3">
              {STEPS.map((s) => (
                <li key={s.n} className="rounded-[20px] bg-white p-5 shadow-ring">
                  <span className="nums text-sm font-medium text-soi-accent">{s.n}</span>
                  <p className="mt-1 text-lg font-semibold">{s.t}</p>
                  <p className="mt-1 text-[15px] text-soi-muted">{s.d}</p>
                </li>
              ))}
            </ol>
            <a href="#elige" className={buttonClass('primary', 'lg', 'mt-8 w-full sm:w-auto')}>Elegir mi reto</a>
          </div>
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

      {/* ---------- Sin riesgo: la prueba dura lo mismo que el reto ---------- */}
      <section className="mx-auto max-w-3xl px-5 py-16 text-center sm:py-20" aria-labelledby="precio">
        <h2 id="precio" className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          {TRIAL_DAYS === 7 ? 'Tu reto dura 7 días. Tu prueba gratis, también.' : trialCoversChallenge ? 'Tu prueba gratis cubre tu reto completo.' : `Pruébalo ${TRIAL_DAYS} días, todo incluido`}
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-pretty text-lg text-soi-muted">
          {trialCoversChallenge ? 'Haces la semana completa sin pagar y sin tarjeta. ' : 'Sin tarjeta. '}
          Si te sirve, SOI+ cuesta ${plans.monthly.price} USD al mes o ${plans.yearly.price} USD al año. Si no, no pagas nada.
        </p>
        <a href="#elige" className={buttonClass('gold', 'lg', 'mt-8 w-full sm:w-auto')}>Elegir mi reto</a>
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

      {/* ---------- Cierre: elegir otra vez, abajo de todo ---------- */}
      <section className="bg-soi-ink px-5 py-16 text-white sm:py-20" aria-labelledby="cierre">
        <div className="mx-auto max-w-xl">
          <h2 id="cierre" className="text-balance text-center text-3xl font-black uppercase leading-tight tracking-tight sm:text-5xl">Tu día 1 empieza hoy.</h2>
          <p className="mx-auto mt-3 max-w-md text-center text-white/75">Elige al autor de tu video. Si al terminar el día 1 no sientes nada distinto, no pierdes nada.</p>
          <div className="mt-8"><AuthorPicker offers={OFFERS} where="cierre" /></div>
        </div>
      </section>

      <footer className="px-5 py-8 text-center text-sm text-soi-muted">
        <nav className="flex justify-center gap-4" aria-label="Legal">
          <Link href="/privacidad" className="underline">Privacidad</Link>
          <Link href="/terminos" className="underline">Términos</Link>
          <Link href="/emociones" className="underline">Emociones</Link>
        </nav>
        <p className="mx-auto mt-3 max-w-2xl">
          SOI no está afiliado ni respaldado por los autores citados; sus enseñanzas se usan como fuente de las prácticas.
          SOI acompaña y no sustituye la atención psicológica ni médica profesional.
        </p>
      </footer>
    </main>
  );
}
