/* Servicio de la app instalable.
   - Guarda el "esqueleto" de la app (pantallas, estilos, íconos) para que abra rápido y sin conexión.
   - NUNCA guarda datos (/api) ni archivos privados (/files): siempre se piden al servidor, así nadie ve información vieja o ajena.
   Si cambiás archivos de public/, subí el número de VERSION para que se actualice. */
const VERSION = 'v1';
const CACHE = 'shuritekan-' + VERSION;
const SHELL = ['/', '/app.css', '/app.js', '/vendor/qrcode.min.js', '/img/icons/icon-192.png', '/manifest.webmanifest'];

self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('shuritekan-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/files/')) return; // directo a la red, sin guardar
  // Primero la red (para ver siempre la versión nueva); si no hay conexión, lo guardado.
  e.respondWith(fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req).then(hit => hit || (req.mode === 'navigate' ? caches.match('/') : Response.error()))));
});
