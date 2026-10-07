import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight, Check, Mic, MoonStar } from 'lucide-react';
import { buttonClass } from '@/components/ui/button';
import { Cta } from '@/components/landing/cta';
import { getSettings } from '@/lib/settings';
import { officialCover } from '@/lib/moments/types';

export const metadata: Metadata = {
  title: 'SOI · Ya viste el video. Ahora vívelo.',
  description: 'Convierte lo que aprendes de Napoleon Hill, Brian Tracy, Neville Goddard y Joe Dispenza en momentos desde 5 minutos, guiados por voz y en español. Prueba gratis.',
};

const signup = (next?: string) => `/login${next ? `?next=${encodeURIComponent(next)}` : ''}`;

/** Lo que la persona reconoce de sí misma (identificación, sin culpa). */
const PAINS = [
  'Guardas videos que nunca vuelves a ver.',
  'Te motivas a las 11 de la noche y a las 9 de la mañana ya se te olvidó.',
  'Sabes lo que tienes que hacer… pero no lo haces.',
  'Antes de dormir, tu mente no se calla.',
];

/** Los temas que ya te mueven, convertidos en algo que se vive (cada uno lleva directo a practicarlo). */
const TOPICS = [
  { title: 'Mañanas de éxito', moment: 'Ritual de 5 minutos', author: 'Brian Tracy', minutes: 5, slug: 'brian_tracy_5min', next: '/m/brian_tracy_5min/play' },
  { title: 'Reprograma tu mente antes de dormir', moment: 'SATS', author: 'Neville Goddard', minutes: 15, slug: 'neville_sats', next: '/m/neville_sats/play' },
  { title: 'La riqueza comienza con un cambio', moment: 'Tu propósito principal definido', author: 'Napoleon Hill', minutes: null, slug: null, next: '/chat?agent=napoleon_hill' },
  { title: 'Rompe el hábito de ser tú', moment: 'Protocolo Dispenza', author: 'Joe Dispenza', minutes: 35, slug: 'dispenza_protocol', next: '/m/dispenza_protocol/play' },
  { title: 'Gana la mañana', moment: 'Club de las 5 AM', author: 'Robin Sharma', minutes: 60, slug: 'five_am_club', next: '/m/five_am_club/play' },
  { title: 'Mañanas milagrosas', moment: 'Miracle Morning', author: 'Hal Elrod', minutes: 36, slug: 'miracle_morning', next: '/m/miracle_morning/play' },
];

const STEPS = [
  { n: '01', t: 'Cuéntale a SOI cómo llegas', d: 'Te escucha primero. Recuerda lo que le contaste ayer y te pregunta cómo siguió. Puedes escribir o hablar.' },
  { n: '02', t: 'Vive un Moment desde 5 minutos', d: 'Una práctica corta, guiada por voz, basada en el autor que ya te inspira. Una cosa a la vez.' },
  { n: '03', t: 'Mira en quién te estás convirtiendo', d: 'Cada Moment es evidencia. No acumulas videos: acumulas pruebas de tu nueva identidad.' },
];

const ENEMIES = [
  { name: 'El Saboteador', whisper: 'Mañana lo hago.' },
  { name: 'La Duda', whisper: '¿Y si sale mal?' },
  { name: 'El Perfeccionista', whisper: 'Todavía no está listo.' },
];

const SOURCES = [
  'Napoleon Hill — Piense y hágase rico',
  'Brian Tracy — ¡Tráguese ese sapo!',
  'Neville Goddard — Sentir es el secreto',
  'Joe Dispenza — Deja de ser tú',
  'Hal Elrod — Mañanas milagrosas',
  'Robin Sharma — El Club de las 5 de la mañana',
];

/**
 * Landing: la persona llega desde videos intensos (fondo negro, letras enormes). La recibimos en ese mundo y la
 * llevamos a la calma de SOI. Persuasión ética: identificación, la brecha entre ver y hacer, un primer paso pequeño
 * (elegir un tema lleva directo a practicarlo), autoridad con fuentes y prueba sin riesgo. Sin cifras ni testimonios
 * inventados, sin imágenes de los autores.
 */
/** Tarifas y días de prueba del panel; la página se regenera cada 5 minutos. */
export const revalidate = 300;

export default async function LandingPage() {
  const { trialDays: TRIAL_DAYS, plans } = await getSettings();
  return (
    <main id="main" className="bg-soi-canvas">
      {/* ---------- Héroe: el mundo de los videos ---------- */}
      <section className="relative isolate overflow-hidden bg-soi-ink text-white">
        <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
          <span className="text-2xl font-semibold">SOI.</span>
          <Link href="/login" className="press inline-flex h-9 items-center rounded-lg px-3 text-sm text-white/80 ring-1 ring-white/20 hover:text-white">Entrar</Link>
        </header>

        {/* El halo de respiración: la única expresividad de la página (estático con movimiento reducido). */}
        <span aria-hidden="true" className="pointer-events-none absolute -right-24 top-24 -z-10 h-[28rem] w-[28rem] animate-breathe rounded-full bg-soi-accent-fill/25 blur-3xl sm:right-0" />

        <div className="mx-auto max-w-5xl px-5 pb-20 pt-8 sm:pb-28 sm:pt-16">
          <p className="text-sm font-medium text-white/70">Para quien ya vio el video y quiere que esta vez sí cambie algo</p>
          <h1 className="mt-4 text-balance text-[2.6rem] font-black uppercase leading-[0.95] tracking-tight sm:text-7xl">
            Ya viste el video.<br /><span className="text-soi-gold">Ahora vívelo.</span>
          </h1>
          <p className="mt-6 max-w-xl text-pretty text-lg text-white/80">
            Escucharlo te inspira diez minutos. Practicarlo cambia quién eres. SOI convierte lo que aprendes de Napoleon Hill,
            Brian Tracy, Neville Goddard y Joe Dispenza en momentos desde 5 minutos, guiados por voz, para hoy.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Cta href={signup()} where="hero" className={buttonClass('gold', 'lg', 'w-full sm:w-auto')}>Pruébalo {TRIAL_DAYS} días gratis</Cta>
            <a href="#temas" className="press inline-flex h-12 items-center justify-center gap-1.5 rounded-lg px-4 text-white/80 hover:text-white">Elige por dónde empezar <ArrowRight className="h-4 w-4" aria-hidden="true" /></a>
          </div>
          <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/60">
            <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4" aria-hidden="true" />Sin tarjeta</span>
            <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4" aria-hidden="true" />En español</span>
            <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4" aria-hidden="true" />Cancela cuando quieras</span>
          </p>
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
          No es falta de disciplina. Es que <span className="font-medium text-soi-ink">nadie te acompañó a practicarlo</span>.
          Un video te enseña qué hacer; un hábito se construye haciéndolo, un día a la vez.
        </p>
      </section>

      {/* ---------- Temas: el primer paso pequeño (elegir lleva directo a practicarlo) ---------- */}
      <section id="temas" className="bg-soi-ink py-16 text-white sm:py-20" aria-labelledby="temas-h">
        <div className="mx-auto max-w-5xl px-5">
          <h2 id="temas-h" className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">Los temas que ya te mueven, ahora para vivirlos</h2>
          <p className="mt-2 text-white/70">Elige uno. Al crear tu cuenta, empiezas directo ahí.</p>
          <ul className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-3">
            {TOPICS.map((t) => (
              <li key={t.title}>
                <Cta href={signup(t.next)} where={`tema:${t.slug ?? 'hill'}`} ariaLabel={`${t.title}: vive ${t.moment} de ${t.author}`}
                  className="press group relative isolate flex h-full min-h-[15.5rem] flex-col justify-end overflow-hidden rounded-[20px] bg-white/5 p-3.5 ring-1 ring-white/10 sm:min-h-[14rem] sm:p-4">
                  {t.slug && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={officialCover(t.slug)} alt="" loading="lazy" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-45" />
                  )}
                  <span aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
                  <span lang="es" className="hyphens-auto break-words text-[17px] font-black uppercase leading-[1.05] tracking-tight sm:text-2xl">{t.title}</span>
                  <span className="mt-2 text-xs text-white/75">{t.moment} · {t.author}</span>
                  <span className="nums mt-3 inline-flex w-fit items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-soi-ink">{t.minutes ? `Vívelo · ${t.minutes} min` : 'Conversa con él'}</span>
                </Cta>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------- Cómo funciona ---------- */}
      <section className="mx-auto max-w-5xl px-5 py-16 sm:py-20" aria-labelledby="como">
        <h2 id="como" className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">Del video a tu vida, en tres pasos</h2>
        <ol className="mt-8 grid gap-3 sm:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.n} className="rounded-[20px] bg-white p-5 shadow-ring">
              <span className="nums text-sm font-medium text-soi-accent">{s.n}</span>
              <p className="mt-1 text-lg font-semibold">{s.t}</p>
              <p className="mt-1 text-[15px] text-soi-muted">{s.d}</p>
            </li>
          ))}
        </ol>
        <Cta href={signup()} where="pasos" className={buttonClass('primary', 'lg', 'mt-8 w-full sm:w-auto')}>Empezar mi primer Moment</Cta>
      </section>

      {/* ---------- Escucha primero (cómo se siente SOI) ---------- */}
      <section className="bg-soi-sidebar py-16 sm:py-20" aria-labelledby="escucha">
        <div className="mx-auto grid max-w-5xl items-center gap-10 px-5 sm:grid-cols-2">
          <div>
            <h2 id="escucha" className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">No es otra app que te da tareas</h2>
            <p className="mt-3 text-pretty text-lg text-soi-muted">
              SOI te escucha primero. Recuerda lo que le contaste, te pregunta cómo siguió y solo te propone algo cuando tú quieres.
              Si hoy no es el día, dices «ahora no» y lo entiende.
            </p>
            <p className="mt-4 flex items-center gap-2 text-[15px] text-soi-muted"><Mic className="h-4 w-4 text-soi-accent" aria-hidden="true" />¿Mucho en la cabeza? Háblale en lugar de escribir.</p>
          </div>
          {/* Una conversación de ejemplo (ilustrativa). */}
          <figure aria-label="Ejemplo de conversación con SOI" className="rounded-[28px] bg-white p-2 shadow-soft">
            <div className="flex flex-col gap-3 rounded-[20px] p-4">
              <p className="text-[15px] leading-relaxed">Buenas noches, Ana. Ayer me contaste que el trabajo no te dejaba dormir. ¿Cómo siguió?</p>
              <div className="flex flex-wrap gap-2" aria-hidden="true">
                {['Mejor', 'Sigue igual', 'Hoy es otra cosa'].map((c) => <span key={c} className="rounded-full bg-white px-3 py-1.5 text-sm shadow-ring">{c}</span>)}
              </div>
              <p className="ml-auto max-w-[80%] rounded-[14px] bg-soi-tray px-3.5 py-2 text-[15px]">Sigue igual. No logro apagar la cabeza.</p>
              <p className="text-[15px] leading-relaxed">Te entiendo: es agotador. ¿Te propongo algo de 3 minutos para soltar el día antes de dormir?</p>
            </div>
            <figcaption className="px-4 pb-2 text-xs text-soi-subtle">Conversación de ejemplo.</figcaption>
          </figure>
        </div>
      </section>

      {/* ---------- Identidad y enemigos interiores (curiosidad) ---------- */}
      <section className="mx-auto max-w-5xl px-5 py-16 sm:py-20" aria-labelledby="identidad">
        <div className="grid gap-10 sm:grid-cols-2">
          <div>
            <h2 id="identidad" className="text-balance text-3xl font-semibold tracking-tight">No coleccionas videos. Coleccionas evidencia.</h2>
            <p className="mt-3 text-pretty text-lg text-soi-muted">Cada Moment que vives es una prueba de quién te estás convirtiendo. SOI te lo muestra.</p>
            <div className="mt-5 rounded-[20px] bg-soi-ink p-5 text-white" aria-hidden="true">
              <p className="text-sm text-white/70">Te estás convirtiendo en</p>
              <p className="mt-1 text-xl font-semibold">Una persona constante</p>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full w-3/5 origin-left rounded-full bg-white" /></div>
              <p className="nums mt-2 text-sm text-white/80">Nivel 3 · 12 evidencias</p>
            </div>
          </div>
          <div>
            <h2 className="text-balance text-3xl font-semibold tracking-tight">Tus enemigos interiores tienen nombre</h2>
            <p className="mt-3 text-pretty text-lg text-soi-muted">No eres tú: son patrones que aparecen en todos. SOI los reconoce contigo y te da cómo vencerlos.</p>
            <ul className="mt-5 flex flex-col gap-2">
              {ENEMIES.map((e) => (
                <li key={e.name} className="flex flex-col gap-0.5 rounded-[20px] bg-white px-5 py-3.5 shadow-ring sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
                  <span className="font-medium">{e.name}</span>
                  <span className="text-sm italic text-soi-muted">«{e.whisper}»</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ---------- Autoridad con fuentes ---------- */}
      <section className="bg-soi-sidebar py-16" aria-labelledby="fuentes">
        <div className="mx-auto max-w-5xl px-5">
          <h2 id="fuentes" className="text-balance text-2xl font-semibold tracking-tight">Cada práctica cita su fuente</h2>
          <p className="mt-2 text-soi-muted">Nada inventado: técnicas de los libros que ya conoces, adaptadas a tu día.</p>
          <ul className="mt-5 flex flex-wrap gap-2">
            {SOURCES.map((s) => <li key={s} className="rounded-full bg-white px-3.5 py-2 text-sm shadow-ring">{s}</li>)}
          </ul>
        </div>
      </section>

      {/* ---------- Sin riesgo ---------- */}
      <section className="mx-auto max-w-3xl px-5 py-16 text-center sm:py-20" aria-labelledby="precio">
        <h2 id="precio" className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">Pruébalo {TRIAL_DAYS} días, todo incluido</h2>
        <p className="mx-auto mt-3 max-w-xl text-pretty text-lg text-soi-muted">
          Sin tarjeta. Si te sirve, SOI+ cuesta ${plans.monthly.price} USD al mes o ${plans.yearly.price} USD al año.
          Si no, sigues con el plan gratuito y no pagas nada.
        </p>
        <Cta href={signup()} where="precio" className={buttonClass('gold', 'lg', 'mt-8 w-full sm:w-auto')}>Pruébalo {TRIAL_DAYS} días gratis</Cta>
      </section>

      {/* ---------- Cierre: un momento concreto ---------- */}
      <section className="bg-soi-ink px-5 py-16 text-center text-white sm:py-20">
        <MoonStar className="mx-auto h-8 w-8 text-soi-gold" aria-hidden="true" />
        <h2 className="mx-auto mt-4 max-w-2xl text-balance text-3xl font-black uppercase leading-tight tracking-tight sm:text-5xl">Esta noche, antes de dormir, pruébalo una vez.</h2>
        <p className="mx-auto mt-3 max-w-md text-white/75">Quince minutos, en tu cama, con la técnica de Neville Goddard. Si al terminar no sientes nada distinto, no pierdes nada.</p>
        <Cta href={signup('/m/neville_sats/play')} where="cierre" className={buttonClass('gold', 'lg', 'mt-8 w-full sm:w-auto')}>Empezar gratis</Cta>
      </section>

      <footer className="px-5 py-8 text-center text-sm text-soi-muted">
        <nav className="flex justify-center gap-4" aria-label="Legal">
          <Link href="/privacidad" className="underline">Privacidad</Link>
          <Link href="/terminos" className="underline">Términos</Link>
        </nav>
        <p className="mx-auto mt-3 max-w-2xl">
          SOI no está afiliado ni respaldado por los autores citados; sus enseñanzas se usan como fuente de las prácticas.
          SOI acompaña y no sustituye la atención psicológica ni médica profesional.
        </p>
      </footer>
    </main>
  );
}
