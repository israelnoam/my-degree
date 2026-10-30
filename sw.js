// Offline support: app shell is cached; network-first so updates show up right away.
// Bump VERSION together with the ?v= in index.html on every release.
const VERSION = 16;
const CACHE = 'planner-v' + VERSION;
const SHELL = [
  './', 'index.html', 'manifest.webmanifest',
  ...['styles.css', 'app.js', 'google.js', 'grades.js', 'store.js', 'data.js', 'catalog.js', 'cheesefork.js', 'planner.js', 'stats.js', 'cv.js', 'extras.js', 'extras.css'].map(f => `${f}?v=${VERSION}`),
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
  const fromCache = () => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('index.html'));
  // 'no-cache' skips GitHub Pages' ~10 minute browser cache, so a release shows up at once.
  const network = fetch(e.request, { cache: 'no-cache' }).then(res => {
    if (res.ok) {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
    }
    return res;
  });
  // On a weak connection don't leave the screen blank: after 4 s use the saved copy
  // (if there is one); otherwise keep waiting for the network.
  const slow = new Promise(resolve => setTimeout(() => resolve(fromCache().then(r => r && r.url ? r : null)), 4000));
  e.respondWith(
    Promise.race([network.catch(() => null), slow]).then(r => r || network.catch(fromCache)).then(r => r || fromCache())
  );
});
