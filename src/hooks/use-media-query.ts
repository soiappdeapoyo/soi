'use client';

import { useSyncExternalStore } from 'react';

/** Suscripción a una media query. En SSR devuelve `false` (mobile-first). */
export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (cb) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', cb);
      return () => mql.removeEventListener('change', cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
