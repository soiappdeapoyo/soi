/* SOI Service Worker — recordatorios (push con alarma) + caché mínima offline */
const CACHE = 'soi-v5';
const OFFLINE_HTML = '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SOI · Sin conexión</title><style>body{margin:0;min-height:100dvh;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;background:#fff;color:#111;text-align:center;padding:24px}@media (prefers-color-scheme:dark){body{background:#111;color:#f4f4f4}}button{margin-top:16px;padding:12px 22px;border-radius:999px;border:0;background:#111;color:#fff;font-size:16px}@media (prefers-color-scheme:dark){button{background:#f4f4f4;color:#111}}</style></head><body><main><p style="font-size:28px;font-weight:600;margin:0">SOI.</p><p>Sin conexión por ahora. Tu sesión sigue abierta.</p><button onclick="location.reload()">Reintentar</button></main></body></html>';
/* El saludo hablado del último aviso tocado: la app lo lee al abrirse (/__soi/saludo) y lo dice en voz alta. */
const GREETING_CACHE = 'soi-greeting';
const GREETING_URL = '/__soi/saludo';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['/icon.svg'])));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== GREETING_CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).pathname.startsWith('/api/')) return;
  if (e.request.mode === 'navigate') {
    // Sin conexión: un aviso con «Reintentar». Antes salía la landing guardada y parecía que SOI te había sacado.
    e.respondWith(fetch(e.request).catch(() => new Response(OFFLINE_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })));
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
      visible.postMessage({ type: 'soi-reminder', kind: data.kind || null, title: data.title, body: data.body, url, alarm: Boolean(data.alarm), speech: data.speech || null });
      return;
    }
    await self.registration.showNotification(data.title, {
      body: data.body, icon: '/icons/icon-192.png', badge: '/icons/badge-96.png', lang: 'es', data: { url, speech: data.speech || null },
      tag: data.tag || undefined, renotify: Boolean(data.tag), silent: false,
      requireInteraction: Boolean(data.alarm),
      vibrate: data.alarm ? [300, 150, 300, 150, 600] : [200, 100, 200],
      actions: [{ action: 'open', title: data.kind === 'coach' ? 'Responder' : data.alarm ? 'Empezar' : 'Abrir SOI' }],
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
