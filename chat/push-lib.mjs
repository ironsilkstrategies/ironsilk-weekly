/* TheDesk · Web Push, by hand (v88). No library: WebCrypto in the Worker does all of it.
   RFC 8291 (message encryption, aes128gcm), RFC 8292 (VAPID), RFC 8188 (the content coding), and the declarative format Safari reads
   on its own (iOS 18.4+: the notification shows even when iOS has put the app's service worker away). Every other browser gets the same
   JSON and the app's service worker shows it. Also: what a pulse change means (the events), and who hears about it (the filters). */
const te = new TextEncoder();
export const b64u = buf => { const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf); let s = ''; for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
export const unb64u = s => { s = String(s || '').replace(/-/g, '+').replace(/_/g, '/'); s += '='.repeat((4 - s.length % 4) % 4); const b = atob(s), o = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) o[i] = b.charCodeAt(i); return o; };
const cat = (...a) => { const n = a.reduce((s, x) => s + x.length, 0), o = new Uint8Array(n); let i = 0; for (const x of a) { o.set(x, i); i += x.length; } return o; };
const hkdf = async (salt, ikm, info, bytes) => new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']), bytes * 8));
/* a P-256 point as JWK x/y (the raw form is 0x04 || x || y) */
const xy = raw => ({ x: b64u(raw.slice(1, 33)), y: b64u(raw.slice(33, 65)) });

/* RFC 8291: encrypt one payload for one subscription. `fixed` is for the RFC's own test vector (a known sender key and salt). */
export async function encrypt(payload, p256dh, auth, fixed) {
  const ua = unb64u(p256dh), secret = unb64u(auth); if (ua.length !== 65 || ua[0] !== 4 || secret.length < 16) throw new Error('bad subscription keys');
  let asPriv, asPub;
  if (fixed) { asPub = unb64u(fixed.pub); asPriv = await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', d: fixed.priv, ...xy(asPub), ext: true }, { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']); }
  else { const k = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']); asPriv = k.privateKey; asPub = new Uint8Array(await crypto.subtle.exportKey('raw', k.publicKey)); }
  const uaKey = await crypto.subtle.importKey('raw', ua, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, asPriv, 256));
  const ikm = await hkdf(secret, shared, cat(te.encode('WebPush: info\0'), ua, asPub), 32);
  const salt = fixed ? unb64u(fixed.salt) : crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, te.encode('Content-Encoding: aes128gcm\0'), 16), nonce = await hkdf(salt, ikm, te.encode('Content-Encoding: nonce\0'), 12);
  const body = cat(typeof payload === 'string' ? te.encode(payload) : payload, new Uint8Array([2]));   /* one record: the payload, then the last-record delimiter */
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']), body));
  const rs = 4096, head = new Uint8Array(21); head.set(salt, 0); new DataView(head.buffer).setUint32(16, rs); head[20] = 65;
  return cat(head, asPub, ct);
}
/* RFC 8292: the server's own key pair (made once, kept in the Durable Object), and a signed JWT per push service */
export async function vapidKeys() { const k = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  return { priv: await crypto.subtle.exportKey('jwk', k.privateKey), pub: b64u(await crypto.subtle.exportKey('raw', k.publicKey)) }; }
export async function vapidAuth(endpoint, keys, sub, now = Date.now()) {
  const aud = new URL(endpoint).origin, enc = o => b64u(te.encode(JSON.stringify(o)));
  const unsigned = `${enc({ typ: 'JWT', alg: 'ES256' })}.${enc({ aud, exp: Math.floor(now / 1000) + 12 * 3600, sub: sub || 'https://ironsilkweekly.com/desk/' })}`;
  const key = await crypto.subtle.importKey('jwk', keys.priv, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, te.encode(unsigned));   /* WebCrypto gives r||s, which is what ES256 wants */
  return `vapid t=${unsigned}.${b64u(sig)}, k=${keys.pub}`; }
/* one push: the request a push service expects. The caller sends it and reads the status (201 sent; 404/410 gone; 429 slow down). */
export async function pushRequest(sub, msg, keys, o = {}) {
  const body = await encrypt(JSON.stringify(msg), sub.keys.p256dh, sub.keys.auth);
  const h = { 'content-encoding': 'aes128gcm', 'content-type': 'application/octet-stream', ttl: String(o.ttl || 6 * 3600), urgency: o.urgency || 'normal', authorization: await vapidAuth(sub.endpoint, keys, o.sub, o.now) };
  if (o.topic) h.topic = String(o.topic).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 32);
  return { url: sub.endpoint, init: { method: 'POST', headers: h, body } };
}
/* the declarative message (RFC 8030's magic number opts it in); the app's service worker reads the same fields everywhere else */
export const declarative = (n, kind) => ({ web_push: 8030, notification: { title: String(n.title).slice(0, 120), body: String(n.body || '').slice(0, 300), navigate: n.url || 'https://ironsilkweekly.com/desk/#today', lang: 'en-US', dir: 'ltr', silent: false, tag: n.tag || undefined, ...(n.badge != null ? { app_badge: String(n.badge) } : {}) }, kind });

/* ── what changed: an old pulse against a new one → events. Sealed picks never say what they are; a sealed pick that opens does. ── */
const LG = { nfl: 'NFL', ncaaf: 'College football', nba: 'NBA', ncaab: 'College hoops', nhl: 'NHL', mlb: 'MLB' };
const no = i => `No. ${i + 1}`;
const units = p => { p = +p; return !isFinite(p) || !p ? 0.91 : p > 0 ? p / 100 : 100 / -p; };
const odds = p => { p = +p; return !isFinite(p) || !p ? '' : p > 0 ? '+' + p : '−' + Math.abs(p); };
export function events(prev, cur, now = Date.now()) {
  const E = []; if (!cur || !cur.day || !prev) return E;   /* the very first pulse only sets the baseline: never a burst of old news */
  const same = prev.day === cur.day, P = (same && prev.picks) || [], C = cur.picks || [];
  const id = (k, x) => `${cur.day}|${k}|${x}`;
  const first = Math.min(...C.map(x => Date.parse(x.start) || Infinity));
  if (cur.locked && C.length && !(same && prev.locked) && first > now) E.push({ id: id('lock', ''), kind: 'lock', day: cur.day, n: C.length, first, sps: [...new Set(C.map(x => x.sp))] });   /* "set" only before the first game */
  C.forEach((x, i) => { const w = P[i];
    if (!x.sealed && x.pick && !x.res && Date.parse(x.start) > now - 10 * 60e3 && ((w && w.sealed) || (cur.beta && !x.res && Date.parse(x.start) - now <= 32 * 60e3 && Date.parse(x.start) > now - 5 * 60e3)))
      E.push({ id: id('open', i), kind: 'open', i, sp: x.sp, pick: x.pick, price: x.price, game: x.game, start: x.start, who: x.who || [] });
    if (x.res && !(w && w.res)) E.push({ id: id('graded', i), kind: 'graded', i, sp: x.sp, pick: x.pick, price: x.price, res: x.res, who: x.who || [] }); });
  if (C.length && C.every(x => x.res) && !(P.length === C.length && P.every(x => x.res))) { const w = C.filter(x => x.res === 'win').length, l = C.filter(x => x.res === 'loss').length, pu = C.filter(x => x.res === 'push').length;
    E.push({ id: id('final', ''), kind: 'final', w, l, pu, u: +C.reduce((s, x) => s + (x.res === 'win' ? units(x.price) : x.res === 'loss' ? -1 : 0), 0).toFixed(2), rec: cur.rec || null }); }
  const PL = new Map(((same && prev.ls) || []).map(t => [t.id, t]));
  for (const t of cur.ls || []) if (t.res === 'cashed' && !(PL.get(t.id) && PL.get(t.id).res === 'cashed')) E.push({ id: id('ls', t.id), kind: 'longshot', name: t.name, n: t.n, odds: t.odds });
  for (const h of cur.heirs || []) if (!((same && prev.heirs) || []).includes(h)) E.push({ id: id('heir', h), kind: 'heir', name: h });
  return E; }
/* the words, in the member's own time zone (Miles: plain, no hype; Ashley: no "lock", no "guaranteed") */
const clockIn = (t, tz) => { try { return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: tz || 'America/Chicago' }).format(new Date(t)); } catch (e) { return ''; } };
const dayName = (d, tz) => { try { return new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'UTC' }).format(new Date(d + 'T12:00:00Z')); } catch (e) { return 'Today'; } };
const matchup = g => String(g || '').replace('@', ' at ');
export function words(e, tz) {
  const u = n => (n >= 0 ? '+' : '−') + Math.abs(n).toFixed(2) + 'u';
  if (e.kind === 'lock') return { title: `${dayName(e.day)}’s Best ${e.n} are set`, body: isFinite(e.first) ? `The first one opens at ${clockIn(e.first - 30 * 60e3, tz)}, 30 minutes before its game.` : 'Each pick opens 30 minutes before its game.', url: 'https://ironsilkweekly.com/desk/#today', tag: 'td-lock' };
  if (e.kind === 'open') return { title: `${no(e.i)} is open: ${e.pick}${odds(e.price) ? ' ' + odds(e.price) : ''}`, body: `${matchup(e.game)}${e.start ? ' · ' + clockIn(e.start, tz) : ''} · ${LG[e.sp] || ''}`.replace(/ · $/, ''), url: 'https://ironsilkweekly.com/desk/#today', tag: 'td-pick-' + e.i };
  if (e.kind === 'graded') return { title: `${e.res === 'win' ? '✅' : e.res === 'loss' ? '❌' : '➖'} ${no(e.i)} · ${e.pick}`, body: e.res === 'win' ? `Won, ${u(units(e.price))}.` : e.res === 'loss' ? 'Lost, −1.00u. It stays on the record.' : 'Pushed: stake back.', url: 'https://ironsilkweekly.com/desk/#today', tag: 'td-pick-' + e.i };
  if (e.kind === 'final') return { title: `The card finished ${e.w}–${e.l}${e.pu ? '–' + e.pu : ''}, ${u(e.u)}`, body: e.rec ? `On the record: ${e.rec.w}–${e.rec.l}${e.rec.pu ? '–' + e.rec.pu : ''}, ${u(+e.rec.u || 0)}.` : 'Every result is on the record.', url: 'https://ironsilkweekly.com/desk/#receipts', tag: 'td-final' };
  if (e.kind === 'longshot') return { title: `🎯 A LongShot cashed${e.odds ? ': ' + e.odds : ''}`, body: `${e.name || 'The founder’s ticket'}${e.n ? `, all ${e.n} legs` : ''}.`, url: 'https://ironsilkweekly.com/desk/#longshots', tag: 'td-ls' };
  if (e.kind === 'heir') return { title: `A new character: ${e.name}`, body: 'Born in the Womb today. Meet it on the Characters page.', url: 'https://ironsilkweekly.com/desk/#cast', tag: 'td-heir' };
  return { title: 'TheDesk', body: '', url: 'https://ironsilkweekly.com/desk/' }; }
/* who hears it: their switches, their sports, their quiet hours (in their time zone), and a daily cap */
export const PREF0 = { lock: true, open: true, graded: true, final: true, longshot: true, heir: false, quiet: [23, 8] };
const hourIn = (t, tz) => { try { return +new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone: tz || 'America/Chicago' }).format(new Date(t)); } catch (e) { return new Date(t).getUTCHours(); } };
export function quiet(q, t, tz) { if (!Array.isArray(q) || q.length !== 2 || q[0] === q[1]) return false; const h = hourIn(t, tz), [a, b] = q.map(Number); return a < b ? h >= a && h < b : h >= a || h < b; }
export function wants(sub, e, now = Date.now()) { const P = { ...PREF0, ...(sub.prefs || {}) };
  if (!P[e.kind]) return false; if (quiet(P.quiet, now, sub.tz)) return false;
  const sp = (sub.desk && Array.isArray(sub.desk.sp) && sub.desk.sp) || []; if (sp.length && e.sp && !sp.includes(e.sp)) return false;
  if (sp.length && e.kind === 'lock' && Array.isArray(e.sps) && !e.sps.some(x => sp.includes(x))) return false;
  const ch = (sub.desk && Array.isArray(sub.desk.ch) && sub.desk.ch) || []; if (ch.length && Array.isArray(e.who) && e.who.length && !e.who.some(v => ch.includes(v))) return false; return true; }
/* several at once for one member become one notification (three results land together, one buzz) */
export function bundle(list, tz) { if (!list.length) return null; const W = list.map(e => words(e, tz)); if (W.length === 1) return W[0];
  const fin = list.find(e => e.kind === 'final'); if (fin) { const F = words(fin, tz), G = list.filter(e => e.kind === 'graded'); return { title: F.title, body: (G.length ? G.map(e => (e.res === 'win' ? '✅ ' : e.res === 'loss' ? '❌ ' : '➖ ') + e.pick).join(' · ') + '. ' : '') + F.body, url: F.url, tag: F.tag }; }
  const t = list.every(e => e.kind === 'graded') ? `Results are in: ${list.map(e => e.res === 'win' ? '✅' : e.res === 'loss' ? '❌' : '➖').join('')}` : `${W[0].title} (+${W.length - 1} more)`;
  return { title: t, body: W.map(w => w.title.replace(/^[✅❌➖]\s*/, '')).slice(0, 4).join(' · '), url: W[0].url, tag: 'td-bundle' }; }
