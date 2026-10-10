'use client';

import { isIOS, isStandalone, pushSupported } from '@/lib/pwa/platform';

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export type EnableResult = 'ok' | 'denied' | 'unsupported' | 'needs-install' | 'error';

/** ¿Se pueden pedir avisos aquí? En iPhone, solo con SOI instalada en la pantalla de inicio. */
export function pushAvailability(): 'ready' | 'needs-install' | 'unsupported' {
  if (isIOS() && !isStandalone()) return 'needs-install';
  return pushSupported() && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ? 'ready' : 'unsupported';
}

/** Pide permiso (requiere un toque), suscribe este dispositivo y guarda la hora del recordatorio. */
export async function enablePush(reminderTime?: string): Promise<EnableResult> {
  const avail = pushAvailability();
  if (avail !== 'ready') return avail;
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return 'denied';
  try {
    const reg = (await navigator.serviceWorker.getRegistration('/')) ?? (await navigator.serviceWorker.register('/sw.js'));
    await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription())
      ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!) }));
    const res = await fetch('/api/push/subscribe', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: sub.toJSON(), reminderTime }),
    });
    return res.ok ? 'ok' : 'error';
  } catch {
    return 'error';
  }
}

export async function disablePush() {
  try {
    const reg = await navigator.serviceWorker.getRegistration('/');
    await (await reg?.pushManager.getSubscription())?.unsubscribe();
  } catch { /* igual se borra en el servidor */ }
  await fetch('/api/push/subscribe', { method: 'DELETE' });
}

export async function saveReminderTime(reminderTime: string) {
  const res = await fetch('/api/push/subscribe', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reminderTime }) });
  return res.ok;
}

export const ENABLE_MESSAGE: Record<Exclude<EnableResult, 'ok'>, string> = {
  denied: 'Los avisos están bloqueados. Actívalos en los ajustes del navegador para SOI.',
  unsupported: 'Este navegador no permite avisos. Prueba desde Chrome o instalando SOI.',
  'needs-install': 'En iPhone, primero agrega SOI a tu pantalla de inicio y ábrela desde ahí.',
  error: 'No pudimos activar los avisos. Intenta de nuevo.',
};
