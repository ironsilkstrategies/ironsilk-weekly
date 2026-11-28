/* TheDesk public app — offline shell. Pages and assets: network first, so a new deploy shows up at once; the cached
   copy only answers when the network can't. The picks feed, the slate and live scores always go to the network
   (the page keeps its own last good copy). */
const V = 'thedesk-shell-v92';
const SHELL = ['./', 'index.html', 'app.css?v=66', 'app.js?v=89', 'rooms.js?v=2', 'fx.js?v=2', 'widget.html', 'widget.js?v=1', 'gamecast.js?v=1', 'wire.js?v=1', 'voice.js?v=3', 'chal-lib.js?v=1', 'privacy.html', 'manifest.webmanifest', 'fonts/big-shoulders.woff2', 'fonts/franklin.woff2', 'fonts/franklin-italic.woff2', '../brand/badge-112.png', '../brand/icon-192.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).catch(() => {}).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('thedesk-shell-') && k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()).then(() => widgetsAll())); });
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin !== self.location.origin || u.pathname.endsWith('.json')) return;
  e.respondWith(fetch(r).then(res => { if (res.ok) { const copy = res.clone(); caches.open(V).then(c => c.put(r, copy)).catch(() => {}); } return res; })
    .catch(() => caches.match(r, { ignoreSearch: true }).then(m => m || (r.mode === 'navigate' ? caches.match('index.html') : Response.error()))));
});

/* ── v88 · device alerts. The push service hands over the declarative message: Safari (iOS 18.4+) shows it by itself, even when iOS
   has put this worker away; everywhere else it lands here and is shown the same way. A tap opens the room it's about. ── */
const API = 'https://thedesk-chat.ironsilkstrategies.workers.dev';
const mine = async k => { try { const c = await caches.open('thedesk-mydesk'), r = await c.match(k); return r ? r.json() : null; } catch (e) { return null; } };
self.addEventListener('push', e => { let d = {}; try { d = e.data ? e.data.json() : {}; } catch (er) { d = { notification: { title: 'TheDesk', body: e.data ? e.data.text() : '' } }; }
  const n = d.notification || {}; if (!n.title) return;
  e.waitUntil((async () => {
    await self.registration.showNotification(n.title, { body: n.body || '', tag: n.tag || undefined, renotify: !!n.tag, icon: '../brand/icon-192.png', lang: n.lang || 'en-US', dir: n.dir || 'ltr', silent: !!n.silent, data: { url: n.navigate || './#today' } });
    if (n.app_badge != null && self.navigator && self.navigator.setAppBadge) { try { const b = +n.app_badge; if (b > 0) await self.navigator.setAppBadge(b); else await self.navigator.clearAppBadge(); } catch (er) { } }
    for (const c of await self.clients.matchAll({ type: 'window' })) c.postMessage({ type: 'push', kind: d.kind || '' });
    await widgetsAll(); })()); });
self.addEventListener('notificationclick', e => { e.notification.close(); const url = new URL((e.notification.data && e.notification.data.url) || './#today', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => { const c = cs.find(x => x.url.startsWith(self.registration.scope));
    if (c) { c.postMessage({ type: 'go', url }); return c.focus(); } return self.clients.openWindow(url); })); });
/* the push service rotated this device's address: subscribe again with the same switches (the page left them in the cache) */
self.addEventListener('pushsubscriptionchange', e => { e.waitUntil((async () => { try { const A = (await mine('alerts.json')) || {}, base = A.api || API;
  const k = (await (await fetch(base + '/push/key')).json()).key, raw = Uint8Array.from(atob((k + '='.repeat((4 - k.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  const sub = e.newSubscription || await self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: raw });
  await fetch(base + '/push/sub', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sub: sub.toJSON(), prefs: A.prefs, tz: A.tz, desk: A.desk }) });
  if (e.oldSubscription) await fetch(base + '/push/unsub', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ endpoint: e.oldSubscription.endpoint }) }); } catch (er) { } })()); });
/* ── v88 · the Windows 11 Widgets Board (installed from Edge): today's card through My Desk, refreshed on install, on resume and with each push ── */
const LG = { nfl: 'NFL', ncaaf: 'CFB', nba: 'NBA', ncaab: 'CBB', nhl: 'NHL', mlb: 'MLB' };
const clk = t => { const d = new Date(typeof t === 'number' ? t : Date.parse(t)); return isFinite(d) ? d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : ''; };
async function widgetData() { const D = (await mine('mydesk.json')) || {}, SP = D.sp || [], CH = D.ch || []; let P = null; try { P = await (await fetch(API + '/pulse')).json(); } catch (e) { }
  if (!P || !P.day) return { title: 'TheDesk · Today', rows: [{ n: '', line: 'The desk is getting today’s card ready', sub: '', tag: '', color: 'Default' }], rec: '' };
  const now = Date.now(), L = (P.picks || []).filter(x => (!SP.length || SP.includes(x.sp)) && (!CH.length || x.sealed || !(x.who || []).length || x.who.some(v => CH.includes(v))));
  const rows = L.map(x => x.sealed ? { n: 'No. ' + (x.i + 1), line: 'Sealed', sub: (LG[x.sp] || '') + ' · opens ' + clk(x.opens || (Date.parse(x.start) - 30 * 60e3)), tag: '🔒', color: 'Accent' }
    : { n: 'No. ' + (x.i + 1), line: x.pick + (x.price ? ' ' + (x.price > 0 ? '+' + x.price : '−' + Math.abs(x.price)) : ''), sub: String(x.game || '').replace('@', ' at ') + ' · ' + (LG[x.sp] || ''),
        tag: x.res === 'win' ? 'WIN' : x.res === 'loss' ? 'LOSS' : x.res === 'push' ? 'PUSH' : Date.parse(x.start) <= now ? 'LIVE' : clk(x.start), color: x.res === 'win' ? 'Good' : x.res === 'loss' ? 'Attention' : 'Default' });
  const R = P.rec || {}, day = new Date(P.day + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
  return { title: `${day}’s Best ${(P.picks || []).length || 3}`, rows: rows.length ? rows : [{ n: '', line: 'No picks in your sports today', sub: '', tag: '', color: 'Default' }], rec: R.w || R.l ? `On the record: ${R.w}–${R.l}${R.pu ? '–' + R.pu : ''}, ${(R.u >= 0 ? '+' : '−') + Math.abs(+R.u || 0).toFixed(1)}u` : '' }; }
async function widgetPaint(w) { try { const t = await (await fetch(w.definition.msAcTemplate || 'widget/today.json')).text(); await self.widgets.updateByTag(w.definition.tag, { template: t, data: JSON.stringify(await widgetData()) }); } catch (e) { } }
async function widgetsAll() { if (!self.widgets || !self.widgets.matchAll) return; try { for (const w of await self.widgets.matchAll()) if (w.instances && w.instances.length) await widgetPaint(w); } catch (e) { } }
self.addEventListener('widgetinstall', e => e.waitUntil(widgetPaint(e.widget)));
self.addEventListener('widgetresume', e => e.waitUntil(widgetPaint(e.widget)));
self.addEventListener('widgetclick', e => { if (e.action === 'open') e.waitUntil(self.clients.openWindow('./#today')); });
self.addEventListener('periodicsync', e => { if (e.tag === 'widgets') e.waitUntil(widgetsAll()); });
