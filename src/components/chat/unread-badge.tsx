'use client';

import { useEffect } from 'react';
import { refreshUnread, setUnread, useUnread } from '@/lib/coach/unread-store';
import { cn } from '@/lib/utils';

/** Inicia la cuenta de no leídos con la del servidor y la refresca al volver a la app. */
export function UnreadSync({ initial }: { initial: number }) {
  useEffect(() => { setUnread(initial); }, [initial]);
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') void refreshUnread(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);
  return null;
}

/** El punto con número sobre la pestaña SOI (como un mensaje nuevo en una app de mensajes). */
export function UnreadBadge({ className }: { className?: string }) {
  const n = useUnread();
  if (!n) return null;
  return (
    <span className={cn('nums pointer-events-none inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#E5484D] px-1 text-[11px] font-semibold leading-none text-white shadow-[0_0_0_2px_white]', className)}>
      <span aria-hidden="true">{n > 9 ? '9+' : n}</span>
      <span className="sr-only">{n === 1 ? '1 mensaje nuevo de SOI' : `${n} mensajes nuevos de SOI`}</span>
    </span>
  );
}
