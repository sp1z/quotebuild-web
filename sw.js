// Keeps the (encrypted) app on the phone so it opens with no signal.
// a2c9332958 is filled in by build.mjs, so every build replaces the old cache.
const CACHE = 'qb-web-%VERSION%';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png'];
const NETWORK_WAIT_MS = 3000; // weak rural signal: don't hang, use the saved copy

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network first so updates show up, but fall back to the saved copy if there's
// no signal or the network is too slow.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  const network = fetch(e.request).then(res => {
    if (res.ok) {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
    }
    return res;
  });
  const cached = caches.match(e.request, { ignoreSearch: true });
  const slow = new Promise(resolve => setTimeout(resolve, NETWORK_WAIT_MS));
  e.respondWith(
    Promise.race([network, slow.then(() => cached.then(c => c || network))])
      .catch(() => cached.then(c => c || Response.error()))
  );
});
