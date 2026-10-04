'use strict';
// OMNI offline support. Game code (html/js/css/json) is network-first so updates arrive at once; with no connection
// the last copy is used. Pictures and sounds load from the cache straight away and refresh in the background.
// After the first visit the whole game (sw-files.json) is stored in the background so it can be played offline.
const CACHE = 'omni-cache-1';
const CORE = ['./', 'index.html', 'game.js', 'version.json'];
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).catch(() => {}));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});
const isAsset = (u) => /\/assets\/|\.(webp|png|jpg|gif|mp3|ogg|wav|woff2?)$/i.test(u.pathname);
async function networkFirst(req) {
  const c = await caches.open(CACHE);
  try {
    const r = await fetch(req);
    if (r && r.ok) c.put(req, r.clone());
    return r;
  } catch (err) {
    const hit = (await c.match(req)) || (await c.match(req, { ignoreSearch: true })) || (req.mode === 'navigate' && (await c.match('index.html')));
    if (hit) return hit;
    throw err;
  }
}
async function staleWhileRevalidate(req) {
  const c = await caches.open(CACHE),
    hit = await c.match(req, { ignoreSearch: true }),
    net = fetch(req)
      .then((r) => {
        if (r && r.ok) c.put(new Request(new URL(req.url).pathname), r.clone());
        return r;
      })
      .catch(() => null);
  return hit || (await net) || Response.error();
}
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (u.origin !== self.location.origin) return; // fonts, room server: straight to the network
  if (u.pathname.includes('/download/')) return; // big installers are never cached
  e.respondWith(isAsset(u) ? staleWhileRevalidate(req) : networkFirst(req));
});
// the page asks for a full offline copy once it has loaded (skipped on data-saver connections)
self.addEventListener('message', (e) => {
  if (!e.data || e.data.type !== 'warm') return;
  e.waitUntil(
    (async () => {
      const c = await caches.open(CACHE);
      const list = await fetch('sw-files.json', { cache: 'no-store' }).then((r) => r.json()).catch(() => []);
      for (const f of list) {
        if (await c.match(f, { ignoreSearch: true })) continue;
        try {
          const r = await fetch(f);
          if (r.ok) await c.put(f, r);
        } catch (err) {}
      }
    })(),
  );
});
