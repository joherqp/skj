const CACHE_NAME = 'cvskj-shell-v5';
const RUNTIME_CACHE = 'cvskj-runtime-v5';
const APP_SHELL = [
  '/',
  '/login',
  '/manifest.webmanifest',
  '/pwa-192x192.svg',
  '/pwa-512x512.svg',
  '/masked-icon.svg',
  '/favicon.ico'
];

// List of static asset extensions to cache Cache-First
const STATIC_ASSETS = [
  '.js',
  '.css',
  '.png',
  '.jpg',
  '.jpeg',
  '.svg',
  '.gif',
  '.woff',
  '.woff2',
  '.ttf',
  '.otf',
  '.ico'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  // Don't skipWaiting automatically here anymore, 
  // we'll wait for the user to confirm in PwaManager
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('cvskj-') && key !== CACHE_NAME && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Handle skipWaiting from client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const reqUrl = new URL(request.url);
  
  // 1. NEVER cache these:
  // - Supabase requests
  // - API requests
  // - Next.js internal requests (_next)
  // - Next.js RSC payloads (_rsc query param)
  // - Chrome extensions or other non-http schemes
  // 1. NEVER cache these:
  // - Supabase requests
  // - API requests
  // - Next.js internal DATA requests (excluding static assets)
  // - Next.js RSC payloads (_rsc query param)
  // - Chrome extensions or other non-http schemes
  if (
    reqUrl.hostname.includes('supabase.co') ||
    reqUrl.pathname.startsWith('/api/') ||
    (reqUrl.pathname.startsWith('/_next/') && !reqUrl.pathname.startsWith('/_next/static/')) ||
    reqUrl.searchParams.has('_rsc') ||
    !request.url.startsWith('http')
  ) {
    return;
  }

  // 2. Navigation Strategy: Network First, Fallback to Cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request, { cache: 'no-cache' }) // Bypass browser HTTP cache
        .then((response) => {
          // If we got a valid response, put it in runtime cache
          if (response.status === 200) {
            const copy = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          // Fallback to cache if network fails
          const cached = await caches.match(request);
          if (cached) return cached;
          return caches.match('/');
        })
    );
    return;
  }

  // 3. Asset Strategy: Cache First for static assets, Network First for others
  const isStaticAsset = STATIC_ASSETS.some(ext => reqUrl.pathname.endsWith(ext));

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.status === 200) {
            const copy = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        });
      })
    );
  } else {
    // For anything else (dynamic pages, shared components, etc.)
    // Always go to network first to ensure data is fresh
    event.respondWith(
      fetch(request, { cache: 'no-cache' })
        .then((response) => {
          if (response.status === 200) {
            const copy = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
  }
});

self.addEventListener('push', (event) => {
  const payload = event.data ? event.data.json() : {};
  const title = payload.title || 'Notifikasi Baru';
  const options = {
    body: payload.body || 'Ada update terbaru.',
    icon: payload.icon || '/pwa-192x192.svg',
    badge: payload.badge || '/masked-icon.svg',
    data: {
      url: payload.url || '/notifikasi',
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || '/notifikasi';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return undefined;
    }),
  );
});

