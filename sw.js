// Offline support: app shell is cached; network-first so updates show up right away.
// Bump VERSION together with the ?v= in index.html on every release.
const VERSION = 5;
const CACHE = 'planner-v' + VERSION;
const SHELL = [
  './', 'index.html', 'manifest.webmanifest',
  ...['styles.css', 'app.js', 'google.js', 'store.js', 'data.js'].map(f => `${f}?v=${VERSION}`),
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-180.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Only handle our own files; Google API calls go straight to the network.
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('index.html')))
  );
});
