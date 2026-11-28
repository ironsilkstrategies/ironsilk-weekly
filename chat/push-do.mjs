/* TheDesk · device alerts (v88): the Push Durable Object. Members subscribe from the app (the bell); the autopilot (GitHub Actions,
   which already watches every unlock and result) posts the public card's pulse here whenever it changes; this object keeps the latest
   pulse for widgets (GET /pulse), turns what changed into events, and sends each member only what they asked for, in their own time
   zone, never in their quiet hours, at most ten a day, eight at a time per wake-up (it fits the free plan's limits).
   Routes: GET /pulse · GET /push/key · POST /push/sub {sub, prefs, tz, desk} · POST /push/unsub {endpoint} · POST /push/test {endpoint}
           POST /push/pulse {sig, pulse} (x-push-key: HMAC of the owner code) · GET /push/stats?k= (the same key). */
import { pushRequest, vapidKeys, declarative, events, wants, bundle, PREF0 } from './push-lib.mjs';
const BATCH = 8, CAP = 10, TEST_GAP = 60e3;
const HOSTS = ['fcm.googleapis.com', 'android.googleapis.com', 'updates.push.services.mozilla.com', 'push.services.mozilla.com', 'web.push.apple.com', 'notify.windows.com'];
const te = new TextEncoder();
const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
export const pushKeyOf = async code => hex(await crypto.subtle.sign('HMAC', await crypto.subtle.importKey('raw', te.encode(String(code)), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), te.encode('thedesk-push-v1')));
const epId = async ep => hex(await crypto.subtle.digest('SHA-256', te.encode('ep:' + ep))).slice(0, 40);
const same = async (a, b) => { const h = async s => new Uint8Array(await crypto.subtle.digest('SHA-256', te.encode(String(s)))); const [x, y] = await Promise.all([h(a), h(b)]); let d = 0; for (let i = 0; i < x.length; i++) d |= x[i] ^ y[i]; return d === 0; };
const okTz = t => { try { new Intl.DateTimeFormat('en-US', { timeZone: String(t) }); return String(t).slice(0, 60); } catch (e) { return 'America/Chicago'; } };
const okPrefs = p => { const o = { ...PREF0 }; if (p && typeof p === 'object') { for (const k of ['lock', 'open', 'graded', 'final', 'longshot', 'heir']) if (typeof p[k] === 'boolean') o[k] = p[k];
  if (Array.isArray(p.quiet) && p.quiet.length === 2 && p.quiet.every(h => Number.isInteger(+h) && +h >= 0 && +h < 24)) o.quiet = p.quiet.map(Number); } return o; };
const okDesk = d => ({ sp: Array.isArray(d && d.sp) ? d.sp.filter(s => /^[a-z]{2,6}$/.test(s)).slice(0, 8) : [], ch: Array.isArray(d && d.ch) ? d.ch.map(String).filter(s => s.length < 40).slice(0, 40) : [] });
const J = (o, status, h) => new Response(JSON.stringify(o), { status: status || 200, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...h } });
export class Push {
  constructor(ctx, env, deps = {}) { this.ctx = ctx; this.env = env; this.now = deps.now || (() => Date.now()); this.fetchFn = deps.fetch || ((u, i) => fetch(u, i)); this.cors = deps.cors || (() => ({})); this.rate = new Map(); }
  async keys() { const S = this.ctx.storage; let k = await S.get('vapid'); if (!k) { k = await vapidKeys(); await S.put('vapid', k); } return k; }
  async owner(k) { const c = this.env.ADMIN_CODE; return !!(c && k && await same(String(k), await pushKeyOf(c))); }
  limited(ip, n, ms) { const now = this.now(), L = (this.rate.get(ip) || []).filter(t => now - t < ms); if (L.length >= n) return true; L.push(now); this.rate.set(ip, L); return false; }
  async fetch(req) { const url = new URL(req.url), p = url.pathname, S = this.ctx.storage, H = p === '/pulse' ? { 'access-control-allow-origin': '*' } : this.cors(req);
    try {
      if (req.method === 'GET' && p === '/pulse') { const pu = await S.get('pulse'); return new Response(JSON.stringify(pu || { v: 1, none: true }), { headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=60', ...H } }); }
      if (req.method === 'GET' && p === '/push/key') return J({ key: (await this.keys()).pub }, 200, { ...H, 'cache-control': 'public, max-age=3600' });
      if (req.method === 'GET' && p === '/push/stats') return (await this.owner(url.searchParams.get('k'))) ? J(await this.stats(), 200, H) : J({ error: 'owner only' }, 403, H);
      if (req.method !== 'POST') return J({ error: 'not found' }, 404, H);
      const ip = req.headers.get('cf-connecting-ip') || 'x'; let b; try { b = await req.json(); } catch (e) { return J({ error: 'body' }, 400, H); }
      if (p === '/push/pulse') return (await this.owner(req.headers.get('x-push-key'))) ? this.pulse(b, H) : J({ error: 'key' }, 403, H);
      if (this.limited(ip, 30, 36e5)) return J({ error: 'slow down' }, 429, H);
      if (p === '/push/sub') return this.sub(b, H);
      if (p === '/push/unsub') { const ep = String((b && b.endpoint) || ''); if (ep) await S.delete('s:' + await epId(ep)); return J({ ok: true }, 200, H); }
      if (p === '/push/test') return this.test(b, H);
      return J({ error: 'not found' }, 404, H);
    } catch (e) { return J({ error: 'server' }, 500, H); } }
  async sub(b, H) { const s = b && b.sub, ok = s && typeof s.endpoint === 'string' && s.endpoint.length < 1200 && /^https:\/\//.test(s.endpoint) && s.keys && typeof s.keys.p256dh === 'string' && typeof s.keys.auth === 'string' && s.keys.p256dh.length < 140 && s.keys.auth.length < 48;
    if (!ok) return J({ error: 'subscription' }, 400, H);
    let host = ''; try { host = new URL(s.endpoint).hostname; } catch (e) { } if (!HOSTS.some(h => host === h || host.endsWith('.' + h))) return J({ error: 'push service' }, 400, H);
    const S = this.ctx.storage, k = 's:' + await epId(s.endpoint), old = (await S.get(k)) || {};
    await S.put(k, { endpoint: s.endpoint, keys: { p256dh: s.keys.p256dh, auth: s.keys.auth }, prefs: okPrefs(b.prefs), tz: okTz(b.tz), desk: okDesk(b.desk), ts: old.ts || this.now(), seen: this.now(), day: old.day || '', n: old.n || 0, fails: 0 });
    return J({ ok: true }, 200, H); }
  async test(b, H) { const S = this.ctx.storage, ep = String((b && b.endpoint) || ''), k = 's:' + await epId(ep), s = ep && await S.get(k); if (!s) return J({ error: 'not subscribed' }, 404, H);
    const t = (await S.get('t:' + k)) || 0; if (this.now() - t < TEST_GAP) return J({ error: 'one test a minute' }, 429, H); await S.put('t:' + k, this.now());
    const r = await this.send(s, declarative({ title: 'TheDesk alerts are on ✓', body: 'This is how the desk will reach you: the card, each pick as it opens, and every result.', url: 'https://ironsilkweekly.com/desk/#today', tag: 'td-test' }, 'test'), 'normal', 'td-test');
    if (r === 'gone') await S.delete(k); return r === 'ok' ? J({ ok: true }, 200, H) : J({ error: 'the push service said ' + r }, 502, H); }
  async pulse(b, H) { const pu = b && b.pulse; if (!pu || typeof pu !== 'object' || !pu.day || JSON.stringify(pu).length > 24000) return J({ error: 'pulse' }, 400, H);
    const S = this.ctx.storage, prev = await S.get('pulse'), sig = String(b.sig || '').slice(0, 80); if (sig && prev && prev.sig === sig) return J({ ok: true, same: true }, 200, H);
    const now = this.now(); await S.put('pulse', { ...pu, sig, got: now });
    const sent = (await S.get('sent')) || {}; for (const k in sent) if (sent[k] < now - 3 * 864e5) delete sent[k];
    const E = events(prev, pu, now).filter(e => !sent[e.id]); E.forEach(e => { sent[e.id] = now; }); await S.put('sent', sent);
    if (E.length) { const live = (pu.picks || []).filter(x => !x.sealed && !x.res && Date.parse(x.start) <= now + 30 * 60e3).length; await S.put('job:' + String(now).padStart(15, '0'), { E, badge: live, after: '' }); await S.setAlarm(now); }
    return J({ ok: true, events: E.map(e => e.kind) }, 200, H); }
  async alarm() { const S = this.ctx.storage, jobs = await S.list({ prefix: 'job:', limit: 1 }); if (!jobs.size) return; const [[jk, job]] = [...jobs];
    const subs = await S.list(job.after ? { prefix: 's:', startAfter: job.after, limit: BATCH } : { prefix: 's:', limit: BATCH }), now = this.now(), day = new Date(now).toISOString().slice(0, 10);
    const st = (await S.get('stat:' + day)) || { sent: 0, fail: 0, gone: 0 }; let last = job.after;
    for (const [k, s] of subs) { last = k; const mine = job.E.filter(e => wants(s, e, now)); if (!mine.length) continue; if (s.day !== day) { s.day = day; s.n = 0; } if (s.n >= CAP) continue;
      const n = bundle(mine, s.tz), r = await this.send(s, declarative({ ...n, badge: job.badge }, mine[0].kind), mine.some(e => e.kind === 'open' || e.kind === 'graded') ? 'high' : 'normal', n.tag);
      if (r === 'gone') { st.gone++; await S.delete(k); continue; } if (r === 'ok') { st.sent++; s.n++; s.fails = 0; } else { st.fail++; s.fails = (s.fails || 0) + 1; }
      if (s.fails > 6) await S.delete(k); else await S.put(k, s); }
    await S.put('stat:' + day, st);
    if (subs.size === BATCH) { job.after = last; await S.put(jk, job); } else await S.delete(jk);
    if ((await S.list({ prefix: 'job:', limit: 1 })).size) await S.setAlarm(this.now() + 50); }
  async send(s, msg, urgency, topic) { try { const R = await pushRequest(s, msg, await this.keys(), { urgency, topic, ttl: 6 * 3600, now: this.now() }); const r = await this.fetchFn(R.url, R.init);
      if (r.status === 404 || r.status === 410) return 'gone'; return r.ok ? 'ok' : 'HTTP ' + r.status; } catch (e) { return 'error'; } }
  async stats() { const S = this.ctx.storage, subs = await S.list({ prefix: 's:' }), day = new Date(this.now()).toISOString().slice(0, 10), pu = await S.get('pulse');
    return { subs: subs.size, today: (await S.get('stat:' + day)) || { sent: 0, fail: 0, gone: 0 }, pulse: pu ? { day: pu.day, got: pu.got, picks: (pu.picks || []).length } : null, queued: (await S.list({ prefix: 'job:' })).size }; }
}
