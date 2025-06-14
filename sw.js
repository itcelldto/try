const CACHE_NAME = 'app-cache-v1';
const urlsToCache = [
  '/try/',
  '/try/index.html',
  '/try/styles.css',
  '/try/script.js',
  '/try/icons/icon-192x192.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});
