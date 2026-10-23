'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { Icon } from '@/components/ui/icon';
import { track } from '@/components/providers/analytics';
import { PRIMARY_TABS } from '@/config/navigation';
import { TOUR_STEPS, bubblePlacement, shouldAutoShowTour, type Rect } from '@/config/welcome-tour';
import { cn } from '@/lib/utils';

const PAD = 6;

/** La pestaña visible con ese `data-tour` (barra inferior en el teléfono, sidebar en la computadora). */
function findTarget(id: string): HTMLElement | null {
  for (const el of document.querySelectorAll<HTMLElement>(`[data-tour="${id}"]`)) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0 && el.offsetParent !== null) return el;
  }
  return null;
}

/**
 * Recorrido de bienvenida por la barra de navegación: la pantalla se oscurece y solo queda iluminada la pestaña que
 * se explica, con una burbuja de lo que se puede hacer ahí. Aparece sola la primera vez (sin `tour_seen_at`) y se
 * repite desde Ajustes (`?tour=1`). Siguiente / Saltar, flechas y Esc. Termina iluminando SOI.
 */
export function WelcomeTour({ seenAt }: { seenAt: string | null }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [vp, setVp] = useState({ width: 0, height: 0 });
  const [done, setDone] = useState(Boolean(seenAt));
  const primaryRef = useRef<HTMLButtonElement>(null);
  const repeat = params.get('tour') === '1';
  const step = TOUR_STEPS[index]!;
  const last = index === TOUR_STEPS.length - 1;

  // `?tour=1` abre una sola vez: al cerrar, el parámetro sigue en la URL unos instantes mientras se quita.
  const repeatHandled = useRef(false);
  useEffect(() => {
    if (!repeat) repeatHandled.current = false;
    if (open) return;
    const again = repeat && !repeatHandled.current;
    if (again || (!repeat && !done && shouldAutoShowTour(pathname, null))) {
      if (again) repeatHandled.current = true;
      setIndex(0);
      setOpen(true);
      track('tour_started', { repeat });
    }
  }, [repeat, done, pathname, open]);

  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { cancelAnimationFrame(raf); document.body.style.overflow = prev; };
  }, [open]);

  // Mide la pestaña del paso (y vuelve a medir si cambia el tamaño de la pantalla).
  const measure = useCallback(() => {
    setVp({ width: window.innerWidth, height: window.innerHeight });
    const el = step.target ? findTarget(step.target) : null;
    if (!el) { setRect(null); return; }
    el.scrollIntoView({ block: 'nearest' });
    const r = el.getBoundingClientRect();
    setRect({ top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 });
  }, [step.target]);

  useLayoutEffect(() => {
    if (!open) return;
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [open, measure, pathname]);

  useEffect(() => { if (open) primaryRef.current?.focus({ preventScroll: true }); }, [open, index]);

  const close = useCallback((outcome: 'completed' | 'skipped', go?: string) => {
    track(outcome === 'completed' ? 'tour_completed' : 'tour_skipped', { step: index + 1, repeat });
    setDone(true);
    void fetch('/api/tour', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ outcome }), keepalive: true }).catch(() => undefined);
    setVisible(false);
    setTimeout(() => {
      setOpen(false);
      if (go) router.push(go);
      else if (repeat) router.replace(pathname, { scroll: false });
    }, 150);
  }, [index, repeat, router, pathname]);

  const goTo = useCallback((i: number) => {
    const n = Math.max(0, Math.min(TOUR_STEPS.length - 1, i));
    setIndex(n);
    track('tour_step', { step: n + 1, id: TOUR_STEPS[n]!.id });
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close('skipped');
      else if (e.key === 'ArrowRight' && !last) goTo(index + 1);
      else if (e.key === 'ArrowLeft') goTo(index - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, index, last, close, goTo]);

  if (!open) return null;

  const tab = step.target ? PRIMARY_TABS.find((t) => t.id === step.target) : null;
  const place = rect && vp.width ? bubblePlacement(rect, vp) : null;
  const counter = index > 0 ? `${index} de ${TOUR_STEPS.length - 1}` : null;

  const buttons = last ? (
    <div className="mt-4 flex flex-col gap-2">
      <button ref={primaryRef} type="button" onClick={() => close('completed', '/chat?nueva=1')} className="press tap-target flex w-full items-center justify-center gap-2 rounded-[14px] bg-soi-ink py-3 text-[16px] font-semibold text-white">
        Contarle a SOI cómo llego <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </button>
      <button type="button" onClick={() => close('completed')} className="press tap-target text-[15px] text-soi-muted">Explorar por mi cuenta</button>
    </div>
  ) : (
    <div className="mt-4 flex items-center justify-between gap-3">
      <button type="button" onClick={() => close('skipped')} className="press tap-target px-1 text-[15px] text-soi-muted">Saltar</button>
      <div className="flex items-center gap-3">
        {counter && <span className="nums text-xs text-soi-muted">{counter}</span>}
        <button ref={primaryRef} type="button" onClick={() => goTo(index + 1)} className="press tap-target flex items-center gap-1.5 rounded-[12px] bg-soi-ink px-4 py-2.5 text-[15px] font-semibold text-white">
          {index === 0 ? 'Empezar' : 'Siguiente'} <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );

  const content = (
    <>
      {tab && !rect && (
        <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-soi-sidebar px-3 py-1 text-xs font-medium text-soi-muted">
          <Icon name={tab.icon} className="h-3.5 w-3.5" /> Pestaña {tab.label}
        </p>
      )}
      <h2 id="tour-title" className="text-balance text-[19px] font-semibold leading-snug tracking-tight">{step.title}</h2>
      <p className="mt-1.5 text-pretty text-[15px] leading-relaxed text-soi-muted">{step.body}</p>
      {buttons}
    </>
  );

  return (
    <div
      role="dialog" aria-modal="true" aria-labelledby="tour-title"
      className={cn('fixed inset-0 z-[70] transition-opacity duration-200 ease-[var(--ease-out-strong)] motion-reduce:transition-none', visible ? 'opacity-100' : 'opacity-0')}
    >
      {/* Bloquea la app mientras dura el recorrido. */}
      <div className="absolute inset-0" aria-hidden="true" />

      {rect ? (
        // El hueco iluminado: un recuadro transparente cuya sombra enorme oscurece todo lo demás. Se desplaza (transform) de pestaña en pestaña.
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 rounded-[18px] shadow-[0_0_0_9999px_rgb(11_11_11/0.62)] ring-2 ring-white/90 transition-transform duration-300 ease-[var(--ease-in-out-strong)] motion-reduce:transition-none"
          style={{ width: rect.width, height: rect.height, transform: `translate(${rect.left}px, ${rect.top}px)` }}
        />
      ) : (
        <div aria-hidden="true" className="absolute inset-0 bg-[rgb(11_11_11/0.62)]" />
      )}

      {place ? (
        <div
          key={step.id}
          className="absolute animate-enter rounded-[20px] bg-white p-4 shadow-raised motion-reduce:animate-none"
          style={place.side === 'top' ? { left: place.left, bottom: place.bottom, width: place.width } : { left: place.left, top: place.top, width: place.width }}
        >
          <span
            aria-hidden="true"
            className="absolute h-3.5 w-3.5 rotate-45 bg-white"
            style={place.side === 'top' ? { left: place.arrow - 7, bottom: -7 } : { top: place.arrow - 7, left: -7 }}
          />
          <div className="relative">{content}</div>
        </div>
      ) : (
        <div className="absolute inset-0 grid place-items-center px-5">
          <div key={step.id} className="w-full max-w-sm animate-enter rounded-[24px] bg-white p-5 shadow-raised motion-reduce:animate-none">
            {index === 0 && <p className="mb-3 text-3xl font-semibold tracking-tight">SOI</p>}
            {content}
          </div>
        </div>
      )}
    </div>
  );
}
