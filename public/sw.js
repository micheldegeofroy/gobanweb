// Goban Web Service Worker v2 - Enhanced Offline Support
const CACHE_NAME = 'gobanweb-v2';
const STATIC_CACHE = 'gobanweb-static-v2';
const GAME_CACHE = 'gobanweb-games-v2';

// Static assets to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/crazy',
  '/wilde',
  '/tutorial',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  '/apple-icon.png',
  '/favicon-16x16.png',
  '/favicon-32x32.png',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            return name.startsWith('gobanweb-') &&
                   name !== STATIC_CACHE &&
                   name !== GAME_CACHE &&
                   name !== CACHE_NAME;
          })
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - smart caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // API requests for game data - cache and update
  if (url.pathname.match(/^\/api\/(games|crazy|wilde)\/[^\/]+$/)) {
    event.respondWith(
      caches.open(GAME_CACHE).then(async (cache) => {
        try {
          // Try network first
          const networkResponse = await fetch(request);
          if (networkResponse.ok) {
            // Cache the fresh response
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch (error) {
          // Network failed, try cache
          const cachedResponse = await cache.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          // Return offline game data placeholder
          return new Response(
            JSON.stringify({ offline: true, error: 'You are offline' }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        }
      })
    );
    return;
  }

  // Skip action/mutation API endpoints - these need network
  if (url.pathname.includes('/action') ||
      url.pathname.includes('/clear') ||
      url.pathname.includes('/undo')) {
    return;
  }

  // Static assets and pages - cache first, network fallback
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cache immediately, update in background
        event.waitUntil(
          fetch(request).then((networkResponse) => {
            if (networkResponse.ok) {
              caches.open(STATIC_CACHE).then((cache) => {
                cache.put(request, networkResponse);
              });
            }
          }).catch(() => {})
        );
        return cachedResponse;
      }

      // Not in cache, try network
      return fetch(request).then((networkResponse) => {
        if (networkResponse.ok) {
          // Cache successful responses
          const responseClone = networkResponse.clone();
          caches.open(STATIC_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Network failed, return offline page for navigation
        if (request.mode === 'navigate') {
          return caches.match('/');
        }
        return new Response('Offline', { status: 503 });
      });
    })
  );
});

// Handle messages from the app
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }

  // Clear game cache on request
  if (event.data === 'clearGameCache') {
    caches.delete(GAME_CACHE);
  }
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-game-actions') {
    event.waitUntil(syncOfflineActions());
  }
});

async function syncOfflineActions() {
  // This will be triggered when back online
  // The actual sync logic is in the client-side OfflineManager
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({ type: 'SYNC_OFFLINE_ACTIONS' });
  });
}
