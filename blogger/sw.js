const CACHE_NAME = 'blogger-cache-v1';
const urlsToCache = [
  '/try/blogger/',
  '/try/blogger/index.html',
  '/try/blogger/styles.css',
  '/try/blogger/assets/icon-192.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
