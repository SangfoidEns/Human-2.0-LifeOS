const CACHE_NAME = 'huma2-core-v2031';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './src/styles/theme.css',
  './src/styles/layout.css',
  './src/app.js',
  './src/core/store.js',
  './src/core/audio.js',
  './src/modules/spineCanvas.js',
  './src/modules/conveyor.js',
  './src/modules/metabolic.js',
  './src/modules/paretoParser.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS).catch((err) => {
        console.warn('[HUMA2 SW] Частина ресурсів буде кешована по мірі звернення:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => k !== CACHE_NAME && caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request))
  );
});
