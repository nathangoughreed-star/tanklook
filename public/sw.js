// TankLook service worker (lane W): makes the site installable and lets it open offline after one visit.
// - The page itself (navigations): network first, so a push to main shows on the next open; the cached copy only
//   when offline.
// - Vite's hashed files under assets/ never change: cache first, capped so old builds do not pile up.
// - Everything else on this origin: network first, cached copy when offline.
// - Other origins (the aqadvisor proxy, fonts, CDNs) are not touched: stocking advice is never served stale.
const CACHE = 'tanklook-v1';
const ASSET_CAP = 120; // files kept under assets/; the oldest go first

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', './manifest.webmanifest'])).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith('tanklook-') && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

async function networkFirst(req, key) {
  const c = await caches.open(CACHE);
  try {
    const res = await fetch(req);
    if (res.ok) await c.put(key ?? req, res.clone());
    return res;
  } catch (err) {
    const hit = await c.match(key ?? req);
    if (hit) return hit;
    throw err;
  }
}

async function cacheFirst(req) {
  const c = await caches.open(CACHE);
  const hit = await c.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) {
    await c.put(req, res.clone());
    const old = (await c.keys()).filter((r) => r.url.includes('/assets/'));
    for (const r of old.slice(0, Math.max(0, old.length - ASSET_CAP))) await c.delete(r);
  }
  return res;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // the app page is cached once whatever its query (?debug, ?ar=ios), so it opens offline from any link to it;
  // other pages (review.html) are cached as themselves
  if (req.mode === 'navigate') {
    const app = url.href.startsWith(self.registration.scope) && /^(index\.html)?$/.test(url.pathname.slice(new URL(self.registration.scope).pathname.length));
    e.respondWith(networkFirst(req, app ? self.registration.scope : undefined)); return;
  }
  if (url.pathname.includes('/assets/')) { e.respondWith(cacheFirst(req)); return; }
  e.respondWith(networkFirst(req));
});
