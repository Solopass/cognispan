/**
 * CogniSpan service worker.
 *
 * The app has no backend and no API calls, so offline support only needs the
 * shell and its build assets. Rather than precache a generated file list, this
 * caches what the app actually requests on first visit and serves it from cache
 * afterwards. That keeps the build free of a bundler plugin.
 *
 * Strategies:
 *   - navigations  -> network first, falling back to the cached shell, so a new
 *                     deploy is picked up as soon as the network allows but the
 *                     app still opens with no connection.
 *   - build assets -> cache first. Vite fingerprints these filenames, so a
 *                     given URL's content never changes and a cache hit is
 *                     always correct.
 *
 * Bump CACHE_VERSION to evict everything on the next activation.
 */

const CACHE_VERSION = 'cognispan-v1';
const SHELL_URL = '/index.html';

self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then(cache => cache.addAll(['/', SHELL_URL, '/manifest.json', '/icon.svg']))
      // A failure here (e.g. one asset 404s) must not leave the app without a
      // worker; the runtime handler will fill the cache instead.
      .catch(() => undefined)
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;

  // Only same-origin GETs are ours to serve.
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(SHELL_URL, copy));
          return response;
        })
        .catch(() => caches.match(SHELL_URL).then(hit => hit || caches.match('/')))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(hit => {
      if (hit) return hit;
      return fetch(request).then(response => {
        // Opaque and error responses are not worth storing.
        if (response && response.status === 200 && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
