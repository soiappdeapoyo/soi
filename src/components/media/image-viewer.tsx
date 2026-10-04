'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Visor de fotos a pantalla completa, estilo Instagram:
 * - "Atrás" del teléfono o del navegador lo cierra (se apila una entrada en el historial).
 * - Deslizar hacia abajo cierra (por distancia o por velocidad, con el fondo desvaneciéndose).
 * - Deslizar de lado cambia de foto (scroll-snap nativo); flechas y Esc con teclado.
 * - Entrada: opacidad + scale 0.96 → 1 (200 ms, ease-out fuerte). Sin animación con reduced motion.
 */
export function ImageViewer({ urls, index, onClose }: { urls: string[]; index: number | null; onClose: () => void }) {
  const open = index !== null;
  const [current, setCurrent] = useState(index ?? 0);
  const [visible, setVisible] = useState(false);
  const [dragY, setDragY] = useState(0);
  const track = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const pushed = useRef(false);
  const drag = useRef<{ x: number; y: number; t: number; vertical: boolean | null } | null>(null);

  const close = useCallback(() => {
    // Si abrimos con una entrada de historial, cerramos retrocediendo (así el "atrás" queda consistente).
    if (pushed.current) { pushed.current = false; history.back(); return; }
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    setCurrent(index!);
    setDragY(0);
    history.pushState({ soiViewer: true }, '');
    pushed.current = true;
    const onPop = () => { pushed.current = false; onClose(); };
    window.addEventListener('popstate', onPop);
    const raf = requestAnimationFrame(() => {
      setVisible(true);
      const el = track.current;
      if (el) el.scrollTo({ left: el.clientWidth * index!, behavior: 'instant' as ScrollBehavior });
      closeBtn.current?.focus();
    });
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('popstate', onPop);
      cancelAnimationFrame(raf);
      document.body.style.overflow = prevOverflow;
      setVisible(false);
    };
  }, [open, index, onClose]);

  const go = useCallback((n: number) => {
    const el = track.current;
    if (!el) return;
    const target = Math.max(0, Math.min(urls.length - 1, n));
    el.scrollTo({ left: el.clientWidth * target, behavior: 'smooth' });
  }, [urls.length]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') go(current + 1);
      else if (e.key === 'ArrowLeft') go(current - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close, go, current]);

  if (!open || typeof document === 'undefined') return null;

  function onPointerDown(e: React.PointerEvent) {
    if (e.pointerType === 'mouse') return;
    drag.current = { x: e.clientX, y: e.clientY, t: performance.now(), vertical: null };
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x; const dy = e.clientY - d.y;
    if (d.vertical === null && Math.hypot(dx, dy) > 8) d.vertical = Math.abs(dy) > Math.abs(dx);
    if (d.vertical) setDragY(Math.max(0, dy));
  }
  function onPointerUp(e: React.PointerEvent) {
    const d = drag.current;
    drag.current = null;
    if (!d?.vertical) return;
    const dy = e.clientY - d.y;
    const velocity = dy / Math.max(1, performance.now() - d.t);
    if (dy > 120 || velocity > 0.5) close(); else setDragY(0);
  }

  const fade = Math.max(0, 1 - dragY / 400);

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`Foto ${current + 1} de ${urls.length}`}
      className={cn('fixed inset-0 z-[60] flex flex-col transition-opacity duration-200 ease-out-strong motion-reduce:transition-none', visible ? 'opacity-100' : 'opacity-0')}
      style={{ backgroundColor: `rgb(0 0 0 / ${0.95 * fade})` }}>
      <div className="flex items-center justify-between px-2 pt-[max(0.5rem,env(safe-area-inset-top))] text-white" style={{ opacity: fade }}>
        <button ref={closeBtn} type="button" onClick={close} aria-label="Cerrar foto"
          className="press flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/10"><X className="h-6 w-6" aria-hidden="true" /></button>
        {urls.length > 1 && <span className="nums pr-3 text-sm text-white/80">{current + 1} / {urls.length}</span>}
      </div>

      <div ref={track} onScroll={(e) => { const el = e.currentTarget; setCurrent(Math.round(el.scrollLeft / Math.max(1, el.clientWidth))); }}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={() => { drag.current = null; setDragY(0); }}
        className="flex flex-1 snap-x snap-mandatory overflow-x-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ touchAction: dragY ? 'none' : 'pan-x pinch-zoom' }}>
        {urls.map((u, i) => (
          <div key={u} className="flex w-full shrink-0 snap-center items-center justify-center px-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={u} alt={urls.length > 1 ? `Foto ${i + 1} de ${urls.length}` : 'Foto'} draggable={false}
              className={cn('max-h-full max-w-full select-none object-contain', visible ? 'scale-100' : 'scale-[0.96]', !dragY && 'transition-transform duration-200 ease-out-strong motion-reduce:transition-none')}
              style={dragY ? { transform: `translateY(${dragY}px) scale(${1 - Math.min(dragY, 300) / 1500})` } : undefined} />
          </div>
        ))}
      </div>

      {urls.length > 1 && (
        <div className="flex items-center justify-center gap-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3" style={{ opacity: fade }}>
          <button type="button" onClick={() => go(current - 1)} disabled={current === 0} aria-label="Foto anterior"
            className="press hidden h-10 w-10 items-center justify-center rounded-full text-white hover:bg-white/10 disabled:opacity-30 md:flex"><ChevronLeft className="h-6 w-6" aria-hidden="true" /></button>
          <div className="flex gap-1.5" aria-hidden="true">
            {urls.map((u, i) => <span key={u} className={cn('h-1.5 w-1.5 rounded-full', i === current ? 'bg-white' : 'bg-white/40')} />)}
          </div>
          <button type="button" onClick={() => go(current + 1)} disabled={current === urls.length - 1} aria-label="Foto siguiente"
            className="press hidden h-10 w-10 items-center justify-center rounded-full text-white hover:bg-white/10 disabled:opacity-30 md:flex"><ChevronRight className="h-6 w-6" aria-hidden="true" /></button>
        </div>
      )}
    </div>,
    document.body,
  );
}
