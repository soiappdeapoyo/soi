'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { track } from '@/components/providers/analytics';
import { playChime, soundEnabled } from '@/lib/push/chime';

/**
 * Con SOI abierta, el service worker no muestra la notificación del sistema: la pasa aquí, y la app la da con su
 * propia alarma (campanadas suaves + vibración) y un aviso con botón. También mide cuándo un aviso trae a la persona.
 */
export function ReminderListener() {
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('from') === 'push') track('notification_opened', { path: window.location.pathname });
    if (params.get('from') === 'app' || params.get('from') === 'shortcut') track('app_opened_installed', { from: params.get('from') });

    if (!('serviceWorker' in navigator)) return;
    const onMessage = (e: MessageEvent) => {
      const d = e.data as { type?: string; title?: string; body?: string; url?: string; alarm?: boolean } | null;
      if (d?.type !== 'soi-reminder' || !d.title) return;
      if (soundEnabled()) void playChime(d.alarm ? 3 : 1);
      if (d.alarm && 'vibrate' in navigator) navigator.vibrate?.([300, 150, 300, 150, 600]);
      track('notification_in_app', { alarm: Boolean(d.alarm) });
      toast(d.title, {
        description: d.body,
        duration: d.alarm ? Infinity : 8000,
        action: d.url ? { label: d.alarm ? 'Empezar' : 'Abrir', onClick: () => router.push(d.url!) } : undefined,
      });
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, [router]);

  return null;
}
