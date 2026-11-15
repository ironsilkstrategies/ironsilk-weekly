/* TheDesk · the members' chatroom (a Cloudflare Worker + one Durable Object room).
   Anyone can read. Posting takes a name and an invite code the owner hands out (during the beta), or the owner's code.
   The owner can delete a message, mute or ban a name, and make or cancel invite codes.
   Routes (all JSON):
     GET  /chat/history                      → { messages }                 the last 80 messages
     GET  /chat/live                         → WebSocket                    new messages and deletions, as they happen (read-only)
     POST /chat/join   { name, code }        → { token, name, owner }       a 30-day pass for posting
     POST /chat/send   { token, text }       → { message }
     POST /chat/mod    { token, act, … }     → owner only: del {id} · mute {name, mins} · ban {name} · unban {name} · invite {uses} · uninvite {code} · invites
   Secret: ADMIN_CODE (24+ characters). Var: ALLOW_ORIGINS (comma-separated).
   Nothing here touches picks or the app's data: the chat is the one thing that flows back to the desk, and it's only words. */
const MAX_TEXT = 500, KEEP = 400, PAGE = 80, PASS_DAYS = 30;
const BAD = ['fuck', 'shit', 'bitch', 'cunt', 'nigger', 'nigga', 'faggot', 'fag', 'retard', 'whore', 'slut', 'dick', 'pussy', 'asshole', 'bastard', 'motherfucker'];
const RESERVED = /^(thedesk|the desk|admin|owner|moderator|mod|system|the (simulator|judge|coach|scorekeeper|oracle|historian|crowd|commissioner|underdog spotter|scout|banker|brain))$/i;
export const clean = t => BAD.reduce((s, w) => s.replace(new RegExp(`\\b${w}(s|es|ed|ing|er|ers)?\\b`, 'gi'), m => m[0] + '*'.repeat(m.length - 1)), t);
export const okName = n => typeof n === 'string' && /^[A-Za-z0-9][A-Za-z0-9 _.-]{1,19}$/.test(n.trim()) && !RESERVED.test(n.trim()) && clean(n) === n;
const rid = (n = 18) => { const a = new Uint8Array(n); crypto.getRandomValues(a); return [...a].map(b => 'abcdefghjkmnpqrstuvwxyz23456789'[b % 31]).join(''); };
const sameSecret = async (a, b) => { const h = async s => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(s)))); const [x, y] = await Promise.all([h(a), h(b)]); let d = 0; for (let i = 0; i < x.length; i++) d |= x[i] ^ y[i]; return d === 0; };

function cors(req, env) { const o = req.headers.get('origin') || '', allow = String(env.ALLOW_ORIGINS || 'https://ironsilkweekly.com').split(',').map(s => s.trim());
  return { 'access-control-allow-origin': allow.includes(o) ? o : allow[0], 'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'GET,POST,OPTIONS', vary: 'origin' }; }
const json = (o, status, h) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...h } });

export default { async fetch(req, env) { const url = new URL(req.url);
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req, env) });
  if (url.pathname.startsWith('/acct/') && env.ACCT) return env.ACCT.get(env.ACCT.idFromName('members')).fetch(req);
  if (!url.pathname.startsWith('/chat/')) return json({ error: 'not found' }, 404, cors(req, env));
  const room = env.ROOM.get(env.ROOM.idFromName('lounge')); return room.fetch(req); } };

export class Room {
  constructor(ctx, env, deps = {}) { this.ctx = ctx; this.env = env; this.now = deps.now || (() => Date.now()); this.rate = new Map(); }
  async fetch(req) { const url = new URL(req.url), p = url.pathname, H = cors(req, this.env);
    try {
      if (req.method === 'GET' && p === '/chat/live') { if (req.headers.get('upgrade') !== 'websocket') return json({ error: 'websocket only' }, 426, H);
        const pair = new WebSocketPair(); this.ctx.acceptWebSocket(pair[1]); return new Response(null, { status: 101, webSocket: pair[0] }); }
      if (req.method === 'GET' && p === '/chat/history') return json({ messages: await this.recent() }, 200, H);
      if (req.method !== 'POST') return json({ error: 'not found' }, 404, H);
      const ip = req.headers.get('cf-connecting-ip') || 'unknown';
      let b; try { b = await req.json(); } catch (e) { return json({ error: 'body' }, 400, H); }
      if (p === '/chat/join') return this.join(b, ip, H);
      if (p === '/chat/send') return this.send(b, H);
      if (p === '/chat/mod') return this.mod(b, H);
      return json({ error: 'not found' }, 404, H);
    } catch (e) { return json({ error: 'server' }, 500, H); } }
  async recent() { const m = await this.ctx.storage.list({ prefix: 'm:', reverse: true, limit: PAGE }); return [...m.values()].reverse(); }
  async pass(token) { if (typeof token !== 'string' || token.length < 20) return null; const s = await this.ctx.storage.get('s:' + token);
    if (!s || s.exp < this.now()) return null; if (await this.ctx.storage.get('b:' + s.name.toLowerCase())) return null; return s; }
  async join(b, ip, H) { const S = this.ctx.storage, k = 'j:' + ip, tries = (await S.get(k)) || { n: 0, t: this.now() };
    if (tries.n >= 8 && this.now() - tries.t < 15 * 60e3) return json({ error: 'too many tries, wait 15 minutes' }, 429, H);
    const code = String(b.code || '').trim(), admin = this.env.ADMIN_CODE;
    const owner = typeof admin === 'string' && admin.length >= 24 && await sameSecret(code, admin);
    const name = owner ? 'TheDesk' : String(b.name || '').trim();
    if (!owner && !okName(name)) return json({ error: 'pick a name: 2–20 letters or numbers, nothing reserved or rude' }, 400, H);
    const inv = owner ? null : await S.get('i:' + code.toUpperCase());
    if (!owner && (!inv || inv.used >= inv.uses)) { await S.put(k, { n: (this.now() - tries.t < 15 * 60e3 ? tries.n : 0) + 1, t: this.now() }); return json({ error: 'that invite code doesn’t work' }, 403, H); }
    if (!owner && await S.get('b:' + name.toLowerCase())) return json({ error: 'that name is banned' }, 403, H);
    const taken = owner ? null : await S.get('n:' + name.toLowerCase());
    if (taken && taken.code !== code.toUpperCase()) return json({ error: 'that name is taken' }, 409, H);
    if (inv) { inv.used++; await S.put('i:' + code.toUpperCase(), inv); await S.put('n:' + name.toLowerCase(), { code: code.toUpperCase(), at: this.now() }); }
    await S.delete(k);
    const token = rid(32), exp = this.now() + PASS_DAYS * 864e5; await S.put('s:' + token, { name, owner: !!owner, exp });
    return json({ token, name, owner: !!owner, exp }, 200, H); }
  async send(b, H) { const s = await this.pass(b.token); if (!s) return json({ error: 'join the chat first' }, 401, H);
    const mute = await this.ctx.storage.get('u:' + s.name.toLowerCase()); if (!s.owner && mute && mute.until > this.now()) return json({ error: 'you’re muted for now' }, 403, H);
    const text = clean(String(b.text || '').replace(/\s+/g, ' ').trim()).slice(0, MAX_TEXT); if (!text) return json({ error: 'say something' }, 400, H);
    if (!s.owner) { const r = (this.rate.get(s.name) || []).filter(t => this.now() - t < 60e3); if (r.length >= 12 || (r.length && this.now() - r[r.length - 1] < 2500)) return json({ error: 'slow down a little' }, 429, H); r.push(this.now()); this.rate.set(s.name, r); }
    const t = this.now(), id = t.toString(36).padStart(9, '0') + rid(4), m = { id, name: s.name, owner: s.owner, text, ts: t };
    await this.ctx.storage.put('m:' + id, m); this.cast({ type: 'msg', m }); await this.trim(); return json({ message: m }, 200, H); }
  async trim() { const all = await this.ctx.storage.list({ prefix: 'm:' }); if (all.size <= KEEP) return; const old = [...all.keys()].slice(0, all.size - KEEP); await this.ctx.storage.delete(old); }
  async mod(b, H) { const s = await this.pass(b.token); if (!s || !s.owner) return json({ error: 'owner only' }, 403, H); const S = this.ctx.storage, n = String(b.name || '').trim().toLowerCase();
    switch (b.act) {
      case 'del': { const k = 'm:' + String(b.id || ''); if (!(await S.get(k))) return json({ error: 'no such message' }, 404, H); await S.delete(k); this.cast({ type: 'del', id: b.id }); return json({ ok: true }, 200, H); }
      case 'mute': { if (!n) return json({ error: 'name' }, 400, H); const mins = Math.max(5, Math.min(7 * 1440, +b.mins || 60)); await S.put('u:' + n, { until: this.now() + mins * 60e3 }); return json({ ok: true, mins }, 200, H); }
      case 'ban': { if (!n) return json({ error: 'name' }, 400, H); await S.put('b:' + n, { at: this.now() }); return json({ ok: true }, 200, H); }
      case 'unban': { await S.delete('b:' + n); await S.delete('u:' + n); return json({ ok: true }, 200, H); }
      case 'invite': { const uses = Math.max(1, Math.min(500, +b.uses || 25)), code = 'DESK-' + rid(5).toUpperCase(); await S.put('i:' + code, { uses, used: 0, at: this.now() }); return json({ code, uses }, 200, H); }
      case 'uninvite': { await S.delete('i:' + String(b.code || '').toUpperCase()); return json({ ok: true }, 200, H); }
      case 'invites': { const L = await S.list({ prefix: 'i:' }); return json({ invites: [...L].map(([k, v]) => ({ code: k.slice(2), ...v })) }, 200, H); }
      default: return json({ error: 'unknown action' }, 400, H);
    } }
  cast(o) { const s = JSON.stringify(o); for (const ws of this.ctx.getWebSockets()) { try { ws.send(s); } catch (e) { } } }
  webSocketMessage(ws, msg) { if (msg === 'ping') try { ws.send('pong'); } catch (e) { } }   /* read-only: posting goes through /chat/send */
  webSocketClose(ws) { try { ws.close(); } catch (e) { } }
}


/* ═══ DESK DOLLARS (v3.0.22, Chris, Nov 15: "each signup gets $1000 of free novelty money… a badge of honor") ════════════════
   Play money only: never cashed out, never a prize. Every member starts with D$1,000 (members from before get theirs the first
   time they look). Bets are on the slate's own games (moneyline, spread, total), priced by the server from the public slate
   feed at the moment of the bet (spreads and totals at -110), closed at start time, one leg per game, up to 10 legs. The server
   grades them itself from ESPN finals every 10 minutes; a game it can't find in 3 days is voided and the stake comes back.
   Bought D$ (the store, built but OFF until a lawyer signs off — or the owner's grant) is kept apart: it shows in its own color,
   and the leaderboard ranks EARNED D$ (balance minus everything bought), so nobody buys their way up the board. */
const DD_START = 1000, DD_LEGS = 10, DD_JUICE = -110, SLATE_URL = 'https://raw.githubusercontent.com/ironsilkstrategies/ironsilk-weekly/feeds/slate.json';
const ESPN_PATH = { nfl: 'football/nfl', ncaaf: 'football/college-football', nba: 'basketball/nba', ncaab: 'basketball/mens-college-basketball', nhl: 'hockey/nhl', mlb: 'baseball/mlb' };
const ESPN_GROUP = { ncaaf: '&groups=80', ncaab: '&groups=50' };
export const ddDec = p => (p > 0 ? 1 + p / 100 : 1 + 100 / -p);
export const ddWallet = u => (u.dd ? u.dd : { bal: DD_START, bought: 0, w: 0, l: 0, p: 0, staked: 0, back: 0, at: 0 });
/* price one leg from the slate game: {mk:'ml'|'spread'|'total', side:'away'|'home'|'over'|'under'} */
export function ddPrice(g, mk, side) { const ln = g && g.ln; if (!ln) return null;
  if (mk === 'ml') { const p = side === 'away' ? ln.mlA : side === 'home' ? ln.mlH : null; return Number.isFinite(p) && Math.abs(p) >= 100 ? { price: Math.round(p), line: null, pick: `${side === 'away' ? g.a.ab : g.h.ab} ML` } : null; }
  if (mk === 'spread') { if (!Number.isFinite(ln.line) || !ln.fav) return null; const team = side === 'away' ? g.a.ab : side === 'home' ? g.h.ab : null; if (!team) return null;
    const line = team === ln.fav ? -Math.abs(ln.line) : Math.abs(ln.line); return { price: DD_JUICE, line, pick: `${team} ${line > 0 ? '+' : ''}${line}` }; }
  if (mk === 'total') { if (!Number.isFinite(ln.tot) || !['over', 'under'].includes(side)) return null; return { price: DD_JUICE, line: ln.tot, pick: `${side === 'over' ? 'Over' : 'Under'} ${ln.tot}` }; }
  return null; }
/* grade one leg against a final score: hit / miss / push */
export function ddGrade(leg, a, h) { if (!Number.isFinite(a) || !Number.isFinite(h)) return null;
  if (leg.mk === 'ml') { if (a === h) return 'push'; return (leg.side === 'home') === (h > a) ? 'hit' : 'miss'; }
  if (leg.mk === 'spread') { const m = (leg.side === 'home' ? h - a : a - h) + leg.line; return m === 0 ? 'push' : m > 0 ? 'hit' : 'miss'; }
  if (leg.mk === 'total') { const t = a + h; return t === leg.line ? 'push' : (leg.side === 'over') === (t > leg.line) ? 'hit' : 'miss'; }
  return null; }
/* settle a whole bet: any miss loses; pushes drop out of the odds; all pushed → stake back */
export function ddSettle(b) { const R = b.legs.map(l => l.res); if (R.includes('miss')) return { status: 'lost', back: 0 }; if (R.some(r => !r)) return null;
  const live = b.legs.filter(l => l.res === 'hit'); if (!live.length) return { status: 'push', back: b.stake };
  const dec = live.reduce((x, l) => x * ddDec(l.price), 1); return { status: 'won', back: Math.round(b.stake * dec * 100) / 100 }; }

/* ═══ ACCOUNTS (v3.0.21, Chris, Nov 15: logins so app users can track their own tickets — "can't we just cloud it") ═══════════
   Everything stays on our Cloudflare: a username and a password, the password never stored, only a PBKDF2-SHA256 hash with its
   own salt (100,000 rounds). A sign-in gives a 90-day token. Each member keeps up to 300 tickets, 15 legs each.
   Routes (POST, JSON):
     /acct/signup  { name, pass, age21 }   → { token, name }      21+ confirmed, name 2–20 letters/numbers, password 8+
     /acct/login   { name, pass }          → { token, name }      8 misses from one address → wait 15 minutes
     /acct/me      { token }               → { name, since, tickets }
     /acct/save    { token, ticket }       → { ticket }           add or replace one ticket (by id)
     /acct/del     { token, id }           → { ok }
     /acct/logout  { token }               → { ok }
     /acct/close   { token, pass }         → { ok }               deletes the account, its tickets and every sign-in
   The tickets are the member's own; nothing here reads the desk's picks or methods. */
const ACCT_DAYS = 90, TIX_MAX = 300, LEGS_MAX = 15, PBKDF2_N = 100000;
const b64 = u => btoa(String.fromCharCode(...new Uint8Array(u)));
async function passHash(pass, salt) { const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(String(pass)), 'PBKDF2', false, ['deriveBits']);
  return b64(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: PBKDF2_N }, k, 256)); }
const str = (v, n) => clean(String(v == null ? '' : v).replace(/[<>]/g, '').trim()).slice(0, n);
export function cleanTicket(t) { if (!t || typeof t !== 'object') return null; const id = String(t.id || '').replace(/[^a-z0-9_-]/gi, '').slice(0, 32); if (!id) return null;
  const legs = (Array.isArray(t.legs) ? t.legs : []).slice(0, LEGS_MAX).map(l => ({ src: ['pick', 'prop', 'own'].includes(l && l.src) ? l.src : 'own', ref: str(l && l.ref, 120), sp: str(l && l.sp, 8),
    game: str(l && l.game, 24), pick: str(l && l.pick, 80), price: Number.isFinite(+(l && l.price)) && Math.abs(+l.price) >= 100 && Math.abs(+l.price) < 100000 ? Math.round(+l.price) : null,
    start: str(l && l.start, 30), res: ['hit', 'miss', 'push'].includes(l && l.res) ? l.res : null })).filter(l => l.pick);
  if (!legs.length) return null;
  return { id, ts: Number.isFinite(+t.ts) ? +t.ts : Date.now(), title: str(t.title, 40), stake: Number.isFinite(+t.stake) && +t.stake > 0 ? Math.min(100000, Math.round(+t.stake * 100) / 100) : null,
    odds: Number.isFinite(+t.odds) && Math.abs(+t.odds) >= 100 ? Math.round(+t.odds) : null, legs }; }
export class Accounts {
  constructor(ctx, env, deps = {}) { this.ctx = ctx; this.env = env; this.now = deps.now || (() => Date.now()); this.fetchFn = deps.fetch || null; }
  async fetch(req) { const url = new URL(req.url), p = url.pathname, H = cors(req, this.env);
    try { if (req.method === 'GET' && p === '/acct/board') return this.board(H); if (req.method !== 'POST') return json({ error: 'not found' }, 404, H);
      const ip = req.headers.get('cf-connecting-ip') || 'unknown'; let b; try { b = await req.json(); } catch (e) { return json({ error: 'body' }, 400, H); }
      if (p === '/acct/board') return this.board(H);
      if (p === '/acct/signup') return this.signup(b, ip, H);
      if (p === '/acct/login') return this.login(b, ip, H);
      const s = await this.pass(b.token); if (!s) return json({ error: 'sign in first' }, 401, H);
      if (p === '/acct/me') return this.me(s, H);
      if (p === '/acct/bet') return this.bet(s, b, H);
      if (p === '/acct/buy') return this.env.STORE_ON === 'yes' ? json({ error: 'checkout isn’t connected yet' }, 501, H) : json({ error: 'the D$ store opens soon' }, 403, H);
      if (p === '/acct/grant') return this.grant(s, b, H);
      if (p === '/acct/save') return this.save(s, b, H);
      if (p === '/acct/del') { await this.ctx.storage.delete('t:' + s.key + ':' + String(b.id || '')); return json({ ok: true }, 200, H); }
      if (p === '/acct/close') { const S = this.ctx.storage, u = await S.get('u:' + s.key); if (!u || !(await sameSecret(await passHash(String(b.pass || ''), u.salt), u.hash))) return json({ error: 'that password doesn’t match' }, 403, H);
        for (const pre of ['t:', 'b:', 'o:']) { const L = await S.list({ prefix: pre + s.key + ':' }); if (L.size) await S.delete([...L.keys()]); } const ses = await S.list({ prefix: 's:' }); const mine = [...ses].filter(([, v]) => v.key === s.key).map(([k]) => k); if (mine.length) await S.delete(mine);
        await S.delete('u:' + s.key); return json({ ok: true }, 200, H); }
      if (p === '/acct/logout') { await this.ctx.storage.delete('s:' + b.token); return json({ ok: true }, 200, H); }
      return json({ error: 'not found' }, 404, H);
    } catch (e) { return json({ error: 'server' }, 500, H); } }
  async pass(token) { if (typeof token !== 'string' || token.length < 20) return null; const s = await this.ctx.storage.get('s:' + token); if (!s || s.exp < this.now()) return null; return s; }
  async tooMany(ip) { const t = await this.ctx.storage.get('j:' + ip); return t && t.n >= 8 && this.now() - t.t < 15 * 60e3; }
  async miss(ip) { const S = this.ctx.storage, t = (await S.get('j:' + ip)) || { n: 0, t: this.now() }; await S.put('j:' + ip, { n: (this.now() - t.t < 15 * 60e3 ? t.n : 0) + 1, t: this.now() }); }
  async issue(name, H) { const token = rid(32), exp = this.now() + ACCT_DAYS * 864e5; await this.ctx.storage.put('s:' + token, { name, key: name.toLowerCase(), exp }); return json({ token, name, exp }, 200, H); }
  async signup(b, ip, H) { if (await this.tooMany(ip)) return json({ error: 'too many tries, wait 15 minutes' }, 429, H);
    const name = String(b.name || '').trim(), pass = String(b.pass || '');
    if (b.age21 !== true) return json({ error: 'TheDesk is for 21 and over' }, 400, H);
    if (!okName(name)) return json({ error: 'pick a username: 2–20 letters or numbers, nothing reserved or rude' }, 400, H);
    if (pass.length < 8 || pass.length > 200) return json({ error: 'use a password of 8 or more characters' }, 400, H);
    const S = this.ctx.storage, k = 'u:' + name.toLowerCase(); if (await S.get(k)) { await this.miss(ip); return json({ error: 'that username is taken' }, 409, H); }
    const salt = rid(16); await S.put(k, { name, salt, hash: await passHash(pass, salt), at: this.now(), age21: true, dd: { ...ddWallet({}), at: this.now() } }); this._bd = null; return this.issue(name, H); }
  async login(b, ip, H) { if (await this.tooMany(ip)) return json({ error: 'too many tries, wait 15 minutes' }, 429, H);
    const name = String(b.name || '').trim(), u = await this.ctx.storage.get('u:' + name.toLowerCase());
    const ok = u && await sameSecret(await passHash(String(b.pass || ''), u.salt), u.hash);
    if (!ok) { await this.miss(ip); return json({ error: 'that username and password don’t match' }, 403, H); }
    await this.ctx.storage.delete('j:' + ip); return this.issue(u.name, H); }
  async me(s, H) { const S = this.ctx.storage, u = await S.get('u:' + s.key); if (!u) return json({ error: 'sign in first' }, 401, H);
    if (!u.dd) { u.dd = ddWallet(u); u.dd.at = this.now(); await S.put('u:' + s.key, u); }
    const L = await S.list({ prefix: 't:' + s.key + ':' }); const B = await S.list({ prefix: 'b:' + s.key + ':' });
    return json({ name: s.name, since: u.at, wallet: u.dd, store: this.env.STORE_ON === 'yes', tickets: [...L.values()].sort((a, b) => b.ts - a.ts), bets: [...B.values()].sort((a, b) => b.ts - a.ts).slice(0, 100) }, 200, H); }
  async slate() { if (this._sl && this.now() - this._sl.t < 5 * 60e3) return this._sl.v; const f = this.fetchFn || fetch; const r = await f(SLATE_URL, { cf: { cacheTtl: 120 } }); if (!r.ok) throw new Error('slate');
    const v = await r.json(); const G = new Map(); (v.days || []).forEach(d => (d.games || []).forEach(g => G.set(g.k, g))); this._sl = { t: this.now(), v: G }; return G; }
  async bet(s, b, H) { const S = this.ctx.storage, u = await S.get('u:' + s.key); if (!u) return json({ error: 'sign in first' }, 401, H); const W = ddWallet(u);
    const stake = Math.round(+b.stake * 100) / 100; if (!(stake >= 1)) return json({ error: 'the smallest bet is D$1' }, 400, H); if (stake > W.bal) return json({ error: `you have D$${W.bal.toLocaleString('en-US')}` }, 400, H);
    const want = Array.isArray(b.legs) ? b.legs.slice(0, DD_LEGS + 1) : []; if (!want.length) return json({ error: 'add a leg' }, 400, H); if (want.length > DD_LEGS) return json({ error: `up to ${DD_LEGS} legs` }, 400, H);
    let G; try { G = await this.slate(); } catch (e) { return json({ error: 'the lines can’t be reached right now — try again in a minute' }, 503, H); }
    const seen = new Set(), legs = [];
    for (const w of want) { const k = String(w.k || ''); const g = G.get(k); if (!g) return json({ error: 'that game isn’t on the board' }, 400, H);
      if (seen.has(k)) return json({ error: 'one leg per game' }, 400, H); seen.add(k);
      if (!(g.t > this.now() + 60e3)) return json({ error: `${g.a.ab} at ${g.h.ab} has started — bets are closed` }, 400, H);
      const pr = ddPrice(g, w.mk, w.side); if (!pr) return json({ error: 'that line isn’t available' }, 400, H);
      legs.push({ k, sp: g.sp, t: g.t, game: g.a.ab + '@' + g.h.ab, mk: w.mk, side: w.side, line: pr.line, price: pr.price, pick: pr.pick, res: null }); }
    const dec = legs.reduce((x, l) => x * ddDec(l.price), 1), id = this.now().toString(36) + rid(4);
    const bet = { id, ts: this.now(), stake, dec: Math.round(dec * 1000) / 1000, toWin: Math.round(stake * (dec - 1) * 100) / 100, legs, status: 'open' };
    W.bal = Math.round((W.bal - stake) * 100) / 100; W.staked = Math.round((W.staked + stake) * 100) / 100; u.dd = W;
    await S.put('u:' + s.key, u); await S.put('b:' + s.key + ':' + id, bet); await S.put('o:' + s.key + ':' + id, 1); this._bd = null; await this.wake();
    return json({ bet, wallet: W }, 200, H); }
  async wake() { try { const a = await this.ctx.storage.getAlarm(); if (a == null) await this.ctx.storage.setAlarm(this.now() + 10 * 60e3); } catch (e) { } }
  async scores(sp, day) { const k = sp + day; this._sc = this._sc || new Map(); const c = this._sc.get(k); if (c && this.now() - c.t < 5 * 60e3) return c.v;
    const f = this.fetchFn || fetch; const r = await f(`https://site.api.espn.com/apis/site/v2/sports/${ESPN_PATH[sp]}/scoreboard?dates=${day}&limit=400${ESPN_GROUP[sp] || ''}`); const v = new Map();
    if (r.ok) { const j = await r.json(); (j.events || []).forEach(e => { const c0 = e.competitions && e.competitions[0]; if (!c0) return; const A = c0.competitors.find(x => x.homeAway === 'away'), Hm = c0.competitors.find(x => x.homeAway === 'home');
      if (!A || !Hm) return; v.set(A.team.abbreviation + '@' + Hm.team.abbreviation, { done: !!(c0.status && c0.status.type && c0.status.type.completed), a: +A.score, h: +Hm.score }); }); }
    this._sc.set(k, { t: this.now(), v }); return v; }
  async alarm() { const S = this.ctx.storage, O = await S.list({ prefix: 'o:' }); if (!O.size) return; const dayOf = t => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date(t)).replace(/-/g, '');
    for (const ok of O.keys()) { const [, key, id] = ok.split(':'); const bk = 'b:' + key + ':' + id, bet = await S.get(bk); if (!bet || bet.status !== 'open') { await S.delete(ok); continue; }
      let changed = false; for (const l of bet.legs) { if (l.res || l.t > this.now()) continue; let sc = null; try { sc = (await this.scores(l.sp, dayOf(l.t))).get(l.game); } catch (e) { }
        if (sc && sc.done) { l.res = ddGrade(l, sc.a, sc.h); changed = true; } else if (this.now() - l.t > 3 * 864e5) { l.res = 'push'; l.void = true; changed = true; } }
      const fin = ddSettle(bet); if (!changed && !fin) continue;
      if (fin) { bet.status = fin.status; bet.back = fin.back; bet.done = this.now(); const u = await S.get('u:' + key); if (u) { const W = ddWallet(u); W.bal = Math.round((W.bal + fin.back) * 100) / 100; W.back = Math.round((W.back + fin.back) * 100) / 100;
          if (fin.status === 'won') W.w++; else if (fin.status === 'lost') W.l++; else W.p++; u.dd = W; await S.put('u:' + key, u); } await S.delete(ok); this._bd = null; }
      await S.put(bk, bet); }
    if ((await S.list({ prefix: 'o:', limit: 1 })).size) await S.setAlarm(this.now() + 10 * 60e3); }
  async board(H) { if (this._bd && this.now() - this._bd.t < 60e3) return json(this._bd.v, 200, H); const U = await this.ctx.storage.list({ prefix: 'u:' });
    const rows = [...U.values()].map(u => { const W = ddWallet(u); return { name: u.name, bal: W.bal, bought: W.bought, earned: Math.round((W.bal - W.bought) * 100) / 100, w: W.w, l: W.l, roi: W.staked ? Math.round(1000 * (W.back - W.staked) / W.staked) / 10 : null }; })
      .sort((a, b) => b.earned - a.earned).slice(0, 50); const v = { rows, n: U.size }; this._bd = { t: this.now(), v }; return json(v, 200, H); }
  async grant(s, b, H) { const admin = this.env.ADMIN_CODE; if (!(typeof admin === 'string' && admin.length >= 24 && await sameSecret(String(b.code || ''), admin))) return json({ error: 'owner only' }, 403, H);
    const S = this.ctx.storage, key = String(b.name || '').trim().toLowerCase(), u = await S.get('u:' + key); if (!u) return json({ error: 'no such member' }, 404, H);
    const amt = Math.round(+b.amount); if (!(amt > 0 && amt <= 100000)) return json({ error: 'amount' }, 400, H); const W = ddWallet(u); W.bal += amt; W.bought += amt; u.dd = W; await S.put('u:' + key, u); this._bd = null; return json({ wallet: W }, 200, H); }
  async save(s, b, H) { const t = cleanTicket(b.ticket); if (!t) return json({ error: 'a ticket needs at least one leg' }, 400, H);
    const S = this.ctx.storage, pre = 't:' + s.key + ':', k = pre + t.id;
    if (!(await S.get(k))) { const L = await S.list({ prefix: pre }); if (L.size >= TIX_MAX) { const old = [...L.entries()].sort((a, b) => a[1].ts - b[1].ts)[0]; await S.delete(old[0]); } }
    await S.put(k, t); return json({ ticket: t }, 200, H); }
}
