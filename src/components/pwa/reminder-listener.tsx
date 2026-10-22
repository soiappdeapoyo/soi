'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { track } from '@/components/providers/analytics';
import { playChime, soundEnabled } from '@/lib/push/chime';
import { playWake, primeWakeAudio } from '@/lib/voice/wake';

/** Lo que el service worker guardó al tocar el aviso (public/sw.js). */
const GREETING_CACHE = 'soi-greeting';
const GREETING_URL = '/__soi/saludo';
/** Un saludo guardado hace más de esto ya no se dice (abrió la app por otra vía, mucho después). */
const GREETING_TTL = 10 * 60_000;

/** Toma (y borra) el saludo del último aviso tocado, si es reciente. */
async function takeGreeting(): Promise<string | null> {
  try {
    if (!('caches' in window)) return null;
    const c = await caches.open(GREETING_CACHE);
    const res = await c.match(GREETING_URL);
    if (!res) return null;
    await c.delete(GREETING_URL);
    const { speech, at } = (await res.json()) as { speech?: string; at?: number };
    return speech && at && Date.now() - at < GREETING_TTL ? speech : null;
  } catch {
    return null;
  }
}

/**
 * La voz de SOI en los recordatorios, en lugar de una alarma: "Mimy… Mimy… Hola, buenos días…", de menos a más.
 *  - Con SOI abierta: el service worker no muestra la notificación del sistema; la pasa aquí y SOI la dice en voz
 *    alta (+ vibración si es alarma) con un aviso con botón.
 *  - Con SOI cerrada: la notificación del sistema es lo único posible; al tocarla, SOI se abre y saluda.
 * Si el navegador aún no deja sonar audio (sin un toque), un aviso ofrece "Escuchar a SOI".
 */
export function ReminderListener() {
  const router = useRouter();

  useEffect(() => {
    // El primer toque de la sesión desbloquea el audio para que el saludo pueda sonar después solo.
    const prime = () => primeWakeAudio();
    window.addEventListener('pointerdown', prime, { once: true, capture: true });

    const say = async (speech: string, where: 'in_app' | 'opened') => {
      if (!soundEnabled()) return;
      const r = await playWake(speech);
      track('reminder_voice', { where, result: r });
      if (r === 'blocked') {
        toast('SOI tiene algo que decirte', {
          duration: 15_000,
          action: { label: 'Escuchar a SOI', onClick: () => { primeWakeAudio(); void playWake(speech); } },
        });
      } else if (r === 'failed' && where === 'in_app') void playChime(1);
    };

    const params = new URLSearchParams(window.location.search);
    if (params.get('from') === 'push') {
      track('notification_opened', { path: window.location.pathname });
      void takeGreeting().then((speech) => { if (speech) void say(speech, 'opened'); });
    }
    if (params.get('from') === 'app' || params.get('from') === 'shortcut') track('app_opened_installed', { from: params.get('from') });

    if (!('serviceWorker' in navigator)) return () => window.removeEventListener('pointerdown', prime, { capture: true });
    const onMessage = (e: MessageEvent) => {
      const d = e.data as { type?: string; title?: string; body?: string; url?: string; alarm?: boolean; speech?: string | null } | null;
      if (d?.type !== 'soi-reminder' || !d.title) return;
      if (d.speech) void say(d.speech, 'in_app');
      else if (soundEnabled()) void playChime(d.alarm ? 3 : 1);
      if (d.alarm && 'vibrate' in navigator) navigator.vibrate?.([300, 150, 300, 150, 600]);
      track('notification_in_app', { alarm: Boolean(d.alarm) });
      toast(d.title, {
        description: d.body,
        duration: d.alarm ? Infinity : 8000,
        action: d.url ? { label: d.alarm ? 'Empezar' : 'Abrir', onClick: () => router.push(d.url!) } : undefined,
      });
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('pointerdown', prime, { capture: true });
      navigator.serviceWorker.removeEventListener('message', onMessage);
    };
  }, [router]);

  return null;
}
