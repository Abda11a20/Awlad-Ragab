const CACHE_NAME = 'mazen-wms-v5';

// ملفات static فقط
const STATIC_ASSETS = [
  '/',
  '/index.html'
];

// install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// activate
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

// fetch
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // ❌ تجاهل أي request مش GET
  if (request.method !== 'GET') return;

  // ❌ تجاهل API بالكامل
  if (
    request.url.includes('/api/') ||
    request.url.startsWith('https://mazen-warehouse.vercel.app')
  ) {
    return;
  }

  // ❌ تجاهل أي حاجة مش http
  if (!request.url.startsWith('http')) return;

  // ✅ كاش فقط للملفات الثابتة
  const isStatic = request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'image' ||
    request.destination === 'document';

  if (!isStatic) return;

  event.respondWith(
    caches.match(request).then(cached => {
      // Cache First
      if (cached) return cached;

      return fetch(request)
        .then(response => {
          if (!response || response.status !== 200) return response;

          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, clone);
          });

          return response;
        })
        .catch(() => {
          // Only return index.html fallback for navigation (document) requests
          // Never return HTML for scripts/styles as it causes MIME type errors
          if (request.destination === 'document') {
            return caches.match('/index.html');
          }
          return new Response('', { status: 408 });
        });
    })
  );
});