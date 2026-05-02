const CACHE = 'mazen-wms-v2';
const STATIC_ASSETS = ['/'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  // Clean up old caches
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const { request } = e;
  // Only cache GET requests — POST/PUT/DELETE are NOT cacheable by the Cache API
  if (request.method !== 'GET') return;
  // Skip API calls — always fetch fresh from network
  if (request.url.includes('/api/')) return;
  // Skip non-http requests (chrome-extension, etc.)
  if (!request.url.startsWith('http')) return;

  e.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(res => {
        // Only cache successful, non-opaque responses
        if (!res || res.status !== 200 || res.type === 'opaque') return res;
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(request, clone));
        return res;
      });
    }).catch(() => caches.match('/') || new Response('', { status: 503 }))
  );
});
