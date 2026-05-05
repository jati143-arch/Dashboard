// v3 — no caching, always fetch fresh, keeps PWA installable
const CACHE_NAME = 'trading-dashboard-v3';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', e => {
  // Delete every cache that exists
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
  );
  self.clients.claim();
});

// Don't intercept any requests — browser fetches everything fresh every time
