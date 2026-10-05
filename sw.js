/* HUMA 2.0 · Service Worker · Cache-First */
const CACHE = 'huma2-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './favicon.svg',
  './src/styles/theme.css',
  './src/styles/layout.css',
  './src/app.js',
  './src/core/store.js',
  './src/core/audio.js',
  './src/core/voice.js',
  './src/modules/spineCanvas.js',
  './src/modules/footballTactics.js',
  './src/modules/paretoParser.js',
  './src/modules/chronoMatrix.js',
  './src/modules/dayScheduler.js',
  './src/modules/conveyor.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
