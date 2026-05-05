// Service worker — network first, cache only as offline fallback
const CACHE = 'trading-dashboard-v2';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  // Delete all old caches on every new deploy
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('/api/')) return;
  if (e.request.url.includes('/auth/')) return;

  // Network first — always try to get fresh content
  // Only fall back to cache if offline
  e.respondWith(
    fetch(e.request)
      .then(res => {
        // Cache a copy for offline use
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
