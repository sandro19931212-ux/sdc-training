const CACHE_NAME = 'sdc-training-dashboard-appointments-v34';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest'
];

self.addEventListener('install', event => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .catch(() => {})
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (
    event.data === 'SKIP_WAITING' ||
    event.data?.type === 'SKIP_WAITING'
  ) {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // La libreria viene scaricata solo quando aperta e riusata nelle visite successive.
  if (/\/exercise-atlas-\d+\.webp$/.test(url.pathname) || /\/exercise-catalog\.json$/.test(url.pathname)) {
    event.respondWith(caches.open(CACHE_NAME).then(async cache => {
      const cached = await cache.match(event.request);
      if (cached) return cached;
      const response = await fetch(event.request);
      if (response.ok) await cache.put(event.request, response.clone());
      return response;
    }));
    return;
  }

  // HTML sempre dalla rete quando disponibile
  if (
    event.request.mode === 'navigate' ||
    event.request.destination === 'document'
  ) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => cache.put(event.request, copy))
            .catch(() => {});
          return response;
        })
        .catch(async () => {
          return (
            await caches.match(event.request) ||
            await caches.match('./index.html') ||
            await caches.match('./')
          );
        })
    );
    return;
  }

  // Altri file: rete prima, cache solo se offline
  event.respondWith(
    fetch(event.request, { cache: 'no-store' })
      .then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME)
          .then(cache => cache.put(event.request, copy))
          .catch(() => {});
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});












