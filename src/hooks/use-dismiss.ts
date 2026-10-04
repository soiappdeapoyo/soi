'use client';

import { useEffect, type RefObject } from 'react';

/** Cierra un menú/popover al tocar fuera o con Esc (y devuelve el foco al disparador si se indica). */
export function useDismiss(ref: RefObject<HTMLElement | null>, open: boolean, close: () => void, trigger?: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node) && !trigger?.current?.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { close(); trigger?.current?.focus(); } };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open, close, ref, trigger]);
}
