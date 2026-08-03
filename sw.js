/* IdealFinway PWA service worker - v62
   Strategy: network-first for the app shell (so users always get the latest deployed
   version of index.html/JS, never stuck on stale cached code), with a cached fallback
   only when fully offline. Does not touch API calls to script.google.com.
   v62: bumped cache name so every old cached copy (from before the mobile-responsive
   update) is force-deleted on next visit; install no longer fails as a whole if one
   file is slow/unreachable on a weak signal; HTML fetches bypass HTTP cache entirely
   (cache:'no-store') so a stale edge/browser cache can never mask a real deploy. */
const CACHE_NAME = 'idealfinway-shell-v62';
const SHELL_FILES = ['./index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', function(e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return Promise.all(SHELL_FILES.map(function(f) {
        return cache.add(f).catch(function() { /* weak signal - skip, don't block install */ });
      }));
    })
  );
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.filter(function(k) { return k !== CACHE_NAME; }).map(function(k) { return caches.delete(k); }));
    }).then(function() { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e) {
  var url = e.request.url;
  // Never intercept the backend API - always go live for real data
  if (url.indexOf('script.google.com') !== -1) return;
  if (e.request.method !== 'GET') return;

  var isHTML = e.request.mode === 'navigate' || (e.request.headers.get('accept') || '').indexOf('text/html') !== -1;
  var fetchOpts = isHTML ? { cache: 'no-store' } : {};

  e.respondWith(
    fetch(e.request, fetchOpts).then(function(res) {
      var copy = res.clone();
      caches.open(CACHE_NAME).then(function(cache) { cache.put(e.request, copy); });
      return res;
    }).catch(function() {
      return caches.match(e.request).then(function(cached) { return cached || caches.match('./index.html'); });
    })
  );
});
