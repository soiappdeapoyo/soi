'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, TrendingUp } from 'lucide-react';
import { Icon } from '@/components/ui/icon';
import { track } from '@/components/providers/analytics';
import { TOUR_SLIDES, shouldAutoShowTour, type TourSlide } from '@/config/welcome-tour';
import { cn } from '@/lib/utils';

/** Ilustración de cada pantalla: la UI real en pequeño, para que la reconozca al verla. */
function Illustration({ id }: { id: TourSlide['id'] }) {
  if (id === 'que-es') {
    return (
      <div className="flex flex-col items-center gap-5">
        <p className="text-6xl font-semibold tracking-tight text-soi-ink">SOI</p>
        <ol className="flex flex-wrap justify-center gap-1.5 text-sm" aria-label="Pensamientos, emociones, acciones y resultados">
          {['Pensamientos', 'Emociones', 'Acciones', 'Resultados'].map((s, i) => (
            <li key={s} className="flex items-center gap-1.5">
              <span className="rounded-full bg-white px-3 py-1.5 shadow-ring">{s}</span>
              {i < 3 && <ArrowRight className="h-3.5 w-3.5 text-soi-muted" aria-hidden="true" />}
            </li>
          ))}
        </ol>
      </div>
    );
  }
  if (id === 'soi') {
    return (
      <div className="flex w-full max-w-xs flex-col gap-2 text-[15px]" aria-hidden="true">
        <p className="self-end rounded-[18px] rounded-br-md bg-soi-ink px-4 py-2.5 text-white">Hoy traigo mucho en la cabeza</p>
        <p className="self-start rounded-[18px] rounded-bl-md bg-white px-4 py-2.5 shadow-ring">Te escucho. ¿Qué es lo que más te pesa ahora?</p>
        <div className="mt-1 flex gap-1.5 self-start text-sm">
          <span className="rounded-full bg-white px-3 py-1.5 shadow-ring">Proponme algo</span>
          <span className="rounded-full bg-white px-3 py-1.5 shadow-ring">Solo quiero conversar</span>
        </div>
      </div>
    );
  }
  if (id === 'hoy') {
    return (
      <div className="relative flex w-full max-w-xs flex-col items-center rounded-[24px] bg-white p-5 shadow-soft" aria-hidden="true">
        <div className="relative my-2 grid h-24 w-24 place-items-center">
          <span className="absolute inset-0 animate-breathe rounded-full bg-soi-accent-soft motion-reduce:animate-none" />
          <span className="relative text-sm font-medium text-soi-accent">Inhala</span>
        </div>
        <p className="mt-2 font-semibold">Calma en 5 minutos</p>
        <div className="mt-2 flex gap-1.5 text-xs text-soi-muted">
          {['Respira', 'Visualiza', 'Escribe'].map((s) => <span key={s} className="rounded-full bg-soi-sidebar px-2.5 py-1">{s}</span>)}
        </div>
      </div>
    );
  }
  return (
    <div className="w-full max-w-xs rounded-[24px] bg-white p-5 shadow-soft" aria-hidden="true">
      <p className="text-sm text-soi-muted">Tu bienestar</p>
      <div className="mt-1 flex items-end justify-between">
        <p className="nums text-4xl font-semibold leading-none">68<span className="text-base font-normal text-soi-muted"> / 100</span></p>
        <svg viewBox="0 0 100 32" className="h-8 w-24 text-soi-accent"><polyline points="0,26 25,22 50,20 75,12 100,6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-sm"><TrendingUp className="h-4 w-4 text-soi-accent" />Subiste 12 puntos en 5 semanas</p>
    </div>
  );
}

/**
 * Introducción de bienvenida: aparece sola la primera vez que la persona entra (sin `tour_seen_at`) y se repite desde
 * Ajustes (`?tour=1`). Pantallas que se deslizan con el dedo (scroll-snap nativo), "Siguiente", "Saltar", flechas y Esc.
 * Al terminar lleva al chat, el primer paso del loop.
 */
export function WelcomeTour({ seenAt }: { seenAt: string | null }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(Boolean(seenAt));
  const trackRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const repeat = params.get('tour') === '1';
  const last = index === TOUR_SLIDES.length - 1;

  // `?tour=1` abre una sola vez: al cerrar, el parámetro sigue en la URL unos instantes mientras se quita.
  const repeatHandled = useRef(false);
  useEffect(() => {
    if (!repeat) repeatHandled.current = false;
    if (open) return;
    const again = repeat && !repeatHandled.current;
    if (again || (!repeat && !done && shouldAutoShowTour(pathname, null))) {
      if (again) repeatHandled.current = true;
      setOpen(true);
      setIndex(0);
      track('tour_started', { repeat });
    }
  }, [repeat, done, pathname, open]);

  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    nextRef.current?.focus({ preventScroll: true });
    return () => { cancelAnimationFrame(raf); document.body.style.overflow = prev; };
  }, [open]);

  const close = useCallback((outcome: 'completed' | 'skipped', go?: string) => {
    track(outcome === 'completed' ? 'tour_completed' : 'tour_skipped', { step: index + 1, repeat });
    setDone(true);
    void fetch('/api/tour', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ outcome }), keepalive: true }).catch(() => undefined);
    setVisible(false);
    setTimeout(() => {
      setOpen(false);
      if (go) router.push(go);
      else if (repeat) router.replace(pathname);
    }, 150);
  }, [index, repeat, router, pathname]);

  const goTo = useCallback((i: number) => {
    const el = trackRef.current;
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollTo({ left: i * el.clientWidth, behavior: reduce ? 'auto' : 'smooth' });
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close('skipped');
      else if (e.key === 'ArrowRight') goTo(Math.min(TOUR_SLIDES.length - 1, index + 1));
      else if (e.key === 'ArrowLeft') goTo(Math.max(0, index - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, index, close, goTo]);

  function onScroll() {
    const el = trackRef.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== index) { setIndex(i); track('tour_step', { step: i + 1 }); }
  }

  if (!open) return null;
  const slide = TOUR_SLIDES[index]!;

  return (
    <div
      role="dialog" aria-modal="true" aria-labelledby={`tour-${slide.id}`}
      className={cn('fixed inset-0 z-[70] flex flex-col bg-soi-canvas transition-opacity duration-200 ease-[var(--ease-out-strong)] motion-reduce:transition-none', visible ? 'opacity-100' : 'opacity-0')}
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex justify-end px-4 pt-3">
        {!last && <button type="button" onClick={() => close('skipped')} className="press tap-target rounded-full px-3 text-[15px] text-soi-muted">Saltar</button>}
      </div>

      <div ref={trackRef} onScroll={onScroll} className="flex flex-1 snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TOUR_SLIDES.map((s, i) => (
          <section key={s.id} aria-hidden={i !== index} className="flex w-full shrink-0 snap-center flex-col items-center justify-center gap-8 px-6">
            <Illustration id={s.id} />
            <div className="max-w-sm text-center">
              {s.tab && (
                <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-soi-sidebar px-3 py-1 text-xs font-medium text-soi-muted">
                  <Icon name={s.tab.icon} className="h-3.5 w-3.5" /> En la pestaña {s.tab.label}
                </p>
              )}
              <h2 id={`tour-${s.id}`} className="text-balance text-[26px] font-semibold leading-tight tracking-tight">{s.title}</h2>
              <p className="mt-3 text-pretty text-[17px] leading-relaxed text-soi-muted">{s.body}</p>
            </div>
          </section>
        ))}
      </div>

      <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-4 px-6 pb-6 pt-4">
        <div className="flex gap-2" role="tablist" aria-label="Pantallas de la introducción">
          {TOUR_SLIDES.map((s, i) => (
            <button
              key={s.id} type="button" role="tab" aria-selected={i === index} aria-label={`Pantalla ${i + 1} de ${TOUR_SLIDES.length}`}
              onClick={() => goTo(i)}
              className="grid h-6 w-6 place-items-center"
            >
              <span className={cn('h-2 rounded-full transition-[width,background-color] duration-200 ease-[var(--ease-out-strong)] motion-reduce:transition-none', i === index ? 'w-5 bg-soi-ink' : 'w-2 bg-black/15')} />
            </button>
          ))}
        </div>
        {last ? (
          <>
            <button ref={nextRef} type="button" onClick={() => close('completed', '/chat?nueva=1')} className="press tap-target flex w-full items-center justify-center gap-2 rounded-[14px] bg-soi-ink py-3.5 text-[17px] font-semibold text-white">
              Contarle a SOI cómo llego <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </button>
            <button type="button" onClick={() => close('completed', '/hoy')} className="press tap-target text-[15px] text-soi-muted">Ver mi día primero</button>
          </>
        ) : (
          <button ref={nextRef} type="button" onClick={() => goTo(index + 1)} className="press tap-target flex w-full items-center justify-center gap-2 rounded-[14px] bg-soi-ink py-3.5 text-[17px] font-semibold text-white">
            Siguiente <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
