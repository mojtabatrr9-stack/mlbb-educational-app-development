/* Nexus service worker — offline hero library.
 * Bump CACHE_VERSION whenever caching behaviour changes. A new worker waits until the
 * page confirms the "update available" toast (SKIP_WAITING).
 */
const CACHE_VERSION = 'v5';
const CACHE = `nexus-library-${CACHE_VERSION}`;
const PRECACHE = [
  '/en',
  '/fa',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
  '/images/nexus-hero.webp',
];

/** Cache each URL independently so one missing file never breaks installation. */
async function cacheEach(cache, urls) {
  const results = await Promise.all(
    urls.map(async (url) => {
      try {
        const response = await fetch(url, { cache: 'no-cache' });
        if (!response.ok) return false;
        await cache.put(url, response);
        return true;
      } catch {
        return false;
      }
    }),
  );
  return results.filter(Boolean).length;
}

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cacheEach(cache, PRECACHE)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('nexus-') && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }
  if (event.data?.type !== 'CACHE_LIBRARY') return;
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      let images = [];
      try {
        const response = await fetch('/api/catalog', { cache: 'no-cache' });
        if (response.ok) {
          await cache.put('/api/catalog', response.clone());
          const catalog = await response.json();
          images = [
            ...(catalog.heroes || []).map((hero) => hero.image_url),
            ...(catalog.guides || []).map((guide) => guide.image_url),
            ...(catalog.items || []).map((item) => item.image_url),
          ].filter((url) => typeof url === 'string' && url.startsWith('/'));
        }
      } catch {
        // Offline right now: keep whatever is already cached.
      }
      const assets = (event.data.assets || []).filter(
        (url) => typeof url === 'string' && url.startsWith('/_next/static/'),
      );
      const urls = [...new Set([...images, ...assets])];
      const cached = await cacheEach(cache, urls);
      if (cached === urls.length) event.source?.postMessage({ type: 'OFFLINE_READY' });
    })(),
  );
});

function isPrivate(url) {
  return (
    /^\/(en|fa)\/admin/.test(url.pathname) ||
    (url.pathname.startsWith('/api/') && url.pathname !== '/api/catalog')
  );
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached =
      (await cache.match(request)) || (request.mode === 'navigate' && (await cache.match('/')));
    if (cached) return cached;
    if (request.mode === 'navigate') {
      return new Response(
        'Your offline library has not been cached yet. / کتابخانهٔ آفلاین هنوز ذخیره نشده است.',
        {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        },
      );
    }
    return new Response(JSON.stringify({ error: 'Offline library not cached yet.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE);
    cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== location.origin || isPrivate(url)) return;
  if (request.headers.get('RSC') === '1') return;
  if (request.mode === 'navigate' || url.pathname === '/api/catalog') {
    event.respondWith(networkFirst(request));
    return;
  }
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/_next/image') ||
    url.pathname.startsWith('/images/') ||
    url.pathname.startsWith('/icon') ||
    url.pathname.startsWith('/apple-touch-icon') ||
    url.pathname.startsWith('/favicon')
  ) {
    event.respondWith(cacheFirst(request));
  }
});
