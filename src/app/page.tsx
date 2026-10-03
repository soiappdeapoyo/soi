import Link from 'next/link';
import { buttonClass } from '@/components/ui/button';
import { ROUTINES } from '@/config/routines';
import { PLANS, TRIAL_DAYS } from '@/config/plans';

const ESLABONES = [
  { n: 1, k: 'Pensamientos', q: '¿Qué crees sobre ti?', d: 'Afirmaciones y reestructuración con Brian Tracy y Neville Goddard.' },
  { n: 2, k: 'Emociones', q: '¿Cómo te hace sentir?', d: 'Meditaciones, SATS y protocolo Dispenza.' },
  { n: 3, k: 'Acciones', q: '¿Qué haces al respecto?', d: 'Rutinas guiadas: Miracle Morning, 5 AM Club, ritual de 5 min.' },
  { n: 4, k: 'Resultados', q: '¿Qué evidencia obtienes?', d: 'Muro de Evidencias, racha sin castigo y comunidad.' },
];

export default function LandingPage() {
  return (
    <main id="main">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <span className="text-2xl font-semibold">SOI.</span>
        <Link href="/login" className={buttonClass('outline', 'sm')}>Entrar</Link>
      </header>

      <section className="mx-auto max-w-5xl px-5 pb-16 pt-10 text-center">
        <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-6xl">Diseña tu identidad.<br />Vive tu propósito.</h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-soi-muted">
          SOI no es un chatbot. Es un sistema de transformación personal con IA que detecta el eslabón que te frena y actúa ahí.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/login" className={buttonClass('gold', 'lg')}>Empieza gratis {TRIAL_DAYS} días</Link>
          <a href="#principio" className={buttonClass('ghost', 'lg')}>Cómo funciona</a>
        </div>
        <p className="mt-3 text-sm text-soi-muted">Sin tarjeta para la prueba.</p>
      </section>

      <section id="principio" className="bg-soi-ink py-16 text-white">
        <div className="mx-auto max-w-5xl px-5">
          <h2 className="text-center text-3xl font-semibold">Una sola ley gobierna SOI</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-white/75">
            Los pensamientos lideran las emociones. Las emociones lideran las acciones. Las acciones lideran los resultados.
          </p>
          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ESLABONES.map((e) => (
              <li key={e.k} className="rounded-[20px] bg-white/5 p-5 ring-1 ring-white/10">
                <span className="text-sm text-soi-gold">0{e.n}</span>
                <p className="mt-1 text-xl font-semibold">{e.k}</p>
                <p className="text-sm italic text-white/70">{e.q}</p>
                <p className="mt-2 text-sm text-white/85">{e.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-16">
        <h2 className="text-3xl font-semibold">Rutinas con fuente, no inventos</h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Object.values(ROUTINES).map((r) => (
            <li key={r.id} className="rounded-[20px] bg-white shadow-soft p-5">
              <p className="font-semibold">{r.label}</p>
              <p className="text-sm text-soi-muted">{r.author} · <em>{r.source}</em></p>
              <p className="mt-2 text-sm">{r.totalMinutes} minutos</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-3xl px-5 pb-20 text-center">
        <h2 className="text-3xl font-semibold">SOI+</h2>
        <p className="mt-2 text-soi-muted">
          ${PLANS.soi_plus_monthly.price} USD/mes o ${PLANS.soi_plus_yearly.price} USD/año. Todo desbloqueado durante tu prueba de {TRIAL_DAYS} días.
        </p>
        <Link href="/login" className={buttonClass('gold', 'lg', 'mt-6')}>Comenzar ahora</Link>
      </section>

      <footer className="py-8 shadow-[0_-1px_0_rgb(0_0_0/0.06)] text-center text-sm text-soi-muted">
        <nav className="flex justify-center gap-4" aria-label="Legal">
          <Link href="/privacidad" className="underline">Privacidad</Link>
          <Link href="/terminos" className="underline">Términos</Link>
        </nav>
        <p className="mt-3">SOI no sustituye la atención psicológica ni médica profesional.</p>
      </footer>
    </main>
  );
}
