/* LifeOS Core 2031 · Service Worker
   Offline-First cache strategy · Network falling back to cache */

const CACHE = 'lifeos-neural-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/src/main.js',
  '/src/ui/styles/tokens.css',
  '/src/ui/styles/layout.css',
  '/src/core/StorageEngine.js',
  '/src/core/AudioSynth.js',
  '/src/core/TemporalEngine.js',
  '/src/modules/biomechanics/SpineCanvas3D.js',
  '/public/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetched = fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const clone = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => cached);

      return cached || fetched;
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
