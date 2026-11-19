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
import { get as chal, inLib, checkpoints, ROUTES, ruleCheck, tierOf, rankOf } from './chal-lib.mjs';
const RESERVED = /^(thedesk|the desk|admin|owner|moderator|mod|system|the (simulator|judge|coach|scorekeeper|oracle|historian|crowd|commissioner|underdog spotter|scout|banker|brain))$/i;
export const clean = t => BAD.reduce((s, w) => s.replace(new RegExp(`\\b${w}(s|es|ed|ing|er|ers)?\\b`, 'gi'), m => m[0] + '*'.repeat(m.length - 1)), t);
/* v3.3 · where a member came from (?src= on their first visit): a short tag, letters/numbers/-/_ only */
export const srcTag = v => { const t = String(v == null ? '' : v).toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 24); return t || null; };
export const okName = n => typeof n === 'string' && /^[A-Za-z0-9][A-Za-z0-9 _.-]{1,19}$/.test(n.trim()) && !RESERVED.test(n.trim()) && clean(n) === n;
const rid = (n = 18) => { const a = new Uint8Array(n); crypto.getRandomValues(a); return [...a].map(b => 'abcdefghjkmnpqrstuvwxyz23456789'[b % 31]).join(''); };
const keyHash = async s => { const d = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('name-key:' + String(s)))); let x = ''; for (const c of d) x += c.toString(16).padStart(2, '0'); return x; };
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
      if (p === '/chat/adm') { const admin = this.env.ADMIN_CODE; if (!(typeof admin === 'string' && admin.length >= 24 && await sameSecret(String(b.admin || ''), admin))) return json({ error: 'owner only' }, 403, H);
        if (b.act === 'list') { const S = this.ctx.storage, U = await S.list({ prefix: 'u:' }), B = await S.list({ prefix: 'b:' }), I = await S.list({ prefix: 'i:' }), all = await S.list({ prefix: 'm:' }), day = this.now() - 864e5;
          return json({ messages: (await this.recent()).slice(-60), mutes: [...U].filter(([, v]) => v.until > this.now()).map(([k, v]) => ({ name: k.slice(2), until: v.until })), bans: [...B.keys()].map(k => k.slice(2)), invites: [...I].map(([k, v]) => ({ code: k.slice(2), ...v })), total: all.size, day: [...all.values()].filter(m => (m.ts || m.t || 0) > day).length }, 200, H); }
        return this.modDo(b, H); }
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
    const bad = async () => { await S.put(k, { n: (this.now() - tries.t < 15 * 60e3 ? tries.n : 0) + 1, t: this.now() }); return json({ error: 'that invite code doesn’t work' }, 403, H); };
    if (!owner && !inv) return bad();
    if (!owner && await S.get('b:' + name.toLowerCase())) return json({ error: 'that name is banned' }, 403, H);
    /* v3.2 · a name belongs to the phone that claimed it: that phone holds a private key (only its hash is kept here), so someone else
       holding the same multi-use invite code can't take it over. Names from before keep working and lock on their next join. A member
       on a new phone asks TheDesk to free the name (Admin → Chat). Coming back under your own name never uses up an invite. */
    const taken = owner ? null : await S.get('n:' + name.toLowerCase()); const nk = String(b.nameKey || '').slice(0, 80);
    let mine = false;
    if (taken && taken.kh) { mine = !!nk && await sameSecret(await keyHash(nk), taken.kh); if (!mine) { await S.put(k, { n: (this.now() - tries.t < 15 * 60e3 ? tries.n : 0) + 1, t: this.now() }); return json({ error: 'that name belongs to another member — pick another (on a new phone? ask TheDesk to free it)' }, 409, H); } }
    else if (taken) { if (taken.code !== code.toUpperCase()) return json({ error: 'that name is taken' }, 409, H); mine = true; }
    if (!owner && !mine && inv.used >= inv.uses) return bad();
    let nameKey = null;
    if (!owner) { if (!taken) { inv.used++; await S.put('i:' + code.toUpperCase(), inv); }
      nameKey = taken && taken.kh ? nk : rid(24);
      await S.put('n:' + name.toLowerCase(), { code: code.toUpperCase(), at: this.now(), kh: taken && taken.kh ? taken.kh : await keyHash(nameKey) }); }
    await S.delete(k);
    const token = rid(32), exp = this.now() + PASS_DAYS * 864e5; await S.put('s:' + token, { name, owner: !!owner, exp });
    return json({ token, name, owner: !!owner, exp, ...(nameKey ? { nameKey } : {}) }, 200, H); }
  async send(b, H) { const s = await this.pass(b.token); if (!s) return json({ error: 'join the chat first' }, 401, H);
    const mute = await this.ctx.storage.get('u:' + s.name.toLowerCase()); if (!s.owner && mute && mute.until > this.now()) return json({ error: 'you’re muted for now' }, 403, H);
    const text = clean(String(b.text || '').replace(/\s+/g, ' ').trim()).slice(0, MAX_TEXT); if (!text) return json({ error: 'say something' }, 400, H);
    if (!s.owner) { const r = (this.rate.get(s.name) || []).filter(t => this.now() - t < 60e3); if (r.length >= 12 || (r.length && this.now() - r[r.length - 1] < 2500)) return json({ error: 'slow down a little' }, 429, H); r.push(this.now()); this.rate.set(s.name, r); }
    const t = this.now(), id = t.toString(36).padStart(9, '0') + rid(4), m = { id, name: s.name, owner: s.owner, text, ts: t };
    await this.ctx.storage.put('m:' + id, m); this.cast({ type: 'msg', m }); await this.trim(); return json({ message: m }, 200, H); }
  async trim() { const all = await this.ctx.storage.list({ prefix: 'm:' }); if (all.size <= KEEP) return; const old = [...all.keys()].slice(0, all.size - KEEP); await this.ctx.storage.delete(old); }
  async mod(b, H) { const s = await this.pass(b.token); if (!s || !s.owner) return json({ error: 'owner only' }, 403, H); return this.modDo(b, H); }
  async modDo(b, H) { const S = this.ctx.storage, n = String(b.name || '').trim().toLowerCase();
    switch (b.act) {
      case 'del': { const k = 'm:' + String(b.id || ''); if (!(await S.get(k))) return json({ error: 'no such message' }, 404, H); await S.delete(k); this.cast({ type: 'del', id: b.id }); return json({ ok: true }, 200, H); }
      case 'mute': { if (!n) return json({ error: 'name' }, 400, H); const mins = Math.max(5, Math.min(7 * 1440, +b.mins || 60)); await S.put('u:' + n, { until: this.now() + mins * 60e3 }); return json({ ok: true, mins }, 200, H); }
      case 'ban': { if (!n) return json({ error: 'name' }, 400, H); await S.put('b:' + n, { at: this.now() }); return json({ ok: true }, 200, H); }
      case 'unban': { await S.delete('b:' + n); await S.delete('u:' + n); return json({ ok: true }, 200, H); }
      /* v3.2 · a member on a new phone: the name is freed, the next phone to join with it claims it */
      case 'free': { if (!n) return json({ error: 'name' }, 400, H); const had = !!(await S.get('n:' + n)); await S.delete('n:' + n); return json({ ok: true, had }, 200, H); }
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
   feed at the moment of the bet (spreads and totals at the book's price; -110 only when the feed has none), closed at start time. Parlay: one pick per game, any number of games. SGP: every game on it 2+ picks (one per market), priced as
   ddTicketDec says. No ticket pays more than 10,000x its stake. The server
   grades them itself from ESPN finals every 10 minutes; a game it can't find in 3 days is voided and the stake comes back.
   Bought D$ (the store, built but OFF until a lawyer signs off — or the owner's grant) is kept apart: it shows in its own color,
   and the leaderboard ranks EARNED D$ (balance minus everything bought), so nobody buys their way up the board. */
const DD_START = 1000, DD_LEGS = 100, DD_CAP = 10000, DD_SGP = 0.8, DD_JUICE = -110, SLATE_URL = 'https://raw.githubusercontent.com/ironsilkstrategies/ironsilk-weekly/feeds/slate.json';
const ESPN_PATH = { nfl: 'football/nfl', ncaaf: 'football/college-football', nba: 'basketball/nba', ncaab: 'basketball/mens-college-basketball', nhl: 'hockey/nhl', mlb: 'baseball/mlb' };
const ESPN_GROUP = { ncaaf: '&groups=80', ncaab: '&groups=50' };
export const ddDec = p => (p > 0 ? 1 + p / 100 : 1 + 100 / -p);
export const ddWallet = u => (u.dd ? u.dd : { bal: DD_START, bought: 0, w: 0, l: 0, p: 0, staked: 0, back: 0, at: 0 });
/* price one leg from the slate game: {mk:'ml'|'spread'|'total', side:'away'|'home'|'over'|'under'} */
export function ddPrice(g, mk, side) { const ln = g && g.ln; if (!ln) return null;
  if (mk === 'ml') { const p = side === 'away' ? ln.mlA : side === 'home' ? ln.mlH : null; return Number.isFinite(p) && Math.abs(p) >= 100 ? { price: Math.round(p), line: null, pick: `${side === 'away' ? g.a.ab : g.h.ab} ML` } : null; }
  if (mk === 'spread') { if (!Number.isFinite(ln.line) || !ln.fav) return null; const team = side === 'away' ? g.a.ab : side === 'home' ? g.h.ab : null; if (!team) return null;
    const line = team === ln.fav ? -Math.abs(ln.line) : Math.abs(ln.line); const sp2 = side === 'home' ? ln.spH : ln.spA; return { price: Number.isFinite(sp2) ? sp2 : DD_JUICE, line, pick: `${team} ${line > 0 ? '+' : ''}${line}` }; }
  if (mk === 'total') { if (!Number.isFinite(ln.tot) || !['over', 'under'].includes(side)) return null; const tp = side === 'over' ? ln.ov : ln.un; return { price: Number.isFinite(tp) ? tp : DD_JUICE, line: ln.tot, pick: `${side === 'over' ? 'Over' : 'Under'} ${ln.tot}` }; }
  return null; }
/* v3.0.23 · how a ticket pays. Parlay: the legs multiply. SGP (each game 2+ picks): inside one game, a team's moneyline and its
   own spread are one bet (the favorite's spread implies its moneyline; the dog's moneyline implies its spread), and what's
   left pays 80% of the straight-parlay profit, since legs in one game move together. Games multiply with each other. */
export function ddTicketDec(legs, mode) { const G = new Map(); legs.forEach(l => { const a = G.get(l.k) || []; a.push(l); G.set(l.k, a); }); let dec = 1;
  for (const L of G.values()) { if (mode !== 'sgp' || L.length < 2) { dec *= L.reduce((x, l) => x * ddDec(l.price), 1); continue; }
    let eff = L.slice(); const ml = eff.find(l => l.mk === 'ml'), sp = eff.find(l => l.mk === 'spread');
    if (ml && sp && ml.side === sp.side) eff = eff.filter(l => l !== (sp.line < 0 ? ml : sp));
    const prod = eff.reduce((x, l) => x * ddDec(l.price), 1); dec *= eff.length > 1 ? 1 + (prod - 1) * DD_SGP : prod; }
  return Math.round(dec * 10000) / 10000; }
/* v3.0.24 · what a game can hold (Chris, Nov 15): moneyline + total, or spread + total — never moneyline and spread together.
   Hockey on a regular parlay: moneyline + total, or the puck line alone; on an SGP ticket hockey follows the normal rule.
   An SGP needs at least two picks in every game on it. Returns an error string, or '' when the ticket is fine. */
export function ddRules(legs, mode) { const G = new Map(); legs.forEach(l => { const a = G.get(l.k) || []; a.push(l); G.set(l.k, a); });
  for (const L of G.values()) { const mk = L.map(l => l.mk); if (new Set(mk).size !== mk.length) return 'one pick per market in a game';
    if (mk.includes('ml') && mk.includes('spread')) return 'moneyline and spread on the same game don’t go together — pair either one with the total';
    if (mode !== 'sgp' && L[0].sp === 'nhl' && mk.includes('spread') && mk.length > 1) return 'hockey on a parlay: moneyline + total, or the puck line alone (puck line + total takes an SGP)';
    if (mode === 'sgp' && L.length < 2) return 'an SGP needs at least two picks in every game on it'; }
  return ''; }
/* grade one leg against a final score: hit / miss / push */
export function ddGrade(leg, a, h) { if (!Number.isFinite(a) || !Number.isFinite(h)) return null;
  if (leg.mk === 'ml') { if (a === h) return 'push'; return (leg.side === 'home') === (h > a) ? 'hit' : 'miss'; }
  if (leg.mk === 'spread') { const m = (leg.side === 'home' ? h - a : a - h) + leg.line; return m === 0 ? 'push' : m > 0 ? 'hit' : 'miss'; }
  if (leg.mk === 'total') { const t = a + h; return t === leg.line ? 'push' : (leg.side === 'over') === (t > leg.line) ? 'hit' : 'miss'; }
  return null; }
/* settle a whole bet: any miss loses; pushes drop out of the odds; all pushed → stake back */
export function ddSettle(b) { const R = b.legs.map(l => l.res); if (R.includes('miss')) return { status: 'lost', back: 0 }; if (R.some(r => !r)) return null;
  const live = b.legs.filter(l => l.res === 'hit'); if (!live.length) return { status: 'push', back: b.stake };
  const dec = Math.min(DD_CAP, ddTicketDec(live, b.mode)); return { status: 'won', back: Math.round(b.stake * dec * 100) / 100 }; }

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
/* ═══ CHALLENGES + LEAGUES (v3.1.0, Chris, Nov 15: "evolve them both to the 10th power") ════════════════════════════════════
   CHALLENGES · 1,000 of them (chat/chal-lib.mjs: 3/7/14/30 days, five tiers, twelve leg rules, every sport, the machine's routes).
   Starting one opens a run with its own bankroll (free; the wallet isn't touched). Every bet from a run is a normal server-priced,
   server-graded D$ bet that must obey the challenge's rule and sport. Six checkpoints pay XP on the way up; reaching the goal pays
   the challenge's XP and its D$ prize into the wallet. Busted under D$1 with nothing open; expired when time's up. Three live runs
   at a time, one per challenge.
   LEAGUES · run by the desk: the owner opens a league (name, dates, bankroll, prizes, sports). Members join while it's open, get the
   league's own bankroll, and bet it during the league's dates. Ranked by bankroll. When it ends and its bets settle, the podium is
   paid in D$ and XP. Opening leagues to members is one switch (env LG_OPEN = "yes") once the desk says so.
   D$ is play money: prizes are D$, never cash and never exchangeable.
   Routes: GET /acct/chal · POST /acct/chal/join {token,id,route?} · /acct/chal/quit {token,rid} · /acct/chal/route {token,rid,route}
           GET /acct/lgs · GET /acct/lgs/one?id= · POST /acct/lgs/create {token,…} (owner) · /acct/lgs/join {token,id} · /acct/lgs/cancel (owner) */
const RUNS_MAX = 3, LGS_PODIUM_XP = [600, 350, 200], LGS_PLAY_XP = 50, CP_XP = 0.06;
const r2 = n => Math.round(n * 100) / 100;
export const lgStatus = (g, now) => g.cancelled ? 'cancelled' : g.paid ? 'final' : now < g.starts ? 'open' : now < g.ends ? 'live' : 'settling';
export const lgRank = E => E.slice().sort((a, b) => b.bal - a.bal || b.w - a.w || a.joined - b.joined);
export class Accounts {
  constructor(ctx, env, deps = {}) { this.ctx = ctx; this.env = env; this.now = deps.now || (() => Date.now()); this.fetchFn = deps.fetch || null; }
  async fetch(req) { const url = new URL(req.url), p = url.pathname, H = cors(req, this.env);
    try { if (req.method === 'GET' && p === '/acct/board') return this.board(H);
      if (req.method === 'GET' && p === '/acct/chal') return this.chalBoard(H);
      if (req.method === 'GET' && p === '/acct/lgs') return this.lgsList(H);
      if (req.method === 'GET' && p === '/acct/lgs/one') return this.lgsOne(String(url.searchParams.get('id') || ''), H);
      if (req.method === 'GET' && p === '/acct/u') return this.profile(String(url.searchParams.get('name') || ''), H);
      if (req.method !== 'POST') return json({ error: 'not found' }, 404, H);
      const ip = req.headers.get('cf-connecting-ip') || 'unknown'; let b; try { b = await req.json(); } catch (e) { return json({ error: 'body' }, 400, H); }
      if (p === '/acct/board') return this.board(H);
      if (p === '/acct/signup') return this.signup(b, ip, H);
      if (p === '/acct/login') return this.login(b, ip, H);
      const s = await this.pass(b.token); if (!s) return json({ error: 'sign in first' }, 401, H);
      if (p === '/acct/me') return this.me(s, H);
      if (p === '/acct/pub') { const S = this.ctx.storage, u = await S.get('u:' + s.key); if (!u) return json({ error: 'sign in first' }, 401, H); u.pub = b.on === true; u.pubOpen = u.pub && b.open === true; await S.put('u:' + s.key, u); return json({ pub: u.pub, open: u.pubOpen }, 200, H); }
      if (p === '/acct/inbox/send') return this.inboxSend(s, b, H);
      if (p === '/acct/inbox/read') { const S = this.ctx.storage, t = await S.get('ib:' + s.key); if (t) { t.uread = 0; await S.put('ib:' + s.key, t); } return json({ ok: true }, 200, H); }
      if (p === '/acct/admin') return s.owner ? this.admin(s, b, H) : json({ error: 'owner only' }, 403, H);
      if (p === '/acct/bet') return this.bet(s, b, H);
      if (p === '/acct/buy') return this.env.STORE_ON === 'yes' ? json({ error: 'checkout isn’t connected yet' }, 501, H) : json({ error: 'the D$ store opens soon' }, 403, H);
      if (p === '/acct/grant') return this.grant(s, b, H);
      if (p === '/acct/chal/join') return this.chalJoin(s, b, H);
      if (p === '/acct/chal/quit') return this.chalQuit(s, b, H);
      if (p === '/acct/chal/route') return this.chalRoute(s, b, H);
      if (p === '/acct/lgs/create') return this.lgsCreate(s, b, H);
      if (p === '/acct/lgs/join') return this.lgsJoin(s, b, H);
      if (p === '/acct/lgs/cancel') return this.lgsCancel(s, b, H);
      if (p === '/acct/save') return this.save(s, b, H);
      if (p === '/acct/del') { await this.ctx.storage.delete('t:' + s.key + ':' + String(b.id || '')); return json({ ok: true }, 200, H); }
      if (p === '/acct/close') { const S = this.ctx.storage, u = await S.get('u:' + s.key); if (u && u.owner) return json({ error: 'the owner account stays' }, 400, H); if (!u || !(await sameSecret(await passHash(String(b.pass || ''), u.salt), u.hash))) return json({ error: 'that password doesn’t match' }, 403, H);
        for (const pre of ['t:', 'b:', 'o:', 'c:', 'r:']) { const L = await S.list({ prefix: pre + s.key + ':' }); if (L.size) await S.delete([...L.keys()]); }
        { const E = await S.list({ prefix: 'e:' }); const mine = [...E.keys()].filter(k => k.endsWith(':' + s.key)); if (mine.length) await S.delete(mine); }
        await S.delete(['u:' + s.key, 'ib:' + s.key]); return json({ ok: true }, 200, H); }
      if (p === '/acct/logout') { await this.ctx.storage.delete('s:' + b.token); return json({ ok: true }, 200, H); }
      return json({ error: 'not found' }, 404, H);
    } catch (e) { return json({ error: 'server' }, 500, H); } }
  async pass(token) { if (typeof token !== 'string' || token.length < 20) return null; const s = await this.ctx.storage.get('s:' + token); if (!s || s.exp < this.now()) return null;
    if (!s.owner && await this.ctx.storage.get('X:' + s.key)) return null; /* suspended by the desk */
    /* stays signed in while they use it: any visit inside the last 60 days of the pass renews it to a full 90 */
    if (s.exp - this.now() < 60 * 864e5) { s.exp = this.now() + ACCT_DAYS * 864e5; await this.ctx.storage.put('s:' + token, s); } return s; }
  async tooMany(ip) { const t = await this.ctx.storage.get('j:' + ip); return t && t.n >= 8 && this.now() - t.t < 15 * 60e3; }
  async miss(ip) { const S = this.ctx.storage, t = (await S.get('j:' + ip)) || { n: 0, t: this.now() }; await S.put('j:' + ip, { n: (this.now() - t.t < 15 * 60e3 ? t.n : 0) + 1, t: this.now() }); }
  async issue(name, H, owner) { const token = rid(32), exp = this.now() + ACCT_DAYS * 864e5; await this.ctx.storage.put('s:' + token, { name, key: name.toLowerCase(), exp, owner: !!owner }); return json({ token, name, exp, owner: !!owner }, 200, H); }
  async signup(b, ip, H) { if (await this.tooMany(ip)) return json({ error: 'too many tries, wait 15 minutes' }, 429, H);
    const name = String(b.name || '').trim(), pass = String(b.pass || '');
    if (b.age21 !== true) return json({ error: 'TheDesk is for 21 and over' }, 400, H);
    if (!okName(name)) return json({ error: 'pick a username: 2–20 letters or numbers, nothing reserved or rude' }, 400, H);
    if (pass.length < 8 || pass.length > 200) return json({ error: 'use a password of 8 or more characters' }, 400, H);
    const S = this.ctx.storage, k = 'u:' + name.toLowerCase(); if (await S.get(k)) { await this.miss(ip); return json({ error: 'that username is taken' }, 409, H); }
    /* v3.2 · every account starts with D$1,000: at most 10 new ones from one connection a day (a phone network shares addresses, so not fewer) */
    const sk = 'su:' + ip, su = (await S.get(sk)) || { n: 0, t: this.now() }; const fresh = this.now() - su.t < 864e5;
    if (fresh && su.n >= 10) return json({ error: 'too many new accounts from this connection today — try again tomorrow' }, 429, H);
    await S.put(sk, { n: (fresh ? su.n : 0) + 1, t: fresh ? su.t : this.now() });
    const salt = rid(16), src = srcTag(b.src); await S.put(k, { name, salt, hash: await passHash(pass, salt), at: this.now(), age21: true, dd: { ...ddWallet({}), at: this.now() }, ...(src ? { src } : {}) }); this._bd = null; return this.issue(name, H); }
  async login(b, ip, H) { if (await this.tooMany(ip)) return json({ error: 'too many tries, wait 15 minutes' }, 429, H);
    const name = String(b.name || '').trim();
    /* the owner: "TheDesk" + the owner code (the chat's), no sign-up — the account is made the first time */
    if (name.toLowerCase() === 'thedesk') { const admin = this.env.ADMIN_CODE; if (!(typeof admin === 'string' && admin.length >= 24 && await sameSecret(String(b.pass || ''), admin))) { await this.miss(ip); return json({ error: 'that username and password don’t match' }, 403, H); }
      const S = this.ctx.storage; let o = await S.get('u:thedesk'); if (!o) { o = { name: 'TheDesk', owner: true, at: this.now(), age21: true, dd: { ...ddWallet({}), at: this.now() } }; await S.put('u:thedesk', o); this._bd = null; }
      await S.delete('j:' + ip); return this.issue('TheDesk', H, true); }
    const u = await this.ctx.storage.get('u:' + name.toLowerCase());
    if (u && await this.ctx.storage.get('X:' + u.name.toLowerCase())) return json({ error: 'this account is suspended — message the desk on Telegram' }, 403, H);
    const ok = u && !u.owner && await sameSecret(await passHash(String(b.pass || ''), u.salt), u.hash);
    if (!ok) { await this.miss(ip); return json({ error: 'that username and password don’t match' }, 403, H); }
    await this.ctx.storage.delete('j:' + ip); return this.issue(u.name, H); }
  async me(s, H) { const S = this.ctx.storage, u = await S.get('u:' + s.key); if (!u) return json({ error: 'sign in first' }, 401, H);
    if (!u.dd) { u.dd = ddWallet(u); u.dd.at = this.now(); await S.put('u:' + s.key, u); }
    const L = await S.list({ prefix: 't:' + s.key + ':' }); const B = await S.list({ prefix: 'b:' + s.key + ':' });
    if (this.now() - (u.seen || 0) > 5 * 60e3) { u.seen = this.now(); u.visits = (u.visits || 0) + 1; await S.put('u:' + s.key, u); }
    const C = await S.list({ prefix: 'c:' + s.key + ':' }), lg = [], ib = await S.get('ib:' + s.key), cfg = (await S.get('cfg')) || {};
    for (const lid of (u.lgs || [])) { const g = await S.get('G:' + lid), e = await S.get('e:' + lid + ':' + s.key); if (g && e) lg.push({ lid, name: g.name, status: lgStatus(g, this.now()), bal: e.bal, start: e.start, open: e.open || 0, starts: g.starts, ends: g.ends, sports: g.sports || null }); }
    return json({ name: s.name, owner: !!u.owner, since: u.at, wallet: u.dd, store: this.env.STORE_ON === 'yes', tickets: [...L.values()].sort((a, b) => b.ts - a.ts), bets: [...B.values()].sort((a, b) => b.ts - a.ts).slice(0, 100),
      runs: [...C.values()].sort((a, b) => b.ts - a.ts).slice(0, 40), xp: u.xp || 0, rank: rankOf(u.xp || 0), trophies: u.tr || {}, xplog: (u.xpl || []).slice(-20).reverse(), leagues: lg, pub: !!u.pub, pubOpen: !!u.pubOpen, cap: !!u.cap, lgOpen: this.env.LG_OPEN === 'yes' || !!cfg.lgOpen || !!u.owner, inbox: ib ? { msgs: ib.msgs.slice(-50), unread: ib.uread || 0 } : { msgs: [], unread: 0 } }, 200, H); }
  /* XP and D$ prizes land here: XP on the account (with a short log), prizes in the wallet as earned D$ */
  async award(key, xp, prize, why) { const S = this.ctx.storage, u = await S.get('u:' + key); if (!u) return; u.xp = (u.xp || 0) + (xp || 0); u.xpl = [...(u.xpl || []), { t: this.now(), xp: xp || 0, dd: prize || 0, why }].slice(-40);
    if (prize) { const W = ddWallet(u); W.bal = r2(W.bal + prize); W.prize = r2((W.prize || 0) + prize); u.dd = W; } await S.put('u:' + key, u); this._bd = null; }
  async slate() { if (this._sl && this.now() - this._sl.t < 5 * 60e3) return this._sl.v; const f = this.fetchFn || fetch; const r = await f(SLATE_URL, { cf: { cacheTtl: 120 } }); if (!r.ok) throw new Error('slate');
    const v = await r.json(); const G = new Map(); (v.days || []).forEach(d => (d.games || []).forEach(g => G.set(g.k, g))); this._sl = { t: this.now(), v: G }; return G; }
  async bet(s, b, H) { if (!Array.isArray(b.legs) || !b.legs.length) return json({ error: 'add a leg' }, 400, H);
    /* v3.2 · the lines first: a Durable Object lets another request in only while it waits on outside I/O, so with the fetch up here every
       read-check-write of the wallet below is atomic. (Fetched after the read, two bets sent at once could both spend the same balance.) */
    let G; try { G = await this.slate(); } catch (e) { return json({ error: 'the lines can’t be reached right now — try again in a minute' }, 503, H); }
    const S = this.ctx.storage, u = await S.get('u:' + s.key); if (!u) return json({ error: 'sign in first' }, 401, H); const W = ddWallet(u);
    const rk = b.run ? 'c:' + s.key + ':' + String(b.run).replace(/[^a-z0-9]/gi, '').slice(0, 24) : null, run = rk ? await S.get(rk) : null;
    if (rk && (!run || run.status !== 'live')) return json({ error: 'that challenge run is over' }, 400, H);
    if (run && run.ends <= this.now()) return json({ error: 'time’s up on that run — no new bets' }, 400, H);
    const lid = !run && b.league ? String(b.league).replace(/[^a-z0-9]/gi, '').slice(0, 24) : null, lg = lid ? await S.get('G:' + lid) : null, ek = lid ? 'e:' + lid + ':' + s.key : null, ent = ek ? await S.get(ek) : null;
    if (lid) { if (!lg || !ent) return json({ error: 'join that league first' }, 400, H); const st = lgStatus(lg, this.now()); if (st === 'open') return json({ error: `${lg.name} hasn’t started yet` }, 400, H); if (st !== 'live') return json({ error: `${lg.name} is over — no new bets` }, 400, H); }
    const pot = run ? run.bal : ent ? ent.bal : W.bal;
    const stake = Math.round(+b.stake * 100) / 100; if (!(stake >= 1)) return json({ error: 'the smallest bet is D$1' }, 400, H); if (stake > pot) return json({ error: `${run ? 'this run has' : 'you have'} D$${pot.toLocaleString('en-US')}` }, 400, H);
    const want = Array.isArray(b.legs) ? b.legs.slice(0, DD_LEGS + 1) : []; if (!want.length) return json({ error: 'add a leg' }, 400, H); if (want.length > DD_LEGS) return json({ error: `up to ${DD_LEGS} legs` }, 400, H);
    const mode = b.mode === 'sgp' ? 'sgp' : 'parlay', seen = new Set(), per = new Map(), legs = [];
    for (const w of want) { const k = String(w.k || ''); const g = G.get(k); if (!g) return json({ error: 'that game isn’t on the board' }, 400, H);
      if (!['ml', 'spread', 'total'].includes(w.mk)) return json({ error: 'that line isn’t available' }, 400, H);
      per.set(k, (per.get(k) || 0) + 1);
      if (!(g.t > this.now() + 60e3)) return json({ error: `${g.a.ab} at ${g.h.ab} has started — bets are closed` }, 400, H);
      const pr = ddPrice(g, w.mk, w.side); if (!pr) return json({ error: 'that line isn’t available' }, 400, H);
      legs.push({ k, sp: g.sp, t: g.t, game: g.a.ab + '@' + g.h.ab, mk: w.mk, side: w.side, line: pr.line, price: pr.price, pick: pr.pick, res: null }); }
    { const bad = ddRules(legs, mode); if (bad) return json({ error: bad }, 400, H); }
    if (run) { const c = chal(run.cid); const bad = c && ruleCheck(c, legs); if (bad) return json({ error: bad }, 400, H); }
    if (lg) { if (lg.sports && legs.some(l => !lg.sports.includes(l.sp))) return json({ error: `${lg.name} is ${lg.sports.map(x => x.toUpperCase()).join(' / ')} only` }, 400, H);
      if (legs.some(l => l.t > lg.ends)) return json({ error: `every game has to start before ${lg.name} ends` }, 400, H); }
    const dec = ddTicketDec(legs, mode), id = this.now().toString(36) + rid(4);
    if (dec > DD_CAP) return json({ error: `that ticket pays over ${DD_CAP.toLocaleString('en-US')}x — the most any ticket can pay is ${DD_CAP.toLocaleString('en-US')}x the stake` }, 400, H);
    const bet = { id, ts: this.now(), stake, mode, dec: Math.round(dec * 1000) / 1000, toWin: Math.round(stake * (dec - 1) * 100) / 100, legs, status: 'open' };
    if (run) { bet.run = run.rid; bet.cid = run.cid; run.bal = r2(run.bal - stake); run.open = (run.open || 0) + 1; run.bets = (run.bets || 0) + 1; run.last = this.now(); await S.put(rk, run); }
    else if (ent) { bet.lg = lid; ent.bal = r2(ent.bal - stake); ent.open = (ent.open || 0) + 1; ent.bets = (ent.bets || 0) + 1; await S.put(ek, ent); this._lgs = null; }
    else { W.bal = r2(W.bal - stake); W.staked = r2(W.staked + stake); u.dd = W; await S.put('u:' + s.key, u); }
    await S.put('b:' + s.key + ':' + id, bet); await S.put('o:' + s.key + ':' + id, 1); this._bd = null; this._ch = null; await this.wake();
    return json({ bet, wallet: W, run: run || null, entry: ent ? { lid, ...ent } : null }, 200, H); }
  async wake() { try { const a = await this.ctx.storage.getAlarm(); if (a == null) await this.ctx.storage.setAlarm(this.now() + 10 * 60e3); } catch (e) { } }
  async scores(sp, day) { const k = sp + day; this._sc = this._sc || new Map(); const c = this._sc.get(k); if (c && this.now() - c.t < 5 * 60e3) return c.v;
    const f = this.fetchFn || fetch; const r = await f(`https://site.api.espn.com/apis/site/v2/sports/${ESPN_PATH[sp]}/scoreboard?dates=${day}&limit=400${ESPN_GROUP[sp] || ''}`); const v = new Map();
    if (r.ok) { const j = await r.json(); (j.events || []).forEach(e => { const c0 = e.competitions && e.competitions[0]; if (!c0) return; const A = c0.competitors.find(x => x.homeAway === 'away'), Hm = c0.competitors.find(x => x.homeAway === 'home');
      if (!A || !Hm) return; v.set(A.team.abbreviation + '@' + Hm.team.abbreviation, { done: !!(c0.status && c0.status.type && c0.status.type.completed), a: +A.score, h: +Hm.score }); }); }
    this._sc.set(k, { t: this.now(), v }); return v; }
  async alarm() { const S = this.ctx.storage, O = await S.list({ prefix: 'o:' }); const dayOf = t => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date(t)).replace(/-/g, '');
    for (const ok of O.keys()) { const [, key, id] = ok.split(':'); const bk = 'b:' + key + ':' + id, bet = await S.get(bk); if (!bet || bet.status !== 'open') { await S.delete(ok); continue; }
      let changed = false; for (const l of bet.legs) { if (l.res || l.t > this.now()) continue; let sc = null; try { sc = (await this.scores(l.sp, dayOf(l.t))).get(l.game); } catch (e) { }
        if (sc && sc.done) { l.res = ddGrade(l, sc.a, sc.h); changed = true; }
        /* a total that's already decided mid-game: an over past the line has won, an under past it has lost — no need to wait for the final */
        else if (sc && l.mk === 'total' && Number.isFinite(sc.a) && Number.isFinite(sc.h) && Number.isFinite(l.line) && sc.a + sc.h > l.line) { l.res = l.side === 'over' ? 'hit' : 'miss'; l.early = true; changed = true; } else if (this.now() - l.t > 3 * 864e5) { l.res = 'push'; l.void = true; changed = true; } }
      const fin = ddSettle(bet); if (!changed && !fin) continue;
      if (fin) { bet.status = fin.status; bet.back = fin.back; bet.done = this.now(); const tally = o => { if (fin.status === 'won') o.w++; else if (fin.status === 'lost') o.l++; else o.p++; };
        if (bet.run) { const rk = 'c:' + key + ':' + bet.run, run = await S.get(rk); if (run) { run.bal = r2(run.bal + fin.back); run.open = Math.max(0, (run.open || 1) - 1); run.w = run.w || 0; run.l = run.l || 0; run.p = run.p || 0; tally(run);
            run.peak = Math.max(run.peak || run.start, run.bal); await S.put(rk, run); await this.runCheck(key, run); } }
        else if (bet.lg) { const ek = 'e:' + bet.lg + ':' + key, e = await S.get(ek); if (e) { e.bal = r2(e.bal + fin.back); e.open = Math.max(0, (e.open || 1) - 1); e.w = e.w || 0; e.l = e.l || 0; e.p = e.p || 0; tally(e); e.peak = Math.max(e.peak || e.start, e.bal); await S.put(ek, e); this._lgs = null; } }
        else { const u = await S.get('u:' + key); if (u) { const W = ddWallet(u); W.bal = r2(W.bal + fin.back); W.back = r2(W.back + fin.back); tally(W); u.dd = W; await S.put('u:' + key, u); } }
        await S.delete(ok); this._bd = null; this._ch = null; }
      await S.put(bk, bet); }
    /* challenge runs whose clock ran out */
    for (const [rk2] of await S.list({ prefix: 'r:' })) { const [, key, rid2] = rk2.split(':'); const run = await S.get('c:' + key + ':' + rid2); if (!run || run.status !== 'live') { await S.delete(rk2); continue; } await this.runCheck(key, run); }
    /* leagues that ended: pay the podium once every bet in them has settled (or three days on) */
    for (const [gk] of await S.list({ prefix: 'Gp:' })) { const lid = gk.slice(3), g = await S.get('G:' + lid); if (!g || g.paid || g.cancelled) { await S.delete(gk); continue; } if (this.now() < g.ends) continue;
      const E = [...(await S.list({ prefix: 'e:' + lid + ':' })).entries()]; if (E.some(([, e]) => e.open) && this.now() - g.ends < 3 * 864e5) continue; await this.lgsPay(lid, g, E); await S.delete(gk); }
    if ((await S.list({ prefix: 'o:', limit: 1 })).size || (await S.list({ prefix: 'r:', limit: 1 })).size || (await S.list({ prefix: 'Gp:', limit: 1 })).size) await S.setAlarm(this.now() + 10 * 60e3); }
  /* a run moves: checkpoints pay XP as it climbs; it ends won at the goal, busted under D$1 with nothing open, expired at the clock */
  async runCheck(key, run) { if (run.status !== 'live') return; const S = this.ctx.storage, c = chal(run.cid); let end = null;
    if (c) { const cps = checkpoints(c); let hit = run.cp || 0; while (hit < cps.length - 1 && run.bal >= cps[hit].amt) hit++;
      if (hit > (run.cp || 0)) { const xp = Math.round(c.xp * CP_XP * (hit - (run.cp || 0))); run.cp = hit; run.xp = (run.xp || 0) + xp; await S.put('c:' + key + ':' + run.rid, run); await this.award(key, xp, 0, `🚩 ${c.name}: ${cps[hit - 1].name}`); } }
    if (run.bal >= run.goal) end = 'won'; else if (run.bal < 1 && !run.open) end = 'busted'; else if (run.ends <= this.now() && !run.open) end = 'expired';
    if (!end) return; run.status = end; run.done = this.now(); if (end === 'won' && c) { run.cp = 6; run.xp = (run.xp || 0) + c.xp; run.paid = c.prize; }
    await S.put('c:' + key + ':' + run.rid, run); await S.delete('r:' + key + ':' + run.rid);
    if (end === 'won' && c) { await this.award(key, c.xp, c.prize, `🏆 ${c.name}`); const u = await S.get('u:' + key); if (u) { u.tr = u.tr || {}; u.tr[c.tier] = (u.tr[c.tier] || 0) + 1; u.trd = (u.trd || 0) + 1; await S.put('u:' + key, u); } }
    await S.put('cx:' + String(run.done).padStart(14, '0') + ':' + key, { name: run.name, cid: run.cid, cname: c ? c.name : run.cid, tier: c ? c.tier : null, status: end, bal: run.bal, goal: run.goal, took: run.done - run.ts, bets: run.bets || 0, prize: run.paid || 0 });
    const X = await S.list({ prefix: 'cx:' }); if (X.size > 80) await S.delete([...X.keys()].slice(0, X.size - 80)); this._ch = null; }
  async chalJoin(s, b, H) { const S = this.ctx.storage, u = await S.get('u:' + s.key), c = chal(b.id); if (!u) return json({ error: 'sign in first' }, 401, H); if (!c || !inLib(c.id)) return json({ error: 'no such challenge' }, 400, H);
    const live = [...(await S.list({ prefix: 'c:' + s.key + ':' })).values()].filter(r => r.status === 'live');
    if (live.some(r => r.cid === c.id)) return json({ error: 'you’re already running this one' }, 400, H); if (live.length >= RUNS_MAX) return json({ error: `${RUNS_MAX} runs at a time — finish or quit one first` }, 400, H);
    const route = ROUTES[b.route] ? b.route : c.route, rid2 = this.now().toString(36) + rid(4);
    const run = { rid: rid2, cid: c.id, name: u.name, ts: this.now(), ends: this.now() + c.days * 864e5, start: c.start, bal: c.start, goal: c.goal, peak: c.start, route, status: 'live', open: 0, bets: 0, w: 0, l: 0, p: 0, cp: 0, xp: 0 };
    await S.put('c:' + s.key + ':' + rid2, run); await S.put('r:' + s.key + ':' + rid2, 1); await this.wake(); this._ch = null; return json({ run }, 200, H); }
  async chalRoute(s, b, H) { const S = this.ctx.storage, rk = 'c:' + s.key + ':' + String(b.rid || '').replace(/[^a-z0-9]/gi, ''), run = await S.get(rk); if (!run || run.status !== 'live') return json({ error: 'that run is over' }, 400, H);
    if (!ROUTES[b.route]) return json({ error: 'no such route' }, 400, H); run.route = b.route; await S.put(rk, run); return json({ run }, 200, H); }
  async chalQuit(s, b, H) { const S = this.ctx.storage, rk = 'c:' + s.key + ':' + String(b.rid || '').replace(/[^a-z0-9]/gi, ''), run = await S.get(rk); if (!run || run.status !== 'live') return json({ error: 'that run is already over' }, 400, H);
    run.status = 'quit'; run.done = this.now(); await S.put(rk, run); await S.delete('r:' + s.key + ':' + run.rid); this._ch = null; return json({ run }, 200, H); }
  async chalBoard(H) { if (!this._ch || this.now() - this._ch.t > 60e3) { const S = this.ctx.storage, all = [...(await S.list({ prefix: 'c:' })).values()], now = this.now();
      const by = {}; all.forEach(r => { const o = by[r.cid] = by[r.cid] || { live: 0, tries: 0, won: 0, fast: null }; if (r.status === 'live') o.live++; else if (r.status !== 'quit') { o.tries++; if (r.status === 'won') { o.won++; const t = r.done - r.ts; if (!o.fast || t < o.fast.took) o.fast = { name: r.name, took: t }; } } });
      const leaders = all.filter(r => r.status === 'live' && r.ends > now).map(r => ({ name: r.name, cid: r.cid, bal: r.bal, goal: r.goal, start: r.start, ends: r.ends, cp: r.cp || 0, pct: Math.round(1000 * Math.max(0, Math.log(Math.max(r.bal, 1) / r.start)) / Math.log(r.goal / r.start)) / 10 })).sort((a, b) => b.pct - a.pct).slice(0, 15);
      const recent = [...(await S.list({ prefix: 'cx:' })).entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 20).map(e => e[1]);
      const U = [...(await S.list({ prefix: 'u:' })).values()].filter(u => u.xp).map(u => ({ name: u.name, xp: u.xp, rank: rankOf(u.xp).name, won: u.trd || 0 })).sort((a, b) => b.xp - a.xp).slice(0, 15);
      this._ch = { t: now, v: { by, leaders, recent, xp: U, totals: { live: all.filter(r => r.status === 'live').length, won: all.filter(r => r.status === 'won').length } } }; }
    return json(this._ch.v, 200, H); }
  /* ── leagues: the desk runs them ── */
  async lgsCreate(s, b, H) { const S = this.ctx.storage, u = await S.get('u:' + s.key); if (!u) return json({ error: 'sign in first' }, 401, H);
    if (!s.owner && this.env.LG_OPEN !== 'yes' && !(((await S.get('cfg')) || {}).lgOpen)) return json({ error: 'leagues are opened by the desk for now' }, 403, H);
    const name = str(b.name, 40); if (name.length < 3) return json({ error: 'give the league a name' }, 400, H); if (clean(name) !== name) return json({ error: 'pick a cleaner name' }, 400, H);
    const starts = +b.starts, ends = +b.ends; if (!(starts > this.now() - 864e5 && ends > starts + 36e5 && ends - starts <= 120 * 864e5)) return json({ error: 'check the dates (an hour to 120 days)' }, 400, H);
    const bank = Math.round(+b.bank || 1000); if (!(bank >= 100 && bank <= 100000)) return json({ error: 'bankroll D$100 to D$100,000' }, 400, H);
    const prizes = (Array.isArray(b.prizes) ? b.prizes : []).slice(0, 10).map(x => Math.round(+x)).filter(x => x > 0 && x <= 1e6); if (!prizes.length) return json({ error: 'set at least a first-place prize' }, 400, H);
    if (!s.owner && prizes.reduce((a, x) => a + x, 0) > 0) return json({ error: 'only the desk puts up D$ prizes' }, 403, H);
    const sports = Array.isArray(b.sports) ? b.sports.filter(x => ESPN_PATH[x]).slice(0, 6) : []; const lid = this.now().toString(36) + rid(4);
    const g = { lid, name, blurb: str(b.blurb, 160), starts, ends, bank, prizes, sports: sports.length ? sports : null, max: Math.min(5000, Math.max(2, Math.round(+b.max || 500))), late: b.late !== false, by: s.name, official: !!s.owner, at: this.now(), n: 0 };
    await S.put('G:' + lid, g); await S.put('Gp:' + lid, 1); await this.wake(); this._lgs = null; return json({ league: g }, 200, H); }
  async lgsCancel(s, b, H) { if (!s.owner) return json({ error: 'owner only' }, 403, H); const S = this.ctx.storage, g = await S.get('G:' + String(b.id || '')); if (!g) return json({ error: 'no such league' }, 404, H);
    if (lgStatus(g, this.now()) !== 'open') return json({ error: 'only a league that hasn’t started can be cancelled' }, 400, H); g.cancelled = true; await S.put('G:' + g.lid, g); await S.delete('Gp:' + g.lid); this._lgs = null; return json({ league: g }, 200, H); }
  async lgsJoin(s, b, H) { const S = this.ctx.storage, u = await S.get('u:' + s.key), lid = String(b.id || '').replace(/[^a-z0-9]/gi, ''), g = await S.get('G:' + lid); if (!u) return json({ error: 'sign in first' }, 401, H); if (!g) return json({ error: 'no such league' }, 404, H);
    const st = lgStatus(g, this.now()); if (!(st === 'open' || (st === 'live' && g.late))) return json({ error: 'that league isn’t taking new players' }, 400, H);
    const ek = 'e:' + lid + ':' + s.key; if (await S.get(ek)) return json({ error: 'you’re already in' }, 400, H); if ((g.n || 0) >= g.max) return json({ error: 'that league is full' }, 400, H);
    const e = { name: u.name, bal: g.bank, start: g.bank, peak: g.bank, w: 0, l: 0, p: 0, open: 0, bets: 0, joined: this.now() }; await S.put(ek, e);
    g.n = (g.n || 0) + 1; await S.put('G:' + lid, g); u.lgs = [...(u.lgs || []).filter(x => x !== lid), lid].slice(-30); await S.put('u:' + s.key, u); this._lgs = null; return json({ league: g, entry: { lid, ...e } }, 200, H); }
  async lgsPay(lid, g, E) { const S = this.ctx.storage, R = lgRank(E.map(([k, e]) => ({ ...e, key: k.split(':').pop() }))).filter(e => e.bets > 0);
    for (let i = 0; i < R.length; i++) { const prize = g.prizes[i] || 0, xp = (LGS_PODIUM_XP[i] || 0) + LGS_PLAY_XP; await this.award(R[i].key, xp, prize, `${i < 3 ? ['🥇', '🥈', '🥉'][i] : '🏟'} ${g.name}: #${i + 1}`); R[i].prize = prize; R[i].place = i + 1; }
    g.paid = true; g.final = this.now(); g.results = R.slice(0, 25).map(e => ({ name: e.name, bal: e.bal, start: e.start, w: e.w, l: e.l, p: e.p, prize: e.prize || 0, place: e.place })); await S.put('G:' + lid, g); this._lgs = null; }
  async lgsList(H) { if (!this._lgs || this.now() - this._lgs.t > 30e3) { const S = this.ctx.storage, now = this.now(), G = [...(await S.list({ prefix: 'G:' })).values()].filter(g => !g.cancelled), out = [];
      for (const g of G) { const st = lgStatus(g, now); const top = st === 'final' ? (g.results || []).slice(0, 3) : lgRank([...(await S.list({ prefix: 'e:' + g.lid + ':' })).values()]).slice(0, 3).map(e => ({ name: e.name, bal: e.bal, start: e.start }));
        out.push({ lid: g.lid, name: g.name, blurb: g.blurb, starts: g.starts, ends: g.ends, bank: g.bank, prizes: g.prizes, pool: g.prizes.reduce((a, x) => a + x, 0), sports: g.sports, n: g.n || 0, max: g.max, late: g.late, official: g.official, status: st, top }); }
      const order = { live: 0, open: 1, settling: 2, final: 3 }; out.sort((a, b) => order[a.status] - order[b.status] || (a.status === 'final' ? b.ends - a.ends : a.starts - b.starts));
      this._lgs = { t: now, v: { leagues: out, open: this.env.LG_OPEN === 'yes' || !!(((await S.get('cfg')) || {}).lgOpen) } }; }
    return json(this._lgs.v, 200, H); }
  async lgsOne(lid, H) { const S = this.ctx.storage, g = await S.get('G:' + lid.replace(/[^a-z0-9]/gi, '')); if (!g || g.cancelled) return json({ error: 'no such league' }, 404, H);
    const st = lgStatus(g, this.now()), rows = st === 'final' ? g.results : lgRank([...(await S.list({ prefix: 'e:' + g.lid + ':' })).values()]).slice(0, 200).map(e => ({ name: e.name, bal: e.bal, start: e.start, peak: e.peak, w: e.w, l: e.l, p: e.p, open: e.open || 0, bets: e.bets || 0 }));
    return json({ league: { ...g, results: undefined, status: st, pool: g.prizes.reduce((a, x) => a + x, 0) }, rows }, 200, H); }
  /* ── the subscriber inbox: members write to the desk, the desk writes back (one thread per member) ── */
  async inboxSend(s, b, H) { const S = this.ctx.storage, u = await S.get('u:' + s.key); if (!u) return json({ error: 'sign in first' }, 401, H); if (s.owner) return json({ error: 'reply from the admin inbox' }, 400, H);
    const text = clean(String(b.text || '').replace(/[<>]/g, '').trim()).slice(0, 1000); if (text.length < 2) return json({ error: 'write a message' }, 400, H);
    const t = (await S.get('ib:' + s.key)) || { name: u.name, msgs: [], unread: 0, uread: 0 }, today = t.msgs.filter(m => m.from === 'me' && this.now() - m.t < 864e5).length;
    if (today >= 20) return json({ error: 'that’s 20 messages today — the desk will get back to you' }, 429, H);
    t.msgs.push({ from: 'me', text, t: this.now() }); t.msgs = t.msgs.slice(-200); t.unread = (t.unread || 0) + 1; t.last = this.now(); t.name = u.name; await S.put('ib:' + s.key, t); return json({ inbox: { msgs: t.msgs.slice(-50), unread: t.uread || 0 } }, 200, H); }
  /* ── the owner's dashboard ── */
  async admin(s, b, H) { const S = this.ctx.storage, now = this.now(), key = String(b.name || '').trim().toLowerCase(), act = String(b.act || '');
    const room = async body => { if (!this.env.ROOM) return null; try { const r = await this.env.ROOM.get(this.env.ROOM.idFromName('lounge')).fetch(new Request('https://x/chat/adm', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...body, admin: this.env.ADMIN_CODE }) })); return await r.json(); } catch (e) { return null; } };
    const need = async () => { const u = await S.get('u:' + key); if (!u) throw Object.assign(new Error('no such member'), { st: 404 }); return u; };
    try { switch (act) {
      case 'stats': { const U = [...(await S.list({ prefix: 'u:' })).values()], X = new Set([...(await S.list({ prefix: 'X:' })).keys()].map(k => k.slice(2))), O = await S.list({ prefix: 'o:' }), Bt = [...(await S.list({ prefix: 'b:' })).values()];
        const C = [...(await S.list({ prefix: 'c:' })).values()], G = [...(await S.list({ prefix: 'G:' })).values()], IB = [...(await S.list({ prefix: 'ib:' })).values()], cfg = (await S.get('cfg')) || {};
        const d = n => now - n * 864e5, W = u => ddWallet(u), sum = f => Math.round(U.reduce((a, u) => a + (f(u) || 0), 0) * 100) / 100;
        const days = []; for (let i = 13; i >= 0; i--) { const a = new Date(now - i * 864e5).toISOString().slice(0, 10); days.push({ d: a, n: U.filter(u => new Date(u.at || 0).toISOString().slice(0, 10) === a).length, act: U.filter(u => u.seen && new Date(u.seen).toISOString().slice(0, 10) === a).length }); }
        const live = G.filter(g => !g.cancelled && lgStatus(g, now) === 'live').length;
        const users = U.map(u => { const w = W(u); return { name: u.name, owner: !!u.owner, at: u.at || 0, seen: u.seen || 0, visits: u.visits || 0, bal: w.bal, bought: w.bought || 0, prize: w.prize || 0, w: w.w, l: w.l, staked: w.staked || 0, xp: u.xp || 0, rank: rankOf(u.xp || 0).name, runs: C.filter(r => r.name === u.name && r.status === 'live').length, lgs: (u.lgs || []).length, sus: X.has(u.name.toLowerCase()), note: u.note || '', tg: u.tg || null, src: u.src || null, pub: !!u.pub, cap: !!u.cap }; });
        const bySrc = {}, src7 = {}; U.filter(u => !u.owner).forEach(u => { const t = u.src || 'direct'; bySrc[t] = (bySrc[t] || 0) + 1; if ((u.at || 0) > d(7)) src7[t] = (src7[t] || 0) + 1; });
        const chat = await room({ act: 'list' });
        return json({ k: { members: U.length, new1: U.filter(u => (u.at || 0) > d(1)).length, new7: U.filter(u => (u.at || 0) > d(7)).length, act1: U.filter(u => (u.seen || 0) > d(1)).length, act7: U.filter(u => (u.seen || 0) > d(7)).length,
            dd: sum(u => W(u).bal), bought: sum(u => W(u).bought), prizes: sum(u => W(u).prize), staked: sum(u => W(u).staked), open: O.size, bets: Bt.length, settled: Bt.filter(x => x.status !== 'open').length,
            runs: C.filter(r => r.status === 'live').length, runsWon: C.filter(r => r.status === 'won').length, lgLive: live, lgAll: G.filter(g => !g.cancelled).length, unread: IB.reduce((a, t) => a + (t.unread || 0), 0), threads: IB.length, sus: X.size,
            chatDay: chat ? chat.day : null, chatTotal: chat ? chat.total : null, bans: chat ? chat.bans.length : null, paid: null, bySrc, src7 },
          days, users: users.sort((a, b) => b.seen - a.seen || b.at - a.at), cfg: { lgOpen: !!cfg.lgOpen, envOpen: this.env.LG_OPEN === 'yes', store: this.env.STORE_ON === 'yes' } }, 200, H); }
      case 'user': { const u = await need(), B = [...(await S.list({ prefix: 'b:' + key + ':' })).values()].sort((a, b) => b.ts - a.ts), C = [...(await S.list({ prefix: 'c:' + key + ':' })).values()].sort((a, b) => b.ts - a.ts), lg = [];
        for (const lid of (u.lgs || [])) { const g = await S.get('G:' + lid), e = await S.get('e:' + lid + ':' + key); if (g && e) lg.push({ lid, name: g.name, status: lgStatus(g, now), bal: e.bal, start: e.start, w: e.w, l: e.l }); }
        const ses = [...(await S.list({ prefix: 's:' })).values()].filter(x => x.key === key && x.exp > now).length;
        return json({ user: { name: u.name, owner: !!u.owner, at: u.at, seen: u.seen || 0, visits: u.visits || 0, src: u.src || null, pub: !!u.pub, cap: !!u.cap, wallet: ddWallet(u), xp: u.xp || 0, rank: rankOf(u.xp || 0), trophies: u.tr || {}, xplog: (u.xpl || []).slice(-20).reverse(), note: u.note || '', sus: !!(await S.get('X:' + key)), sessions: ses },
          bets: B.slice(0, 40), runs: C.slice(0, 20), leagues: lg, inbox: ((await S.get('ib:' + key)) || { msgs: [] }).msgs.slice(-50) }, 200, H); }
      case 'grant': case 'take': { const u = await need(), amt = Math.round(+b.amount * 100) / 100; if (!(amt > 0 && amt <= 1e6)) return json({ error: 'amount' }, 400, H); const w = ddWallet(u);
        if (act === 'grant') { w.bal = Math.round((w.bal + amt) * 100) / 100; if (b.kind === 'prize') w.prize = Math.round(((w.prize || 0) + amt) * 100) / 100; else w.bought = Math.round(((w.bought || 0) + amt) * 100) / 100; }
        else { w.bal = Math.max(0, Math.round((w.bal - amt) * 100) / 100); } u.dd = w; u.xpl = [...(u.xpl || []), { t: now, xp: 0, dd: act === 'grant' ? amt : -amt, why: act === 'grant' ? (b.kind === 'prize' ? '🎁 From the desk' : '➕ Added by the desk') : '➖ Adjusted by the desk' }].slice(-40); await S.put('u:' + key, u); this._bd = null; return json({ wallet: w }, 200, H); }
      case 'xp': { const u = await need(), n = Math.round(+b.amount); if (!n || Math.abs(n) > 100000) return json({ error: 'amount' }, 400, H); u.xp = Math.max(0, (u.xp || 0) + n); u.xpl = [...(u.xpl || []), { t: now, xp: n, dd: 0, why: n > 0 ? '⭐ Bonus from the desk' : 'XP adjusted by the desk' }].slice(-40); await S.put('u:' + key, u); return json({ xp: u.xp }, 200, H); }
      case 'note': { const u = await need(); u.note = str(b.note, 300); await S.put('u:' + key, u); return json({ ok: true }, 200, H); }
      case 'cap': { const u = await need(); u.cap = b.on === true; if (u.cap) u.pub = true; await S.put('u:' + key, u); this._bd = null; return json({ ok: true, cap: u.cap, pub: !!u.pub }, 200, H); }
      case 'suspend': { const u = await need(); if (u.owner) return json({ error: 'not the owner' }, 400, H); await S.put('X:' + key, { at: now, why: str(b.why, 200) }); const ses = [...(await S.list({ prefix: 's:' }))].filter(([, v]) => v.key === key).map(([k]) => k); if (ses.length) await S.delete(ses); await room({ act: 'ban', name: u.name }); return json({ ok: true }, 200, H); }
      case 'unsuspend': { await S.delete('X:' + key); await room({ act: 'unban', name: key }); return json({ ok: true }, 200, H); }
      case 'signout': { const ses = [...(await S.list({ prefix: 's:' }))].filter(([, v]) => v.key === key && !v.owner).map(([k]) => k); if (ses.length) await S.delete(ses); return json({ ok: true, n: ses.length }, 200, H); }
      case 'delete': { const u = await need(); if (u.owner) return json({ error: 'the owner account stays' }, 400, H);
        for (const pre of ['t:', 'b:', 'o:', 'c:', 'r:']) { const L = await S.list({ prefix: pre + key + ':' }); if (L.size) await S.delete([...L.keys()]); }
        { const E = await S.list({ prefix: 'e:' }); const mine = [...E.keys()].filter(k => k.endsWith(':' + key)); if (mine.length) await S.delete(mine); }
        const ses = [...(await S.list({ prefix: 's:' }))].filter(([, v]) => v.key === key).map(([k]) => k); if (ses.length) await S.delete(ses); await S.delete(['u:' + key, 'ib:' + key, 'X:' + key]); this._bd = null; return json({ ok: true }, 200, H); }
      case 'inbox': { const T = [...(await S.list({ prefix: 'ib:' }))].map(([k, t]) => ({ key: k.slice(3), name: t.name, last: t.last || 0, unread: t.unread || 0, n: t.msgs.length, preview: (t.msgs[t.msgs.length - 1] || {}).text || '', from: (t.msgs[t.msgs.length - 1] || {}).from })).sort((a, b) => b.unread - a.unread || b.last - a.last); return json({ threads: T }, 200, H); }
      case 'thread': { const t = await S.get('ib:' + key); if (!t) return json({ thread: { name: b.name, msgs: [] } }, 200, H); t.unread = 0; await S.put('ib:' + key, t); return json({ thread: { name: t.name, msgs: t.msgs.slice(-100) } }, 200, H); }
      case 'reply': { const u = await need(), text = String(b.text || '').replace(/[<>]/g, '').trim().slice(0, 2000); if (!text) return json({ error: 'write a reply' }, 400, H);
        const t = (await S.get('ib:' + key)) || { name: u.name, msgs: [], unread: 0, uread: 0 }; t.msgs.push({ from: 'desk', text, t: now }); t.msgs = t.msgs.slice(-200); t.uread = (t.uread || 0) + 1; t.unread = 0; t.last = now; await S.put('ib:' + key, t); return json({ thread: { name: t.name, msgs: t.msgs.slice(-100) } }, 200, H); }
      case 'broadcast': { const text = String(b.text || '').replace(/[<>]/g, '').trim().slice(0, 2000); if (!text) return json({ error: 'write a message' }, 400, H); const U = [...(await S.list({ prefix: 'u:' }))].filter(([, u]) => !u.owner); let n = 0;
        for (const [k, u] of U) { const kk = k.slice(2), t = (await S.get('ib:' + kk)) || { name: u.name, msgs: [], unread: 0, uread: 0 }; t.msgs.push({ from: 'desk', text, t: now, all: true }); t.msgs = t.msgs.slice(-200); t.uread = (t.uread || 0) + 1; t.last = Math.max(t.last || 0, 0) || now; await S.put('ib:' + kk, t); n++; } return json({ ok: true, n }, 200, H); }
      case 'chat': { const r = await room({ act: b.sub || 'list', id: b.id, name: b.name, mins: b.mins, uses: b.uses, code: b.code }); return r ? json(r, 200, H) : json({ error: 'the chat can’t be reached' }, 503, H); }
      case 'cfg': { const c = (await S.get('cfg')) || {}; if (typeof b.lgOpen === 'boolean') c.lgOpen = b.lgOpen; await S.put('cfg', c); this._lgs = null; return json({ cfg: c }, 200, H); }
      default: return json({ error: 'unknown action' }, 400, H); }
    } catch (e) { return json({ error: e.message || 'server' }, e.st || 500, H); } }
  async board(H) { if (this._bd && this.now() - this._bd.t < 60e3) return json(this._bd.v, 200, H); const U = await this.ctx.storage.list({ prefix: 'u:' });
    const rows = [...U.values()].map(u => { const W = ddWallet(u); return { name: u.name, bal: W.bal, bought: W.bought, earned: Math.round((W.bal - W.bought) * 100) / 100, w: W.w, l: W.l, roi: W.staked ? Math.round(1000 * (W.back - W.staked) / W.staked) / 10 : null, ...(u.pub || u.cap ? { pub: true } : {}), ...(u.cap ? { cap: true } : {}) }; })
      .sort((a, b) => b.earned - a.earned).slice(0, 50); const v = { rows, n: U.size }; this._bd = { t: this.now(), v }; return json(v, 200, H); }
  /* v3.3 · the Open Scoreboard (Nov 19, the growth playbook): a member's record, public when they switch it on (or the desk verifies
     them as a capper). Every settled D$ bet with the moment it was placed and when each game started, so anyone can see it was in
     before the game; open bets only when the member chooses to show them. A private profile shows only what the leaderboard does. */
  async profile(name, H) { const key = String(name || '').trim().toLowerCase(); if (!/^[a-z0-9][a-z0-9 _.-]{1,19}$/.test(key)) return json({ error: 'no such member' }, 404, H);
    const S = this.ctx.storage, u = await S.get('u:' + key); if (!u || await S.get('X:' + key)) return json({ error: 'no such member' }, 404, H);
    const W = ddWallet(u), base = { name: u.name, since: u.at || 0, cap: !!u.cap, rank: rankOf(u.xp || 0).name, xp: u.xp || 0, trophies: u.tr || {}, earned: Math.round((W.bal - W.bought) * 100) / 100 };
    const B = [...(await S.list({ prefix: 'b:' + key + ':' })).values()].sort((a, b) => b.ts - a.ts), done = B.filter(x => x.status !== 'open');
    const rec = { w: done.filter(x => x.status === 'won').length, l: done.filter(x => x.status === 'lost').length, p: done.filter(x => x.status === 'push').length }, staked = done.reduce((a, x) => a + (+x.stake || 0), 0), back = done.reduce((a, x) => a + (+x.back || 0), 0);
    const out = { ...base, ...rec, roi: staked ? Math.round(1000 * (back - staked) / staked) / 10 : null };
    if (!u.pub && !u.cap) return json({ ...out, private: true }, 200, H);
    const show = x => ({ ts: x.ts, status: x.status, stake: x.stake, dec: x.dec, back: x.back == null ? null : x.back, mode: x.mode, ctx: x.run ? 'challenge' : x.lg ? 'league' : 'wallet', legs: (x.legs || []).map(l => ({ sp: l.sp, game: l.game, pick: l.pick, price: l.price, t: l.t, res: l.res || null })) });
    return json({ ...out, settled: done.slice(0, 25).map(show), open: u.pubOpen ? B.filter(x => x.status === 'open').slice(0, 15).map(show) : null, openHidden: !u.pubOpen && B.some(x => x.status === 'open') }, 200, H); }
  async grant(s, b, H) { const admin = this.env.ADMIN_CODE; if (!s.owner && !(typeof admin === 'string' && admin.length >= 24 && await sameSecret(String(b.code || ''), admin))) return json({ error: 'owner only' }, 403, H);
    const S = this.ctx.storage, key = String(b.name || '').trim().toLowerCase(), u = await S.get('u:' + key); if (!u) return json({ error: 'no such member' }, 404, H);
    const amt = Math.round(+b.amount); if (!(amt > 0 && amt <= 100000)) return json({ error: 'amount' }, 400, H); const W = ddWallet(u); W.bal += amt; W.bought += amt; u.dd = W; await S.put('u:' + key, u); this._bd = null; return json({ wallet: W }, 200, H); }
  async save(s, b, H) { const t = cleanTicket(b.ticket); if (!t) return json({ error: 'a ticket needs at least one leg' }, 400, H);
    const S = this.ctx.storage, pre = 't:' + s.key + ':', k = pre + t.id;
    if (!(await S.get(k))) { const L = await S.list({ prefix: pre }); if (L.size >= TIX_MAX) { const old = [...L.entries()].sort((a, b) => a[1].ts - b[1].ts)[0]; await S.delete(old[0]); } }
    await S.put(k, t); return json({ ticket: t }, 200, H); }
}
