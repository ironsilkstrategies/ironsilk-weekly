/* TheDesk public app — offline shell. Pages and assets: network first, so a new deploy shows up at once; the cached
   copy only answers when the network can't. The picks feed, the slate and live scores always go to the network
   (the page keeps its own last good copy). */
const V = 'thedesk-shell-v13';
const SHELL = ['./', 'index.html', 'app.css?v=11', 'app.js?v=12', 'privacy.html', 'terms.html', 'manifest.webmanifest', 'fonts/big-shoulders.woff2', 'fonts/franklin.woff2', 'fonts/franklin-italic.woff2', '../brand/badge-112.png', '../brand/icon-192.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).catch(() => {}).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('thedesk-shell-') && k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin !== self.location.origin || u.pathname.endsWith('.json')) return;
  e.respondWith(fetch(r).then(res => { if (res.ok) { const copy = res.clone(); caches.open(V).then(c => c.put(r, copy)).catch(() => {}); } return res; })
    .catch(() => caches.match(r, { ignoreSearch: true }).then(m => m || (r.mode === 'navigate' ? caches.match('index.html') : Response.error()))));
});
