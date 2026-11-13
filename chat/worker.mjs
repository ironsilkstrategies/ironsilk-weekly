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
