/* v88 · device alerts: the Web Push crypto against RFC 8291's own worked example, a full encrypt → decrypt round trip, the VAPID
   token, and what a pulse change turns into (who hears it, in their own time zone, never in their quiet hours). */
import { encrypt, vapidKeys, vapidAuth, pushRequest, declarative, events, words, wants, quiet, bundle, b64u, unb64u } from './chat/push-lib.mjs';
const out = []; const T = (n, ok, d) => out.push(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + String(d).slice(0, 300) : ''}`);
const te = new TextEncoder(), td = new TextDecoder();
try {
  /* RFC 8291 Appendix A */
  const V = { plain: 'When I grow up, I want to be a watermelon', asPriv: 'yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw', asPub: 'BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8',
    uaPriv: 'q1dXpw3UpT5VOmu_cf_v6ih07Aems3njxI-JWgLcM94', uaPub: 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4', auth: 'BTBZMqHH6r4Tts7J_aSIgg', salt: 'DGv6ra1nlYgDCS1FRnbzlw',
    msg: 'DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN' };
  const got = b64u(await encrypt(V.plain, V.uaPub, V.auth, { priv: V.asPriv, pub: V.asPub, salt: V.salt }));
  T('RFC 8291 Appendix A: the same bytes, to the byte', got === V.msg, got.slice(0, 80));
  /* round trip: decrypt as the browser would */
  const ua = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']), uaRaw = new Uint8Array(await crypto.subtle.exportKey('raw', ua.publicKey)), auth = crypto.getRandomValues(new Uint8Array(16));
  const msg = JSON.stringify(declarative({ title: 'No. 1 is open: Rangers ML −172', body: 'Rangers at Blackhawks · 7:00 PM', url: 'https://ironsilkweekly.com/desk/#today', tag: 'td-pick-0' }, 'open'));
  const body = await encrypt(msg, b64u(uaRaw), b64u(auth));
  const salt = body.slice(0, 16), rs = new DataView(body.buffer, body.byteOffset).getUint32(16), idlen = body[20], asPub = body.slice(21, 21 + idlen), ct = body.slice(21 + idlen);
  const hk = async (s, ikm, info, n) => new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: s, info }, await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']), n * 8));
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: await crypto.subtle.importKey('raw', asPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []) }, ua.privateKey, 256));
  const ikm = await hk(auth, shared, new Uint8Array([...te.encode('WebPush: info\0'), ...uaRaw, ...asPub]), 32);
  const cek = await hk(salt, ikm, te.encode('Content-Encoding: aes128gcm\0'), 16), nonce = await hk(salt, ikm, te.encode('Content-Encoding: nonce\0'), 12);
  const pt = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt']), ct));
  T('a real subscription: encrypt, then decrypt like the browser does (rs 4096, the sender key in the header, the last-record delimiter)', rs === 4096 && idlen === 65 && pt[pt.length - 1] === 2 && td.decode(pt.slice(0, -1)) === msg);
  const J = JSON.parse(td.decode(pt.slice(0, -1)));
  T('the message is declarative (Safari shows it by itself), and carries where a tap goes', J.web_push === 8030 && J.notification.title.startsWith('No. 1 is open') && J.notification.navigate === 'https://ironsilkweekly.com/desk/#today' && J.kind === 'open');
  /* VAPID */
  const K = await vapidKeys(); const a = await vapidAuth('https://web.push.apple.com/QGuQyavXutnMH...', K, null, Date.parse('2026-11-28T00:00:00Z'));
  const [t, k] = a.replace(/^vapid /, '').split(', '), jwt = t.slice(2).split('.'), claims = JSON.parse(td.decode(unb64u(jwt[1])));
  const ok = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, await crypto.subtle.importKey('raw', unb64u(K.pub), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']), unb64u(jwt[2]), te.encode(jwt[0] + '.' + jwt[1]));
  T('VAPID: an ES256 token for the push service (aud is its origin, 12 hours, a site URL as contact, never an email), signed and verifiable', ok && claims.aud === 'https://web.push.apple.com' && claims.exp - Date.parse('2026-11-28T00:00:00Z') / 1000 === 43200 && claims.sub === 'https://ironsilkweekly.com/desk/' && k === 'k=' + K.pub && unb64u(K.pub).length === 65);
  const R = await pushRequest({ endpoint: 'https://fcm.googleapis.com/fcm/send/abc', keys: { p256dh: b64u(uaRaw), auth: b64u(auth) } }, J, K, { urgency: 'high', topic: 'td-pick-0/day:x' });
  T('the request: aes128gcm, a TTL, urgency, a topic a push service accepts', R.init.headers['content-encoding'] === 'aes128gcm' && R.init.headers.ttl === '21600' && R.init.headers.urgency === 'high' && R.init.headers.topic === 'td-pick-0dayx' && R.init.method === 'POST');
  /* events */
  const day = '2026-12-01', st = h => `2026-12-02T0${h}:00:00Z`;
  const p0 = { day, locked: Date.parse('2026-12-01T15:05:00Z'), beta: false, rec: { w: 60, l: 43, u: 2.4 }, picks: [{ sp: 'nhl', sealed: 1, start: st(1) }, { sp: 'nba', sealed: 1, start: st(2) }, { sp: 'ncaab', sealed: 1, start: st(3) }], ls: [] };
  let E = events({ day: '2026-11-30', picks: [] }, p0, Date.parse('2026-12-01T15:06:00Z'));
  T('a new day locks: one "set" event, with the first game\'s time, nothing about what the picks are', E.length === 1 && E[0].kind === 'lock' && E[0].n === 3 && !JSON.stringify(E).includes('pick"'));
  const w0 = words(E[0], 'America/New_York');
  T('…in the member\'s own time zone: the first pick opens 30 minutes before its game (7:30 PM Eastern for an 8 PM start)', w0.title === 'Tuesday’s Best 3 are set' && /7:30 PM/.test(w0.body), JSON.stringify(w0));
  const p1 = JSON.parse(JSON.stringify(p0)); p1.picks[0] = { sp: 'nhl', pick: 'Rangers ML', price: -172, game: 'NYR@CHI', start: st(1) };
  E = events(p0, p1, Date.parse('2026-12-02T00:31:00Z'));
  const w1 = words(E[0], 'America/Chicago');
  T('a sealed pick opens: "No. 1 is open", the pick, the price, the game and its time', E.length === 1 && E[0].kind === 'open' && w1.title === 'No. 1 is open: Rangers ML −172' && w1.body === 'NYR at CHI · 7:00 PM · NHL', JSON.stringify(w1));
  T('…the same pulse again says nothing', events(p1, p1).length === 0);
  const p2 = JSON.parse(JSON.stringify(p1)); p2.picks[0].res = 'win';
  E = events(p1, p2); const w2 = words(E[0]);
  T('graded: ✅ and the units won at the price (a win at −172 is +0.58u)', E.length === 1 && w2.title === '✅ No. 1 · Rangers ML' && w2.body === 'Won, +0.58u.', JSON.stringify(w2));
  const p3 = JSON.parse(JSON.stringify(p2)); p3.picks = p3.picks.map((x, i) => i === 0 ? x : { ...x, sealed: 0, pick: i === 1 ? 'Lakers −4.5' : 'Under 140.5', price: -110, game: 'A@B', res: i === 1 ? 'loss' : 'push' }); p3.rec = { w: 61, l: 44, u: 1.98 };
  E = events(p2, p3);
  T('the last two land together: two results and the day\'s final (honest about the loss)', E.filter(e => e.kind === 'graded').length === 2 && E.some(e => e.kind === 'final' && e.w === 1 && e.l === 1 && e.pu === 1));
  const fin = words(E.find(e => e.kind === 'final')), lossW = words(E.find(e => e.res === 'loss'));
  T('…"The card finished 1–1–1", with the record under it; a loss says it stays on the record', fin.title === 'The card finished 1–1–1, −0.42u' && /On the record: 61–44, \+1\.98u/.test(fin.body) && /stays on the record/.test(lossW.body), JSON.stringify([fin, lossW]));
  const b = bundle(E.filter(e => e.kind === 'graded'));
  T('…and one member gets one buzz for both: "Results are in: ❌➖"', b.title === 'Results are in: ❌➖' && /Lakers −4\.5/.test(b.body), JSON.stringify(b));
  /* the beta: picks aren't sealed, so "open" goes 30 minutes before the game instead */
  const bp = { day, beta: true, locked: 1, picks: [{ sp: 'nba', pick: 'Over 221.5', price: -110, game: 'X@Y', start: '2026-12-02T01:00:00Z' }] };
  T('in the beta (nothing sealed) a pick still gets its heads-up 30 minutes out, once', events({ ...bp }, bp, Date.parse('2026-12-02T00:29:00Z')).some(e => e.kind === 'open') && !events({ ...bp }, bp, Date.parse('2026-12-01T23:00:00Z')).some(e => e.kind === 'open'));
  /* LongShots and heirs */
  E = events({ day, picks: [], ls: [{ id: 't1', res: 'live' }] }, { day, picks: [], ls: [{ id: 't1', res: 'cashed', name: 'LongShot', n: 10, odds: '+15,438' }], heirs: ['The Closer'] });
  T('a LongShot that cashes, and an heir born today', E.some(e => e.kind === 'longshot' && words(e).title === '🎯 A LongShot cashed: +15,438') && E.some(e => e.kind === 'heir' && /The Closer/.test(words(e).title)));
  /* who hears it */
  const sub = { tz: 'America/Chicago', prefs: { quiet: [23, 8] }, desk: { sp: ['nba'] } };
  T('quiet hours wrap midnight, in the member\'s zone (11 PM to 8 AM Central)', quiet([23, 8], Date.parse('2026-12-02T06:30:00Z'), 'America/Chicago') && !quiet([23, 8], Date.parse('2026-12-02T15:00:00Z'), 'America/Chicago'));
  T('My Desk filters alerts: an NBA-only member hears the NBA pick, not the NHL one; nobody hears anything at 3 AM', wants(sub, { kind: 'open', sp: 'nba' }, Date.parse('2026-12-01T20:00:00Z')) && !wants(sub, { kind: 'open', sp: 'nhl' }, Date.parse('2026-12-01T20:00:00Z')) && !wants(sub, { kind: 'open', sp: 'nba' }, Date.parse('2026-12-02T09:00:00Z')));
  T('…heirs are off unless switched on; switches off mean off', !wants({ prefs: {} }, { kind: 'heir' }, Date.parse('2026-12-01T20:00:00Z')) && !wants({ prefs: { graded: false } }, { kind: 'graded', sp: 'nba' }, Date.parse('2026-12-01T20:00:00Z')));
  T('My Desk characters: a member following only the Scout hears the Scout\'s picks, not a pick the Scout isn\'t on', wants({ desk: { ch: ['Scout'] }, prefs: { quiet: [0, 0] } }, { kind: 'graded', sp: 'nba', who: ['Scout', 'Sim'] }) && !wants({ desk: { ch: ['Scout'] }, prefs: { quiet: [0, 0] } }, { kind: 'graded', sp: 'nba', who: ['Judge'] }) && wants({ desk: { ch: ['Scout'] }, prefs: { quiet: [0, 0] } }, { kind: 'lock', n: 3 }));
  T('the words never say "lock", "guaranteed" or "risk-free"', ![w0, w1, w2, fin, lossW, b].some(w => /\block\b|guarantee|risk-free/i.test(w.title + ' ' + w.body)));
} catch (e) { T('harness', false, e.stack); }
console.log(out.join('\n')); console.log(`\n${out.filter(x => x.startsWith('PASS')).length} pass / ${out.filter(x => x.startsWith('FAIL')).length} fail`); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
