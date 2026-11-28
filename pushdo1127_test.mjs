/* v88 · the Push Durable Object end to end, on an in-memory store: the server key, subscribing (only real push services), the pulse from
   the autopilot (signed with the owner code's HMAC), the events it turns into, the encrypted request each member gets (decrypted here
   like a browser would), quiet hours, gone subscriptions, the eight-at-a-time batches, GET /pulse for widgets, and the owner's stats. */
import { PushBox } from './chat/worker.mjs';
import { pushKeyOf } from './chat/push-do.mjs';
import { b64u, unb64u } from './chat/push-lib.mjs';
const out = []; const T = (n, ok, d) => out.push(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + String(d).slice(0, 300) : ''}`);
const te = new TextEncoder(), td = new TextDecoder();
function mem() { const m = new Map(); let alarm = null; const sorted = () => [...m.keys()].sort();
  return { get: async k => m.get(k), put: async (k, v) => { m.set(k, JSON.parse(JSON.stringify(v))); }, delete: async k => m.delete(k),
    list: async ({ prefix = '', startAfter, limit } = {}) => { const ks = sorted().filter(k => k.startsWith(prefix) && (!startAfter || k > startAfter)).slice(0, limit || 1e9); return new Map(ks.map(k => [k, JSON.parse(JSON.stringify(m.get(k)))])); },
    setAlarm: async t => { alarm = t; }, getAlarm: async () => alarm, _m: m, _alarm: () => alarm, _clear: () => { alarm = null; } }; }
async function browser() { const k = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']), raw = new Uint8Array(await crypto.subtle.exportKey('raw', k.publicKey)), auth = crypto.getRandomValues(new Uint8Array(16)); return { k, raw, auth, keys: { p256dh: b64u(raw), auth: b64u(auth) } }; }
async function open(br, body) { const salt = body.slice(0, 16), idlen = body[20], asPub = body.slice(21, 21 + idlen), ct = body.slice(21 + idlen);
  const hk = async (s, ikm, info, n) => new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: s, info }, await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']), n * 8));
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: await crypto.subtle.importKey('raw', asPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []) }, br.k.privateKey, 256));
  const ikm = await hk(br.auth, shared, new Uint8Array([...te.encode('WebPush: info\0'), ...br.raw, ...asPub]), 32);
  const cek = await hk(salt, ikm, te.encode('Content-Encoding: aes128gcm\0'), 16), nonce = await hk(salt, ikm, te.encode('Content-Encoding: nonce\0'), 12);
  const pt = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt']), ct)); return JSON.parse(td.decode(pt.slice(0, -1))); }
try {
  const store = mem(), CODE = 'owner-code-for-tests-0123456789abcdef'; let NOW = Date.parse('2026-12-01T18:00:00Z'); const sent = []; let status = 201;
  const fetchFn = async (u, i) => { sent.push({ u, i }); return { status: typeof status === 'function' ? status(u) : status, ok: (typeof status === 'function' ? status(u) : status) < 300 }; };
  const P = new PushBox({ storage: store }, { ADMIN_CODE: CODE, ALLOW_ORIGINS: 'https://ironsilkweekly.com' }); P.now = () => NOW; P.fetchFn = fetchFn;
  const call = (path, o = {}) => P.fetch(new Request('https://w.test' + path, { method: o.body ? 'POST' : 'GET', headers: { 'content-type': 'application/json', origin: 'https://ironsilkweekly.com', ...(o.h || {}) }, body: o.body ? JSON.stringify(o.body) : undefined })).then(async r => ({ s: r.status, h: r.headers, j: await r.json() }));
  let r = await call('/push/key'); const key1 = r.j.key; r = await call('/push/key');
  T('the server key: made once, kept, 65 bytes (what the browser needs to subscribe)', key1 && unb64u(key1).length === 65 && r.j.key === key1 && store._m.has('vapid'));
  const A = await browser(), B = await browser();
  r = await call('/push/sub', { body: { sub: { endpoint: 'https://fcm.googleapis.com/fcm/send/AAA', keys: A.keys }, prefs: { quiet: [23, 8] }, tz: 'America/Chicago', desk: { sp: [] } } });
  T('a member subscribes (Chrome\'s push service)', r.s === 200 && r.j.ok && [...store._m.keys()].some(k => k.startsWith('s:')));
  r = await call('/push/sub', { body: { sub: { endpoint: 'https://evil.example/collect', keys: B.keys } } });
  T('…an endpoint that isn\'t a real push service is refused (the worker never posts to a stranger\'s server)', r.s === 400 && r.j.error === 'push service');
  r = await call('/push/sub', { body: { sub: { endpoint: 'https://web.push.apple.com/QXYZ', keys: B.keys }, prefs: { lock: true, open: true, graded: false, quiet: [0, 0] }, tz: 'America/New_York', desk: { sp: ['nba'] } } });
  T('…an iPhone (Apple\'s push service) with its own switches: NBA only, no results', r.s === 200);
  /* the pulse */
  const day = '2026-12-01', pu0 = { v: 1, day, locked: NOW - 3 * 36e5, beta: false, rec: { w: 60, l: 43, u: 2.4 }, picks: [{ i: 0, sp: 'nba', sealed: 1, start: '2026-12-02T01:00:00Z' }, { i: 1, sp: 'nhl', sealed: 1, start: '2026-12-02T00:30:00Z' }] };
  r = await call('/push/pulse', { body: { sig: 's0', pulse: pu0 } });
  T('a pulse without the key is refused', r.s === 403);
  const K = await pushKeyOf(CODE);
  r = await call('/push/pulse', { body: { sig: 'b0', pulse: { v: 1, day: '2026-11-30', picks: [] } }, h: { 'x-push-key': K } });
  T('the very first pulse only sets the baseline (no burst of old news)', r.s === 200 && r.j.events.length === 0 && store._alarm() == null);
  r = await call('/push/pulse', { body: { sig: 's0', pulse: pu0 }, h: { 'x-push-key': K } });
  T('the autopilot\'s pulse (HMAC of the owner code, never the code itself): kept, and the day\'s "set" event queued', r.s === 200 && r.j.events.join() === 'lock' && store._alarm() === NOW && K.length === 64 && !K.includes(CODE));
  await P.alarm();
  T('one wake-up sends to both members (a request each, to their own push service)', sent.length === 2 && sent.some(x => /fcm\.googleapis/.test(x.u)) && sent.some(x => /web\.push\.apple/.test(x.u)));
  const fA = sent.find(x => /fcm/.test(x.u)), mA = await open(A, fA.i.body);
  T('…encrypted for that browser alone (decrypts with its key): "Tuesday\'s Best 2 are set", the first opens 6:00 PM Central', mA.web_push === 8030 && mA.notification.title === 'Tuesday’s Best 2 are set' && /6:00 PM/.test(mA.notification.body) && fA.i.headers['content-encoding'] === 'aes128gcm' && /^vapid t=.+, k=/.test(fA.i.headers.authorization), JSON.stringify(mA.notification));
  const mB = await open(B, sent.find(x => /apple/.test(x.u)).i.body);
  T('…the iPhone gets it in Eastern time (7:00 PM)', /7:00 PM/.test(mB.notification.body), mB.notification.body);
  r = await call('/push/pulse', { body: { sig: 's0', pulse: pu0 }, h: { 'x-push-key': K } });
  T('the same pulse again: nothing new', r.j.same === true);
  /* a pick opens, then gets graded */
  sent.length = 0; NOW = Date.parse('2026-12-02T00:31:00Z');
  const pu1 = JSON.parse(JSON.stringify(pu0)); pu1.picks[0] = { i: 0, sp: 'nba', pick: 'Lakers −4.5', price: -110, game: 'LAL@SA', start: '2026-12-02T01:00:00Z' };
  r = await call('/push/pulse', { body: { sig: 's1', pulse: pu1 }, h: { 'x-push-key': K } }); await P.alarm();
  const m1 = await open(A, sent[0].i.body);
  T('No. 1 opens: both hear it (the iPhone member follows the NBA), urgent', r.j.events.join() === 'open' && sent.length === 2 && m1.notification.title === 'No. 1 is open: Lakers −4.5 −110' && sent[0].i.headers.urgency === 'high', JSON.stringify(m1.notification));
  sent.length = 0; const pu2 = JSON.parse(JSON.stringify(pu1)); pu2.picks[0].res = 'win'; pu2.picks[1] = { i: 1, sp: 'nhl', pick: 'Under 6.5', price: -120, game: 'NYR@CHI', start: '2026-12-02T00:30:00Z', res: 'loss' }; NOW += 3 * 36e5;
  r = await call('/push/pulse', { body: { sig: 's2', pulse: pu2 }, h: { 'x-push-key': K } }); await P.alarm();
  const m2 = await open(A, sent.find(x => /fcm/.test(x.u)).i.body);
  T('both graded at once and the day is final: one notification, the final on top and both results under it (a pick graded before anyone heard it opened never says "is open")', sent.filter(x => /fcm/.test(x.u)).length === 1 && m2.notification.title === 'The card finished 1–1, −0.09u' && /✅ Lakers −4\.5 · ❌ Under 6\.5/.test(m2.notification.body) && !/is open/.test(m2.notification.body), JSON.stringify(m2.notification));
  const mB2 = await open(B, sent.find(x => /apple/.test(x.u)).i.body);
  T('…the iPhone member, who switched results off, gets the day\'s final alone (no ✅/❌ lines)', mB2.notification.title === 'The card finished 1–1, −0.09u' && !/✅|❌/.test(mB2.notification.body), JSON.stringify(mB2.notification));
  /* quiet hours */
  sent.length = 0; NOW = Date.parse('2026-12-02T09:00:00Z');
  r = await call('/push/pulse', { body: { sig: 's3', pulse: { ...pu2, day: '2026-12-02', locked: NOW, picks: [{ i: 0, sp: 'nba', sealed: 1, start: '2026-12-03T01:00:00Z' }] } }, h: { 'x-push-key': K } }); await P.alarm();
  T('3 AM Central: the Chrome member (quiet 11 PM to 8 AM) hears nothing; the iPhone member (no quiet hours, 4 AM Eastern) does', !sent.some(x => /fcm/.test(x.u)) && sent.some(x => /apple/.test(x.u)));
  /* a gone subscription */
  sent.length = 0; status = u => /apple/.test(u) ? 410 : 201; NOW = Date.parse('2026-12-02T16:00:00Z');
  const before = [...store._m.keys()].filter(k => k.startsWith('s:')).length;
  r = await call('/push/pulse', { body: { sig: 's4', pulse: { day: '2026-12-02', beta: false, picks: [{ i: 0, sp: 'nba', pick: 'Over 220.5', price: -110, game: 'A@B', start: '2026-12-03T01:00:00Z' }], heirs: [] } }, h: { 'x-push-key': K } });
  await P.alarm(); const after = [...store._m.keys()].filter(k => k.startsWith('s:')).length;
  T('a push service that says 410 (the member uninstalled): that subscription is dropped', before === 2 && after === 1, before + ' → ' + after); status = 201;
  /* batches */
  for (let i = 0; i < 19; i++) { const br = await browser(); await call('/push/sub', { body: { sub: { endpoint: 'https://updates.push.services.mozilla.com/wpush/v2/x' + i, keys: br.keys }, prefs: { quiet: [0, 0] }, tz: 'UTC' } }); }
  sent.length = 0; NOW += 36e5; store._clear();
  await call('/push/pulse', { body: { sig: 's5', pulse: { day: '2026-12-02', beta: false, picks: [{ i: 0, sp: 'nba', pick: 'Over 220.5', price: -110, game: 'A@B', start: '2026-12-03T01:00:00Z', res: 'win' }] } }, h: { 'x-push-key': K } });
  let wakes = 0; while (store._alarm() != null && wakes < 10) { store._clear(); await P.alarm(); wakes++; }
  T('20 members: eight per wake-up (the free plan\'s limits), three wake-ups, everyone once', sent.length === 20 && wakes === 3 && new Set(sent.map(x => x.u)).size === 20, sent.length + ' sent, ' + wakes + ' wakes');
  /* GET /pulse and the stats */
  r = await call('/pulse');
  T('GET /pulse: the latest pulse for widgets, open to any page (it only holds what the public card holds), cached a minute', r.s === 200 && r.j.day === '2026-12-02' && r.h.get('access-control-allow-origin') === '*' && /max-age=60/.test(r.h.get('cache-control')));
  r = await call('/push/stats?k=' + K); const r2 = await call('/push/stats?k=nope');
  T('the owner\'s stats (members, sent today, the last pulse); refused without the key', r.s === 200 && r.j.subs === 20 && r.j.today.sent >= 20 && r.j.pulse.day === '2026-12-02' && r2.s === 403, JSON.stringify(r.j));
  /* the test button */
  sent.length = 0; r = await call('/push/test', { body: { endpoint: 'https://fcm.googleapis.com/fcm/send/AAA' } }); const r3 = await call('/push/test', { body: { endpoint: 'https://fcm.googleapis.com/fcm/send/AAA' } });
  T('Send me a test: one goes out, a second within the minute is held', r.s === 200 && sent.length === 1 && r3.s === 429 && (await open(A, sent[0].i.body)).notification.title === 'TheDesk alerts are on ✓');
  T('unsubscribe removes it', (await call('/push/unsub', { body: { endpoint: 'https://fcm.googleapis.com/fcm/send/AAA' } })).j.ok && ![...store._m.values()].some(v => v && v.endpoint === 'https://fcm.googleapis.com/fcm/send/AAA'));
} catch (e) { T('harness', false, e.stack); }
console.log(out.join('\n')); console.log(`\n${out.filter(x => x.startsWith('PASS')).length} pass / ${out.filter(x => x.startsWith('FAIL')).length} fail`); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
