/* ═══ TheDesk · the Facebook inbox (v1, Nov 20) ════════════════════════════════════════════════════════════════════════════
   Chris: "build that inbox auto reply feature." Two jobs, both off Facebook's webhooks (Meta wants an automated reply inside 30
   seconds, so this lives on the always-on worker, not the 10-minute robot):
     · COMMENT "FREE 3" on any TheDesk Page post → a private reply with the day's Free 3 (Facebook allows one per comment, within
       7 days), then a short public reply under the comment ("Sent ✅ check your messages").
     · A MESSAGE to the Page → asking for picks (FREE 3, "picks", "free"…) gets the Free 3; anything else gets one automated
       welcome a day that says a real person reads every message (a hybrid inbox: the owner answers the rest by hand).
   The picks come from the public card (public/picks.json, the file the app publishes): a pick still locked outside the open beta
   is told as locked with its unlock time, never early. Every automated message says it's automated; 21+ and 1-800-MY-RESET ride
   along; no sportsbook links. Every webhook is checked against the app secret (X-Hub-Signature-256) before anything runs.
   Routes:  GET /fb/hook (Meta's handshake) · POST /fb/hook (events) · GET /fb/status → { configured } (no keys, ever)
   Secrets (set by the deploy workflow from GitHub secrets): FB_PAGE_TOKEN · FB_APP_SECRET · FB_VERIFY_TOKEN · FB_PAGE_ID     */
const FEED_URL = 'https://raw.githubusercontent.com/ironsilkstrategies/ironsilk-weekly-site/main/public/picks.json';
const APP_URL = 'https://ironsilkweekly.com/desk/';
export const KEYWORD = /\bfree\s*-?\s*(?:3|three)\b/i;                       /* "FREE 3", "free3", "Free Three" */
export const ASKS = /\bfree\s*-?\s*(?:3|three)\b|\bpicks?\b|\bfree\b|\btoday'?s card\b/i;   /* an inbox message asking for picks */
const PER_DAY = 3;   /* Free 3 messages a person can get a day (a comment or an ask); past that, a human answers */
const enc = new TextEncoder();
const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
const sameText = (a, b) => { a = String(a); b = String(b); if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; };
export async function sigOk(secret, raw, header) { if (!secret || !header || !/^sha256=[0-9a-f]{64}$/i.test(header)) return false;
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return sameText(hex(await crypto.subtle.sign('HMAC', key, raw)), header.slice(7).toLowerCase()); }
export const ctDay = (t = Date.now()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(t));
const ctTime = t => { try { const d = new Date(t); return isFinite(d) ? d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }) + ' CT' : ''; } catch (e) { return ''; } };
const dayLabel = d => { try { return new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }); } catch (e) { return d; } };
const sgn = n => n == null || !isFinite(+n) ? '' : (+n > 0 ? '+' : '−') + Math.abs(+n);

/* the reason line (the same rules as the Free 3 post): the read's best stat-backed sentence about THIS pick, never the risk
   paragraph or the price math; else the character's take with its own record */
const sentences = s => String(s || '').replace(/\s+/g, ' ').split(/(?<=[.!?])\s+(?=[A-Z"“])/).map(x => x.trim()).filter(Boolean);
const FIRST = /\b(I|I'm|I've|I'd|I'll|me|my|mine)\b/, RISK = /^(where it goes wrong|the worry|the risk)|can beat this|swing a total|nothing here is a lock|goes wrong/i;
const MATH = /break-even|my number|the book is pricing|translation|the price pays|i say \d/i, NOISE = /^(listen|bodies get tired|that's football|look)\b/i;
const BANNED = /\b(lock|locks|guarantee[ds]?|risk-free|can't lose|sure thing)\b/i;
const HUMAN = s => String(s || '').replace(/\bCBB\b/g, 'college hoops').replace(/\bCFB\b/g, 'college football');
function recordOf(text) { for (const s of sentences(text)) { let m = s.match(/\bI'?m (\d{1,3}-\d{1,3}) on (.+?)(?: against the spread)?[.!]?$/i);
    if (m) return { rec: m[1], lane: m[2].replace(/\bunderdogs\b/i, 'dogs').trim() + (/against the spread/i.test(s) ? ' ATS' : '') };
    m = s.match(/^(.+?) is a lane I know:? (\d{1,3}-\d{1,3})/i); if (m) return { rec: m[2], lane: m[1].trim() }; } return null; }
export function reasonOf(x) { const r = (x.why && x.why.read) || {}; const who = String(r.who || 'TheDesk'), whoMid = who.replace(/^The /, 'the ');
  const ab = (String(x.pick || '').match(/^[A-Z]{3,5}\b/) || [])[0]; const names = ab ? [ab.toLowerCase()] : [];
  const dir = (String(x.pick || '').match(/^(over|under)\b/i) || [])[1], line = (String(x.pick || '').match(/[+-]?\d+(?:\.\d+)?/) || [])[0];
  const totalWords = dir ? new RegExp(`\\b(total|pace|script|possessions|scoring|${dir.toLowerCase()}s?)\\b(?!\\s+(?:his|her|their|its|the last|recent))`, 'i') : null;
  const score = s => { if (RISK.test(s) || MATH.test(s) || NOISE.test(s) || BANNED.test(s) || FIRST.test(s) || s.length > 150) return -99; let v = 0; const L = s.toLowerCase();
    if (/\d/.test(s)) v += 3; if (names.some(n => L.includes(n))) v += 3; if (totalWords && totalWords.test(s)) v += 3; if (line && s.includes(String(Math.abs(+line)))) v += 2; if (/\bwe're\b|still testing/i.test(s)) v -= 1; return v; };
  const best = sentences(r.text).map(s => ({ s, v: score(s) })).filter(o => o.v >= 5).sort((a, b) => b.v - a.v)[0]; if (best) return HUMAN(best.s);
  const take = sentences(r.take).filter(s => !NOISE.test(s) && !/\briding it\b/i.test(s) && !BANNED.test(s)).join(' '); const rec = recordOf(r.text), lead = take && !FIRST.test(take) ? take : '';
  if (lead && rec) return HUMAN(`${lead.replace(/[.!]$/, '')}, and ${whoMid} is ${rec.rec} on ${rec.lane}.`); if (lead) return HUMAN(lead); if (rec) return HUMAN(`${who} is ${rec.rec} on ${rec.lane}.`); return ''; }

/* ── the words ────────────────────────────────────────────────────────────────────────────────────────────────────────── */
const TAIL = `📲 The full card, live scores and every result: ${APP_URL}\n\n21+ · For entertainment only · Need help? Call or text 1-800-MY-RESET`;
const AUTO = '🤖 Automated message from TheDesk. Reply anytime and a real person will see it.';
/* the day's Free 3 as one message (Messenger holds 2,000 characters; this stays well under) */
export function free3Dm(F, now = Date.now()) { const d = ctDay(now), T = F && F.today;
  if (!T || T.d !== d) return `🎯 THE FREE 3 · ${dayLabel(d)}\n\nToday's Free 3 isn't out yet. It drops once the card locks, before the first game, and the app has it the minute it does.\n\n${TAIL}\n\n${AUTO}`;
  const picks = (T.picks || []).slice(0, 3);
  if (!picks.length) return `🎯 THE FREE 3 · ${dayLabel(d)}\n\nNo free picks today. Nothing cleared the bar, and we don't force plays.\n\n${TAIL}\n\n${AUTO}`;
  const rows = picks.map((x, i) => { if (x.hidden) return `${i + 1}) 🔒 Free pick: unlocks ${ctTime(x.unlockAt || (Date.parse(x.start || '') - 30 * 60e3))}, 30 minutes before its game`;
    const [a, h] = String(x.game || '').split('@'); const res = x.hit === true ? ' ✅' : x.hit === false && !x.push ? ' ❌' : x.push ? ' ➖' : ''; const why = reasonOf(x);
    return `${i + 1}) ${String(x.pick || '').toUpperCase().replace(/(^|\s)-(?=\d)/g, '$1−')}${x.price != null ? ` (${sgn(x.price)})` : ''}${res}\n${a} @ ${h} · ${ctTime(x.start)}${why ? `\n${why}` : ''}`; });
  const n = picks.length; const out = [`🎯 THE FREE 3 · ${dayLabel(d)}`, '', rows.join('\n\n')];
  if (n < 3) out.push('', n === 2 ? 'Only two cleared the bar today. We don\'t force a third.' : 'Only one cleared the bar today. We don\'t force the rest.');
  const H0 = (F.history || []).filter(h => h.d < d && (h.picks || []).some(p => p.hit != null || p.push)).sort((x, y) => x.d < y.d ? 1 : -1)[0]; const R = F.record || {};
  const recs = [H0 ? `Last card ${H0.picks.filter(p => p.hit === true).length}–${H0.picks.filter(p => p.hit === false && !p.push).length}` : '', isFinite(+R.w) && isFinite(+R.l) ? `Record ${+R.w}–${+R.l}` : ''].filter(Boolean);
  if (recs.length) out.push('', recs.join(' · ') + ' · graded in public');
  out.push('', TAIL, '', AUTO); return out.join('\n'); }
export const WELCOME = `🤖 Automated reply from TheDesk\n\nThanks for the message! A real person reads every one and will answer you here.\n\nWant today's free picks? Tap FREE 3 below or type it.\n\n${APP_URL}`;
export const sentNote = name => { const first = String(name || '').trim().split(/\s+/)[0]; return `Sent ✅ Check your messages${first && /^[\p{L}'-]{1,20}$/u.test(first) ? ', ' + first : ''}.`; };

/* ── the worker side: Meta's handshake, the signature check, then the Inbox object does the work ───────────────────────── */
export async function fbHook(req, env, ctx) { const url = new URL(req.url);
  if (url.pathname === '/fb/status' && req.method === 'GET') return Response.json({ ok: true, configured: !!(env.FB_PAGE_TOKEN && env.FB_APP_SECRET && env.FB_VERIFY_TOKEN && env.FB_PAGE_ID) }, { headers: { 'cache-control': 'no-store' } });
  if (url.pathname !== '/fb/hook') return new Response('not found', { status: 404 });
  if (req.method === 'GET') { const q = url.searchParams;
    if (q.get('hub.mode') === 'subscribe' && env.FB_VERIFY_TOKEN && sameText(q.get('hub.verify_token') || '', env.FB_VERIFY_TOKEN)) return new Response(q.get('hub.challenge') || '', { status: 200, headers: { 'content-type': 'text/plain' } });
    return new Response('forbidden', { status: 403 }); }
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });
  const raw = await req.arrayBuffer(); if (raw.byteLength > 256e3) return new Response('too big', { status: 413 });
  if (!(await sigOk(env.FB_APP_SECRET, raw, req.headers.get('x-hub-signature-256')))) return new Response('bad signature', { status: 401 });
  let body = null; try { body = JSON.parse(new TextDecoder().decode(raw)); } catch (e) { return new Response('bad json', { status: 400 }); }
  if (body && body.object === 'page' && env.INBOX) { const stub = env.INBOX.get(env.INBOX.idFromName('fb'));
    const work = stub.fetch('https://inbox/fb/event', { method: 'POST', body: JSON.stringify(body) }).catch(e => console.log('inbox', String(e && e.message || e).slice(0, 80)));
    if (ctx && ctx.waitUntil) ctx.waitUntil(work); else await work; }
  return new Response('EVENT_RECEIVED', { status: 200 }); }

export class Inbox {
  constructor(ctx, env, deps = {}) { this.ctx = ctx; this.env = env; this.fetch_ = deps.fetch || ((...a) => fetch(...a)); this.now = deps.now || (() => Date.now()); this.feed = null; }
  async fetch(req) { if (new URL(req.url).pathname !== '/fb/event' || req.method !== 'POST') return new Response('not found', { status: 404 });
    let b = null; try { b = await req.json(); } catch (e) { return new Response('bad json', { status: 400 }); }
    let n = 0; for (const e of (b.entry || []).slice(0, 20)) { const page = String(e.id || '');
      for (const c of (e.changes || []).slice(0, 50)) try { n += await this.comment(page, c); } catch (x) { console.log('inbox comment', String(x && x.message || x).slice(0, 80)); }
      for (const m of (e.messaging || []).slice(0, 50)) try { n += await this.message(page, m); } catch (x) { console.log('inbox message', String(x && x.message || x).slice(0, 80)); } }
    await this.prune(); return Response.json({ ok: true, acted: n }); }
  /* a comment on a Page post: "FREE 3" → the private reply, then the public note */
  async comment(page, c) { const v = c && c.field === 'feed' && c.value; if (!v || v.item !== 'comment' || v.verb !== 'add' || !v.comment_id || !KEYWORD.test(String(v.message || ''))) return 0;
    const who = v.from && v.from.id ? String(v.from.id) : ''; if (!who || who === page || who === String(this.env.FB_PAGE_ID || '')) return 0;   /* the Page's own comments */
    const S = this.ctx.storage, key = 'c:' + v.comment_id; if (await S.get(key)) return 0; await S.put(key, this.now());   /* each comment once, even when Meta retries */
    if (!(await this.allow(who))) return 0;
    const ok = await this.send({ recipient: { comment_id: String(v.comment_id) }, message: { text: free3Dm(await this.card(), this.now()) } }, 'private reply');
    if (!ok) return 0;
    if (String(this.env.FB_DM_PUBLIC || '').toLowerCase() !== 'off') await this.graph(`${encodeURIComponent(v.comment_id)}/comments`, { message: sentNote(v.from && v.from.name) }, 'public note');
    return 1; }
  /* a message to the Page: an ask for picks gets the Free 3; anything else, one automated welcome a day — a person answers the rest */
  async message(page, m) { const msg = m && m.message; const psid = m && m.sender && m.sender.id ? String(m.sender.id) : '';
    if (!msg || msg.is_echo || !psid || psid === page || !msg.mid) return 0;
    const S = this.ctx.storage, key = 'm:' + msg.mid; if (await S.get(key)) return 0; await S.put(key, this.now());
    const text = String(msg.text || ''), payload = msg.quick_reply && msg.quick_reply.payload;
    if (payload === 'FREE3' || ASKS.test(text)) { if (!(await this.allow(psid))) return 0;
      return (await this.send({ recipient: { id: psid }, messaging_type: 'RESPONSE', message: { text: free3Dm(await this.card(), this.now()) } }, 'free 3 message')) ? 1 : 0; }
    const day = ctDay(this.now()), uk = 'w:' + psid; if ((await S.get(uk)) === day) return 0; await S.put(uk, day);
    return (await this.send({ recipient: { id: psid }, messaging_type: 'RESPONSE', message: { text: WELCOME, quick_replies: [{ content_type: 'text', title: 'FREE 3', payload: 'FREE3' }] } }, 'welcome')) ? 1 : 0; }
  /* PER_DAY Free 3 messages a person a day */
  async allow(who) { const S = this.ctx.storage, day = ctDay(this.now()), k = 'u:' + who; const u = (await S.get(k)) || {}; const n = u.d === day ? u.n || 0 : 0;
    if (n >= PER_DAY) return false; await S.put(k, { d: day, n: n + 1, t: this.now() }); return true; }
  async card() { if (this.feed && this.now() - this.feed.at < 120e3) return this.feed.f;
    try { const r = await this.fetch_(FEED_URL + '?t=' + Math.floor(this.now() / 12e4), { headers: { 'user-agent': 'thedesk-inbox' } }); if (r.ok) { this.feed = { at: this.now(), f: await r.json() }; return this.feed.f; } } catch (e) { }
    return this.feed ? this.feed.f : null; }
  async send(body, what) { const page = String(this.env.FB_PAGE_ID || ''); if (!page) return false; return !!(await this.graph(`${encodeURIComponent(page)}/messages`, body, what)); }
  async graph(path, body, what) { const tok = String(this.env.FB_PAGE_TOKEN || ''); if (!tok) { console.log('inbox: no page token'); return null; }
    try { const r = await this.fetch_(`https://graph.facebook.com/${this.env.FB_GRAPH_VERSION || 'v24.0'}/${path}`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + tok }, body: JSON.stringify(body) });
      let j = {}; try { j = await r.json(); } catch (e) { }
      if (!r.ok || (j && j.error)) { console.log('inbox', what + ':', r.status, String((j && j.error && j.error.message) || '').split(tok).join('…').slice(0, 120)); return null; } return j || {}; }
    catch (e) { console.log('inbox', what + ':', String(e && e.message || e).split(tok).join('…').slice(0, 80)); return null; } }
  /* keep 8 days of what's been answered */
  async prune() { const S = this.ctx.storage, day = ctDay(this.now()); if ((await S.get('pruned')) === day) return; await S.put('pruned', day);
    const old = this.now() - 8 * 864e5, cut = ctDay(old); const drop = [];
    for (const [k, v] of await S.list()) { if (k === 'pruned') continue; const t = typeof v === 'number' ? v : v && v.t; if ((t && t < old) || (typeof v === 'string' && v < cut)) drop.push(k); }
    for (let i = 0; i < drop.length; i += 128) await S.delete(drop.slice(i, i + 128)); }
}
