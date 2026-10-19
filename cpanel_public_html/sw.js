/**
 * TripPool Nepal - Self-Healing Network-First Service Worker
 * - Never intercepts .php scripts (debug.php, api/*.php) or /api/ routes
 * - Automatically purges old Workbox precaches that hijacked /debug.php
 * - Uses Network-First for HTML pages so live server updates & PHP scripts always open directly
 */

const CACHE_NAME = 'trippool-runtime-v3';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // 1. Delete all old workbox-precache and legacy caches
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
          return Promise.resolve();
        })
      );

      // 2. Claim all open clients immediately
      await self.clients.claim();

      // 3. If any open browser tab is on debug.php or .php (previously stuck on cached index.html), reload it from server
      const windowClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of windowClients) {
        if (client.url && (client.url.toLowerCase().includes('.php') || client.url.toLowerCase().includes('debug'))) {
          try {
            await client.navigate(client.url);
          } catch (e) {
            // Ignore navigation errors on cross-origin or restricted frames
          }
        }
      }
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // NEVER intercept PHP scripts (debug.php, api/*.php), API endpoints, or debug routes
  if (
    url.pathname.toLowerCase().endsWith('.php') ||
    url.pathname.toLowerCase().includes('.php/') ||
    url.pathname.toLowerCase().includes('/api/') ||
    url.pathname.toLowerCase().includes('debug.php') ||
    url.search.toLowerCase().includes('debug=')
  ) {
    return;
  }

  // Network-First strategy for HTML navigation (falls back to cache ONLY when offline)
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      fetch(req)
        .then((networkRes) => {
          if (networkRes && networkRes.ok && networkRes.type === 'basic') {
            const copy = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
          }
          return networkRes;
        })
        .catch(async () => {
          const cached = await caches.match(req);
          if (cached) return cached;
          return caches.match('./index.html');
        })
    );
    return;
  }

  // Stale-While-Revalidate for static JS/CSS/icons/fonts
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(req)
        .then((networkRes) => {
          if (networkRes && networkRes.ok) {
            const copy = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
          }
          return networkRes;
        })
        .catch(() => caches.match(req))
    );
  }
});
