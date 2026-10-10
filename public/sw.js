/* SOI Service Worker — recordatorios (push con alarma) + caché mínima offline */
const CACHE = 'soi-v2';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['/', '/icon.svg'])));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).pathname.startsWith('/api/')) return;
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).catch(() => caches.match('/')));
  }
});

/*
 * Recordatorio. Si SOI está abierta y a la vista, la app lo muestra con su sonido (los navegadores no permiten
 * sonidos propios en notificaciones). Si no, notificación del sistema: la alarma vibra más y se queda en
 * pantalla hasta que la persona la toca (requireInteraction); renotify hace que suene de nuevo con el mismo tag.
 */
self.addEventListener('push', (e) => {
  const data = e.data ? e.data.json() : { title: 'SOI', body: '¿Cómo llegas hoy?', url: '/hoy' };
  const url = data.url || '/hoy';
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const visible = wins.find((w) => w.visibilityState === 'visible');
    if (visible) {
      visible.postMessage({ type: 'soi-reminder', title: data.title, body: data.body, url, alarm: Boolean(data.alarm) });
      return;
    }
    await self.registration.showNotification(data.title, {
      body: data.body, icon: '/icons/icon-192.png', badge: '/icons/badge-96.png', lang: 'es', data: { url },
      tag: data.tag || undefined, renotify: Boolean(data.tag), silent: false,
      requireInteraction: Boolean(data.alarm),
      vibrate: data.alarm ? [300, 150, 300, 150, 600] : [200, 100, 200],
      actions: [{ action: 'open', title: data.alarm ? 'Empezar' : 'Abrir SOI' }],
    });
  })());
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = e.notification.data?.url || '/hoy';
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const open = wins.find((w) => new URL(w.url).origin === self.location.origin);
    if (open) { await open.focus(); return open.navigate(url); }
    return self.clients.openWindow(url);
  })());
});
