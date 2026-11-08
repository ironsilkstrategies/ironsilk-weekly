/* TheDesk · Telegram autopilot worker (GitHub Actions, every 10 minutes).
   Reads the encrypted card the app handed over (branch autopilot-state, file tg.enc),
   grades every pick from ESPN (finals + box scores), then — exactly like the in-app
   autopilot — edits the posts with ✅/❌/➖, replies with new results, and posts the
   day's recap once. Writes the updated state back (encrypted) with a merge so the app
   and the worker never overwrite each other.
   Secrets: TG_BOT_TOKEN, AUTOPILOT_KEY. GITHUB_TOKEN + GITHUB_REPOSITORY come from Actions. */
import { webcrypto as crypto } from 'node:crypto';
const env = process.env;
const REPO = env.GITHUB_REPOSITORY, GH = env.GITHUB_TOKEN, TG = (env.TG_BOT_TOKEN || '').trim(), KEY = (env.AUTOPILOT_KEY || '').trim();
const BRANCH = 'autopilot-state', FILE = 'tg.enc';
const log = (...a) => console.log('[autopilot]', ...a);
const VERSION = 'worker v2.82';
if (!TG || !KEY) { log('secrets TG_BOT_TOKEN / AUTOPILOT_KEY not set — nothing to do'); process.exit(0); }

/* ── crypto: AES-GCM, key = the 32 random bytes the app generated (base64) ── */
const b64d = s => Uint8Array.from(Buffer.from(s, 'base64'));
const b64e = u => Buffer.from(u).toString('base64');
async function aesKey() { return crypto.subtle.importKey('raw', b64d(KEY), 'AES-GCM', false, ['encrypt', 'decrypt']); }
async function decrypt(str) { const [v, iv, ct] = String(str).trim().split('.'); if (v !== 'v1') throw new Error('unknown format');
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64d(iv) }, await aesKey(), b64d(ct)); return JSON.parse(Buffer.from(pt).toString('utf8')); }
async function encrypt(obj) { const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await aesKey(), Buffer.from(JSON.stringify(obj), 'utf8')); return 'v1.' + b64e(iv) + '.' + b64e(new Uint8Array(ct)); }

/* ── GitHub contents API on the state branch ── */
const ghH = { Authorization: 'Bearer ' + GH, Accept: 'application/vnd.github+json', 'User-Agent': 'thedesk-autopilot' };
/* v2.35 · the card lives where the app hands it over. Since the publication moved (v2.25) that is the
   site repo, not this one — the worker never saw a card after Oct 12. It now reads both, merges them, and
   writes its progress to both: here with its own token, there with the site token the app put inside
   the encrypted card (so the app's status sees every grade). STATE_REPO overrides the site repo. */
const SITE = String(env.STATE_REPO || 'ironsilkstrategies/ironsilk-weekly-site').trim();
let SITE_TOK = '';
const siteTokOf = s => { let t = ''; for (const d of Object.keys((s && s.posts) || {}).sort()) { const x = s.posts[d] && s.posts[d].site; if (x && x.tok && x.repo === SITE) t = x.tok; } return t; };
async function readStateAt(repo) { const url = `https://api.github.com/repos/${repo}/contents/${FILE}?ref=${BRANCH}`; const own = repo === REPO;
  let r = await fetch(url, { headers: { ...ghH, Authorization: 'Bearer ' + (own ? GH : (SITE_TOK || GH)) } });
  if (!own && (r.status === 401 || r.status === 403 || r.status === 404)) r = await fetch(url, { headers: { Accept: ghH.Accept, 'User-Agent': ghH['User-Agent'] } });   /* a public repo reads without a token */
  if (r.status === 404) return null; if (!r.ok) throw new Error('read state ' + (own ? '' : repo + ' ') + 'HTTP ' + r.status);
  const j = await r.json(); const state = await decrypt(Buffer.from(j.content, 'base64').toString('utf8'));
  if (!own) { const t = siteTokOf(state); if (t && t !== SITE_TOK) { SITE_TOK = t; if (env.GITHUB_ACTIONS === 'true') console.log('::add-mask::' + t); } }   /* this repo's logs are public — the runner blanks the token everywhere */
  return { repo, sha: j.sha, state }; }
async function readState() { return readStateAt(REPO); }
/* this repo's copy never carries the site token — the site's own copy already holds it */
const stripTok = s => { const o = JSON.parse(JSON.stringify(s)); for (const d in o.posts || {}) { const p = o.posts[d]; if (p && p.site && p.site.tok) p.site = { ...p.site, tok: '' }; } return o; };
async function writeStateAt(repo, state, sha) { const own = repo === REPO; const tok = own ? GH : SITE_TOK; if (!tok) return 0;
  const body = { message: 'autopilot ' + new Date().toISOString(), branch: BRANCH, content: Buffer.from(await encrypt(own ? stripTok(state) : state), 'utf8').toString('base64'), ...(sha ? { sha } : {}) };
  const r = await fetch(`https://api.github.com/repos/${repo}/contents/${FILE}`, { method: 'PUT', headers: { ...ghH, Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return r.status; }
async function writeState(state, sha) { return writeStateAt(REPO, state, sha); }
/* site copy first, so on a tie its version (with the token) wins; then this repo's; then what this run holds */
export function combineStates(...xs) { return xs.filter(Boolean).reduce((a, s) => a ? mergeState(a, s) : s, null); }
/* the same merge the app uses: statuses and announcements only ever accumulate */
const relayMerge = (x, y) => !x ? y : !y ? x : x.d > y.d ? x : x.d < y.d ? y : { d: x.d, n: Math.max(x.n || 0, y.n || 0) };
/* v2.82 · the lounge's memory — who owns the bot, which chats it may serve, welcomes, agreements, warnings. Every map keeps
   the newer entry per key (warnings keep the higher count), so the app, this repo's copy and the site's copy never lose one. */
export function mergeMod(x, y) { if (!x && !y) return undefined; x = x || {}; y = y || {}; const ts = o => (o && typeof o === 'object' ? Math.max(o.ts || 0, o.at || 0) : 0);
  /* v2.82 · the robot's memory: numbers (when someone agreed, when a note went out) keep the latest; records (a chat's access, a member's
     warnings, a welcome) keep the newest — a reset (/unban) is newer than the warnings it clears. Ties keep the first copy. */
  const pick = (A, B) => { const o = { ...(B || {}) }; for (const k in (A || {})) { const a = A[k], b = o[k]; o[k] = b == null ? a : (typeof a === 'number' ? Math.max(a, +b || 0) : ts(a) >= ts(b) ? a : b); } return o; };
  return { owner: ts(x.owner) >= ts(y.owner) ? (x.owner || y.owner) : y.owner, acl: pick(x.acl, y.acl), agreed: pick(x.agreed, y.agreed), warns: pick(x.warns, y.warns), wel: pick(x.wel, y.wel), note: pick(x.note, y.note) }; }
export function mergeState(a, b) { const out = { v: 1, posts: {}, lastRun: Math.max(a?.lastRun || 0, b?.lastRun || 0), runs: Math.max(a?.runs || 0, b?.runs || 0), tgOff: Math.max(a?.tgOff || 0, b?.tgOff || 0), cmdTs: Math.max(a?.cmdTs || 0, b?.cmdTs || 0), cmdSig: a?.cmdSig || b?.cmdSig || '', pubSig: { ...(b?.pubSig || {}), ...(a?.pubSig || {}) }, ...(a?.relay || b?.relay ? { relay: relayMerge(a?.relay, b?.relay) } : {}), ...(a?.mod || b?.mod ? { mod: mergeMod(a?.mod, b?.mod) } : {}) };
  const ds = new Set([...Object.keys(a?.posts || {}), ...Object.keys(b?.posts || {})]);
  ds.forEach(d => { const x = a?.posts?.[d], y = b?.posts?.[d]; if (!x || !y) { out.posts[d] = x || y; return; }
    const base = (x.postedTs || 0) >= (y.postedTs || 0) ? x : y;
    const fx = (x.feedTs || 0) >= (y.feedTs || 0) ? x : y;   /* the newest public card the app handed over wins */
    out.posts[d] = { ...base, st: { ...(y.st || {}), ...(x.st || {}) }, sent: { ...(y.sent || {}), ...(x.sent || {}) }, recap: !!(x.recap || y.recap), worker: x.worker !== false && y.worker !== false,
      ...(fx.feedTs ? { feed: fx.feed, pub: fx.pub, bc: fx.bc, site: fx.site, feedTs: fx.feedTs, ...(fx.cmd ? { cmd: fx.cmd } : {}) } : {}) }; });
  const keep = Object.keys(out.posts).sort().slice(-5); Object.keys(out.posts).forEach(d => { if (!keep.includes(d)) delete out.posts[d]; });
  return out; }

/* ── ESPN ── */
const PATH = { nfl: 'football/nfl', ncaaf: 'football/college-football', nhl: 'hockey/nhl', mlb: 'baseball/mlb', nba: 'basketball/nba', ncaab: 'basketball/mens-college-basketball' };
const ALIAS = { mlb: { CHW: 'CWS', ARI: 'AZ', OAK: 'ATH', WAS: 'WSH' }, nfl: { WAS: 'WSH', JAC: 'JAX', LA: 'LAR', LVR: 'LV', OAK: 'LV', ARZ: 'ARI' }, ncaaf: {},
  nhl: { LAK: 'LA', NJD: 'NJ', SJS: 'SJ', TBL: 'TB', VEG: 'VGK', LV: 'VGK', MON: 'MTL', UTA: 'UTAH', WAS: 'WSH' }, nba: { GSW: 'GS', NYK: 'NY', NOP: 'NO', SAS: 'SA', UTA: 'UTAH', WAS: 'WSH', BRK: 'BKN', PHO: 'PHX', CHO: 'CHA' }, ncaab: {} };
const ab = (sp, x) => { x = String(x || '').toUpperCase(); return (ALIAS[sp] || {})[x] || x; };
const ymd = d => d.replace(/-/g, '');
const shift = (d, n) => new Date(Date.parse(d + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10);
const SB = {};
async function scoreboard(sp, d) { const k = sp + d; if (SB[k]) return SB[k];
  if (!PATH[sp]) { SB[k] = []; return SB[k]; }
  const url = `https://site.api.espn.com/apis/site/v2/sports/${PATH[sp]}/scoreboard?dates=${ymd(d)}` + (sp === 'ncaaf' ? '&groups=80&limit=300' : sp === 'ncaab' ? '&groups=50&limit=900' : '&limit=300');
  try { const r = await fetch(url); SB[k] = r.ok ? ((await r.json()).events || []) : []; } catch (e) { SB[k] = []; } return SB[k]; }
function evTeams(sp, ev) { const cs = ((ev.competitions || [])[0] || {}).competitors || []; const A = cs.find(c => c.homeAway === 'away'), H = cs.find(c => c.homeAway === 'home');
  return A && H ? { a: ab(sp, A.team?.abbreviation), h: ab(sp, H.team?.abbreviation), as: +((A.score && A.score.value) ?? A.score), hs: +((H.score && H.score.value) ?? H.score) } : null; }
function evFinal(ev) { const c = (ev.competitions || [])[0] || {}; const t = ((c.status || ev.status || {}).type) || {}; return t.completed === true || t.state === 'post'; }
async function findEvent(sp, d, teams) { for (const day of [d, shift(d, 1), shift(d, -1)]) { for (const ev of await scoreboard(sp, day)) { const T = evTeams(sp, ev); if (!T) continue;
      const set = [T.a, T.h]; if (teams.every(t => set.includes(ab(sp, t)))) return { ev, T }; } } return null; }

/* side / total picks — the same formats the app writes */
async function gradePick(x, d) { const [ga, gh] = String(x.game || '').split('@'); if (!ga || !gh) return null; const F = await findEvent(x.sp, d, [ga, gh]); if (!F || !evFinal(F.ev)) return null;
  const { as, hs } = F.T; if (!isFinite(as) || !isFinite(hs)) return null; const awayK = ab(x.sp, ga), homeK = ab(x.sp, gh);
  const awayIsA = F.T.a === awayK; const A = awayIsA ? as : hs, H = awayIsA ? hs : as; const p = String(x.pick || '').trim(); let m;
  x.__fin = `${ga} ${A}–${H} ${gh}`;
  if ((m = p.match(/^(Over|Under)\s+([\d.]+)$/i))) { const t = A + H, L = +m[2]; if (t === L) return 'P'; return (/over/i.test(m[1]) ? t > L : t < L) ? 'W' : 'L'; }
  if ((m = p.match(/^(\S+)\s+ML$/i))) { const side = ab(x.sp, m[1]) === homeK ? 'h' : ab(x.sp, m[1]) === awayK ? 'a' : null; if (!side) return null; if (A === H) return 'P'; return ((side === 'h') === (H > A)) ? 'W' : 'L'; }
  if ((m = p.match(/^(\S+)\s+([+-]\d+(?:\.\d+)?)$/))) { const side = ab(x.sp, m[1]) === homeK ? 'h' : ab(x.sp, m[1]) === awayK ? 'a' : null; if (!side) return null;
    const mar = (side === 'h' ? H - A : A - H) + (+m[2]); return mar === 0 ? 'P' : mar > 0 ? 'W' : 'L'; }
  return null; }   /* period / first-five / alt formats: the app grades those when it opens */

/* player props from the final box score */
const norm = s => String(s || '').toLowerCase().replace(/[^a-z ]/g, ' ').replace(/\b(jr|sr|ii|iii|iv|v)\b/g, ' ').replace(/\s+/g, ' ').trim();
const PROP = { py: [['passing', 'YDS']], ptd: [['passing', 'TD']], ry: [['rushing', 'YDS']], rtd: [['rushing', 'TD']], rec: [['receiving', 'REC']], wy: [['receiving', 'YDS']], wtd: [['receiving', 'TD']],
  td: [['rushing', 'TD'], ['receiving', 'TD']], g: [['*', 'G']], a: [['*', 'A']], s: [['*', 'S'], ['*', 'SOG']], pts: [['*', 'PTS']], reb: [['*', 'REB']], ast: [['*', 'AST']], fg3: [['*', '3PT']],
  stl: [['*', 'STL']], blk: [['*', 'BLK']], h: [['batting', 'H']], hr: [['batting', 'HR']], rbi: [['batting', 'RBI']], r: [['batting', 'R']], bb: [['batting', 'BB']], k: [['pitching', 'K']], ha: [['pitching', 'H']], er: [['pitching', 'ER']] };
async function gradeProp(x, d) { const team = x.team; if (!team) return null; let F = null;
  for (const day of [d, shift(d, 1)]) { for (const ev of await scoreboard(x.sp, day)) { const T = evTeams(x.sp, ev); if (T && [T.a, T.h].includes(ab(x.sp, team))) { F = { ev, T }; break; } } if (F) break; }
  if (!F) return null; const fin = evFinal(F.ev);   /* v2.66 · an over that's already cleared wins mid-game; everything else waits for the final */
  if (!fin && x.side === 'under') return null;
  let j; try { const r = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${PATH[x.sp]}/summary?event=${F.ev.id}`); j = await r.json(); } catch (e) { return null; }
  const rows = []; ((j.boxscore || {}).players || []).forEach(t => (t.statistics || []).forEach(g => { const labels = (g.labels || []).map(l => String(l).toUpperCase());
    (g.athletes || []).forEach(a => rows.push({ name: a.athlete?.displayName || '', grp: String(g.name || g.type || '').toLowerCase(), labels, stats: a.stats || [] })); }));
  if (!rows.length) return null;
  const want = norm(x.player), wp = want.split(' '), wl = wp[wp.length - 1], wi = (wp[0] || '')[0];
  let mine = rows.filter(r => norm(r.name) === want); if (!mine.length) { const c = rows.filter(r => { const q = norm(r.name).split(' '); return q[q.length - 1] === wl && (q[0] || '')[0] === wi; }); const names = new Set(c.map(r => r.name)); if (names.size === 1) mine = c; }
  if (!mine.length) return fin ? 'P' : null;   /* not in the final box → didn't play → void, the book rule */
  const stat = x.stat; const spec = PROP[stat]; if (!spec) return null; let val = 0, found = false;
  spec.forEach(([grp, lab]) => { mine.forEach(r => { if (grp !== '*' && !r.grp.includes(grp)) return; const i = r.labels.indexOf(lab); if (i < 0) return;
      const raw = String(r.stats[i] ?? ''); const v = parseFloat(raw.split('-')[0]); if (isFinite(v)) { val += v; found = true; } }); });
  if (!found) { if (!fin) return null; if (['rec', 'wy', 'ry', 'py', 'td', 'rtd', 'wtd', 'ptd'].includes(stat)) return +x.thr > 0 ? 'L' : 'W'; return null; }   /* played, recorded none in that category */
  if (x.side === 'under') return val < +x.thr ? 'W' : val > +x.thr ? 'L' : 'P';
  if (val >= +x.thr) return 'W'; return fin ? 'L' : null; }

/* ── Telegram ── */
async function tg(method, params) { try { const r = await fetch(`https://api.telegram.org/bot${TG}/${method}`, { method: 'POST', body: new URLSearchParams(params), signal: AbortSignal.timeout(((+(params && params.timeout) || 0) + 20) * 1000) });   /* v2.82 · a hung connection can't eat the run */ const j = await r.json().catch(() => ({})); if (!j.ok) { log(method, 'said', j.description || r.status); return null; } return j; } catch (e) { log(method, 'failed', e.message); return null; } }   /* v2.35 · a refused send is not "sent" — it retries next pass */
const MARK = { W: '✅ ', L: '❌ ', P: '➖ ' };
export function fillTemplate(text, st) { return String(text)
  .replace(/⟦m:([^⟧]*)⟧/g, (_, k) => st[k] ? MARK[st[k]] : '')
  .replace(/⟦b:([^⟧]*)⟧/g, (_, k) => st[k] ? MARK[st[k]] : '• ')
  .replace(/⟦p:([^⟧]*)⟧/g, (_, ks) => { const m = ks.split('¦').map(k => st[k]); if (!m.some(Boolean)) return ''; if (m.includes('L')) return '❌ '; return m.every(s => s === 'W' || s === 'P') ? '✅ CASHED · ' : ''; }); }
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const units = (price, s) => s === 'P' ? 0 : s === 'L' ? -1 : (price == null ? 100 / 110 : price > 0 ? price / 100 : 100 / Math.abs(price));
export function recapText(p, st) { const R = p.recapPlan || {}; const rec = keys => { const w = keys.filter(k => st[k] === 'W').length, l = keys.filter(k => st[k] === 'L').length, pu = keys.length - w - l; return `${w}-${l}${pu ? '-' + pu : ''}`; };
  const u = items => items.reduce((a, it) => a + units(it.price, st[it.k]), 0); const f = v => (v >= 0 ? '+' : '') + v.toFixed(2) + 'u';
  const par = keys => { const m = keys.map(k => st[k]); return m.includes('L') ? '❌' : m.every(s => s === 'W' || s === 'P') ? '✅ CASHED' : '…'; };
  const out = [`<b>📊 Day recap — ${esc(R.day || p.d)}</b>`];
  if ((R.best || []).length) out.push(`⭐ Best ${R.best.length}: <b>${rec(R.best.map(x => x.k))}</b> (${f(u(R.best))})`);
  if ((R.top10 || []).length) out.push(`🔟 Top ${R.top10.length}: <b>${rec(R.top10.map(x => x.k))}</b> (${f(u(R.top10))})`);
  if (R.banker) out.push(`🏦 Banker's parlay: ${par(R.banker.keys)} ${esc(R.banker.price)}`);
  if ((R.chars || []).length) { const c = R.chars.filter(x => par(x.keys) === '✅ CASHED'); out.push(`🎭 Character parlays: <b>${c.length} of ${R.chars.length} cashed</b>${c.length ? ' — ' + c.map(x => esc(x.name) + ' ' + esc(x.price)).join(', ') : ''}`); }
  if ((R.props || []).length) out.push(`🎯 Props: <b>${rec(R.props)}</b>`);
  const pend = (p.legs || []).filter(l => !st[l.k]).length; if (pend) out.push(`<i>${pend} pick${pend > 1 ? 's' : ''} still pending (postponed / player didn't play) — not counted.</i>`);
  out.push('<i>Every pick was locked and posted before kickoff.</i>'); return out.join('\n'); }

/* ── v2.30 · a cashed Banker / character parlay gets its own post (identical tickets share one) ── */
export function cashedParlays(p) { const R = p.recapPlan || {}, st = p.st || {}; const L = [];
  if (R.banker) L.push({ who: '🏦 The Banker', keys: R.banker.keys || [] }); (R.chars || []).forEach(c => L.push({ who: '🎭 ' + c.name, keys: c.keys || [] }));
  const G = {}; L.forEach(x => { if (!x.keys.length) return; const m = x.keys.map(k => st[k]); if (m.some(s => !s) || m.includes('L') || !m.includes('W')) return;
    const sig = [...x.keys].sort().join('¦'); (G[sig] = G[sig] || { sig, keys: x.keys, who: [] }).who.push(x.who); });
  return Object.values(G); }
const toDec = pr => pr == null ? 1 + 100 / 110 : pr > 0 ? 1 + pr / 100 : 1 + 100 / Math.abs(pr);
const toAmer = d => d >= 2 ? '+' + Math.round((d - 1) * 100) : '-' + Math.round(100 / (d - 1));
export function cashText(p, g) { const st = p.st || {}; const by = {}; (p.legs || []).forEach(l => { by[l.k] = l; });
  const D = g.keys.filter(k => st[k] === 'W').reduce((a, k) => a * toDec(by[k] && by[k].price), 1); const day = (p.recapPlan && p.recapPlan.day) || p.d;
  return [`🎉 <b>CASHED</b> — <b>${g.who.map(esc).join(' + ')}</b>`, `<b>${g.keys.length}-leg parlay · ${toAmer(D)}</b> · 1 unit → <b>+${(D - 1).toFixed(2)}u</b>`, '',
    ...g.keys.map(k => { const l = by[k] || {}; return `${MARK[st[k]] || ''}<b>${esc(l.label || k)}</b>${l.__fin ? ' · ' + esc(l.__fin) : ''}`; }), '', `<i>Locked and posted before the first game · ${esc(day)}</i>`].join('\n'); }

/* ── v2.60 · commands: anyone in TheDesk's lounges types /best, /judge … and gets the answer the app wrote at its last
   hand-off, with ✅/❌ filled in from the grades so far.
   v2.82 · …and ONLY in TheDesk's own chats. The bot serves the chats on the card (VIP channel, VIP lounge, public channel,
   public lounge) and any group where the bot's owner is an admin. Added to anyone else's group, it says so once and leaves;
   a private message gets answers only from the owner or a member of TheDesk's lounges. New members get a welcome with the
   rules and an "I agree" button; admins get /warn (3 strikes = ban) and /ban. New: /live /next /status /rules /why. ── */
const MEMBER = new Set(['creator', 'administrator', 'member']);
const nchat = x => String(x == null ? '' : x).trim().toLowerCase();
export function knownChats(p) { const K = new Set(); for (const x of [p?.chat, p?.bc?.vipLounge, p?.bc?.pub, p?.bc?.pubLounge]) { const v = nchat(x); if (v) K.add(v); } return K; }
const knownOf = (state, p) => { const K = knownChats(p); for (const d in (state.posts || {})) for (const v of knownChats(state.posts[d])) K.add(v); return K; };
const isKnown = (K, chat) => !!chat && (K.has(nchat(chat.id)) || (!!chat.username && K.has('@' + nchat(chat.username))));
export const modOf = state => { const M = state.mod || (state.mod = {}); for (const k of ['acl', 'agreed', 'warns', 'wel', 'note']) M[k] = M[k] || {}; return M; };
const tsOf = v => (v && typeof v === 'object' ? v.ts || 0 : +v || 0);
const prune = (o, n) => { const ks = Object.keys(o); if (ks.length <= n) return; ks.sort((a, b) => tsOf(o[a]) - tsOf(o[b])).slice(0, ks.length - n).forEach(k => delete o[k]); };
/* the owner: whoever created the VIP channel and the lounges (asked of Telegram, refreshed every 3 days) */
export async function ownersOf(state, T, p) { const M = modOf(state); if (M.owner && (M.owner.ids || []).length && Date.now() - (M.owner.ts || 0) < 3 * 864e5) return M.owner.ids;
  const ids = new Set(); for (const c of new Set([p?.chat, p?.bc?.vipLounge, p?.bc?.pubLounge].filter(Boolean).map(String))) { const r = await T('getChatAdministrators', { chat_id: c });
    const cr = (Array.isArray(r && r.result) ? r.result : []).find(x => x && x.status === 'creator' && x.user && !x.user.is_bot); if (cr) ids.add(cr.user.id); }
  if (ids.size) M.owner = { ids: [...ids], ts: Date.now() }; return (M.owner && M.owner.ids) || []; }
/* 'ok' · 'stranger' (someone else's group: leave) · 'outsider' (a private chat from outside the lounges) · 'unknown' (couldn't check: stay quiet, never leave) */
export async function chatAccess(state, T, p, chat, from) { if (!chat) return 'unknown'; if (isKnown(knownOf(state, p), chat)) return 'ok';
  const M = modOf(state); const key = chat.type === 'private' ? 'u' + (from && from.id) : String(chat.id); const c = M.acl[key];
  if (c && Date.now() - c.ts < (c.v === 'unknown' ? 10 * 60e3 : 12 * 36e5)) return c.v;
  const owners = await ownersOf(state, T, p); let v = 'unknown';
  if (chat.type === 'private') { if (from && owners.includes(from.id)) v = 'ok';
    else if (from) { let checked = false; for (const id of new Set([p?.bc?.pubLounge, p?.bc?.vipLounge, p?.chat].filter(Boolean).map(String))) { const r = await T('getChatMember', { chat_id: id, user_id: String(from.id) }); if (!r) continue; checked = true; const m = r.result;
        if (m && (MEMBER.has(m.status) || (m.status === 'restricted' && m.is_member))) { v = 'ok'; break; } }
      if (v !== 'ok' && checked) v = 'outsider'; } }
  else if (owners.length) { const r = await T('getChatAdministrators', { chat_id: String(chat.id) }); if (r && Array.isArray(r.result)) v = r.result.some(x => x && x.user && owners.includes(x.user.id)) ? 'ok' : 'stranger'; }
  M.acl[key] = { v, ts: Date.now() }; prune(M.acl, 300); return v; }
const joinLink = C => (C && C.join) || 'https://t.me/TheDeskLounge';
async function turnAway(state, T, C, chat, from, why) { const M = modOf(state); const key = why === 'stranger' ? 'c' + chat.id : 'u' + (from && from.id); const fresh = Date.now() - (M.note[key] || 0) > 864e5;
  if (why === 'stranger') { if (fresh && chat.type !== 'channel') { await T('sendMessage', { chat_id: String(chat.id), text: `🔒 This bot only works inside TheDesk's own chats, so it's leaving this one.\nJoin TheDesk: ${joinLink(C)}`, disable_web_page_preview: 'true' }); M.note[key] = Date.now(); prune(M.note, 300); }
    await T('leaveChat', { chat_id: String(chat.id) }); return 1; }
  if (why === 'outsider' && fresh) { await T('sendMessage', { chat_id: String(chat.id), text: `🔒 TheDesk's bot answers inside TheDesk's lounges, and in private for lounge members.\nJoin the lounge first: ${joinLink(C)}`, disable_web_page_preview: 'true' }); M.note[key] = Date.now(); prune(M.note, 300); return 1; }
  return 0; }
/* the rules + the welcome */
export const RULES_DEFAULT = ['Respect everyone. No harassment, hate, slurs or personal attacks.', 'No spam. No links to other groups or services, no selling picks or "VIP" offers.',
  'Keep it to sports, picks and bankroll talk.', 'No begging, no scams, no DMing members to sell anything.', "Don't repost TheDesk's VIP picks outside TheDesk.", '21+ only. For entertainment… bet responsibly. Problem? Call 1-800-GAMBLER.'];
const RULES_TAIL = "<b>Break a rule and you're out.</b> Admins warn or ban on sight… three warnings is an automatic ban.";
const rulesList = C => (C && Array.isArray(C.rules) && C.rules.filter(Boolean).length ? C.rules.filter(Boolean) : RULES_DEFAULT).slice(0, 15).map((r, i) => `${i + 1}. ${esc(r)}`).join('\n');
export function rulesText(C) { return `<b>📜 TheDesk lounge rules</b>\n${rulesList(C)}\n\n${RULES_TAIL}`; }
const nameOf = u => esc([u && u.first_name, u && u.last_name].filter(Boolean).join(' ') || (u && u.username ? '@' + u.username : 'friend'));
export function welcomeText(users, C) { const names = users.map(nameOf); const who = names.length > 1 ? names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1] : names[0];
  return `👋 <b>Welcome to TheDesk, ${who}!</b>\n\n<b>Read the rules… they're enforced:</b>\n${rulesList(C)}\n\n${RULES_TAIL}\n\nTap <b>✅ I agree to the rules</b> below to confirm you've read them. /help shows what the bot can do.`; }
const AGREE_KB = JSON.stringify({ inline_keyboard: [[{ text: '✅ I agree to the rules', callback_data: 'agree' }]] });
async function welcome(state, T, C, chat, users, owners) { const seen = new Set(); users = users.filter(u => u && !u.is_bot && !owners.includes(u.id) && !seen.has(u.id) && seen.add(u.id)); if (!users.length) return 0;
  const M = modOf(state); const k = String(chat.id); const prev = M.wel[k];
  if (prev && prev.id && Date.now() - (prev.ts || 0) < 47 * 36e5) await T('deleteMessage', { chat_id: k, message_id: String(prev.id) });   /* one welcome on screen at a time */
  const text = welcomeText(users.slice(0, 12), C); const r = await T('sendMessage', { chat_id: k, text, parse_mode: 'HTML', disable_web_page_preview: 'true', reply_markup: AGREE_KB });
  if (r && r.result) { M.wel[k] = { id: r.result.message_id, ts: Date.now(), text, ok: [] }; prune(M.wel, 100); return 1; } return 0; }
async function onAgree(state, T, cq) { const M = modOf(state); const chat = cq.message && cq.message.chat; const first = esc((cq.from && cq.from.first_name) || 'friend');
  if (!chat || !cq.from) { await T('answerCallbackQuery', { callback_query_id: cq.id }); return 0; }
  const k = String(chat.id); const key = k + '|' + cq.from.id; const again = !!M.agreed[key]; M.agreed[key] = Date.now(); prune(M.agreed, 2000);
  await T('answerCallbackQuery', { callback_query_id: cq.id, text: again ? `You already agreed, ${first}. The rules stay at /rules.` : `✅ Thanks, ${first}. You're in… the rules stay at /rules.` });
  const W = M.wel[k]; if (!again && W && W.id === (cq.message && cq.message.message_id)) { W.ok = [...new Set([...(W.ok || []), nameOf(cq.from)])].slice(-12); W.at = Date.now();
    await T('editMessageText', { chat_id: k, message_id: String(W.id), text: W.text + `\n\n✅ <b>Read and agreed:</b> ${W.ok.join(', ')}`, parse_mode: 'HTML', disable_web_page_preview: 'true', reply_markup: AGREE_KB }); }
  return 1; }
/* /warn, /ban, /unban: admins only, as a reply to the message that broke a rule */
async function isAdmin(state, T, p, m) { if (m.sender_chat && String(m.sender_chat.id) === String(m.chat.id)) return true;   /* an admin posting anonymously as the group */
  if (!m.from) return false; if ((await ownersOf(state, T, p)).includes(m.from.id)) return true;
  const r = await T('getChatMember', { chat_id: String(m.chat.id), user_id: String(m.from.id) }); const st = r && r.result && r.result.status; return st === 'creator' || st === 'administrator'; }
async function moderate(state, T, p, m, cmd) { const reply = text => T('sendMessage', { chat_id: String(m.chat.id), text, parse_mode: 'HTML', reply_to_message_id: String(m.message_id), allow_sending_without_reply: 'true' });
  if (m.chat.type === 'private' || m.chat.type === 'channel') { await reply(`/${cmd} works in the lounges, as a reply to the member's message.`); return 1; }
  if (!(await isAdmin(state, T, p, m))) { await reply('Only admins can use /' + cmd + '.'); return 1; }
  const tm0 = m.reply_to_message; const tgt = tm0 && tm0.from; if (!tgt || tgt.is_bot || tm0.sender_chat) { await reply(`Reply to the member's message with /${cmd}${cmd === 'unban' ? '' : ' (and a reason, if you like)'}.`); return 1; }
  const owners = await ownersOf(state, T, p); const tm = await T('getChatMember', { chat_id: String(m.chat.id), user_id: String(tgt.id) }); const ts0 = tm && tm.result && tm.result.status;
  if (owners.includes(tgt.id) || ts0 === 'creator' || ts0 === 'administrator') { await reply("Admins can't be warned or banned."); return 1; }
  const reason = esc(String(m.text || '').replace(/^\/\S+\s*/, '').trim().slice(0, 200)); const M = modOf(state); const key = String(m.chat.id) + '|' + tgt.id; const nm = nameOf(tgt);
  const ban = async why => { const r = await T('banChatMember', { chat_id: String(m.chat.id), user_id: String(tgt.id) }); if (!r) { await reply("I couldn't ban. Make me an admin with <b>Ban users</b> and <b>Delete messages</b>."); return 1; }
    await T('deleteMessage', { chat_id: String(m.chat.id), message_id: String(tm0.message_id) }); await reply(`🚫 <b>${nm}</b> is banned${why ? ': ' + why : ''}.`); return 1; };
  if (cmd === 'ban') return ban(reason);
  if (cmd === 'unban') { const r = await T('unbanChatMember', { chat_id: String(m.chat.id), user_id: String(tgt.id), only_if_banned: 'true' }); M.warns[key] = { n: 0, ts: Date.now() }; await reply(r ? `✅ <b>${nm}</b> can come back.` : "Couldn't unban. I need admin rights."); return 1; }
  const w = { n: ((M.warns[key] && M.warns[key].n) || 0) + 1, ts: Date.now() }; M.warns[key] = w; prune(M.warns, 1000);
  if (w.n >= 3) return ban('three warnings');
  await reply(`⚠️ <b>${nm}</b>, warning ${w.n} of 3${reason ? ': ' + reason : ''}. Three is a ban. The rules: /rules`); return 1; }
/* what the robot says on its own (from ESPN and the card), whatever the app last handed over */
const todayCard = (state, now) => { const d = chicagoDay(now); const p = state.posts && state.posts[d]; return p && (p.legs || []).length ? p : null; };
const cardLegs = p => { const seen = new Set(); return (p.legs || []).filter(l => l && !l.player && l.game && /best|top/i.test(String(l.kind || '')) && !seen.has(l.k) && seen.add(l.k)).slice(0, 15); };
async function legEvent(l, d, deps) { const [ga, gh] = String(l.game || '').split('@'); if (!ga || !gh || !l.sp) return null; try { return await (deps?.findEvent || findEvent)(l.sp, d, [ga, gh]); } catch (e) { return null; } }
const evState = ev => { const c0 = (ev.competitions || [])[0] || {}; const t = ((c0.status || ev.status || {}).type) || {}; return { state: t.completed ? 'post' : t.state || 'pre', detail: t.shortDetail || t.detail || '', start: Date.parse(c0.date || ev.date || '') }; };
export async function liveText(state, now, deps) { const p = todayCard(state, now); if (!p) return "<b>📡 Live</b>\nToday's card isn't out yet. /results has the last one.";
  const st = p.st || {}; const out = [`<b>📡 Live: today's Best 3 and Top 10</b>`];
  for (const l of cardLegs(p)) { const F = await legEvent(l, p.d, deps); const E = F ? evState(F.ev) : null; const S = F && F.T; const [ga, gh] = String(l.game).split('@');
    const sc = S && isFinite(S.as) && isFinite(S.hs) ? (S.a === ab(l.sp, ga) ? `${esc(ga)} ${S.as}–${S.hs} ${esc(gh)}` : `${esc(ga)} ${S.hs}–${S.as} ${esc(gh)}`) : esc(l.game);
    const mark = st[l.k] ? MARK[st[l.k]] : E && E.state === 'in' ? '🔴 ' : '⏳ ';
    const tail = st[l.k] || (E && E.state === 'post') ? ` · ${sc} (final)` : E && E.state === 'in' ? ` · ${sc} · ${esc(E.detail)}` : E && isFinite(E.start) ? ` · ${esc(l.game)} · ${tStr(E.start)}` : ` · ${esc(l.game)}`;
    out.push(`${mark}<b>${esc(l.label)}</b>${tail}`); }
  if (out.length === 1) out.push("No game picks on today's card."); return out.join('\n'); }
export async function nextText(state, now, deps) { const p = todayCard(state, now); if (!p) return "<b>⏭ Next up</b>\nToday's card isn't out yet."; let best = null;
  for (const l of cardLegs(p)) { if ((p.st || {})[l.k]) continue; const F = await legEvent(l, p.d, deps); if (!F) continue; const E = evState(F.ev); if (E.state !== 'pre' || !isFinite(E.start) || E.start < now - 5 * 60e3) continue;
    if (!best || E.start < best.t) best = { t: E.start, l, list: [l] }; else if (E.start === best.t) best.list.push(l); }
  if (!best) return "<b>⏭ Next up</b>\nEvery game on today's card has started. /live has the scores.";
  const mins = Math.max(0, Math.round((best.t - now) / 60e3)); const inT = mins >= 60 ? `${Math.floor(mins / 60)} h ${mins % 60} min` : `${mins} min`;
  return `<b>⏭ Next up: ${esc(best.l.game)} · ${tStr(best.t)}</b> (in ${inT})\n${best.list.map(l => `• <b>${esc(l.label)}</b> <i>${esc(l.kind || '')}</i>`).join('\n')}`; }
const hourName = h => h === 0 || h === 24 ? 'midnight' : h === 12 ? 'noon' : h < 12 ? h + ' AM' : (h - 12) + ' PM';
export function statusText(state, now) { const p = todayCard(state, now); const legs = p ? p.legs || [] : []; const g = p ? legs.filter(l => (p.st || {})[l.k]).length : 0; const H = loungeHours(env.LOUNGE);
  return [`<b>🤖 TheDesk robot: online</b>`, p ? `Today's card: ${esc(DAYFMT(p.d))} · handed over ${tStr(p.feedTs || p.postedTs || now)}` : "Today's card isn't out yet, so answers come from the last card.",
    p ? `Graded so far: ${g} of ${legs.length} picks` : '', H ? `Answers in seconds from ${hourName(H[0])} to ${hourName(H[1])} CT. Outside those hours it answers when it next wakes.` : 'It answers each time it runs (every few minutes on game days).'].filter(Boolean).join('\n'); }
const RECENT = new WeakMap();
let ME = null; async function myName(T) { if (ME) return ME; const r = await T('getMe', {}); const u = r && r.result && r.result.username; if (u) ME = String(u).toLowerCase(); return ME || ''; }
const WORKER_MENU = [['live', "Live scores of today's picks"], ['next', 'The next game on the card'], ['rules', 'The lounge rules'], ['status', 'Is the robot on?']];
export async function runCommands(state, deps) { const T = deps?.tg || tg; let acted = 0, seen = 0; const now = deps?.now || Date.now();
  const ds = Object.keys(state.posts || {}).filter(d => state.posts[d]?.cmd).sort(); const p = ds.length ? state.posts[ds[ds.length - 1]] : (Object.keys(state.posts || {}).sort().map(d => state.posts[d]).pop() || null);
  const C = (p && p.cmd) || { r: {}, menu: [] }; C.r = C.r || {};
  /* the / menu, once per new list: the robot's own commands ride along; admins also see /warn /ban /unban */
  const menu = [...(C.menu || [])]; if (menu.length) for (const [c, t] of WORKER_MENU) if (!menu.some(x => x.command === c)) menu.push({ command: c, description: t });
  const sig = 'v2|' + menu.map(m => m.command).join(','); if (state.cmdSig !== sig && menu.length) { const r = await T('setMyCommands', { commands: JSON.stringify(menu.slice(0, 100)) });
    const r2 = await T('setMyCommands', { commands: JSON.stringify([...menu.slice(0, 97), { command: 'warn', description: 'Admins: warn a member (reply). 3 = ban' }, { command: 'ban', description: 'Admins: ban a member (reply)' }, { command: 'unban', description: 'Admins: lift a ban (reply)' }]), scope: JSON.stringify({ type: 'all_chat_administrators' }) });
    if (r && r2) { state.cmdSig = sig; acted++; } }
  const u = await T('getUpdates', { offset: String((state.tgOff || 0) + 1), timeout: String(Math.max(0, Math.min(50, deps?.poll || 0))), allowed_updates: JSON.stringify(['message', 'callback_query', 'my_chat_member']) });
  const rows = (u && Array.isArray(u.result)) ? u.result : []; if (!rows.length) return acted;
  const st = {}; for (const d of ds) Object.assign(st, state.posts[d].st || {}); const joins = {};
  for (const x of rows) { state.tgOff = Math.max(state.tgOff || 0, x.update_id);
    try {
      /* the bot was added somewhere: whose chat is it? */
      if (x.my_chat_member) { seen++; const mc = x.my_chat_member; const nw = mc.new_chat_member && mc.new_chat_member.status;
        if ((nw === 'member' || nw === 'administrator') && mc.chat && mc.chat.type !== 'private') { const a = await chatAccess(state, T, p, mc.chat, mc.from); if (a === 'stranger') { acted += await turnAway(state, T, C, mc.chat, mc.from, a); log('left a chat that isn\'t TheDesk\'s'); } }
        continue; }
      if (x.callback_query) { seen++; const cq = x.callback_query; if (cq.data === 'agree') acted += await onAgree(state, T, cq); else await T('answerCallbackQuery', { callback_query_id: cq.id }); continue; }
      const m = x.message; if (!m || !m.chat) continue;
      if ((m.new_chat_members || []).length && m.chat.type !== 'private') { seen++; if (!m.date || now - m.date * 1000 < 12 * 36e5) { const J = joins[m.chat.id] || (joins[m.chat.id] = { chat: m.chat, from: m.from, users: [] }); J.users.push(...m.new_chat_members); } continue; }
      if (!m.text || m.text[0] !== '/') continue;
      const at0 = ((m.text.slice(1).split(/\s+/)[0] || '').split('@')[1] || '').toLowerCase(); if (at0) { const me = await myName(T); if (me && at0 !== me) continue; }   /* /cmd@SomeOtherBot isn't ours */
      seen++; state.cmdTs = Date.now();
      const acc = await chatAccess(state, T, p, m.chat, m.from); if (acc !== 'ok') { acted += await turnAway(state, T, C, m.chat, m.from, acc); if (acc === 'stranger') log('left a chat that isn\'t TheDesk\'s'); continue; }
      const parts = m.text.slice(1).split(/\s+/); const cmd = (parts[0] || '').split('@')[0].toLowerCase(); const arg = (parts[1] || '').toLowerCase(); const at = ((parts[0] || '').split('@')[1] || '').toLowerCase();
      if (cmd === 'warn' || cmd === 'ban' || cmd === 'unban') { acted += await moderate(state, T, p, m, cmd); continue; }
      /* the same question in the same group within 15 s gets one answer (the first is right above) — the bot can't be used as a spam cannon */
      if (m.chat.type !== 'private' && cmd !== 'check') { const R0 = RECENT.get(state) || new Map(); RECENT.set(state, R0); const rk = m.chat.id + '|' + cmd + '|' + arg; if (Date.now() - (R0.get(rk) || 0) < 15e3) continue; R0.set(rk, Date.now()); }
      let txt = null;
      if (cmd === 'check') { try { txt = checkTicket(m.text, C.idx); } catch (e) { log('check', e.message || e); } }
      else if (cmd === 'live') txt = await liveText(state, now, deps);
      else if (cmd === 'next') txt = await nextText(state, now, deps);
      else if (cmd === 'status') txt = statusText(state, now);
      else if (cmd === 'rules') txt = rulesText(C);
      else if (cmd === 'why' && /^#?[1-9]$/.test(arg)) txt = C.r['why' + arg.replace('#', '')] || null;
      txt = txt || C.r[cmd] || (cmd && (at || m.chat.type === 'private') ? `I don't know /${esc(cmd)}… tap /help for the list.` : null); if (!txt) continue;   /* a stray /word in a group stays quiet unless it's addressed to the bot */
      const dyn = ['live', 'next', 'status', 'rules', 'check'].includes(cmd);
      const stale = !dyn && C.d && C.d !== chicagoDay(now) ? `\n<i>(from ${esc(C.d)}: today's card isn't out yet)</i>` : '';
      const r = await T('sendMessage', { chat_id: m.chat.id, text: (fillTemplate(txt, st) + stale).slice(0, 4000), parse_mode: 'HTML', disable_web_page_preview: 'true', reply_to_message_id: String(m.message_id), allow_sending_without_reply: 'true' }); if (r) acted++;
    } catch (e) { log('update', x.update_id, e.message || e); } }
  /* one welcome per chat for everyone who joined in this batch */
  for (const k in joins) { const J = joins[k]; try { if ((await chatAccess(state, T, p, J.chat, J.from)) === 'ok') acted += await welcome(state, T, C, J.chat, J.users, await ownersOf(state, T, p)); } catch (e) { log('welcome', e.message || e); } }
  return acted || (seen ? 1 : 0); }   /* a command, a join or a tap moved things: save. Plain chatter doesn't (ackUpdates confirms it). */
/* confirm everything read so far, so the next run never sees it again */
export async function ackUpdates(state, deps) { const T = deps?.tg || tg; if (!state || !state.tgOff) return null; return T('getUpdates', { offset: String(state.tgOff + 1), timeout: '0', limit: '1' }); }
/* v2.82 · lounge hours (Central): the relay stays up so a /command answers in seconds. Repo variable LOUNGE: "8-24" (default), "0-24", "off". */
export function loungeHours(spec) { const s = String(spec == null || spec === '' ? '8-24' : spec).trim().toLowerCase(); if (s === 'off' || s === 'none' || s === '0') return null;
  const m = s.match(/^(\d{1,2})\s*-\s*(\d{1,2})$/); if (!m) return [8, 24]; const a = +m[1], b = +m[2]; return a <= 24 && b <= 24 && a !== b ? [a, b] : [8, 24]; }
export function loungeOpen(now, spec) { const H = loungeHours(spec === undefined ? env.LOUNGE : spec); if (!H) return false;
  const h = +new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', hour: 'numeric', hourCycle: 'h23' }).format(new Date(now)) % 24; const [a, b] = H; return a < b ? h >= a && h < b : (h >= a || h < b); }

/* ── v2.63 · /check: read a pasted slip like intake does, grade each leg with the characters ── */
const nrm = t => ' ' + String(t || '').toLowerCase().replace(/[^a-z0-9.+\-@/ ]/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
export function checkTicket(text, X) { if (!X || !X.games) return null; const body = String(text || '').replace(/^\/check(@\S+)?/i, '').trim();
  if (!body) return null;
  const legs = body.split(/\n|,|;|\s\+\s|\s&\s|\sand\s|\|/i).map(x => x.trim()).filter(x => x.length > 1).slice(0, 15);
  const G = X.games.map(([sp, game, a, h]) => ({ sp, game, a: a.map(x => nrm(x).trim()).filter(Boolean), h: h.map(x => nrm(x).trim()).filter(Boolean) }));
  const find = L => { let best = null; for (const g of G) for (const [side, al] of [['away', g.a], ['home', g.h]]) for (const n of al) {
      const re = n.length <= 4 ? new RegExp('(^|[ @/(])' + n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[ @/),])') : null; const hit = re ? re.test(L) : L.includes(' ' + n + ' ') || L.includes(n);
      if (hit && (!best || n.length > best.len)) best = { g, side, len: n.length }; } return best; };
  const out = []; let chance = 1, nC = 0; const rows = [];
  for (const raw of legs) { const L = nrm(raw); const T = find(L); if (!T) { rows.push({ raw, txt: `⚪ <b>${esc(raw)}</b> — not on today's board` }); continue; }
    const tot = L.match(/ (over|under|o|u) ?(\d+(?:\.\d+)?) /); const priceM = [...L.matchAll(/(?:^| |\()([+-]\d{3,4})(?= |\)|$)/g)].pop(); const noPrice = priceM ? L.replace(priceM[1], ' ') : L;
    const spr = !tot && noPrice.match(/ ([+-]\d{1,2}(?:\.5)?) /); const pk = / pk | pick ?em /.test(L);
    const m = tot ? 'total' : (spr || pk) ? 'spread' : 'ml'; const sd = tot ? (tot[1][0] === 'o' ? 'over' : 'under') : T.side;
    const opp = { away: 'home', home: 'away', over: 'under', under: 'over' }[sd];
    const C = (X.calls || []).filter(c => c[0] === T.g.sp && c[1] === T.g.game && c[2] === m);
    const on = C.filter(c => c[3] === sd).sort((a, b) => b[7] - a[7]), fd = C.filter(c => c[3] === opp).sort((a, b) => b[7] - a[7]);
    const who = A => A.slice(0, 3).map(c => `${esc(c[6])} ${c[7]}%${c[8] ? '✅' : ''}${c[9] ? '💪' : ''}`).join(', ');
    const bo = on[0] ? on[0][7] / 100 : null, bf = fd[0] ? fd[0][7] / 100 : null; const offOn = on.some(c => c[8]), pvF = fd.some(c => c[9] || c[8]);
    const ic = !on.length && !fd.length ? '⚪' : offOn && !pvF ? '🟢' : (bf != null && (bo == null || bf > bo)) ? '🔴' : '🟡';
    const label = m === 'total' ? `${sd === 'over' ? 'Over' : 'Under'} ${tot[2]} · ${T.g.game}` : m === 'spread' ? `${T.g.game.split('@')[sd === 'away' ? 0 : 1]} ${pk ? 'PK' : spr[1]} · ${T.g.game}` : `${T.g.game.split('@')[sd === 'away' ? 0 : 1]} ML · ${T.g.game}`;
    const p = bo != null ? bo : bf != null ? 1 - bf : null; if (p != null) { chance *= p; nC++; }
    rows.push({ raw, score: (bo || 0.5) - (bf || 0), txt: `${ic} <b>${esc(label)}</b>${priceM ? ' ' + esc(priceM[1]) : ''}\n   ${on.length ? '💪 on it: ' + who(on) : 'nobody on it'}${fd.length ? ' · 🚫 fading: ' + who(fd) : ''}` }); }
  const graded = rows.filter(r => r.score != null); const weak = graded.length > 1 ? graded.reduce((a, b) => b.score < a.score ? b : a) : null;
  out.push('<b>🧾 Your ticket, graded by the characters</b>', ...rows.map(r => r.txt));
  if (weak) out.push('', `🔻 <b>Weakest leg:</b> ${esc(weak.raw)} — drop it or swap in a /best pick.`);
  if (nC) out.push(`🎯 Chance it cashes (characters' read): <b>${(chance * 100).toFixed(chance < 0.1 ? 1 : 0)}%</b>`);
  out.push('<i>🟢 official pick, nobody proven against it · 🟡 split or lean · 🔴 the stronger side is the other way · ✅ official · 💪 proven in that lane</i>');
  return out.join('\n'); }

/* ── one pass ── */
/* v2.35 · history: a past day's card no worker ever touched, first seen 20+ hours after it was posted (the cards
   of Oct 13–15 sat where the worker wasn't looking). Its ✅/❌ go into the original post as a quiet edit — no
   notification — and the day closes: no late replies, recaps, cash posts or public posts days after the fact. */
export function isHistory(p, d, today, now) { return d < today && !p.recap && !Object.keys(p.sent || {}).length && (p.postedTs || 0) < now - 20 * 36e5; }
async function retireQuiet(p, deps, T) { p.st = p.st || {}; p.sent = p.sent || {};
  for (const l of p.legs || []) { if (p.st[l.k]) continue; let s = null; try { s = l.player ? await (deps?.gradeProp || gradeProp)(l, p.d) : await (deps?.gradePick || gradePick)(l, p.d); } catch (e) { } if (s) p.st[l.k] = s; }
  if (Object.keys(p.st).length && (p.ids || []).length && (p.ids || []).length === (p.parts || []).length)
    for (let i = 0; i < p.parts.length; i++) await T('editMessageText', { chat_id: p.chat, message_id: p.ids[i], text: fillTemplate(p.parts[i], p.st), parse_mode: 'HTML', disable_web_page_preview: 'true' });
  for (const l of p.legs || []) if (p.st[l.k]) p.sent[l.k] = p.st[l.k];
  for (const g of cashedParlays(p)) { const key = 'cash|' + g.sig; for (const k of [key, key + '|vl', key + '|pub', key + '|pl']) p.sent[k] = p.sent[k] || 'q'; }
  for (const l of (p.pub && p.pub.legs) || []) { p.sent['unlock|' + l.k] = p.sent['unlock|' + l.k] || 'q'; p.sent['pres|' + l.k] = p.sent['pres|' + l.k] || 'q'; }
  p.sent.precap = p.sent.precap || 'q'; p.sent['~quiet'] = 1; p.recap = true; }
const quiet = p => !!(p && p.sent && p.sent['~quiet']);
export async function runOnce(state, today, deps) { const T = deps?.tg || tg; let acted = 0; const now = deps?.now || Date.now();
  for (const d of Object.keys(state.posts || {}).sort()) { const p = state.posts[d]; if (!p || p.recap || p.worker === false || !p.chat) continue;
    p.st = p.st || {}; p.sent = p.sent || {};
    if (isHistory(p, d, today, now)) { await retireQuiet(p, deps, T); state.posts[d] = p; acted++; log('closed', d, 'quietly ·', (p.legs || []).filter(l => p.st[l.k]).length + '/' + (p.legs || []).length, 'graded into the original post'); continue; }
    p.sent['~wk'] = p.sent['~wk'] || 1;   /* this card is live with a worker — it never counts as history */
    for (const l of p.legs || []) { if (p.st[l.k]) continue; let s = null; try { s = l.player ? await (deps?.gradeProp || gradeProp)(l, p.d) : await (deps?.gradePick || gradePick)(l, p.d); } catch (e) { } if (s) p.st[l.k] = s; }
    const fresh = (p.legs || []).filter(l => p.st[l.k] && !p.sent[l.k]);
    if (fresh.length) {
      if ((p.ids || []).length === (p.parts || []).length) for (let i = 0; i < p.parts.length; i++) await T('editMessageText', { chat_id: p.chat, message_id: p.ids[i], text: fillTemplate(p.parts[i], p.st), parse_mode: 'HTML', disable_web_page_preview: 'true' });
      const lines = fresh.map(l => `${MARK[p.st[l.k]]}<b>${esc(l.label)}</b> <i>${esc(l.kind)}</i>${l.__fin ? ' · ' + esc(l.__fin) : ''}`);
      const msg = { chat_id: p.chat, text: '<b>📣 Results</b>\n' + lines.join('\n'), parse_mode: 'HTML', disable_web_page_preview: 'true' }; if ((p.ids || [])[0]) { msg.reply_to_message_id = p.ids[0]; msg.allow_sending_without_reply = 'true'; }
      const r = await T('sendMessage', msg); if (r) { fresh.forEach(l => { p.sent[l.k] = p.st[l.k]; }); acted++; }
      /* v2.31 · the VIP lounge gets the same results */
      const vl = p.bc && p.bc.vipLounge; if (vl) await T('sendMessage', { chat_id: vl, text: '<b>📣 Results</b>\n' + lines.join('\n'), parse_mode: 'HTML', disable_web_page_preview: 'true' }); }
    const legs = p.legs || []; const allDone = legs.every(l => p.st[l.k]); const games = legs.filter(l => !l.player);
    const ready = legs.length && (allDone || (p.d < today && games.every(l => p.st[l.k])) || p.d < shift(today, -1));
    if (ready) { const r = await T('sendMessage', { chat_id: p.chat, text: recapText(p, p.st), parse_mode: 'HTML', disable_web_page_preview: 'true' }); if (r) { p.recap = true; acted++;
        if (p.bc && p.bc.vipLounge) await T('sendMessage', { chat_id: p.bc.vipLounge, text: recapText(p, p.st), parse_mode: 'HTML', disable_web_page_preview: 'true' }); } }
    state.posts[d] = p; }
  /* v2.31 · the public side: unlocks 30 min before each game, results, the public recap */
  for (const d of Object.keys(state.posts || {}).sort()) { const p = state.posts[d]; if (!p || p.worker === false || !p.pub || quiet(p) || d < shift(today, -2)) continue;
    try { acted += await runPublic(p, deps); } catch (e) { log('public side', e.message || e); } state.posts[d] = p; }
  /* cashed tickets — also for days already recapped (the last 4), each announced once */
  for (const d of Object.keys(state.posts || {}).sort()) { const p = state.posts[d]; if (!p || p.worker === false || !p.chat || quiet(p) || d < shift(today, -4)) continue; p.sent = p.sent || {};
    for (const g of cashedParlays(p)) { const key = 'cash|' + g.sig; if (p.sent[key]) continue;
      const r = await T('sendMessage', { chat_id: p.chat, text: cashText(p, g), parse_mode: 'HTML', disable_web_page_preview: 'true' }); if (r) { p.sent[key] = 'W'; acted++;
        /* v2.31 · a cash goes everywhere: the VIP lounge, the public channel and its lounge (it's after the fact) */
        for (const [lab, c] of [['vl', p.bc && p.bc.vipLounge], ['pub', p.bc && p.bc.pub], ['pl', p.bc && p.bc.pubLounge]]) { if (!c || p.sent[key + '|' + lab]) continue;
          const r2 = await T('sendMessage', { chat_id: c, text: cashText(p, g), parse_mode: 'HTML', disable_web_page_preview: 'true' }); if (r2) p.sent[key + '|' + lab] = 'W'; }
        if (fbOn(deps) && !p.sent[key + '|fb'] && await fbPost(cashText(p, g), deps)) p.sent[key + '|fb'] = 'W'; } }
    state.posts[d] = p; }
  return acted; }

/* ── v2.97 · the Facebook page ─────────────────────────────────────────────────
   Every public post — unlocks (30 min before each game), results, the public recap, cashed tickets — is mirrored to
   TheDesk's Facebook page in plain text with the lounge invite, and once a day (from 10 AM Central, on a day with a card)
   the page gets an invite to the free lounge: we talk sports there, not just picks. It only ever mirrors what already
   went public, after Telegram took it. On only when the repo secrets FB_PAGE_ID and FB_PAGE_TOKEN are set; the token is
   masked in the (public) Actions logs and never printed. LOUNGE_URL (a repo variable) overrides the invite link. */
const fbCfg = deps => deps?.fb || { page: (env.FB_PAGE_ID || '').trim(), tok: (env.FB_PAGE_TOKEN || '').trim(), v: (env.FB_GRAPH_VERSION || 'v24.0').trim() };
export const fbOn = deps => { const c = fbCfg(deps); return !!(c && c.page && c.tok); };
if ((env.FB_PAGE_TOKEN || '').trim() && env.GITHUB_ACTIONS === 'true') console.log('::add-mask::' + env.FB_PAGE_TOKEN.trim());
const loungeUrl = deps => (deps?.lounge || env.LOUNGE_URL || '').trim() || 'https://t.me/TheDeskLounge';
export const fbPlain = html => String(html || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/\n{3,}/g, '\n\n').trim();
const fbFoot = deps => `\n\n💬 We talk sports in TheDesk's free Telegram lounge… not just picks. Pull up → ${loungeUrl(deps)}`;
export async function fbPost(text, deps, opt) { const c = fbCfg(deps); if (!c || !c.page || !c.tok) return false; const F = deps?.fetch || fetch;
  const message = fbPlain(text) + (opt && opt.bare ? '' : fbFoot(deps)); const hide = x => String(x || '').split(c.tok).join('…');
  try { const r = await F(`https://graph.facebook.com/${c.v || 'v24.0'}/${encodeURIComponent(c.page)}/feed`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ message, access_token: c.tok }).toString() });
    if (r && r.ok) { log('facebook ✓', message.split('\n')[0].slice(0, 70)); return true; } let why = r ? r.status : 'no reply'; try { const j = await r.json(); const m = j && j.error && j.error.message; if (m) why += ' ' + hide(m).slice(0, 90); } catch (e) { }
    log('facebook:', why); return false; } catch (e) { log('facebook:', hide(e && e.message || e).slice(0, 60)); return false; } }
const FB_INVITES = [
  "💬 TheDesk lounge is open… a free Telegram room where we break down the slate, argue the matchups and talk ball all day. The picks are part of it… the conversation is the point.\nPull up → {link}",
  "🏈🏀🏒 Talk sports with us… not just picks. TheDesk's free lounge on Telegram: live game talk, the reads behind every play, and a crew that actually watches the games.\nJoin → {link}",
  "Every pick we post is locked before the games and graded at the final… in public. Want the why behind them? Come talk it out in the free lounge.\n→ {link}",
  "No promises. No politics. Just sports. TheDesk's free Telegram lounge is where the real conversation happens… bring your takes.\n→ {link}"];
export async function fbInvite(state, deps) { if (!fbOn(deps)) return 0; const now = deps?.now || Date.now(); const d = chicagoDay(now); const p = state && state.posts && state.posts[d]; if (!p) return 0;
  const h = +new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', hour: 'numeric', hourCycle: 'h23' }).format(new Date(now)); p.sent = p.sent || {};
  if (h < 10 || p.sent.fbinv) return 0; const i = Math.floor(Date.parse(d + 'T12:00:00Z') / 864e5) % FB_INVITES.length;
  if (await fbPost(FB_INVITES[i].replace('{link}', loungeUrl(deps)), deps, { bare: true })) { p.sent.fbinv = 1; return 1; } return 0; }

/* ── v2.31 · the public side ──────────────────────────────────────────────────
   p.pub.legs: the Best 3, the Best 3 props and the Banker's parlay legs, each with
   the moment it unlocks (30 min before its game). Unlocks are announced on the
   public channel and lounge; results follow as they grade; one public recap. */
const DAYFMT = d => new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
const tStr = t => { try { return new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }) + ' CT'; } catch (e) { return ''; } };
const EM = { nfl: '🏈', ncaaf: '🏟', nhl: '🏒', mlb: '⚾', nba: '🏀', ncaab: '🏀' };
const KIND = { 'Best 3': '⭐ Best 3', 'Prop': '🎯 Prop', "Banker's parlay": "🏦 Banker's parlay" };
export async function runPublic(p, deps) { const T = deps?.tg || tg; const now = deps?.now || Date.now(); const legs = (p.pub && p.pub.legs) || []; if (!legs.length) return 0;
  const dests = [p.bc && p.bc.pub, p.bc && p.bc.pubLounge].filter(Boolean); let acted = 0; p.st = p.st || {}; p.sent = p.sent || {};
  for (const l of legs) { if (!l.prop || p.st[l.k]) continue; let s = null; try { s = await (deps?.gradeProp || gradeProp)({ sp: l.sp, player: l.player, team: l.team, stat: l.stat, thr: l.thr, side: l.side }, p.d); } catch (e) { } if (s) p.st[l.k] = s; }
  if (!dests.length && !fbOn(deps)) return 0;
  const send = async text => { let ok = false; for (const c of dests) { const r = await T('sendMessage', { chat_id: c, text, parse_mode: 'HTML', disable_web_page_preview: 'true' }); ok = ok || !!r; }
    /* v2.97 · the Facebook page gets it once Telegram has it (a Telegram miss retries both next pass) */
    if ((ok || !dests.length) && fbOn(deps)) { const fb = await fbPost(text, deps); if (!dests.length) ok = fb; } return ok; };
  /* unlocks */
  const open = legs.filter(l => l.unlockAt && now >= l.unlockAt && !p.sent['unlock|' + l.k] && !p.st[l.k]);
  if (open.length) { const day = (p.pub && p.pub.day) || DAYFMT(p.d);
    /* v2.35 · an unlock that goes out after its game has started says so — the post never claims a time it missed */
    const late = l => { const t = Date.parse(l.start || ''); return isFinite(t) && now >= t; };
    const txt = [`🔓 <b>UNLOCKED — TheDesk · ${esc(day)}</b>`, ...open.map(l => `${KIND[l.kind] || l.kind}${l.n && l.kind !== 'Prop' ? ' #' + l.n : ''}: <b>${esc(l.label)}</b>${l.game ? ' · ' + (EM[l.sp] || '') + ' ' + esc(l.game) : ''}${l.start ? ' · ' + tStr(l.start) : ''}${late(l) ? ' · <i>underway</i>' : ''}`),
      '', open.some(late) ? '<i>Locked before the games. This post is late — the game marked underway has already started. Graded at the final.</i>'
        : '<i>Locked before the games, posted 30 minutes before each start. Graded at the final.</i>'].join('\n');
    if (await send(txt)) { open.forEach(l => { p.sent['unlock|' + l.k] = 1; }); acted++; } }
  /* results (only what's been unlocked or is final) */
  const fresh = legs.filter(l => p.st[l.k] && !p.sent['pres|' + l.k]);
  if (fresh.length) { const by = {}; (p.legs || []).forEach(l => { by[l.k] = l; });
    const txt = '<b>📣 Results</b>\n' + fresh.map(l => `${MARK[p.st[l.k]]}<b>${esc(l.label)}</b> <i>${esc(KIND[l.kind] || l.kind)}</i>${by[l.k] && by[l.k].__fin ? ' · ' + esc(by[l.k].__fin) : ''}`).join('\n');
    if (await send(txt)) { fresh.forEach(l => { p.sent['pres|' + l.k] = p.st[l.k]; }); acted++; } }
  /* the public recap, once */
  const allDone = legs.every(l => p.st[l.k]);
  if ((allDone || p.d < shift(chicagoDay(now), -1)) && !p.sent.precap && legs.some(l => p.st[l.k])) {
    const rec = arr => { const w = arr.filter(l => p.st[l.k] === 'W').length, L = arr.filter(l => p.st[l.k] === 'L').length; return `${w}-${L}`; };
    const best = legs.filter(l => l.kind === 'Best 3'), props = legs.filter(l => l.kind === 'Prop'), bk = legs.filter(l => l.kind === "Banker's parlay");
    const bkr = bk.length ? (bk.some(l => p.st[l.k] === 'L') ? '❌' : bk.every(l => p.st[l.k] === 'W' || p.st[l.k] === 'P') ? '✅ CASHED' : '…') : '';
    const out = [`<b>📊 Public recap — ${esc((p.pub && p.pub.day) || DAYFMT(p.d))}</b>`];
    if (best.length) out.push(`⭐ Best ${best.length}: <b>${rec(best)}</b> (${(best.reduce((a, l) => a + units(l.price, p.st[l.k] || 'P'), 0) >= 0 ? '+' : '') + best.reduce((a, l) => a + units(l.price, p.st[l.k] || 'P'), 0).toFixed(2)}u)`);
    if (props.length) out.push(`🎯 Props: <b>${rec(props)}</b>`);
    if (bk.length) out.push(`🏦 The Banker's parlay: ${bkr}${p.pub && p.pub.parlay ? ' ' + esc(p.pub.parlay.price) : ''}`);
    out.push('<i>Every pick locked before the games and graded at the final — VIP gets them all in the morning.</i>');
    if (await send(out.join('\n'))) { p.sent.precap = 1; acted++; } }
  return acted; }
/* the public page: the full card the app handed over, with whatever hasn't unlocked yet hidden, and every grade the worker knows */
export function publicView(feed, st, now) { const F = JSON.parse(JSON.stringify(feed || {})); st = st || {}; const T0 = F.today; if (!T0) { F.generated = now; return F; }
  const key = x => [x.sp, x.game || x.team || '', x.pick || ''].join('|');
  const hide = x => ({ hidden: true, sp: x.sp, start: x.start || '', unlockAt: x.unlockAt || null });
  /* v2.35 · open = graded, or past its unlock (T-30 from the start when only the start is known). No time at all → stays hidden. */
  const shut = x => { if (x.hit != null || x.push) return false; const t = x.unlockAt || (Date.parse(x.start || '') - 30 * 60e3); return !(isFinite(t) && now >= t); };
  const R = F.record || { w: 0, l: 0, pu: 0, u: 0 };
  T0.picks = (T0.picks || []).map(x => { if (x.hidden) return x; const s = st[key(x)];
    if (x.hit == null && !x.push && s) { if (s === 'P') x.push = true; else { x.hit = s === 'W'; if (x.hit) { R.w++; R.u += units(x.price, 'W'); } else { R.l++; R.u -= 1; } } }
    return shut(x) ? hide(x) : x; });
  T0.props = (T0.props || []).map(x => { if (x.hidden) return x; const s = st['pprop|' + x.sp + '|' + x.player + '|' + x.stat + '|' + x.thr];
    if (x.hit == null && !x.push && s) { if (s === 'P') x.push = true; else x.hit = s === 'W'; } return shut(x) ? hide(x) : x; });
  T0.allStarted = (T0.picks || []).every(x => !x.hidden);
  if (F.parlay && F.parlay.legs) { F.parlay.legs = F.parlay.legs.map(l => { if (l.hidden) return l; const s = st[key(l)]; if (l.hit == null && !l.push && s) { if (s === 'P') l.push = true; else l.hit = s === 'W'; }
      return shut(l) ? hide(l) : l; });
    const live = F.parlay.legs.filter(l => !l.push); F.parlay.result = live.some(l => l.hit === false) ? false : live.length && live.every(l => l.hit === true) ? true : null; }
  /* v2.51.1 · today's card never rides in the history list (an older app build handed it over in full) */
  F.history = (F.history || []).filter(h => h && h.d && h.d < T0.d);
  F.record = { ...R, u: +(+R.u).toFixed(2) }; F.generated = now; F.by = 'worker'; return F; }
async function sitePut(site, text, deps) { const tok = (site && site.tok) || (site && site.repo === SITE ? SITE_TOK : '') || env.SITE_TOKEN; if (!tok || !site || !site.repo) return { ok: false, reason: 'no site token' };
  const F = deps?.fetch || fetch; const api = `https://api.github.com/repos/${site.repo}/contents/${site.path || 'public/picks.json'}`; const H = { Authorization: 'Bearer ' + tok, Accept: 'application/vnd.github+json', 'User-Agent': 'thedesk-autopilot' };
  let sha = null; try { const g = await F(api, { headers: H }); if (g.status === 200) sha = (await g.json()).sha; } catch (e) { }
  const r = await F(api, { method: 'PUT', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'Public page — worker update', content: Buffer.from(text, 'utf8').toString('base64'), ...(sha ? { sha } : {}) }) });
  return { ok: r.ok, status: r.status }; }
export async function publishPublic(state, deps) { const now = deps?.now || Date.now(); const ds = Object.keys(state.posts || {}).sort(); const d = ds.reverse().find(x => state.posts[x] && state.posts[x].feed && state.posts[x].site);
  if (!d) return 0; const p = state.posts[d]; const V = publicView(p.feed, p.st, now); const sig = JSON.stringify({ ...V, generated: 0 });
  state.pubSig = state.pubSig || {}; if (state.pubSig[d] === sig) return 0; const r = await sitePut(p.site, JSON.stringify(V, null, 1), deps);
  if (r.ok) { state.pubSig[d] = sig; return 1; } log('public page', r.reason || r.status); return 0; }
/* ── v2.33 · the relay ─────────────────────────────────────────────────────────
   GitHub only fires the 10-minute schedule every few hours, so per-game results
   could wait hours when the app is closed. While today's slate is live, the worker
   now keeps itself going: it checks every 75 seconds inside its run, then starts
   the next run itself (a workflow dispatch, which the job's own token may do).
   The chain rests once every pick on today's card is graded — and it's capped. */
export function relayPending(state, now, lounge) { const today = chicagoDay(now);
  if (loungeOpen(now, lounge)) return true;   /* v2.82 · lounge hours: up and listening, so /commands answer in seconds */
  if (state.cmdTs && now - state.cmdTs < 45 * 60e3) return true;   /* v2.62.1 · someone is using the commands: stay awake 45 minutes after the last one */
  for (const d of Object.keys(state.posts || {})) { const p = state.posts[d]; if (!p || p.worker === false || p.recap || d !== today) continue; const st = p.st || {}, sent = p.sent || {};
    const vip = (p.legs || []).filter(l => !st[l.k]); const pub = ((p.pub && p.pub.legs) || []).filter(l => !st[l.k]);
    if (!vip.length && !pub.length) continue;
    /* the earliest game still open — when the card knows its start times */
    const starts = pub.map(l => Date.parse(l.start || '') || (l.unlockAt ? l.unlockAt + 30 * 60e3 : NaN)).filter(isFinite);
    const first = starts.length ? Math.min(...starts) : null;
    if (first == null) return true;                                  /* no times on file: the slate is live until it's graded */
    if (first - now <= 6 * 36e5) return true;                          /* a game is on, or the first one starts within 6 hours (GitHub's schedule can sit ~4 h) */
    if (pub.some(l => l.unlockAt && !sent['unlock|' + l.k] && l.unlockAt - now <= 6 * 36e5)) return true; }
  return false; }
/* the next leg of the relay: one more run of this workflow */
let VIS = null;   /* is this repo public? Actions minutes are free there — a private repo would pay for every relayed run */
async function repoPublic(F) { if (VIS != null) return VIS; try { const r = await F(`https://api.github.com/repos/${REPO}`, { headers: ghH }); if (r && r.status === 200 && typeof r.json === 'function') { const j = await r.json(); if (typeof j.private === 'boolean') VIS = !j.private; } } catch (e) { } return VIS !== false; }
export async function relayNext(state, deps) { if ((env.RELAY || '') === 'off') return false; const today = chicagoDay(deps?.now || Date.now());
  const F = deps?.fetch || fetch; const wf = env.RELAY_WORKFLOW || 'tg-autopilot.yml';
  if (!(await repoPublic(F))) { log('this repo is private — the relay stays off so it never spends Actions minutes; the schedule still runs'); return false; }
  /* the cap: count today's relayed runs straight from GitHub (nothing extra written to the state branch) */
  let n = state && state.relay && state.relay.d === today ? state.relay.n || 0 : 0;
  try { const since = new Date((deps?.now || Date.now()) - 20 * 36e5).toISOString().slice(0, 19) + 'Z';
    const c = await F(`https://api.github.com/repos/${REPO}/actions/workflows/${wf}/runs?event=workflow_dispatch&created=%3E%3D${since}&per_page=1`, { headers: ghH });
    if (c && c.status === 200 && typeof c.json === 'function') { const j = await c.json(); if (isFinite(+j.total_count)) n = Math.max(n, +j.total_count); } } catch (e) { }
  if (n >= 240) { log('relay cap reached (' + n + ' runs today)'); return false; }   /* v2.82 · lounge hours fit: 16 h ≈ 150 runs, plus late games */
  const r = await F(`https://api.github.com/repos/${REPO}/actions/workflows/${wf}/dispatches`, { method: 'POST', headers: { ...ghH, 'Content-Type': 'application/json' }, body: JSON.stringify({ ref: env.GITHUB_REF_NAME || 'main' }) });
  log('relay → next run', r.status); return r.status === 204; }
/* the slate day turns over at 5 AM Central — a game ending after midnight still belongs to its day */
export function chicagoDay(now) { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date((now || Date.now()) - 5 * 36e5)); }
export { decrypt, encrypt, gradePick, gradeProp };
/* ── main ── */
if (import.meta.url === 'file://' + process.argv[1]) {
  const t0 = Date.now(), BUDGET = +(env.RELAY_BUDGET_MS || 6.5 * 60e3), STEP = +(env.RELAY_STEP_MS || 75e3), MARGIN = +(env.RELAY_MARGIN_MS || 25e3);
  log(VERSION, '· repo', REPO, '· card from', SITE === REPO ? 'here' : SITE + ' + here', '· today', chicagoDay(t0), '·', env.GITHUB_EVENT_NAME || 'manual', '· lounge hours', (loungeHours(env.LOUNGE) || ['off']).join('-'), '· facebook page', fbOn() ? 'on' : 'off');
  /* write one copy: on a collision, re-read that copy, merge, retry */
  const saveAt = async (repo, state, cur) => { for (let tries = 0; tries < 3; tries++) { const latest = tries ? await readStateAt(repo) : cur;
      const merged = tries && latest ? mergeState(state, latest.state) : state; const st = await writeStateAt(repo, merged, latest && latest.sha);
      if (st === 200 || st === 201) return true; if (!st) return false; log('write conflict', repo === REPO ? 'here' : repo, st, '— merging and retrying'); } return false; };
  const readSite = async () => { if (SITE === REPO) return null; try { return await readStateAt(SITE); } catch (e) { log('the site\'s copy:', e.message || e); return undefined; } };
  /* v2.34 · a hiccup (GitHub or ESPN) costs one pass, not the chain. What this run already sent stays in
     memory and is merged into every fresh read, so a failed save can never make a result post twice. */
  let state = null, total = 0, dirty = false, siteDirty = false;
  const flush = async () => { if (!state) return; try { if (dirty) { const c = await readState(); dirty = !(await saveAt(REPO, c ? mergeState(state, c.state) : state, c)); }
      if (siteDirty && SITE_TOK) { const c = await readSite(); if (c !== undefined) siteDirty = !(await saveAt(SITE, c ? mergeState(state, c.state) : state, c)); } } catch (e) { log('final save', e.message || e); } };
  for (let pass = 0; ; pass++) { const today = chicagoDay(Date.now());
    try { const cur = await readState(); const sc = await readSite();
      if (!cur && !sc) { log('no card handed over yet'); process.exit(0); }
      state = combineStates(sc && sc.state, cur && cur.state, state); for (const k in SB) delete SB[k];   /* fresh scoreboards every pass */
      if (!pass) log('posts on file:', Object.entries(state.posts || {}).map(([d, p]) => `${d} ${Object.keys(p.st || {}).length}/${(p.legs || []).length} graded${p.recap ? ' · closed' : ''}`).join(' · '));
      let acted = await runOnce(state, today); try { acted += await publishPublic(state); } catch (e) { log('public page', e.message || e); }
      try { acted += await runCommands(state); } catch (e) { log('commands', e.message || e); }
      try { acted += await fbInvite(state); } catch (e) { log('facebook invite', e.message || e); }
      /* the state branch only gets a commit when something was sent — or an hourly heartbeat */
      const beat = !state.lastRun || Date.now() - state.lastRun > 60 * 60e3;
      if (acted || beat || dirty) { state.lastRun = Date.now(); state.runs = (state.runs || 0) + 1; dirty = !(await saveAt(REPO, state, cur)); if (dirty) log('couldn\'t save this pass — kept in memory, retrying next pass'); }
      /* the site's copy too, so the app sees every grade (its token rides inside the card) */
      if (SITE !== REPO && SITE_TOK && sc !== undefined && (acted || siteDirty)) { siteDirty = !(await saveAt(SITE, state, sc)); if (siteDirty) log('couldn\'t update the site\'s copy — next pass'); }
      total += acted; if (acted) log('pass', pass + 1, '·', acted, 'update(s)');
    } catch (e) { log('pass', pass + 1, 'hiccup:', e.message || e); }
    if (state && !relayPending(state, Date.now())) { await ackUpdates(state); await flush(); log('ok ·', total, 'update(s) · nothing live, lounge closed — the relay rests'); process.exit(dirty ? 1 : 0); }
    if (BUDGET - (Date.now() - t0) < STEP + MARGIN) { if (state) await ackUpdates(state); await flush();
      if (!state) { log('couldn\'t read the card this run — the schedule will try again'); process.exit(1); }
      await relayNext(state); log('ok ·', total, 'update(s) · relay handed off'); process.exit(dirty ? 1 : 0); }
    /* v2.82 · between passes the robot listens (Telegram long-poll): a /command is answered in seconds, not at the next pass */
    const until = Date.now() + STEP;
    while (state && TG && Date.now() < until - 2500) { const t1 = Date.now(); let a = 0;
      try { a = await runCommands(state, { poll: Math.min(50, Math.floor((until - Date.now()) / 1000) - 1) }); } catch (e) { log('commands', e.message || e); }
      if (a) { dirty = true; total += a; }
      if (Date.now() - t1 < 1500) await new Promise(r => setTimeout(r, Math.min(3000, Math.max(0, until - Date.now())))); }   /* Telegram answered at once (an error): don't spin */
    const left = until - Date.now(); if (left > 0) await new Promise(r => setTimeout(r, left)); } }
