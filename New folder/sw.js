const CACHE_NAME = 'happiness-chalet-v3';
const urlsToCache = [
  './',
  './index.html',
  './css/style.css',
  './js/script.js',
  './images/logo.png',
  './manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);
  if (event.request.method !== 'GET' ||
      requestUrl.origin !== self.location.origin ||
      requestUrl.pathname.startsWith('/api/')) return;

  event.respondWith((async () => {
    const cachedResponse = await caches.match(event.request);
    try {
      const response = await fetch(event.request);
      if (response.ok && response.type === 'basic') {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(event.request, response.clone());
      }
      return response;
    } catch (error) {
      if (cachedResponse) return cachedResponse;
      throw error;
    }
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter(cacheName => cacheName !== CACHE_NAME)
        .map(cacheName => caches.delete(cacheName))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('push', event => {
  const title = 'شاليه هابينيس';
  const options = {
    body: event.data ? event.data.text() : 'عروض جديدة متاحة!',
    icon: 'images/logo.png',
    badge: 'images/logo.png',
    vibrate: [200, 100, 200],
    tag: 'happiness-chalet-notification'
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});
