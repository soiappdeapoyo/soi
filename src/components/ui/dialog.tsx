'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Diálogo modal centrado (DESIGN.md §4 · Diálogos).
 * - Contenido: scale(0.96 → 1) + fade, 200 ms entrada / 150 ms salida, --ease-out-strong. Sin transform-origin del trigger.
 * - Overlay: solo fade.
 * - Foco atrapado, Esc cierra y el foco vuelve al trigger.
 * Transiciones CSS (interrumpibles), no keyframes.
 */
export function Dialog({ open, onOpenChange, title, description, children, className }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (open) {
      returnFocus.current = document.activeElement as HTMLElement | null;
      setMounted(true);
      const raf = requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
      return () => cancelAnimationFrame(raf);
    }
    setVisible(false);
    const t = setTimeout(() => {
      setMounted(false);
      returnFocus.current?.focus();
    }, 150);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!mounted) return;
    const panel = panelRef.current;
    panel?.querySelector<HTMLElement>('[data-autofocus], a[href], button:not([disabled])')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onOpenChange(false); return; }
      if (e.key !== 'Tab' || !panel) return;
      const els = panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])');
      if (!els.length) return;
      const first = els[0]!;
      const last = els[els.length - 1]!;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [mounted, onOpenChange]);

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        aria-hidden="true"
        onClick={() => onOpenChange(false)}
        className={cn(
          'absolute inset-0 bg-black/30 transition-opacity ease-out-strong',
          visible ? 'opacity-100 duration-(--dur-base)' : 'opacity-0 duration-(--dur-fast)',
        )}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className={cn(
          'relative w-full max-w-md rounded-3xl bg-white p-5 shadow-raised transition-[transform,opacity] ease-out-strong',
          visible ? 'scale-100 opacity-100 duration-(--dur-base)' : 'scale-[0.96] opacity-0 duration-(--dur-fast)',
          className,
        )}
      >
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          aria-label="Cerrar"
          className="press absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-lg text-soi-muted hover:bg-black/[0.04] hover:text-soi-ink"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
        <h2 id={titleId} className="pr-10 text-lg font-semibold">{title}</h2>
        {description && <p id={descId} className="mt-1 text-sm text-soi-muted">{description}</p>}
        <div className="mt-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
