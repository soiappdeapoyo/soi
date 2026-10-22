/* SOI Service Worker — recordatorios (push con alarma) + caché mínima offline */
const CACHE = 'soi-v3';
/* El saludo hablado del último aviso tocado: la app lo lee al abrirse (/__soi/saludo) y lo dice en voz alta. */
const GREETING_CACHE = 'soi-greeting';
const GREETING_URL = '/__soi/saludo';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['/', '/icon.svg'])));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== GREETING_CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).pathname.startsWith('/api/')) return;
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).catch(() => caches.match('/')));
  }
});

/*
 * Recordatorio. Si SOI está abierta y a la vista, la app lo dice con la voz de SOI (su nombre, de menos a más; los
 * navegadores no permiten sonidos propios en notificaciones). Si no, notificación del sistema: la alarma vibra más
 * y se queda en pantalla hasta que la persona la toca (requireInteraction); al tocarla, SOI se abre y la saluda.
 */
self.addEventListener('push', (e) => {
  const data = e.data ? e.data.json() : { title: 'SOI', body: '¿Cómo llegas hoy?', url: '/hoy' };
  const url = data.url || '/hoy';
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const visible = wins.find((w) => w.visibilityState === 'visible');
    if (visible) {
      visible.postMessage({ type: 'soi-reminder', title: data.title, body: data.body, url, alarm: Boolean(data.alarm), speech: data.speech || null });
      return;
    }
    await self.registration.showNotification(data.title, {
      body: data.body, icon: '/icons/icon-192.png', badge: '/icons/badge-96.png', lang: 'es', data: { url, speech: data.speech || null },
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
  const speech = e.notification.data?.speech;
  // Se guarda en paralelo: abrir la ventana no debe esperar (el navegador da poco tiempo tras el toque).
  const saved = speech
    ? caches.open(GREETING_CACHE).then((c) => c.put(GREETING_URL, new Response(JSON.stringify({ speech, at: Date.now() }), { headers: { 'Content-Type': 'application/json' } })))
    : Promise.resolve();
  e.waitUntil(Promise.all([saved, (async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const open = wins.find((w) => new URL(w.url).origin === self.location.origin);
    if (open) { await open.focus(); return open.navigate(url); }
    return self.clients.openWindow(url);
  })()]));
});
