/* v88 · the service worker's alert handling, run in a stand-in worker scope (a headless browser can't be granted notification
   permission, so this drives the real sw.js handlers directly): a declarative push is shown with its title, body, tag and where a tap
   goes; the app badge follows; an open page hears the moment; a tap focuses the open app and hands it the room (or opens one); a
   rotated subscription re-subscribes with the member's saved switches; the Windows widget handlers are wired. */
const fs = require('fs'); const src = fs.readFileSync(__dirname + '/desk/sw.js', 'utf8');
let pass = 0, fail = 0; const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  — ' + String(x || '').slice(0, 400))); };
(async () => { try {
  const H = {}, shown = [], msgs = [], posts = []; let badge = null, focused = 0;
  const client = { url: 'https://ironsilkweekly.com/desk/#slate', postMessage: m => msgs.push(m), focus: async () => { focused++; } };
  const cacheStore = { 'alerts.json': { prefs: { open: true, graded: false, quiet: [22, 7] }, tz: 'America/New_York', desk: { sp: ['nba'], ch: [] }, api: 'https://w.test' } };
  const self = { addEventListener: (t, f) => { H[t] = f; }, skipWaiting: () => { }, registration: { scope: 'https://ironsilkweekly.com/desk/', showNotification: async (t, o) => { shown.push({ t, o }); }, pushManager: { subscribe: async () => ({ toJSON: () => ({ endpoint: 'https://fcm.googleapis.com/new', keys: { p256dh: 'x', auth: 'y' } }) }) } },
    clients: { matchAll: async () => [client], claim: async () => { }, openWindow: async u => { msgs.push({ open: u }); } }, navigator: { setAppBadge: async n => { badge = n; }, clearAppBadge: async () => { badge = 0; } } };
  const caches = { open: async () => ({ match: async k => cacheStore[k] ? { json: async () => cacheStore[k] } : null, put: async () => { }, addAll: async () => { } }), keys: async () => [], match: async () => null };
  const fetchFn = async (u, i) => { posts.push({ u, b: i && i.body ? JSON.parse(i.body) : null }); return { ok: true, json: async () => ({ key: 'BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8' }), text: async () => '' }; };
  new Function('self', 'caches', 'fetch', src)(self, caches, fetchFn);
  T('the worker listens for push, a tap, a rotated subscription, and the Windows widget\'s install, resume and click', ['push', 'notificationclick', 'pushsubscriptionchange', 'widgetinstall', 'widgetresume', 'widgetclick'].every(k => typeof H[k] === 'function'));
  let w; H.push({ data: { json: () => ({ web_push: 8030, notification: { title: 'No. 1 is open: Rangers ML −172', body: 'NYR at CHI · 7:00 PM · NHL', navigate: 'https://ironsilkweekly.com/desk/#today', tag: 'td-pick-0', app_badge: '1', lang: 'en-US', dir: 'ltr' }, kind: 'open' }) }, waitUntil: p => { w = p; } }); await w;
  T('a declarative push is shown: its title, body, tag (a newer one replaces it) and where a tap goes', shown.length === 1 && shown[0].t === 'No. 1 is open: Rangers ML −172' && shown[0].o.body === 'NYR at CHI · 7:00 PM · NHL' && shown[0].o.tag === 'td-pick-0' && shown[0].o.renotify === true && shown[0].o.data.url === 'https://ironsilkweekly.com/desk/#today', JSON.stringify(shown[0]));
  T('…the app icon\'s badge follows the message (1 live)', badge === 1);
  T('…and an open page hears the moment (its sound plays there)', msgs.some(m => m.type === 'push' && m.kind === 'open'));
  shown.length = 0; H.push({ data: { json: () => { throw new Error('not json'); }, text: () => 'plain words' }, waitUntil: p => { w = p; } }); await w;
  T('a push that isn\'t JSON still shows something honest (TheDesk + its words)', shown.length === 1 && shown[0].t === 'TheDesk' && shown[0].o.body === 'plain words');
  msgs.length = 0; let closed = 0; H.notificationclick({ notification: { close: () => { closed++; }, data: { url: 'https://ironsilkweekly.com/desk/#receipts' } }, waitUntil: p => { w = p; } }); await w;
  T('a tap closes it, focuses the open app and hands it the room (Receipts)', closed === 1 && focused === 1 && msgs.some(m => m.type === 'go' && m.url === 'https://ironsilkweekly.com/desk/#receipts'));
  client.url = 'https://elsewhere.test/'; msgs.length = 0; H.notificationclick({ notification: { close: () => { }, data: { url: './#today' } }, waitUntil: p => { w = p; } }); await w;
  T('…with no app open, it opens one on that room', msgs.some(m => m.open === 'https://ironsilkweekly.com/desk/#today'));
  posts.length = 0; H.pushsubscriptionchange({ oldSubscription: { endpoint: 'https://fcm.googleapis.com/old' }, waitUntil: p => { w = p; } }); await w;
  const sub = posts.find(x => /\/push\/sub$/.test(x.u)), un = posts.find(x => /\/push\/unsub$/.test(x.u));
  T('the push service rotated the address: the worker subscribes again with the member\'s own switches, zone and sports, and drops the old one', sub && sub.b.sub.endpoint === 'https://fcm.googleapis.com/new' && sub.b.tz === 'America/New_York' && sub.b.desk.sp[0] === 'nba' && sub.b.prefs.graded === false && un && un.b.endpoint === 'https://fcm.googleapis.com/old', JSON.stringify(posts.map(x => x.u)));
  T('the shell caches the new pieces (Rooms, the effects layer, the widget page) under a new version', /thedesk-shell-v91/.test(src) && ['rooms.js?v=1', 'fx.js?v=1', 'widget.html', 'widget.js?v=1', 'app.js?v=88', 'app.css?v=65'].every(f => src.includes(`'${f}'`)));
} catch (e) { T('harness', false, e.stack); }
console.log(`\n${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0); })();
