/**
 * Holiday Currency Converter - Service Worker
 * Enables offline functionality and caching
 */

const CACHE_VERSION = '2.6.10';
const CACHE_NAME = `holiday-v${CACHE_VERSION}`;
const RUNTIME_CACHE = 'holiday-runtime';

// Files to cache immediately on install (relative paths for GitHub Pages compatibility)
const PRECACHE_URLS = [
  './',
  './index.html',
  './css/styles.css',
  './js/app.js',
  './data/currencies.json',
  './data/rates.json',
  './data/scams.json',
  './icons/icon.svg',
  './icons/logo.svg',
  './manifest.json'
];

// External CDN resources to cache for offline use
const EXTERNAL_URLS = [
  'https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js',
  'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.0.0/css/flag-icons.min.css'
];

// All country codes used in the app - pre-cache these flag SVGs
const FLAG_CODES = [
  'us', 'eu', 'gb', 'jp', 'au', 'ca', 'ch', 'cn', 'in', 'mx', 'br', 'za', 'kr', 'sg', 'hk',
  'no', 'se', 'dk', 'nz', 'th', 'ph', 'id', 'my', 'vn', 'tr', 'ru', 'pl', 'cz', 'hu', 'il',
  'ae', 'sa', 'eg', 'cl', 'co', 'pe', 'ar', 'tw', 'ma', 'hr', 'ro', 'bg', 'is', 'jm', 'ke',
  'ng', 'gh', 'do', 'cr', 'gt', 'pa', 'lk', 'np', 'pk', 'bd', 'mm', 'kh', 'la', 'fj', 'pf',
  'qa', 'kw', 'bh', 'om', 'jo', 'mu', 'sc', 'cu', 'bs', 'bb', 'aw', 'cw', 'bm', 'ky', 'tz',
  'rw', 'et', 'bw', 'na', 'zm', 'ug', 'mz', 'mg', 'tn', 'dz', 'es', 'fr', 'it', 'de', 'gr',
  'pt', 'nl', 'be', 'at', 'ie', 'fi', 'mv', 'pr', 'zw', 'sn'
];

// Generate flag SVG URLs
const FLAG_URLS = FLAG_CODES.map(code =>
  `https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.0.0/flags/4x3/${code}.svg`
);

// CDN prefixes to cache dynamically (fallback for any missed flags)
const CACHEABLE_CDN_PREFIXES = [
  'https://cdn.jsdelivr.net/gh/lipis/flag-icons'
];

// Install event - cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Pre-caching app shell');
        // Cache local files first
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => {
        // Cache external CDN resources (don't fail install if these fail)
        return caches.open(CACHE_NAME).then((cache) => {
          const allExternalUrls = [...EXTERNAL_URLS, ...FLAG_URLS];
          console.log(`[SW] Caching ${allExternalUrls.length} external resources including flags`);
          return Promise.allSettled(
            allExternalUrls.map(url =>
              fetch(url, { mode: 'cors' })
                .then(response => {
                  if (response.ok) {
                    return cache.put(url, response);
                  }
                })
                .catch(err => console.log('[SW] Could not cache:', url))
            )
          );
        });
      })
      .then(() => {
        console.log('[SW] Pre-caching complete - app ready for offline use');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Pre-caching failed:', error);
      })
  );
});

// Activate event - clean up old caches and notify clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Activated v' + CACHE_VERSION);
        // Notify all clients that a new version is active
        return self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({ type: 'SW_ACTIVATED', version: CACHE_VERSION });
          });
        });
      })
      .then(() => self.clients.claim())
  );
});

// Check if URL is an external CDN resource we cache
function isExternalCached(url) {
  return EXTERNAL_URLS.some(extUrl => url.href.startsWith(extUrl.split('?')[0]));
}

// Check if URL is a cacheable CDN resource (for dynamic caching)
function isCacheableCDN(url) {
  return CACHEABLE_CDN_PREFIXES.some(prefix => url.href.startsWith(prefix));
}

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle API requests differently (network-first for fresh rates)
  if (url.href.includes('exchangerate-api.com')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Handle external CDN resources (cache-first)
  if (isExternalCached(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Handle cacheable CDN resources like flag SVGs (cache-first with dynamic caching)
  if (isCacheableCDN(url)) {
    event.respondWith(cacheFirstWithStore(request));
    return;
  }

  // Skip other cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // For app assets - cache first, then network
  event.respondWith(cacheFirst(request));
});

// Cache-first strategy (for app assets)
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    // Return cached response and update cache in background
    updateCache(request);
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.error('[SW] Fetch failed:', error);

    // Return offline fallback for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('./index.html');
    }

    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

// Cache-first with store strategy (for CDN resources like flags)
// Caches resources on first fetch for offline use
async function cacheFirstWithStore(request) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request, { mode: 'cors' });

    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.error('[SW] CDN fetch failed:', error);
    return new Response('', { status: 503, statusText: 'Service Unavailable' });
  }
}

// Network-first strategy (for API calls)
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // Cache the fresh response
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('[SW] Network request failed, trying cache:', request.url);

    // Try to return cached response
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // Return error response if nothing in cache
    return new Response(JSON.stringify({ error: 'Offline' }), {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Update cache in background
async function updateCache(request) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse);
    }
  } catch (error) {
    // Silently fail - we already have cached version
  }
}

// Handle messages from the app
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
  if (event.data === 'getVersion') {
    event.source.postMessage({ type: 'VERSION', version: CACHE_VERSION });
  }
});

// Background sync for rate updates (if supported)
self.addEventListener('sync', (event) => {
  if (event.tag === 'update-rates') {
    event.waitUntil(updateExchangeRates());
  }
});

async function updateExchangeRates() {
  try {
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put('https://api.exchangerate-api.com/v4/latest/USD', response.clone());

      // Notify clients of update
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({ type: 'RATES_UPDATED' });
      });
    }
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-rates-daily') {
    event.waitUntil(updateExchangeRates());
  }
});
