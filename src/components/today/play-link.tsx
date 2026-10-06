'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { unlockAudio } from '@/lib/voice/player';

/**
 * Reproducir desde Hoy: este toque habilita la voz (iOS) para toda la lista y abre el Moment ya en marcha.
 */
export function PlayLink({ href, className, children, label, prefetch = false }: {
  href: string; className?: string; children: React.ReactNode; label?: string; prefetch?: boolean;
}) {
  const router = useRouter();
  useEffect(() => { if (prefetch) router.prefetch(href); }, [prefetch, href, router]);
  return (
    <button type="button" aria-label={label} className={className} onClick={() => { unlockAudio(); router.push(href); }}>
      {children}
    </button>
  );
}
