const CACHE_NAME = 'huma2-core-v2031-11';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './src/styles/theme.css',
  './src/styles/layout.css',
  './src/app.js',
  './src/core/store.js',
  './src/core/audio.js',
  './src/core/voice.js',
  './src/modules/chronoMatrix.js',
  './src/modules/spineCanvas.js',
  './src/modules/conveyor.js',
  './src/modules/metabolic.js',
  './src/modules/slouchDetector.js',
  './src/modules/vitalHomeostasis.js',
  './src/modules/geofenceGuide.js',
  './src/modules/neuroAcoustic.js',
  './src/modules/dayScheduler.js',
  './src/modules/footballTactics.js',
  './src/modules/paretoParser.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS).catch(() => {}))
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
    caches.match(e.request).then((res) => res || fetch(e.request))
  );
});
