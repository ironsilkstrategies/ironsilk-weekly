/* TheDesk · Telegram autopilot worker (GitHub Actions, every 10 minutes).
   Reads the encrypted card the app handed over (branch autopilot-state, file tg.enc),
   grades every pick from ESPN (finals + box scores), then — exactly like the in-app
   autopilot — edits the posts with ✅/❌/➖, replies with new results, and posts the
   day's recap once. Writes the updated state back (encrypted) with a merge so the app
   and the worker never overwrite each other.
   Secrets: TG_BOT_TOKEN, AUTOPILOT_KEY. GITHUB_TOKEN + GITHUB_REPOSITORY come from Actions. */
import { webcrypto as crypto, createHash } from 'node:crypto';
import * as Soc from './social.mjs';
import * as Mega from './megaphone.mjs';
import * as F3 from './free3.mjs';   /* v3.3.2 · the daily Free 3 promo post (free3.mjs) */
import * as Gr from './growth.mjs';   /* v3.3 · the growth playbook: the debate, Receipts Sunday, recruiting links, game pages */   /* v2.99 · a post every 30 minutes: game questions + polls, streaks, line movers, the reactions goal */   /* v2.98 · the picture cards and the other outlets (Facebook, Instagram, Threads) */
const env = process.env;
const REPO = env.GITHUB_REPOSITORY, GH = env.GITHUB_TOKEN, TG = (env.TG_BOT_TOKEN || '').trim(), KEY = (env.AUTOPILOT_KEY || '').trim();
const BRANCH = 'autopilot-state', FILE = 'tg.enc';
const log = (...a) => console.log('[autopilot]', ...a);
const VERSION = 'worker v3.3.2';
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
  let H = { ...ghH, Authorization: 'Bearer ' + (own ? GH : (SITE_TOK || GH)) }; let r = await fetch(url, { headers: H });
  if (!own && (r.status === 401 || r.status === 403 || r.status === 404)) { H = { Accept: ghH.Accept, 'User-Agent': ghH['User-Agent'] }; r = await fetch(url, { headers: H }); }   /* a public repo reads without a token */
  if (r.status === 404) return null; if (!r.ok) throw new Error('read state ' + (own ? '' : repo + ' ') + 'HTTP ' + r.status);
  const j = await r.json(); let raw = j.content;
  /* v3.1.5 · over 1 MB the contents API sends no body ("encoding": "none") — the site's copy crossed it on Nov 13 and the worker
     lost every card after that ("unknown format"). The blob API gives the same file up to 100 MB. */
  if (!raw || j.encoding === 'none') { const b = await fetch(`https://api.github.com/repos/${repo}/git/blobs/${j.sha}`, { headers: H }); if (!b.ok) throw new Error('read state blob ' + (own ? '' : repo + ' ') + 'HTTP ' + b.status); raw = (await b.json()).content; }
  const state = await decrypt(Buffer.from(String(raw || ''), 'base64').toString('utf8'));
  if (!own) { const t = siteTokOf(state); if (t && t !== SITE_TOK) { SITE_TOK = t; if (env.GITHUB_ACTIONS === 'true') console.log('::add-mask::' + t); } }   /* this repo's logs are public — the runner blanks the token everywhere */
  return { repo, sha: j.sha, state }; }
async function readState() { return readStateAt(REPO); }
/* this repo's copy never carries the site token — the site's own copy already holds it */
const stripTok = s => { const o = JSON.parse(JSON.stringify(s)); for (const d in o.posts || {}) { const p = o.posts[d]; if (p && p.site && p.site.tok) p.site = { ...p.site, tok: '' }; } return o; };
/* v3.1.5 · only the two newest days keep their full public card (the public page is rebuilt from the newest one); older days keep
   everything the recap, results and receipts need, without the ~300 KB card each — the file stays well under GitHub's limits */
export function slimFeeds(state) { if (!state || !state.posts) return state; const ds = Object.keys(state.posts).sort(); const keep = new Set(ds.slice(-2)); const posts = {};
  for (const d of ds) { const p = state.posts[d]; posts[d] = keep.has(d) || !p || !p.feed ? p : (({ feed, ...rest }) => rest)(p); } return { ...state, posts }; }
async function writeStateAt(repo, state, sha) { const own = repo === REPO; const tok = own ? GH : SITE_TOK; if (!tok) return 0;
  const body = { message: 'autopilot ' + new Date().toISOString(), branch: BRANCH, content: Buffer.from(await encrypt(slimFeeds(own ? stripTok(state) : state)), 'utf8').toString('base64'), ...(sha ? { sha } : {}) };
  const r = await fetch(`https://api.github.com/repos/${repo}/contents/${FILE}`, { method: 'PUT', headers: { ...ghH, Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!own) siteSeen(r.status); return r.status; }
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
const newerTs = (x, y) => !x ? y : !y ? x : (+x.ts || 0) >= (+y.ts || 0) ? x : y;
/* v3.2 · the watchdog's memory: which alert went out on which day, the last refusal from the site, the daily squash, the vault copies */
export function mergeWatch(x, y) { if (!x || !y) return x || y; const sent = { ...(y.sent || {}) };
  for (const k in (x.sent || {})) { const a = x.sent[k], b = sent[k]; sent[k] = !b || (a && (a.ts || 0) >= (b.ts || 0)) ? a : b; }
  const sq = { ...(y.sq || {}) }; for (const k in (x.sq || {})) if (!sq[k] || String(x.sq[k]) > String(sq[k])) sq[k] = x.sq[k];
  const out = { ...y, ...x, sent, sq }; const se = newerTs(x.siteErr, y.siteErr), so = Math.max(+x.siteOk || 0, +y.siteOk || 0);
  if (se && so > (se.ts || 0)) delete out.siteErr; else if (se) out.siteErr = se; else delete out.siteErr; if (so) out.siteOk = so;
  const v = newerTs(x.vault && { ...x.vault, ts: x.vault.ts }, y.vault && { ...y.vault, ts: y.vault.ts }); if (v) out.vault = v; return out; }
/* v3.3 · the / menu's signature: the newer one wins. (It was "whichever copy came first", so a copy that couldn't be written — the site's,
   with a refused token — kept the old signature and the menu was sent again on every pass.) A copy with no stamp loses to one with a stamp. */
const cmdSigOf = (a, b) => { const x = (a?.cmdSigTs || 0) >= (b?.cmdSigTs || 0) ? a : b, y = x === a ? b : a; const sig = x?.cmdSig || y?.cmdSig || ''; const ts = Math.max(a?.cmdSigTs || 0, b?.cmdSigTs || 0);
  return { cmdSig: sig, ...(ts ? { cmdSigTs: ts } : {}) }; };
export function mergeState(a, b) { const out = { v: 1, posts: {}, lastRun: Math.max(a?.lastRun || 0, b?.lastRun || 0), runs: Math.max(a?.runs || 0, b?.runs || 0), tgOff: Math.max(a?.tgOff || 0, b?.tgOff || 0), cmdTs: Math.max(a?.cmdTs || 0, b?.cmdTs || 0), ...cmdSigOf(a, b), pubSig: { ...(b?.pubSig || {}), ...(a?.pubSig || {}) }, ...(a?.relay || b?.relay ? { relay: relayMerge(a?.relay, b?.relay) } : {}), ...(a?.mod || b?.mod ? { mod: mergeMod(a?.mod, b?.mod) } : {}), ...(a?.lounge || b?.lounge ? { lounge: mergeLounge(a?.lounge, b?.lounge) } : {}), ...(a?.phone || b?.phone ? { phone: newerTs(a?.phone, b?.phone) } : {}), ...(a?.watch || b?.watch ? { watch: mergeWatch(a?.watch, b?.watch) } : {}), ...(a?.refs || b?.refs ? { refs: Gr.mergeRefs(a?.refs, b?.refs) } : {}) };
  const ds = new Set([...Object.keys(a?.posts || {}), ...Object.keys(b?.posts || {})]);
  ds.forEach(d => { const x = a?.posts?.[d], y = b?.posts?.[d]; if (!x || !y) { out.posts[d] = x || y; return; }
    const base = (x.postedTs || 0) >= (y.postedTs || 0) ? x : y;
    const fx = (x.feedTs || 0) >= (y.feedTs || 0) ? x : y;   /* the newest public card the app handed over wins */
    /* v3.2 · whoever actually posted the card keeps its message ids: a later hand-off from a phone that couldn't post (ids: [])
       must never make the worker post the same card twice */
    const ids = (base.ids || []).length ? base.ids : ((base === x ? y : x).ids || []);
    out.posts[d] = { ...base, ids, needPost: !ids.length && !!(x.needPost || y.needPost), ...(x.postedBy || y.postedBy ? { postedBy: x.postedBy || y.postedBy } : {}), st: { ...(y.st || {}), ...(x.st || {}) }, sent: { ...(y.sent || {}), ...(x.sent || {}) }, recap: !!(x.recap || y.recap), worker: x.worker !== false && y.worker !== false,
      ...(fx.feedTs ? { feed: fx.feed, pub: fx.pub, bc: fx.bc, site: fx.site, feedTs: fx.feedTs, ...(fx.cmd ? { cmd: fx.cmd } : {}) } : {}) }; });
  const keep = Object.keys(out.posts).sort().slice(-5); Object.keys(out.posts).forEach(d => { if (!keep.includes(d)) delete out.posts[d]; });
  return out; }

/* v3.1.4 · the welcome post (on request only, from its own workflow: .github/workflows/social-post.yml → autopilot/postnow.mjs) */
export async function postNow(kind, deps) { if (kind !== 'welcome' || !Soc.anyOn(deps)) return null; const m = await Soc.mirror(WELCOME_TEXT, await picOf(WELCOME_CARD(), deps), deps, { kind: 'welcome' });
  log('welcome post:', ['fb', 'ig', 'th', 'x'].filter(o => Soc.on(deps, o)).map(o => o + (m[o] === true ? ' ✓' : m[o] === 'skip' ? ' skipped' : ' ✗')).join(' · ')); return m; }
export const WELCOME_TEXT = '👋 Welcome to TheDesk App.\n\nFree picks before every game. Every result posted, win or lose. The recap every night. No hype… just receipts.\n\nThe whole card is free on the app during the open beta.';
export const WELCOME_CARD = () => ({ kicker: 'Welcome', title: 'Welcome to TheDesk App', sub: 'Free picks. Real receipts.', rows: [{ label: 'Free picks', meta: '30 min before every game' }, { label: 'Every result', meta: 'graded at the final, win or lose' }, { label: 'The recap', meta: 'every night' }, { label: 'The full card', meta: 'free in the open beta' }], foot: 'ironsilkweekly.com/desk' });
/* v3.1.3 · the lounge's memory: its member count (newest reading wins) and the moment it locked at 100 (the first lock wins, never undone) */
export function mergeLounge(x, y) { if (!x || !y) return x || y; const nw = (x.at || 0) >= (y.at || 0) ? x : y, lk = [x, y].filter(z => z.locked).sort((a, b) => a.locked - b.locked)[0];
  return { ...nw, ...(lk ? { locked: lk.locked, chat: lk.chat, founders: lk.founders, titled: !!(x.titled || y.titled) } : {}) }; }

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
/* v2.98 · the same cash as a picture card */
export function cashCard(p, g) { const st = p.st || {}; const by = {}; (p.legs || []).forEach(l => { by[l.k] = l; });
  const D = g.keys.filter(k => st[k] === 'W').reduce((a, k) => a * toDec(by[k] && by[k].price), 1); const day = (p.recapPlan && p.recapPlan.day) || DAYFMT(p.d);
  return { kicker: 'Cashed · ' + day, title: g.who.join(' + '), big: { value: toAmer(D), label: `${g.keys.length}-leg parlay · +${(D - 1).toFixed(2)}u` },
    rows: g.keys.map(k => ({ label: (by[k] && by[k].label) || k, meta: (by[k] && by[k].__fin) || '', res: st[k] })) }; }
/* v2.98 · pictures. In a real run (no deps) the real renderer and Telegram's sendPhoto; a test hands in its own, or none
   (then it's words only, exactly as before). A post whose picture can't be made or sent still goes out as words. */
const picOf = async (card, deps) => { const R = deps ? deps.render : Soc.renderCard; if (!R || !card) return null; try { return await R(card, deps); } catch (e) { return null; } };
async function say(T, chat, text, img, deps) { const P = deps ? deps.tgPhoto : (c, i, t) => Soc.tgPhoto(TG, c, i, t);
  if (img && P && await P(chat, img, text)) return true; return !!(await T('sendMessage', { chat_id: chat, text, parse_mode: 'HTML', disable_web_page_preview: 'true' })); }

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
    else if (from) { let checked = false; for (const id of new Set([p?.bc?.pubLounge, p?.bc?.vipLounge, p?.chat, p?.bc?.pub].filter(Boolean).map(String))) { const r = await T('getChatMember', { chat_id: id, user_id: String(from.id) }); if (!r) continue; checked = true; const m = r.result;
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
  'Keep it to sports, picks and bankroll talk.', 'No begging, no scams, no DMing members to sell anything.', "Don't repost TheDesk's VIP picks outside TheDesk.", '21+ only. For entertainment… bet responsibly. Problem? Call or text 1-800-MY-RESET.'];
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
const WORKER_MENU = [['live', "Live scores of today's picks"], ['next', 'The next game on the card'], ['rules', 'The lounge rules'], ['status', 'Is the robot on?'], ['mylink', 'Your personal invite link (DM the bot)']];
export async function runCommands(state, deps) { const T = deps?.tg || tg; let acted = 0, seen = 0; const now = deps?.now || Date.now();
  const ds = Object.keys(state.posts || {}).filter(d => state.posts[d]?.cmd).sort(); const p = ds.length ? state.posts[ds[ds.length - 1]] : (Object.keys(state.posts || {}).sort().map(d => state.posts[d]).pop() || null);
  const C = (p && p.cmd) || { r: {}, menu: [] }; C.r = C.r || {};
  /* the / menu, once per new list: the robot's own commands ride along; admins also see /warn /ban /unban */
  const menu = [...(C.menu || [])]; if (menu.length) for (const [c, t] of WORKER_MENU) if (!menu.some(x => x.command === c)) menu.push({ command: c, description: t });
  const sig = 'v3|' + menu.map(m => m.command).join(','); if (state.cmdSig !== sig && menu.length) { const r = await T('setMyCommands', { commands: JSON.stringify(menu.slice(0, 100)) });
    const r2 = await T('setMyCommands', { commands: JSON.stringify([...menu.slice(0, 93), { command: 'warn', description: 'Admins: warn a member (reply). 3 = ban' }, { command: 'ban', description: 'Admins: ban a member (reply)' }, { command: 'unban', description: 'Admins: lift a ban (reply)' }, { command: 'vipinvite', description: 'Owner: a one-person VIP lounge link (DM the bot)' }, { command: 'lounge', description: 'Owner: how many lounge seats are taken' }, { command: 'sourcelinks', description: 'Owner: one invite link per platform (DM the bot)' }, { command: 'joins', description: 'Owner: joins by link, top recruiters (DM the bot)' }]), scope: JSON.stringify({ type: 'all_chat_administrators' }) });
    if (r && r2) { state.cmdSig = sig; state.cmdSigTs = Date.now(); acted++; } }
  const u = await T('getUpdates', { offset: String((state.tgOff || 0) + 1), timeout: String(Math.max(0, Math.min(50, deps?.poll || 0))), allowed_updates: JSON.stringify(['message', 'callback_query', 'my_chat_member', 'chat_member']) });
  const rows = (u && Array.isArray(u.result)) ? u.result : []; if (!rows.length) return acted;
  const st = {}; for (const d of ds) Object.assign(st, state.posts[d].st || {}); const joins = {}, gone = new Set();
  for (const x of rows) { state.tgOff = Math.max(state.tgOff || 0, x.update_id);
    try {
      /* the bot was added somewhere: whose chat is it? */
      if (x.my_chat_member) { seen++; const mc = x.my_chat_member; const nw = mc.new_chat_member && mc.new_chat_member.status;
        if ((nw === 'member' || nw === 'administrator') && mc.chat && mc.chat.type !== 'private') { const a = await chatAccess(state, T, p, mc.chat, mc.from); if (a === 'stranger') { acted += await turnAway(state, T, C, mc.chat, mc.from, a); log('left a chat that isn\'t TheDesk\'s'); } }
        continue; }
      /* v3.1.3 · the VIP lounge's door: after the lock, a join that didn't come through a VIP invite (or the owner adding someone) is shown out */
      if (x.chat_member) { seen++; const cm = x.chat_member, LK = state.lounge; const u = cm.new_chat_member && cm.new_chat_member.user;
        if (LK && LK.locked && u && !u.is_bot && cm.chat && String(cm.chat.id) === String(LK.chat) && ['member', 'restricted'].includes(cm.new_chat_member.status) && ['left', 'kicked'].includes(cm.old_chat_member && cm.old_chat_member.status) && (cm.date || 0) * 1000 >= LK.locked) {
          const owners = await ownersOf(state, T, p); const viaVip = !!(cm.invite_link && /^VIP/i.test(cm.invite_link.name || '')); const byOwner = !!(cm.from && cm.from.id !== u.id && owners.includes(cm.from.id));
          if (!viaVip && !byOwner && !owners.includes(u.id)) { await T('banChatMember', { chat_id: String(LK.chat), user_id: String(u.id), until_date: String(Math.floor(now / 1000) + 60) }); await T('unbanChatMember', { chat_id: String(LK.chat), user_id: String(u.id), only_if_banned: 'true' }); gone.add(u.id); acted++; log('VIP lounge: a join without a VIP invite was shown out'); } }
        /* v3.3 · recruiting: a join through a member's link (ref <id>) or a platform's link (src <tag>) counts once — never a show-out */
        const nc = cm.new_chat_member || {}, joinedNow = u && !u.is_bot && (nc.status === 'member' || (nc.status === 'restricted' && nc.is_member)) && ['left', 'kicked'].includes(cm.old_chat_member && cm.old_chat_member.status);
        if (joinedNow && !gone.has(u.id) && cm.invite_link && cm.invite_link.name) { const c = Gr.countJoin(state, cm.invite_link.name, u.id, now, chicagoDay(now)); if (c) { acted++; log('recruiting · a join through', c === 'ref' ? "a member's link" : 'the ' + String(cm.invite_link.name).slice(4) + ' link'); } }
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
      if ((cmd === 'vipinvite' || cmd === 'lounge') && await ownerLounge(state, T, p, m, cmd, now)) { acted++; continue; }
      if (cmd === 'app' && await ownerApp(state, T, p, m, parts[1] || '')) { acted++; continue; }
      if (cmd === 'health' && await ownerHealth(state, T, p, m, now)) { acted++; continue; }
      if (cmd === 'mylink') { acted += await myLink(state, T, p, m, now); continue; }
      if ((cmd === 'sourcelinks' || cmd === 'joins') && await ownerRecruit(state, T, p, m, cmd, now)) { acted++; continue; }
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
  for (const k in joins) { const J = joins[k]; J.users = J.users.filter(u => !gone.has(u.id)); if (!J.users.length) continue; try { if ((await chatAccess(state, T, p, J.chat, J.from)) === 'ok') acted += await welcome(state, T, C, J.chat, J.users, await ownersOf(state, T, p)); } catch (e) { log('welcome', e.message || e); } }
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
/* v3.1.3 · the owner's lounge tools: /vipinvite (in private) makes a one-person VIP link, good for 7 days; /lounge shows the seats */
async function ownerLounge(state, T, p, m, cmd, now) { const owners = await ownersOf(state, T, p); if (!m.from || !owners.includes(m.from.id)) return 0;
  const L = state.lounge || {}; const chat = L.locked ? L.chat : (p && p.bc && (p.bc.vipLounge || p.bc.pubLounge)); const reply = text => T('sendMessage', { chat_id: m.chat.id, text, disable_web_page_preview: 'true' });
  if (cmd === 'lounge') { await reply(L.locked ? `🔒 VIP lounge since ${new Date(L.locked).toLocaleDateString('en-US', { timeZone: 'America/Chicago' })} · ${L.founders} founders${L.n ? ` · ${L.n} members at the last count` : ''}` : L.n != null ? `🚪 Public lounge: ${L.n} of ${LOUNGE_CAP()} seats taken · ${Math.max(0, LOUNGE_CAP() - L.n)} left` : 'No count yet (the lounge is counted every 15 minutes).'); return 1; }
  if (m.chat.type !== 'private') { await reply('DM me /vipinvite so the link stays private.'); return 1; }
  const r = chat ? await T('createChatInviteLink', { chat_id: String(chat), name: 'VIP ' + chicagoDay(now), member_limit: '1', expire_date: String(Math.floor(now / 1000) + 7 * 86400) }) : null;
  const link = r && r.result && r.result.invite_link; await reply(link ? `🎟 One VIP seat: one person, good for 7 days.\n${link}` : "Couldn't make a link: is the bot an admin there with \"Invite users\" on?"); return 1; }

/* v3.1.6 · the TheDesk app inside Telegram (Chris, Nov 15: "facilitate it into a TG app that I'll run in the lounge"). The owner sends
   /app in the lounge (or any TheDesk chat): the bot posts an "Open TheDesk" button and pins it. The button opens the Mini App registered
   in BotFather (t.me/<bot>/<short name>: "TheDesk", the name Chris registered; /app <other> to change it); with no Mini App registered yet it
   opens the web address. The app is the public one — the published card only, nothing of the machine. */
export const APP_URL_DEF = 'https://ironsilkweekly.com/desk/';
async function ownerApp(state, T, p, m, arg) { const owners = await ownersOf(state, T, p);
  /* the owner, or any admin of that chat — including one posting anonymously as the group (Telegram then hides who it is) */
  const ok = (m.from && owners.includes(m.from.id)) || (m.chat.type !== 'private' && await isAdmin(state, T, p, m)); if (!ok) return 0;
  const short = (String(arg || '').match(/^[A-Za-z0-9_]{3,30}$/) || [])[0] || state.appShort || 'TheDesk'; state.appShort = short;   /* Chris registered the Mini App as "TheDesk" (Nov 15) */
  const me = await myName(T); const url = me ? `https://t.me/${me}/${short}` : (process.env.APP_URL || APP_URL_DEF);
  const text = `📲 <b>TheDesk, right here in Telegram</b>\n\nToday's card, the board, Props, the Founder LongShots and your Desk Dollars, without leaving the lounge. Tap below to open it.`;
  const r = await T('sendMessage', { chat_id: String(m.chat.id), text, parse_mode: 'HTML', disable_web_page_preview: 'true', reply_markup: JSON.stringify({ inline_keyboard: [[{ text: '📲 Open TheDesk', url }]] }) });
  const id = r && r.result && r.result.message_id;
  if (id && m.chat.type !== 'private') { const pin = await T('pinChatMessage', { chat_id: String(m.chat.id), message_id: String(id), disable_notification: 'true' });
    if (!pin) await T('sendMessage', { chat_id: String(m.chat.id), text: 'Posted, but I couldn\'t pin it: make me an admin with "Pin messages" on.' }); }
  return 1; }
export async function runOnce(state, today, deps) { const T = deps?.tg || tg; let acted = 0; const now = deps?.now || Date.now(); loungeRoute(state);
  for (const d of Object.keys(state.posts || {}).sort()) { const p = state.posts[d]; if (!p || p.recap || p.worker === false || !p.chat) continue;
    p.st = p.st || {}; p.sent = p.sent || {};
    if (isHistory(p, d, today, now)) { await retireQuiet(p, deps, T); state.posts[d] = p; acted++; log('closed', d, 'quietly ·', (p.legs || []).filter(l => p.st[l.k]).length + '/' + (p.legs || []).length, 'graded into the original post'); continue; }
    /* v3.2 · the phone had no bot token (Nov 17: iOS wiped it) — the card came over unposted, so the worker posts it with its own */
    if (p.needPost && !(p.ids || []).length && d >= shift(today, -1)) acted += await postCard(p, T);
    p.sent['~wk'] = p.sent['~wk'] || 1;   /* this card is live with a worker — it never counts as history */
    for (const l of p.legs || []) { if (p.st[l.k]) continue; let s = null; try { s = l.player ? await (deps?.gradeProp || gradeProp)(l, p.d) : await (deps?.gradePick || gradePick)(l, p.d); } catch (e) { } if (s) p.st[l.k] = s; }
    const fresh = (p.legs || []).filter(l => p.st[l.k] && !p.sent[l.k]);
    if (fresh.length) {
      if ((p.ids || []).length === (p.parts || []).length) for (let i = 0; i < p.parts.length; i++) await T('editMessageText', { chat_id: p.chat, message_id: p.ids[i], text: fillTemplate(p.parts[i], p.st), parse_mode: 'HTML', disable_web_page_preview: 'true' });
      const lines = fresh.map(l => `${MARK[p.st[l.k]]}<b>${esc(l.label)}</b> <i>${esc(l.kind)}</i>${l.__fin ? ' · ' + esc(l.__fin) : ''}`);
      const msg = { chat_id: p.chat, text: '<b>📣 Results</b>\n' + lines.join('\n'), parse_mode: 'HTML', disable_web_page_preview: 'true' }; if ((p.ids || [])[0]) { msg.reply_to_message_id = p.ids[0]; msg.allow_sending_without_reply = 'true'; }
      const r = await T('sendMessage', msg); if (r) { fresh.forEach(l => { p.sent[l.k] = p.st[l.k]; }); acted++; }
      /* v3.1.3 · the VIP lounge (the public lounge, renamed at 100) gets every result */
      const vl = p.bc && p.bc.vipLounge; if (vl) await T('sendMessage', { chat_id: vl, text: '<b>📣 Results</b>\n' + lines.join('\n'), parse_mode: 'HTML', disable_web_page_preview: 'true' }); }
    const legs = p.legs || []; const allDone = legs.every(l => p.st[l.k]); const games = legs.filter(l => !l.player);
    const ready = legs.length && (allDone || (p.d < today && games.every(l => p.st[l.k])) || p.d < shift(today, -1));
    if (ready) { const r = await T('sendMessage', { chat_id: p.chat, text: recapText(p, p.st), parse_mode: 'HTML', disable_web_page_preview: 'true' }); if (r) { p.recap = true; acted++;
        if (p.bc && p.bc.vipLounge) await T('sendMessage', { chat_id: p.bc.vipLounge, text: recapText(p, p.st), parse_mode: 'HTML', disable_web_page_preview: 'true' }); } }
    state.posts[d] = p; }
  /* v2.31 · the public side: unlocks 30 min before each game, results, the public recap */
  for (const d of Object.keys(state.posts || {}).sort()) { const p = state.posts[d]; if (!p || p.worker === false || quiet(p) || d < shift(today, -2)) continue;
    if (p.pub) try { acted += await runPublic(p, deps); } catch (e) { log('public side', e.message || e); }
    try { acted += await runSpotlights(state, p, today, deps); } catch (e) { log('spotlights', e.message || e); } state.posts[d] = p; }
  /* cashed tickets — also for days already recapped (the last 4), each announced once */
  for (const d of Object.keys(state.posts || {}).sort()) { const p = state.posts[d]; if (!p || p.worker === false || !p.chat || quiet(p) || d < shift(today, -4)) continue; p.sent = p.sent || {};
    for (const g of cashedParlays(p)) { const key = 'cash|' + g.sig; if (p.sent[key]) continue;
      const text = cashText(p, g), img = await picOf(cashCard(p, g), deps);   /* v2.98 · one picture, every outlet */
      if (await say(T, p.chat, text, img, deps)) { p.sent[key] = 'W'; acted++;
        /* v2.31 · a cash goes everywhere after the fact: the VIP lounge, the public channel and its lounge */
        for (const [lab, c] of [['vl', p.bc && p.bc.vipLounge], ['pub', p.bc && p.bc.pub], ['pl', p.bc && p.bc.pubLounge]]) { if (!c || p.sent[key + '|' + lab]) continue;
          if (await say(T, c, text, img, deps)) p.sent[key + '|' + lab] = 'W'; }
        if (Soc.anyOn(deps)) { const m = await Soc.mirror(text, img, deps, { kind: 'cash' }, { fb: !!p.sent[key + '|fb'], ig: !!p.sent[key + '|ig'], th: !!p.sent[key + '|th'], x: !!p.sent[key + '|x'] });
          for (const o of ['fb', 'ig', 'th', 'x']) if (m[o]) p.sent[key + '|' + o] = m[o] === true ? 'W' : 'skip'; } } }
    state.posts[d] = p; }
  return acted; }

/* ── v2.97 · the Facebook page ─────────────────────────────────────────────────
   Every public post — unlocks (30 min before each game), results, the public recap, cashed tickets — is mirrored to
   TheDesk's Facebook page in plain text with the lounge invite, and once a day (from 10 AM Central, on a day with a card)
   the page gets an invite to the free lounge: we talk sports there, not just picks. It only ever mirrors what already
   went public, after Telegram took it. On only when the repo secrets FB_PAGE_ID and FB_PAGE_TOKEN are set; the token is
   masked in the (public) Actions logs and never printed. LOUNGE_URL (a repo variable) overrides the invite link.
   v2.98 · every one of those posts is now a picture card too, and Instagram + Threads get them (social.mjs). fbPost stays
   for a plain words-only post. */
const fbCfg = deps => deps?.fb || { page: (env.FB_PAGE_ID || '').trim(), tok: (env.FB_PAGE_TOKEN || '').trim(), v: (env.FB_GRAPH_VERSION || 'v24.0').trim() };
export const fbOn = deps => { const c = fbCfg(deps); return !!(c && c.page && c.tok); };
if ((env.FB_PAGE_TOKEN || '').trim() && env.GITHUB_ACTIONS === 'true') console.log('::add-mask::' + env.FB_PAGE_TOKEN.trim());
const loungeUrl = deps => (deps?.lounge || env.LOUNGE_URL || '').trim() || 'https://t.me/TheDeskLounge';
export const fbPlain = html => String(html || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/\n{3,}/g, '\n\n').trim();
/* v3.1.3 · Nov 13: "the socials promote the public app address" — the lounge is only ever an easter egg now */
export const appUrl = deps => (deps?.app || env.APP_URL || '').trim() || 'https://ironsilkweekly.com/desk/';
const fbFoot = deps => `\n\n📲 The full card, live scores and every result → ${appUrl(deps)}`;
export async function fbPost(text, deps, opt) { const c = fbCfg(deps); if (!c || !c.page || !c.tok) return false; const F = deps?.fetch || fetch;
  const message = fbPlain(text) + (opt && opt.bare ? '' : fbFoot(deps)); const hide = x => String(x || '').split(c.tok).join('…');
  try { const r = await F(`https://graph.facebook.com/${c.v || 'v24.0'}/${encodeURIComponent(c.page)}/feed`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ message, access_token: c.tok }).toString() });
    if (r && r.ok) { log('facebook ✓', message.split('\n')[0].slice(0, 70)); return true; } let why = r ? r.status : 'no reply'; try { const j = await r.json(); const m = j && j.error && j.error.message; if (m) why += ' ' + hide(m).slice(0, 90); } catch (e) { }
    log('facebook:', why); return false; } catch (e) { log('facebook:', hide(e && e.message || e).slice(0, 60)); return false; } }
/* v3.1.3 · Nov 13: "those socials will leave an Easter egg from time to time about the TG public lounge… once the public lounge
   hits 100 members the public lounge will be locked and renamed the VIP lounge." About twice a week, on days and at times nobody
   can predict (drawn from a hash of the week and the worker's own key), Facebook, Instagram, Threads, X and the free channel get a
   short, cryptic way in. It stops for good the moment the lounge locks. */
export const LOUNGE_CAP = () => Math.max(2, Math.floor(+(env.LOUNGE_CAP || 100)) || 100);
const EGGS = [
  "🥚 There's a room where the whole card drops the second it locks. {left} No ads, no announcement… this is the door.\n→ {link}",
  "🥚 You weren't supposed to find this. {left}\n→ {link}",
  "🥚 First 100 through the door keep their seat free… for good. After that it's VIP only. {left}\n→ {link}",
  "🥚 Not everybody gets told about this one. The full slate at lock, and a crew that actually watches the games. {left}\n→ {link}",
  "🥚 Somewhere on Telegram there's a room with 100 chairs. {left} When they're gone, the door closes.\n→ {link}"];
const mondayOf = d => { const t = Date.parse(d + 'T12:00:00Z'); const w = new Date(t).getUTCDay(); return new Date(t - ((w + 6) % 7) * 864e5).toISOString().slice(0, 10); };
/* this week's two egg moments: [{ day: 0-6 from Monday, min: minutes after midnight Central (11:00 AM – 8:59 PM) }] */
export function eggPlan(day, salt) { const mon = mondayOf(day); const H = createHash('sha256').update(String(salt || 'thedesk') + '|egg|' + mon).digest();
  const a = H[0] % 7; let b = H[1] % 6; if (b >= a) b++; return [a, b].sort((x, y) => x - y).map((dd, i) => ({ day: dd, min: 11 * 60 + ((H[2 + i * 2] << 8 | H[3 + i * 2]) % 600) })); }
export function eggDue(day, now, deps) { const salt = deps?.eggSalt ?? createHash('sha256').update(env.AUTOPILOT_KEY || 'thedesk').digest('hex');
  const P = eggPlan(day, salt); const dow = (new Date(Date.parse(day + 'T12:00:00Z')).getUTCDay() + 6) % 7; const e = P.find(x => x.day === dow); if (!e) return false;
  const [hh, mm] = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).format(new Date(now)).split(':').map(Number);
  const m = hh * 60 + mm; return m >= e.min && hh < 23; }
const eggCard = (deps, left) => ({ kicker: 'You found something', title: 'There’s a room', sub: 'The full card the second it locks. 100 seats.',
  big: { value: left != null ? String(left) : '100', label: left != null ? 'seats left' : 'seats' }, rows: [{ label: 'First 100 keep their seat', meta: 'free, for good' }, { label: 'After that', meta: 'VIP only', lock: true }],
  foot: loungeUrl(deps).replace(/^https?:\/\//, '') });
export async function fbInvite(state, deps) { const now = deps?.now || Date.now(); const d = chicagoDay(now); const p = state && state.posts && state.posts[d]; if (!p) return 0;
  if (state.lounge && state.lounge.locked) return 0; if (!p.bc || !p.bc.pubLounge) return 0;   /* no lounge, or it's full: no egg */
  const T = deps?.tg || tg; const chan = p.bc.pub; if (!Soc.anyOn(deps) && !chan) return 0; if (!(deps?.eggDue ? deps.eggDue(d, now) : eggDue(d, now, deps))) return 0; p.sent = p.sent || {};
  const done = { fb: !!p.sent.fbinv, ig: !!p.sent.iginv, th: !!p.sent.thinv, x: !!p.sent.xinv };
  const socLeft = Soc.anyOn(deps) && ['fb', 'ig', 'th', 'x'].some(o => !done[o] && Soc.on(deps, o)); if (!socLeft && (!chan || p.sent.tginv)) return 0;
  const L = state.lounge, left = L && L.n != null && String(L.chat) === String(p.bc.pubLounge) ? Math.max(0, LOUNGE_CAP() - L.n) : null;
  const i = createHash('sha256').update('pick|' + d).digest()[0] % EGGS.length;
  const txt = EGGS[i].replace('{link}', loungeUrl(deps)).replace('{left}', left != null ? `${left} seat${left === 1 ? '' : 's'} left.` : '100 seats.');
  const pic = await picOf(eggCard(deps, left), deps); let acted = 0;
  if (socLeft) { const m = await Soc.mirror(txt, pic, deps, { bare: true, kind: 'egg' }, done); if (m.fb) p.sent.fbinv = 1; if (m.ig) p.sent.iginv = 1; if (m.th) p.sent.thinv = 1; if (m.x) p.sent.xinv = 1; if ([m.fb, m.ig, m.th, m.x].includes(true)) acted = 1; }
  if (chan && !p.sent.tginv) { if (await say(T, chan, txt, pic, deps)) { p.sent.tginv = 1; acted = 1; } }
  if (acted) log('lounge easter egg out'); return acted; }

/* v3.1.3 · the lock: the worker counts the public lounge every 15 minutes. At 100 (LOUNGE_CAP) it renames the room
   "TheDesk VIP Lounge", makes a fresh invite link (the old one stops working), tells the room its founders keep their seats
   free for good, and tells the owner the one step only they can take (a public @username can't be removed by a bot).
   From then on the room is the VIP lounge: the full card at lock, results and the recap; new members only through a VIP invite. */
export async function loungeWatch(state, deps) { const T = deps?.tg || tg; const now = deps?.now || Date.now(); if (!state) return 0;
  const ds = Object.keys(state.posts || {}).sort(); const p = state.posts && state.posts[ds[ds.length - 1]]; const L = state.lounge = state.lounge || {};
  if (L.locked) return 0; const chat = p && p.bc && p.bc.pubLounge; if (!chat) return 0;
  if (String(L.chat) === String(chat) && L.at && now - L.at < 15 * 60e3) return 0;
  const r = await T('getChatMemberCount', { chat_id: String(chat) }); const n = r && Number.isFinite(+r.result) ? +r.result : null; if (n == null) return 0;
  L.chat = String(chat); L.n = n; L.at = now; if (n < LOUNGE_CAP()) return 0;
  L.titled = !!(await T('setChatTitle', { chat_id: L.chat, title: 'TheDesk VIP Lounge' }));
  await T('exportChatInviteLink', { chat_id: L.chat });
  await T('sendMessage', { chat_id: L.chat, parse_mode: 'HTML', text: `🔒 <b>${n} seats filled. The door is closed.</b>\nThis room is now <b>TheDesk VIP Lounge</b>. Everyone here found it first… your seat is yours, free, for good.\nFrom here on: the full card the second it locks, every result, the recap. New faces come in through VIP only.` });
  L.locked = now; L.founders = n; log('the lounge hit', n, '— locked and renamed the VIP lounge');
  for (const id of await ownersOf(state, T, p)) await T('sendMessage', { chat_id: String(id), disable_web_page_preview: 'true', text: `🔒 The lounge hit ${n} members and is now TheDesk VIP Lounge.\n\nOne step only you can take: if the group still has a public @username, open it in Telegram → Edit → Group type → Private. A bot can't remove that name; until it's gone, anyone who joins by it is removed automatically.\n\nTo let a VIP subscriber in, send me /vipinvite here: a one-person link, good for 7 days.` });
  return 1; }
/* every post's routing follows the lock: the room that was the public lounge is the VIP lounge now */
export function loungeRoute(state) { const L = state && state.lounge; if (!L || !L.locked || !L.chat) return;
  for (const p of Object.values(state.posts || {})) if (p && p.bc && p.bc.pubLounge && String(p.bc.pubLounge) === String(L.chat)) p.bc = { ...p.bc, vipLounge: p.bc.pubLounge, pubLounge: '' }; }

/* ── v2.31 · the public side ──────────────────────────────────────────────────
   p.pub.legs: the Best 3, the Best 3 props and the Banker's parlay legs, each with
   the moment it unlocks (30 min before its game). Unlocks are announced on the
   public channel and lounge; results follow as they grade; one public recap. */
const DAYFMT = d => new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
const tStr = t => { try { return new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }) + ' CT'; } catch (e) { return ''; } };
const EM = { nfl: '🏈', ncaaf: '🏟', nhl: '🏒', mlb: '⚾', nba: '🏀', ncaab: '🏀' };
const KIND = { 'Best 3': '⭐ Best 3', 'Prop': '🎯 Prop', "Banker's parlay": "🏦 Banker's parlay" };
export async function runPublic(p, deps) { const T = deps?.tg || tg; const now = deps?.now || Date.now(); const legs = (p.pub && p.pub.legs) || []; if (!legs.length) return 0;
  /* v3.1.2 · Nov 13: whatever goes to Facebook goes to the free channel and the public lounge too */
  const dests = [p.bc && p.bc.pub, p.bc && p.bc.pubLounge].filter(Boolean); let acted = 0; p.st = p.st || {}; p.sent = p.sent || {};
  const beta = !!(p.feed && p.feed.beta === true);
  for (const l of legs) { if (!l.prop || p.st[l.k]) continue; let s = null; try { s = await (deps?.gradeProp || gradeProp)({ sp: l.sp, player: l.player, team: l.team, stat: l.stat, thr: l.thr, side: l.side }, p.d); } catch (e) { } if (s) p.st[l.k] = s; }
  if (!dests.length && !Soc.anyOn(deps)) return 0;
  /* v2.97 · the other outlets get it once Telegram has it (a Telegram miss retries all of them next pass)
     v2.98 · …with its picture: the public channel and lounge get the card with the words as its caption */
  const send = (text, card, kind) => sendPublic(dests, T, deps, text, card, kind);
  const day = (p.pub && p.pub.day) || DAYFMT(p.d);
  /* unlocks */
  const open = legs.filter(l => l.unlockAt && now >= l.unlockAt && !p.sent['unlock|' + l.k] && !p.st[l.k]);
  if (open.length) {
    /* v2.35 · an unlock that goes out after its game has started says so — the post never claims a time it missed */
    const late = l => { const t = Date.parse(l.start || ''); return isFinite(t) && now >= t; };
    const txt = [beta ? `⏰ <b>STARTING SOON — TheDesk · ${esc(day)}</b>` : `🔓 <b>UNLOCKED — TheDesk · ${esc(day)}</b>`, ...open.map(l => `${KIND[l.kind] || l.kind}${l.n && l.kind !== 'Prop' ? ' #' + l.n : ''}: <b>${esc(l.label)}</b>${l.game ? ' · ' + (EM[l.sp] || '') + ' ' + esc(l.game) : ''}${l.start ? ' · ' + tStr(l.start) : ''}${late(l) ? ' · <i>underway</i>' : ''}`),
      '', open.some(late) ? '<i>Locked before the games. This post is late — the game marked underway has already started. Graded at the final.</i>'
        : beta ? '<i>Posted at the lock, back again 30 minutes before the start. Graded at the final.</i>' : '<i>Locked before the games, posted 30 minutes before each start. Graded at the final.</i>'].join('\n');
    const kinds = [...new Set(open.map(l => l.kind))], one = open.length === 1 ? open[0] : null;
    const card = { kicker: (beta ? 'Starting soon · ' : 'Unlocked · ') + day, title: beta ? 'Starting soon' : kinds.length > 1 ? 'Picks unlocked' : kinds[0] === 'Prop' ? (open.length > 1 ? 'Props' : 'Prop') : kinds[0],
      sub: one && one.game ? one.game + (one.start ? ' · ' + tStr(one.start) : '') : 'Locked before the games · graded at the final',
      rows: open.map(l => ({ label: l.label, meta: [l.kind + (l.n && l.kind !== 'Prop' ? ' #' + l.n : ''), one ? '' : l.game, one || !l.start ? '' : tStr(l.start), late(l) ? 'underway' : ''].filter(Boolean).join(' · ') })) };
    if (await send(txt, card, 'unlock')) { open.forEach(l => { p.sent['unlock|' + l.k] = 1; }); acted++; } }
  /* results (only what's been unlocked or is final) */
  const fresh = legs.filter(l => p.st[l.k] && !p.sent['pres|' + l.k]);
  if (fresh.length) { const by = {}; (p.legs || []).forEach(l => { by[l.k] = l; });
    const txt = '<b>📣 Results</b>\n' + fresh.map(l => `${MARK[p.st[l.k]]}<b>${esc(l.label)}</b> <i>${esc(KIND[l.kind] || l.kind)}</i>${by[l.k] && by[l.k].__fin ? ' · ' + esc(by[l.k].__fin) : ''}`).join('\n');
    const n = s => fresh.filter(l => p.st[l.k] === s).length;
    const card = { kicker: 'Results · ' + day, title: fresh.length === 1 ? ({ W: 'Winner', L: 'Loss', P: 'Push' })[p.st[fresh[0].k]] || 'Graded' : `${n('W')}-${n('L')}${n('P') ? '-' + n('P') : ''}`,
      rows: fresh.map(l => ({ label: l.label, meta: [l.kind, by[l.k] && by[l.k].__fin].filter(Boolean).join(' · '), res: p.st[l.k] })) };
    if (await send(txt, card, 'result')) { fresh.forEach(l => { p.sent['pres|' + l.k] = p.st[l.k]; }); acted++; } }
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
    const graded = legs.filter(l => p.st[l.k]), bu = best.reduce((a, l) => a + units(l.price, p.st[l.k] || 'P'), 0);
    const card = { kicker: 'Recap · ' + day, title: 'Free picks, graded', big: { value: rec(graded), label: best.length ? `Best ${best.length}: ${bu >= 0 ? '+' : ''}${bu.toFixed(2)}u` : 'graded at the final' },
      rows: graded.map(l => ({ label: l.label, meta: l.kind, res: p.st[l.k] })) };
    if (await send(out.join('\n'), card, 'recap')) { p.sent.precap = 1; acted++; } }
  return acted; }
/* ── v2.98 · character spotlights ────────────────────────────────────────────────────────────────────────────────
   Nov 8: "posting different characters parlays (player of the week daily parlay, underdog spotter 'terrible 3' picks etc)".
   Two tickets a day go public, 30 minutes before their first game, picture and all, to the public channel and lounge and
   every outlet that's on:
     🌟 Player of the Week — the character with the hottest hand over the card days the worker holds (2+ graded
        parlays, most units won), and today's parlay from him
     🐕 The Terrible 3 — the Underdog Spotter's dogs-only parlay ("The Terrible 4" when it has four)
   A teaser by default: a leg shows once its own game is 30 minutes out (the rule every public pick follows); the rest
   say when they unlock — VIP already has the whole ticket. SPOTLIGHT (repo variable): "full" shows every leg at the
   first unlock, "off" stops them. A ticket whose first game started over an hour ago is skipped, never posted late.
   If it cashes, the cash post already goes everywhere. */
const baseName = n => String(n || '').replace(/\s*\((props|strong suit)\)$/, '').trim();
export function weekLeader(state, today) { const U = {};
  for (const [d, p] of Object.entries(state.posts || {})) { if (d >= today || !p || !p.recapPlan) continue; const st = p.st || {}; const by = {}; (p.legs || []).forEach(l => { by[l.k] = l; });
    for (const c of p.recapPlan.chars || []) { if (/\((props|strong suit)\)$/.test(c.name)) continue; const m = (c.keys || []).map(k => st[k]); if (!m.length || m.some(s => !s)) continue;
      const nm = baseName(c.name); const u = U[nm] = U[nm] || { name: nm, u: 0, n: 0, w: 0, days: new Set() }; u.n++; u.days.add(d);
      if (m.includes('L')) u.u -= 1; else { const D = c.keys.filter(k => st[k] === 'W').reduce((a, k) => a * toDec(by[k] && by[k].price), 1); u.u += D - 1; if (m.includes('W')) u.w++; } } }
  const L = Object.values(U).filter(x => x.n >= 2 && x.u > 0).sort((a, b) => b.u - a.u || b.w - a.w || a.name.localeCompare(b.name)); return L[0] ? { ...L[0], days: L[0].days.size } : null; }
export function spotlights(state, p, today) { const chars = (p.recapPlan && p.recapPlan.chars) || []; const out = [];
  const lead = weekLeader(state, today); const pc = lead && chars.find(c => c.name === lead.name && (c.keys || []).length); if (pc) out.push({ tag: 'potw', c: pc, lead });
  const dog = chars.find(c => c.name === 'The Underdog Spotter' && (c.keys || []).length); if (dog) { if (pc === dog) out[0].dog = true; else out.push({ tag: 'dog', c: dog }); }
  return out; }
async function legStart(l, d, deps) { if (deps?.startOf) return deps.startOf(l, d);
  try { if (l.game) { const [a, h] = String(l.game).split('@'); const F = a && h ? await findEvent(l.sp, d, [a, h]) : null; return F ? Date.parse(F.ev.date) : NaN; }
    if (l.team) for (const day of [d, shift(d, 1)]) for (const ev of await scoreboard(l.sp, day)) { const T = evTeams(l.sp, ev); if (T && [T.a, T.h].includes(ab(l.sp, l.team))) return Date.parse(ev.date); } } catch (e) { }
  return NaN; }
const WORD = { 2: 'Two', 3: 'Three', 4: 'Four', 5: 'Five', 6: 'Six' };
export async function runSpotlights(state, p, today, deps) { const mode = String(deps?.spot ?? env.SPOTLIGHT ?? '').trim().toLowerCase() || 'teaser'; if (mode === 'off' || !p || p.d !== today) return 0;
  const T = deps?.tg || tg; const now = deps?.now || Date.now(); const dests = [p.bc && p.bc.pub, p.bc && p.bc.pubLounge].filter(Boolean); if (!dests.length && !Soc.anyOn(deps)) return 0;   /* v3.1.2 · with Facebook: the channel and the lounge */
  p.sent = p.sent || {}; let acted = 0; const by = {}; (p.legs || []).forEach(l => { by[l.k] = l; }); const day = (p.recapPlan && p.recapPlan.day) || DAYFMT(p.d);
  for (const s of spotlights(state, p, today)) { const key = 'spot|' + [...s.c.keys].sort().join('¦'); if (p.sent[key]) continue;
    const legs = s.c.keys.map(k => by[k]); if (legs.some(l => !l)) { p.sent[key] = 'x'; continue; }
    const starts = []; for (const l of legs) starts.push(await legStart(l, p.d, deps)); const known = starts.filter(t => isFinite(t)); if (!known.length) continue;
    const first = Math.min(...known); if (now < first - 30 * 60e3) continue; if (now > first + 60 * 60e3) { p.sent[key] = 'late'; continue; }
    const open = i => mode === 'full' || (isFinite(starts[i]) && now >= starts[i] - 30 * 60e3); const n = legs.length;
    const when = i => isFinite(starts[i]) ? 'unlocks ' + tStr(starts[i] - 30 * 60e3) : 'unlocks 30 min before its game';
    const lead = s.lead ? `+${s.lead.u.toFixed(2)}u over the last ${s.lead.days} card day${s.lead.days > 1 ? 's' : ''}` : '';
    const head = s.tag === 'potw' ? `🌟 <b>PLAYER OF THE WEEK — ${esc(s.c.name)}</b>\n<i>Hottest hand on TheDesk: ${lead}${s.dog ? ` · today it's his Terrible ${n}` : ''}</i>` : `🐕 <b>THE TERRIBLE ${n} — The Underdog Spotter</b>\n<i>${WORD[n] || n} dogs, one ticket.</i>`;
    const lines = legs.map((l, i) => open(i) ? `• <b>${esc(l.label)}</b>${l.game ? ' · ' + (EM[l.sp] || '') + ' ' + esc(l.game) : ''}${isFinite(starts[i]) ? ' · ' + tStr(starts[i]) : ''}${isFinite(starts[i]) && now >= starts[i] ? ' · <i>underway</i>' : ''}` : `🔒 Leg ${i + 1} · ${when(i)}`);
    const shut = legs.some((l, i) => !open(i));
    const text = [head, `<b>${n}-leg parlay · ${esc(s.c.price)}</b>`, ...lines, '', shut ? '<i>Locked before the games. VIP got the whole ticket this morning; here each leg unlocks 30 minutes before its game. Graded at the final.</i>' : '<i>Locked before the games. Graded at the final.</i>'].join('\n');
    const card = { kicker: (s.tag === 'potw' ? 'Player of the week · ' : 'Underdog Spotter · ') + day, title: s.tag === 'potw' ? s.c.name : `The Terrible ${n}`, sub: s.tag === 'potw' ? lead : `${WORD[n] || n} dogs, one ticket`,
      big: { value: s.c.price, label: `${n}-leg parlay` }, rows: legs.map((l, i) => open(i) ? { label: l.label, meta: [l.game, isFinite(starts[i]) ? tStr(starts[i]) : ''].filter(Boolean).join(' · ') } : { label: `Locked · leg ${i + 1}`, meta: when(i) + ' · VIP has it now', lock: true }) };
    if (await sendPublic(dests, T, deps, text, card, 'spotlight')) { p.sent[key] = 1; acted++; log('spotlight ·', s.tag, '·', s.c.name); } }
  return acted; }
/* the public posts' one way out: Telegram first (picture + words), then the other outlets once Telegram has it */
async function sendPublic(dests, T, deps, text, card, kind) { const img = await picOf(card, deps); let ok = false; for (const c of dests) ok = (await say(T, c, text, img, deps)) || ok;
  if ((ok || !dests.length) && Soc.anyOn(deps)) { const m = await Soc.mirror(text, img, deps, { kind }); if (!dests.length) ok = [m.fb, m.ig, m.th].includes(true); } return ok; }
/* ── v2.99 · THE MEGAPHONE: one post every 30 minutes in posting hours (megaphone.mjs says what and why) ── */
const FEEDS_RAW = () => `https://raw.githubusercontent.com/${REPO || 'ironsilkstrategies/ironsilk-weekly'}/feeds/`;
let FEEDS = null;
async function feedsNow(deps) { if (deps && 'feeds' in deps) return deps.feeds ? { ...deps.feeds, P: Mega.powerRanks(deps.feeds.season) } : null; if (FEEDS && Date.now() - FEEDS.at < 20 * 60e3) return FEEDS;
  try { const get = async f => { const r = await fetch(FEEDS_RAW() + f + '.json', { headers: { 'User-Agent': 'thedesk-autopilot' } }); return r.ok ? r.json() : null; };
    const [oracle, season, coach] = await Promise.all([get('oracle'), get('season'), get('coach')]); if (!oracle) return FEEDS;
    FEEDS = { at: Date.now(), oracle, season, coach, P: Mega.powerRanks(season) }; return FEEDS; } catch (e) { log('megaphone feeds:', String(e && e.message || e).slice(0, 60)); return FEEDS; } }
/* the public places to post: the newest card that names them */
const pubDests = state => { const ds = Object.keys(state.posts || {}).sort().reverse(); for (const d of ds) { const b = state.posts[d] && state.posts[d].bc; if (b && (b.pub || b.pubLounge)) return [b.pub, b.pubLounge].filter(Boolean); } return []; };   /* v3.1.2 · with Facebook: the channel and the lounge */
/* a Megaphone post: picture + words to the public channel and lounge (with a poll under it when it has one), then the outlets */
/* v3.1.2 · the Facebook goal post goes to Telegram too, saying where the reactions count */
const FB_PAGE_URL = () => (env.FB_PAGE_URL || '').trim() || 'https://www.facebook.com/share/1FCDFdUvRp/';
async function sendMega(dests, T, deps, post) { const img = await picOf(post.card, deps); let ok = false, fbId = null;
  if (post.only === 'fb') { for (const c of dests) await say(T, c, post.text + `\n\n👍 The reactions count on our Facebook post → ${FB_PAGE_URL()}`, img, deps); }
  else for (const c of dests) { const r = await say(T, c, post.text, img, deps); ok = r || ok;
    if (r && post.poll && post.poll.options && post.poll.options.length >= 2) await T('sendPoll', { chat_id: c, question: post.poll.question, options: JSON.stringify(post.poll.options.map(text => ({ text }))), is_anonymous: 'true' }); }
  if ((ok || !dests.length || post.only === 'fb') && Soc.anyOn(deps)) { const m = await Soc.mirror(post.text, img, deps, { kind: post.kind, bare: true, only: post.only }); fbId = m.fbId || null;
    if (!dests.length || post.only === 'fb') ok = [m.fb, m.ig, m.th].includes(true); }
  return { ok, fbId }; }
const goalN = deps => { const v = String(deps?.goal ?? env.MEGA_GOAL ?? '').trim().toLowerCase(); return v === 'off' ? 0 : (+v > 0 ? Math.round(+v) : 100); };
const lockedFree = (p, now) => ((p && p.pub && p.pub.legs) || []).filter(l => !p.sent['unlock|' + l.k] && !(p.st || {})[l.k] && (!l.unlockAt || l.unlockAt > now));
/* 🧾 yesterday's free card, graded (mornings) */
export function recordPost(state, today) { const p = state.posts && state.posts[shift(today, -1)]; const legs = ((p && p.pub && p.pub.legs) || []).filter(l => (p.st || {})[l.k]); if (legs.length < 2) return null;
  const st = p.st, w = legs.filter(l => st[l.k] === 'W').length, L = legs.filter(l => st[l.k] === 'L').length; const best = legs.filter(l => l.kind === 'Best 3'); const bu = best.reduce((a, l) => a + units(l.price, st[l.k]), 0); const day = (p.pub && p.pub.day) || DAYFMT(p.d);
  const text = [`🧾 <b>RECEIPTS — yesterday's free card went ${w}-${L}</b>`, ...legs.map(l => `${MARK[st[l.k]] || ''}<b>${esc(l.label)}</b> · ${esc(l.kind)}`), best.length ? `\nBest ${best.length}: ${bu >= 0 ? '+' : ''}${bu.toFixed(2)}u` : '', '',
    `Every pick posted before its game, graded at the final — wins and losses. Today's free picks unlock 30 minutes before each game. 👇 ${loungeUrl()}`].join('\n').replace(/\n{3,}/g, '\n\n');
  const card = { kicker: 'Receipts · ' + day, title: `Yesterday: ${w}-${L}`, big: best.length ? { value: `${bu >= 0 ? '+' : ''}${bu.toFixed(1)}u`, label: `Best ${best.length} on the day` } : null, rows: legs.map(l => ({ label: l.label, meta: l.kind, res: st[l.k] })) };
  return { kind: 'record', key: 'rec|' + p.d, text, card }; }
/* 🎯 the goal post (Facebook, where the reactions are counted) and the drop when it hits */
export function goalPost(p, n, now) { const legs = lockedFree(p, now); const first = Math.min(...legs.map(l => Date.parse(l.start || '') || Infinity)); const day = (p.pub && p.pub.day) || DAYFMT(p.d);
  const text = [`🎯 <b>${n} REACTIONS = TODAY'S FULL FREE CARD, EARLY</b>`, `Hit ${n} reactions on this post and we drop all ${legs.length} of today's free picks right here, right then — no waiting on the 30-minute unlocks.`,
    isFinite(first) ? `First game: ${tStr(first)}. Clock's running.` : '', '', 'Every pick locked before the games, graded at the final. 👇'].filter((x, i) => x || i === 3).join('\n');
  const card = { kicker: 'The goal · ' + day, title: `${n} reactions unlocks it`, wrap: true, big: { value: String(legs.length), label: `free picks, locked` }, rows: [{ label: 'React to this post', meta: `${n} reactions and the full free card drops here` }, isFinite(first) ? { label: 'First game ' + tStr(first), meta: 'clock\'s running', lock: true } : null].filter(Boolean) };
  return { kind: 'goal', key: 'goal|' + p.d, text, card, only: 'fb', legs: legs.map(l => l.k), until: (u => isFinite(u) && u > 0 ? u : now + 12 * 36e5)(Math.max(...legs.map(l => l.unlockAt || 0))) }; }   /* alive until the last locked pick unlocks */
export function dropPost(p, legs, n) { const day = (p.pub && p.pub.day) || DAYFMT(p.d);
  const text = [n ? `🔓 <b>GOAL HIT — ${n}+ reactions. Here's today's full free card.</b>` : `🔓 <b>AS PROMISED — today's full free card, early.</b>`, ...legs.map(l => `• <b>${esc(l.label)}</b> · ${esc(l.kind)}${l.game ? ' · ' + (EM[l.sp] || '') + ' ' + esc(l.game) : ''}${l.start ? ' · ' + tStr(l.start) : ''}`), '', '<i>Locked before the games. Graded at the final. You did this — keep it coming.</i>'].join('\n');
  const card = { kicker: 'Goal hit · ' + day, title: 'The full free card', big: n ? { value: `${n}+`, label: 'reactions did it' } : null, rows: legs.map(l => ({ label: l.label, meta: [l.kind, l.game, l.start ? tStr(l.start) : ''].filter(Boolean).join(' · ') })) };
  return { kind: 'drop', key: 'drop|' + p.d, text, card }; }
export async function runMegaphone(state, M, today, deps) { if (String(deps?.mega ?? env.MEGAPHONE ?? '').trim().toLowerCase() === 'off') return 0;
  const now = deps?.now || Date.now(), T = deps?.tg || tg; let acted = 0;
  if (M.d !== today) { const last = M.last || 0, goal = M.goal; for (const k of Object.keys(M)) delete M[k]; Object.assign(M, { d: today, last, n: 0, q: {}, st: {}, mv: 0, rec: 0 }); if (goal && goal.d === today) M.goal = goal; }
  const dests = pubDests(state); if (!dests.length && !Soc.anyOn(deps)) return 0; const p = state.posts && state.posts[today];
  /* the goal: count the reactions every few minutes; at the number, drop every free pick still locked */
  const G = M.goal; if (G && G.d === today && !G.done && p) {
    /* v3.0 · two unreadable counts in a row (the token can't read reactions) → stop asking; the 90-minute promise still pays */
    const deaf = (G.miss || 0) >= 2;
    if (now >= G.until) G.done = 'expired'; else if (deaf ? now - G.at >= 90 * 60e3 : (!G.chk || now - G.chk >= 8 * 60e3)) { G.chk = now; const n = deaf ? null : await Soc.fbReactions(G.id, deps); if (n != null) { G.seen = n; G.miss = 0; } else G.miss = (G.miss || 0) + 1;
      /* can't read the count (the token lacks pages_read_user_content)? the promise still holds: the card drops 90 minutes in */
      const blind = n == null && now - G.at >= 90 * 60e3; if (blind) log('megaphone · reactions unreadable — dropping the card as promised');
      if ((n != null && n >= G.n) || blind) { const legs = lockedFree(p, now); if (!legs.length) G.done = 'empty'; else { const r = await sendMega(dests, T, deps, dropPost(p, legs, blind ? 0 : G.n));
          if (r.ok) { legs.forEach(l => { p.sent['unlock|' + l.k] = 1; }); G.done = 'hit'; acted++; log('megaphone · goal hit ·', n, 'reactions · dropped', legs.length, 'picks'); } } } } }
  if (!Mega.due(M, now, { hours: deps?.hours ?? env.MEGA_HOURS, every: deps?.every ?? env.MEGA_EVERY })) return acted;
  const F = await feedsNow(deps); const c = {}; const L = loungeUrl(deps); const h = Mega.ctParts(now).h;
  if (F && F.oracle) { const games = Mega.gamesToday(F.oracle, today); const g = Mega.pickGame(games, F.P, M, now); if (g) c.question = Mega.questionPost(g, F, { lounge: L });
    if (Object.keys(M.st || {}).length < 3) c.streak = Mega.streakPost(games, F, M, now, { lounge: L });
    if ((M.mv || 0) < 2 && (!M.mvAt || now - M.mvAt > 4 * 36e5)) c.movers = Mega.moversPost(games, F, now, { lounge: L }); }
  if (!M.rec && h < 13) c.record = recordPost(state, today);
  const gn = goalN(deps); if (gn && p && p.pub && Soc.on(deps, 'fb') && !(M.goal && M.goal.d === today) && h >= 9 && h < 13) { const free = lockedFree(p, now + 90 * 60e3); if (free.length >= 2) c.goal = goalPost(p, gn, now); }
  const post = Mega.choose(c, M); if (!post) return acted;
  const r = await sendMega(dests, T, deps, post); if (!r.ok) return acted;
  M.last = now; M.n = (M.n || 0) + 1;
  if (post.kind === 'question') M.q[post.key.slice(2)] = 1; else if (post.kind === 'streak') M.st[post.key.slice(3)] = 1; else if (post.kind === 'movers') { M.mv = (M.mv || 0) + 1; M.mvAt = now; } else if (post.kind === 'record') M.rec = 1;
  else if (post.kind === 'goal') M.goal = r.fbId ? { d: today, id: r.fbId, n: gn, at: now, until: post.until } : { d: today, done: 'noid' };
  log('megaphone ·', post.kind, '·', post.key.slice(0, 60)); return acted + 1; }
/* ══ v3.3 · THE GROWTH DESK (Nov 19, the playbook: "Let's execute it all") ═══════════════════════════════════════════
   growth.mjs writes the words; this sends them. Everything here reads only what's already public: the live public page
   (picks.json on the site, the same file anyone can open) and the worker's own grades. */
let PUBF = null;   /* the live public page, read at most every 10 minutes */
async function pubFeedNow(deps) { if (deps && 'pubFeed' in deps) return deps.pubFeed; if (PUBF && Date.now() - PUBF.at < 10 * 60e3) return PUBF.f;
  try { const r = await fetch(`https://raw.githubusercontent.com/${SITE}/main/public/picks.json?t=${Math.floor(Date.now() / 6e5)}`, { headers: { 'User-Agent': 'thedesk-autopilot' } });
    if (r.ok) { const f = await r.json(); PUBF = { at: Date.now(), f }; return f; } log('public page read: HTTP', r.status); } catch (e) { log('public page read:', String(e && e.message || e).slice(0, 60)); }
  return PUBF ? PUBF.f : null; }
const newestFeed = state => { for (const d of Object.keys(state.posts || {}).sort().reverse()) { const f = state.posts[d] && state.posts[d].feed; if (f) return f; } return null; };
const newestChatCard = state => Object.keys(state.posts || {}).sort().map(d => state.posts[d]).filter(x => x && x.chat).pop() || null;
/* ⚔️ The Desk Debate: once a day between 10 AM and 6 PM Central, only while the board is public (the open beta), for a game
   90 minutes to 14 hours out. Telegram gets the card and a poll; Facebook, Instagram and Threads the card; the owner gets the
   card and a ready-to-post X caption in a DM. After the final, both sides are graded and the result posts once. */
export async function runDebate(state, S, today, deps) { if (String(deps?.debate ?? env.DEBATE ?? '').trim().toLowerCase() === 'off') return 0;
  const now = deps?.now || Date.now(), T = deps?.tg || tg; const dests = pubDests(state); if (!dests.length && !Soc.anyOn(deps)) return 0; let acted = 0;
  const D0 = S.deb || {};
  if (D0.d && !D0.done && D0.start && now > D0.start + 150 * 60e3) {
    const g = { sp: D0.sp, game: D0.game }, xa = { ...g, pick: D0.pa }, xb = { ...g, pick: D0.pb }; const G = deps?.gradePick || gradePick; let ra = null, rb = null;
    try { ra = await G(xa, D0.d); rb = await G(xb, D0.d); } catch (e) { }
    if (ra && rb) { const post = Gr.settlePost(D0, ra, rb, { fin: xa.__fin || xb.__fin || '' }); if (await sendPublic(dests, T, deps, post.text, post.card, 'debate')) { D0.done = ra + rb; acted++; log('debate settled ·', D0.k, ra + '/' + rb); } }
    else if (now > D0.start + 30 * 36e5) { D0.done = 'x'; acted++; } }   /* never graded in 30 hours: let it go */
  if (D0.d === today) return acted;
  const h = Gr.ctHour(now); if (h < 10 || h >= 18) return acted;
  const F = await pubFeedNow(deps); if (!F || F.beta !== true || !F.board || F.board.d !== today) return acted;
  const C = Gr.debates(F.board, now)[0]; if (!C) return acted;
  const FD = await feedsNow(deps).catch(() => null);
  const post = Gr.debatePost(C, { cast: F.board.cast, coach: FD && FD.coach, day: DAYFMT(today), app: appUrl(deps) });
  const r = await sendMega(dests, T, deps, post); if (!r.ok) return acted;
  S.deb = { d: today, k: C.k, sp: C.sp, game: C.game, start: C.start, pa: C.la.pick, pb: C.lb.pick, wa: post.wa, wb: post.wb, matchup: post.matchup, fullM: post.fullM, ts: now }; acted++; log('debate ·', C.k);
  /* the owner's kit for X (manual: X bills per post) — the card plus the words, ready to paste */
  try { const p = newestChatCard(state); const owners = p ? await ownersOf(state, T, p) : []; const img = owners.length ? await picOf(post.card, deps) : null;
    for (const id of owners) await say(T, String(id), `🗞 <b>Today's debate is live</b> on Telegram, Facebook and Instagram.\n\n<b>For X</b> (copy it, attach this picture, pin it):\n\n${esc(post.x)}`, img, deps); } catch (e) { log('debate kit:', String(e && e.message || e).slice(0, 60)); }
  return acted; }
/* 🧾 Receipts Sunday: Sundays from 9 AM Central, the week that ended Saturday, from the public record */
export async function runWeekly(state, S, today, deps) { if (String(deps?.weekly ?? env.WEEKLY ?? '').trim().toLowerCase() === 'off') return 0; const now = deps?.now || Date.now();
  if (S.wk === today || new Date(today + 'T12:00:00Z').getUTCDay() !== 0 || Gr.ctHour(now) < 9) return 0;
  const dests = pubDests(state); if (!dests.length && !Soc.anyOn(deps)) return 0;
  const F = (await pubFeedNow(deps)) || newestFeed(state); const post = Gr.weeklyPost(F, today, { app: appUrl(deps) }); if (!post) { S.wk = today; return 1; }   /* a quiet week: nothing to say */
  if (!(await sendPublic(dests, deps?.tg || tg, deps, post.text, post.card, 'weekly'))) return 0; S.wk = today; log('receipts sunday ·', post.w + '-' + post.l); return 1; }
/* 🎯 v3.3.2 · THE FREE 3 (free3.mjs): once a day, the day's free picks as one promo post — the picture and the words to the public
   channel and lounge, then Facebook, Instagram and Threads (X only if X_KINDS asks for it). It goes out once the card is locked and
   while a pick still hasn't started, between 9 AM and 10 PM Central. Outside the open beta it waits for the first unlock and draws
   the picks still locked as locked. Off until the repo variable FREE3 is "on". */
export async function runFree3(state, S, today, deps) { if (String(deps?.free3 ?? env.FREE3 ?? '').trim().toLowerCase() !== 'on') return 0;
  const now = deps?.now || Date.now(); if (S.f3 === today) return 0; const h = Gr.ctHour(now); if (h < 9 || h >= 22) return 0;
  const dests = pubDests(state); if (!dests.length && !Soc.anyOn(deps)) return 0;
  const F = await pubFeedNow(deps); if (!F || !F.today || F.today.d !== today || !(F.today.picks || []).length) return 0;
  const D = await F3.free3Of(F, deps); if (!D || !D.open) return 0;
  if (!D.picks.some(x => !x.hidden && x.start && now < Date.parse(x.start))) { S.f3 = today; return 1; }   /* every open pick has started: today's post would be late */
  const text = F3.free3Caption(D, { app: appUrl(deps), dm: deps?.dm }); const R = deps ? deps.renderFree3 : F3.renderFree3; let img = null; try { img = R ? await R(D) : null; } catch (e) { }
  let ok = false; for (const c of dests) ok = (await say(deps?.tg || tg, c, text, img, deps)) || ok;
  if ((ok || !dests.length) && Soc.anyOn(deps)) { const m = await Soc.mirror(text, img, deps, { kind: 'free3', bare: true }); if (!dests.length) ok = [m.fb, m.ig, m.th].includes(true); }
  if (!ok) return 0; S.f3 = today; log('free 3 ·', D.n, 'pick' + (D.n === 1 ? '' : 's'), '·', D.picks.map(x => x.hidden ? 'locked' : x.pick).join(' | ')); return 1; }
/* 🔗 recruiting: members link to the public lounge until it locks, then to the free channel */
const recruitChat = (state, p) => { const L = state.lounge || {}, lounge = p && p.bc && p.bc.pubLounge; if (lounge && !L.locked) return String(lounge); const ch = p && p.bc && p.bc.pub; return ch ? String(ch) : null; };
const plainName = u => (([u && u.first_name, u && u.last_name].filter(Boolean).join(' ')) || (u && u.username ? '@' + u.username : 'A member')).slice(0, 40);
async function myLink(state, T, p, m, now) { if (!m.from || m.from.is_bot) return 0;
  const reply = text => T('sendMessage', { chat_id: String(m.chat.id), text, parse_mode: 'HTML', disable_web_page_preview: 'true', reply_to_message_id: String(m.message_id), allow_sending_without_reply: 'true' });
  if (m.chat.type !== 'private') { const me = await myName(T); await reply(`🔗 DM me /mylink${me ? ' (@' + esc(me) + ')' : ''} and I'll send your personal invite link there.`); return 1; }
  const chat = recruitChat(state, p); if (!chat) { await reply("There's no TheDesk room to invite people to yet."); return 1; }
  const R = Gr.refsOf(state), uid = String(m.from.id); let L = R.links[uid];
  if (!L || L.c !== chat) { const r = await T('createChatInviteLink', { chat_id: chat, name: ('ref ' + uid).slice(0, 32) }); const link = r && r.result && r.result.invite_link;
    if (!link) { await reply('I couldn\'t make your link just now (the bot needs "Invite users" in that room). Try again later.'); return 1; } L = R.links[uid] = { l: link, c: chat, ts: now }; }
  const B = R.by[uid] || { n: 0 }; R.by[uid] = { ...B, nm: plainName(m.from), ts: now };
  await reply(`🔗 <b>Your personal TheDesk link</b>\n${L.l}\n\nEveryone who joins through it counts for you${B.n ? ` (so far: <b>${B.n}</b>)` : ''}. Sundays, the lounge hears who brought the most people in.`); return 1; }
async function ownerRecruit(state, T, p, m, cmd, now) { const owners = await ownersOf(state, T, p); if (!m.from || !owners.includes(m.from.id)) return 0;
  const reply = text => T('sendMessage', { chat_id: String(m.chat.id), text, parse_mode: 'HTML', disable_web_page_preview: 'true' });
  if (m.chat.type !== 'private') { await reply(`DM me /${cmd} so it stays private.`); return 1; }
  const R = Gr.refsOf(state); if (cmd === 'joins') { await reply(Gr.joinsText(R, Gr.weekOf(chicagoDay(now)))); return 1; }
  const chat = recruitChat(state, p); if (!chat) { await reply("There's no TheDesk room to link to yet."); return 1; } const out = [];
  for (const [tag, lab] of Gr.SRC_TAGS) { let L = R.srcLinks[tag];
    if (!L || L.c !== chat) { const r = await T('createChatInviteLink', { chat_id: chat, name: 'src ' + tag }); const link = r && r.result && r.result.invite_link;
      if (!link) { out.push(`${lab}: couldn't make it (is the bot an admin there with "Invite users" on?)`); continue; } L = R.srcLinks[tag] = { l: link, c: chat, ts: now }; }
    out.push(`<b>${lab}</b>: ${L.l}`); }
  await reply(['🔗 <b>One link per platform</b> (put each one in that platform\'s bio):', ...out, '', 'Telegram counts the joins on each link (the room → Manage → Invite links). /joins shows them here.'].join('\n')); return 1; }
/* Sundays from 11 AM Central: the lounge hears who brought the most people in last week (only when somebody did) */
export async function runRecruitShout(state, deps) { const now = deps?.now || Date.now(), today = chicagoDay(now); if (new Date(today + 'T12:00:00Z').getUTCDay() !== 0 || Gr.ctHour(now) < 11) return 0;
  const R = state.refs; if (!R) return 0; const wk = Gr.weekOf(Gr.shift(today, -1)); if (R.shout === wk) return 0;
  const text = Gr.shoutText(R, wk); if (!text) { R.shout = wk; return 1; }
  let room = null; for (const d of Object.keys(state.posts || {}).sort().reverse()) { const b = state.posts[d] && state.posts[d].bc; if (b && (b.pubLounge || b.vipLounge)) { room = b.pubLounge || b.vipLounge; break; } }
  if (!room) { R.shout = wk; return 1; } const r = await (deps?.tg || tg)('sendMessage', { chat_id: String(room), text, parse_mode: 'HTML', disable_web_page_preview: 'true' });
  if (r) { R.shout = wk; log('recruiting · the weekly shout-out went out'); return 1; } return 0; }
/* 📄 Tonight's Game pages: the site's /desk/games/ (growth.mjs draws them). One commit per write through the Git Data API, the
   files inline in one tree (three write calls however many pages), at most 60 pages a commit. New pages go out within 30
   minutes, finals every 2 hours, days older than 14 are removed. The slate drops a game once it starts, so each day's rows sit
   beside its pages in games.json (public slate data) for the final rewrite; the worker's own memory is ~2 KB (what it wrote).
   The token: SITE_TOKEN (a repo secret) when set, else the card's. */
let SLATE = null; const GP_RUN = { d: '', chk: 0, res: {}, fin: {} };
async function slateNow(deps) { if (deps && 'slate' in deps) return deps.slate; if (SLATE && Date.now() - SLATE.at < 20 * 60e3) return SLATE.s;
  try { const r = await fetch(FEEDS_RAW() + 'slate.json', { headers: { 'User-Agent': 'thedesk-autopilot' } }); if (r.ok) { SLATE = { at: Date.now(), s: await r.json() }; return SLATE.s; } } catch (e) { }
  return SLATE ? SLATE.s : null; }
async function finalOf(sp, game, d) { const [ga, gh] = String(game || '').split('@'); if (!ga || !gh) return null; const F = await findEvent(sp, d, [ga, gh]); if (!F || !evFinal(F.ev)) return null;
  const { as, hs } = F.T; if (!isFinite(as) || !isFinite(hs)) return null; const awayIsA = F.T.a === ab(sp, ga); return `${ga} ${awayIsA ? as : hs}–${awayIsA ? hs : as} ${gh}`; }
export async function siteCommit(repo, tok, files, del, message, deps) { const F = deps?.fetch || fetch, api = p => `https://api.github.com/repos/${repo}/${p}`;
  const H = { Authorization: 'Bearer ' + tok, Accept: 'application/vnd.github+json', 'User-Agent': 'thedesk-autopilot', 'Content-Type': 'application/json' };
  const J = async (u, o) => { const r = await F(u, { headers: H, ...(o || {}) }); let j = null; try { j = await r.json(); } catch (e) { } return { ok: r.ok, status: r.status, j }; };
  const put = Object.entries(files).map(([path, content]) => ({ path, mode: '100644', type: 'blob', content })); let gone = [...(del || [])];
  for (let tries = 0; tries < 3; tries++) {
    const ref = await J(api('git/ref/heads/main')); if (!ref.ok) return { ok: false, status: ref.status }; const head = ref.j.object.sha;
    const cm = await J(api('git/commits/' + head)); if (!cm.ok) return { ok: false, status: cm.status };
    const tree = () => J(api('git/trees'), { method: 'POST', body: JSON.stringify({ base_tree: cm.j.tree.sha, tree: [...put, ...gone.map(path => ({ path, mode: '100644', type: 'blob', sha: null }))] }) });
    let t = await tree(); if (!t.ok && t.status === 422 && gone.length) { gone = []; t = await tree(); }   /* a file to remove was already gone: write the rest */
    if (!t.ok) return { ok: false, status: t.status };
    const c = await J(api('git/commits'), { method: 'POST', body: JSON.stringify({ message, tree: t.j.sha, parents: [head] }) }); if (!c.ok) return { ok: false, status: c.status };
    const u = await J(api('git/refs/heads/main'), { method: 'PATCH', body: JSON.stringify({ sha: c.j.sha, force: false }) }); if (u.ok) return { ok: true, sha: c.j.sha, removed: gone.length };
    if (u.status !== 422 && u.status !== 409) return { ok: false, status: u.status }; }   /* the phone published picks.json in between: build on the new head */
  return { ok: false, reason: 'busy' }; }
const SL_KEEP = g => ({ k: g.k, sp: g.sp, t: g.t, a: g.a, h: g.h, venue: g.venue || '', ln: g.ln ? { fav: g.ln.fav, line: g.ln.line, tot: g.ln.tot, mlA: g.ln.mlA, mlH: g.ln.mlH } : null, read: g.read || null, mkt: g.mkt || null, note: g.note || '' });
const t36 = t => Math.round(t / 6e4).toString(36), un36 = s => parseInt(s, 36) * 6e4, fnv = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h.toString(36); };
async function gamesOnSite(tok, deps) { const F = deps?.fetch || fetch, H = { Authorization: 'Bearer ' + tok, Accept: 'application/vnd.github+json', 'User-Agent': 'thedesk-autopilot' };
  const d = await F(`https://api.github.com/repos/${SITE}/contents/desk?ref=main`, { headers: H }); if (!d.ok) return { status: d.status };
  const L = await d.json().catch(() => []), g = (Array.isArray(L) ? L : []).find(x => x && x.name === 'games' && x.type === 'dir'); if (!g) return { paths: [] };
  const t = await F(`https://api.github.com/repos/${SITE}/git/trees/${g.sha}?recursive=1`, { headers: H }); if (!t.ok) return { status: t.status };
  const T = await t.json().catch(() => ({})); return { paths: (T.tree || []).filter(x => x && x.type === 'blob').map(x => `${Gr.GP_DIR}/${x.path}`) }; }
async function siteText(tok, path, deps) { try { const r = await (deps?.fetch || fetch)(`https://api.github.com/repos/${SITE}/contents/${path}?ref=main`, { headers: { Authorization: 'Bearer ' + tok, Accept: 'application/vnd.github.raw', 'User-Agent': 'thedesk-autopilot' } }); return r.ok ? await r.text() : null; } catch (e) { return null; } }
export async function runGamePages(state, S, today, deps) { if (String(deps?.gamePages ?? env.GAME_PAGES ?? '').trim().toLowerCase() === 'off') return 0;
  const now = deps?.now || Date.now(), G = S.gp = S.gp || {}, run = deps?.gpRun || GP_RUN; if (run.d !== today) { run.d = today; run.chk = 0; run.res = {}; run.fin = {}; }
  const tok = deps && 'siteTok' in deps ? deps.siteTok : ((env.SITE_TOKEN || '').trim() || SITE_TOK); if (!tok) return 0;
  if (G.err && G.errTok === fnv(tok) && now - G.err < 60 * 60e3) return 0;   /* a refused token waits an hour; a new one is tried at once */
  const W = G.w = G.w || {}; for (const d of Object.keys(W)) if (d < today) delete W[d];
  const F = await pubFeedNow(deps), slate0 = await slateNow(deps); if (!slate0 || !Array.isArray(slate0.days)) return 0;
  const B = F && F.beta === true && F.board ? F.board : null, days = [today, Gr.shift(today, 1), Gr.shift(today, 2)];
  const live = {}, seen = {}; for (const D of slate0.days) if (days.includes(D.d)) for (const g of D.games || []) if (g && g.k && Gr.named(g) && Number.isFinite(g.t)) { (live[D.d] = live[D.d] || {})[g.k] = SL_KEEP(g); (seen[D.d] = seen[D.d] || {})[g.k] = g.t; }
  const fresh = []; for (const d in seen) for (const k in seen[d]) if (!(W[d] && W[d][k])) fresh.push({ d, k, t: seen[d][k] });
  /* finals: today's games past start + 2.5 h, graded with the cards' own grader (ESPN), at most once a run */
  const mine = Object.entries(W[today] || {}).map(([k, v]) => ({ k, ph: v[0], t: un36(v.slice(1)) }));
  if (!run.chk && (mine.some(x => x.ph === 'p' && now > x.t + 2.5 * 36e5) || fresh.some(x => x.d === today))) { run.chk = now;
    const GP = deps?.gradePick || gradePick, FO = deps?.finalOf || finalOf, all = new Map(); for (const x of mine) all.set(x.k, x.t); for (const x of fresh) if (x.d === today) all.set(x.k, x.t); let looked = 0;
    for (const [k, t] of all) { if (run.fin[k] || now < t + 2.5 * 36e5 || looked >= 60) continue; looked++; const [sp, game] = k.split('|'), b = B && (B.games || []).find(x => x.sp + '|' + x.game === k);
      const picks = [...new Set([...((b && b.picks) || []).map(x => x && x.pick), ...((F && F.today && F.today.picks) || []).filter(x => x && !x.hidden && x.sp + '|' + x.game === k).map(x => x.pick)].filter(Boolean))];
      let fin0 = null; try { for (const pk of picks) { const x = { sp, game, pick: pk }; const r = await GP(x, today); if (r) { run.res[k + '|' + pk] = r; fin0 = fin0 || x.__fin || null; } } if (!fin0) fin0 = await FO(sp, game, today); } catch (e) { }
      if (fin0) run.fin[k] = fin0; } }
  const finals = mine.filter(x => x.ph === 'p' && run.fin[x.k]);
  const go = (fresh.length && (!G.at || now - G.at >= 30 * 60e3)) || (finals.length && (!G.at || now - G.at >= 2 * 36e5)); if (!go) return 0;
  const L = await gamesOnSite(tok, deps); if (!L.paths) { log('game pages: the site said', L.status); if ([401, 403, 404].includes(L.status)) { G.err = now; G.errTok = fnv(tok); return 1; } return 0; }   /* 1 = save the memory, so the wait sticks */
  const touched = [...new Set([...fresh.map(x => x.d), ...(finals.length ? [today] : [])])].sort(), have = new Set(L.paths), rows = {};
  for (const d of touched) { const m = {}, f = `${Gr.GP_DIR}/${d}/games.json`; if (have.has(f)) { try { for (const g of (JSON.parse(await siteText(tok, f, deps) || '{}').games || [])) if (g && g.k) m[g.k] = g; } catch (e) { } }
    Object.assign(m, live[d] || {}); rows[d] = Object.values(m).filter(Gr.named).sort((x, y) => x.t - y.t || x.k.localeCompare(y.k)); }
  const FD = await feedsNow(deps).catch(() => null), app = appUrl(deps);
  const P = Gr.gamePages(F, { days: touched.map(d => ({ d, games: rows[d] })) }, now, today, { app, coach: FD && FD.coach, res: run.res, fin: run.fin });
  const due = P.pages.filter(pg => { const v = W[pg.day] && W[pg.day][pg.k]; return touched.includes(pg.day) && (!v || (pg.phase === 'final' && v[0] !== 'f')); }).sort((a, b) => a.day.localeCompare(b.day) || a.t - b.t).slice(0, 60);
  if (!due.length) { G.at = now; return 0; }
  const files = {}; for (const pg of due) files[pg.path] = pg.html; for (const dp of P.dayPages) if (touched.includes(dp.day)) files[dp.path] = dp.html;   /* a day's page only from its full list */
  for (const d of touched) if (rows[d].length) files[`${Gr.GP_DIR}/${d}/games.json`] = JSON.stringify({ v: 1, d, note: 'TheDesk game pages: the public slate rows each page was drawn from', games: rows[d] }) + '\n';
  const old = Gr.shift(today, -14), dayOf = p => (p.match(/\/(\d{4}-\d\d-\d\d)\//) || [])[1] || '', stale = L.paths.filter(p => dayOf(p) && dayOf(p) < old).slice(0, 400);
  Object.assign(files, Gr.gameIndex([...new Set([...L.paths.filter(p => !stale.includes(p)), ...Object.keys(files)])], now, { app, today }));
  if (!G.robots) { const txt = await siteText(tok, 'robots.txt', deps); if (txt != null) { if (txt.includes(`/${Gr.GP_DIR}/sitemap.xml`)) G.robots = true; else files['robots.txt'] = txt.replace(/\s*$/, '\n') + `Sitemap: ${Gr.GP_SITE}/${Gr.GP_DIR}/sitemap.xml\n`; } }
  const nf = due.filter(pg => pg.phase === 'final').length, nn = due.length - nf;
  const r = await (deps?.siteCommit || siteCommit)(SITE, tok, files, stale, `Game pages · ${today} · ${[nn ? nn + ' new' : '', nf ? nf + ' final' : '', stale.length ? stale.length + ' old removed' : ''].filter(Boolean).join(' · ')}`, deps);
  if (!r.ok) { log('game pages: not written ·', r.status || r.reason); if (r.status === 401 || r.status === 403) { G.err = now; G.errTok = fnv(tok); return 1; } return 0; }
  for (const pg of due) (W[pg.day] = W[pg.day] || {})[pg.k] = (pg.phase === 'final' ? 'f' : 'p') + t36(pg.t);
  if (files['robots.txt']) G.robots = true; G.at = now; delete G.err; delete G.errTok; log('game pages ·', [nn ? nn + ' new' : '', nf ? nf + ' final' : '', stale.length ? stale.length + ' removed' : ''].filter(Boolean).join(' · ')); return 1; }
/* the public page: the full card the app handed over, with whatever hasn't unlocked yet hidden, and every grade the worker knows */
export function publicView(feed, st, now) { const F = JSON.parse(JSON.stringify(feed || {})); st = st || {}; const T0 = F.today; if (!T0) { F.generated = now; return F; }
  const key = x => [x.sp, x.game || x.team || '', x.pick || ''].join('|');
  const hide = x => ({ hidden: true, sp: x.sp, start: x.start || '', unlockAt: x.unlockAt || null });
  /* v2.35 · open = graded, or past its unlock (T-30 from the start when only the start is known). No time at all → stays hidden. */
  /* v3.1 · the open beta: when the app says so, nothing waits for its unlock */
  const shut = x => { if (F.beta === true) return false; if (x.hit != null || x.push) return false; const t = x.unlockAt || (Date.parse(x.start || '') - 30 * 60e3); return !(isFinite(t) && now >= t); };
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
  if (site.repo === SITE) siteSeen(r.status); return { ok: r.ok, status: r.status }; }
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
/* v2.98 · the worker's own memory for Threads: its refreshed token, encrypted, in social.enc on the state branch of
   this repo only — never in the card, never in the site's copy, so it never reaches the phone or the public page */
const SOCFILE = 'social.enc';
/* v2.99 · the same file is the Megaphone's memory (what it posted today, and when) */
let SOCMEM = null;
async function socialBoot() { if (!GH || !REPO) return;
  try { const r = await fetch(`https://api.github.com/repos/${REPO}/contents/${SOCFILE}?ref=${BRANCH}`, { headers: ghH }); let S = {}, sha = null;
    if (r.ok) { const j = await r.json(); sha = j.sha; S = await decrypt(Buffer.from(j.content, 'base64').toString('utf8')) || {}; } else if (r.status !== 404) { log('social memory: HTTP', r.status); return; }
    S.mega = S.mega || {}; SOCMEM = { S, sha };
    if ((env.THREADS_TOKEN || '').trim()) { Soc.useSocial(S); if (await Soc.thRefresh(S)) await socialSave(); } } catch (e) { log('social memory:', String(e && e.message || e).slice(0, 60)); } }
async function socialSave() { if (!SOCMEM) return;
  try { const w = await fetch(`https://api.github.com/repos/${REPO}/contents/${SOCFILE}`, { method: 'PUT', headers: { ...ghH, 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'autopilot social ' + new Date().toISOString(), branch: BRANCH, content: Buffer.from(await encrypt(SOCMEM.S), 'utf8').toString('base64'), ...(SOCMEM.sha ? { sha: SOCMEM.sha } : {}) }) });
    if (w.ok) { const j = await w.json(); SOCMEM.sha = (j.content && j.content.sha) || SOCMEM.sha; } else log('social memory: save HTTP', w.status); } catch (e) { log('social memory:', String(e && e.message || e).slice(0, 60)); } }
/* ══ v3.2 · SAFEGUARDS (Nov 18) ═════════════════════════════════════════════════
   Nov 17: iOS wiped the phone's app. The Telegram token went with it, so the VIP card never posted, so it was never handed
   over — and this worker, the one piece that never sleeps, sat on Nov 16 for two days while nothing told anyone. Now:
   · the phone hands the card over even without a bot token, and the worker posts it itself (TG_BOT_TOKEN lives here, safe from wipes)
   · the phone checks in (state.phone) and the worker DMs the owner when the phone goes quiet, a card is missing, backups fail,
     or the token inside the card is refused — once a day each, 9 AM to 10 PM Central
   · /health (the owner, in a private chat) answers with the whole picture; health.json (branch desk-health — no secrets, times only) feeds the admin tab
   · the state branches keep one day of history instead of 1,600 commits of 1 MB encrypted files
   · the phone's encrypted vault backup (branch desk-vault on the site repo) is copied here, four days deep */
export async function postCard(p, T) { const ids = []; const parts = p.parts || [];
  for (const part of parts) { const r = await T('sendMessage', { chat_id: p.chat, text: fillTemplate(part, p.st || {}), parse_mode: 'HTML', disable_web_page_preview: 'true' });
    const id = r && r.result && r.result.message_id; if (!id) break; ids.push(id); if (T === tg) await new Promise(z => setTimeout(z, 450)); }
  if (!ids.length) return 0;   /* Telegram refused: the next pass tries again */
  p.ids = ids.length === parts.length ? ids : []; p.needPost = false; p.postedBy = 'worker'; p.workerPostTs = Date.now();
  log('posted the VIP card for', p.d, 'itself ·', ids.length + '/' + parts.length, 'message(s) — the phone had no bot token'); return 1; }
let SITE_ERR = null, SITE_OK = 0, KEY_BAD = 0;
/* the card couldn't be opened: sealed with a key that isn't AUTOPILOT_KEY (a phone that made itself a new one) */
export const keyBadErr = e => /OperationError|operation failed|unknown format|Unsupported state|unable to authenticate/i.test(String(e && ((e.name || '') + ' ' + (e.message || ''))));
function siteSeen(status) { if (status === 401 || status === 403) SITE_ERR = { status, ts: Date.now() }; else if (status >= 200 && status < 300) SITE_OK = Date.now(); }
/* fold what this run saw about the site token into the state (only when it changed, so a dead token can't make every pass save) */
export function siteNote(state, err, ok) { const W = state.watch || (state.watch = {}); let ch = false;
  if (err && (!W.siteErr || W.siteErr.status !== err.status || err.ts - (W.siteErr.ts || 0) > 36e5)) { W.siteErr = err; ch = true; }
  if (ok && W.siteErr && ok > (W.siteErr.ts || 0)) { delete W.siteErr; W.siteOk = ok; ch = true; } return ch; }
const ctHour = now => +new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', hour: 'numeric', hourCycle: 'h23' }).format(new Date(now));
const ago = ms => { const h = ms / 36e5; return h < 1 ? Math.max(1, Math.round(ms / 60e3)) + ' min' : h < 48 ? Math.round(h) + ' h' : Math.round(h / 24) + ' days'; };
const ctTime = t => new Date(t).toLocaleString('en-US', { timeZone: 'America/Chicago', weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
/* what needs saying right now (pure — the tests drive it); each kind once a day, the transfer-code nudge once a week */
export function watchPlan(state, now) { now = now || Date.now(); const today = chicagoDay(now); const out = []; const ph = state.phone || null, W = state.watch || {};
  const fresh = !!(ph && ph.ts && now - ph.ts < 24 * 36e5);
  if (ph && ph.ts && !fresh) out.push({ k: 'silent', text: `📵 <b>TheDesk hasn't checked in for ${ago(now - ph.ts)}</b> (last seen ${ctTime(ph.ts)} CT).\nI'm still grading and posting what I have, but backups and new cards wait until the app is opened. Open TheDesk on your phone.` });
  const p = state.posts && state.posts[today];
  if (!p && ctHour(now) >= 15) out.push({ k: 'nocard', text: `🗂 <b>No card has been handed to me today.</b>\nIf today's a day off, ignore this. Otherwise open TheDesk → Today → 🛰️ Re-send today's card.${ph && ph.keys && ph.keys.tg === false ? '\nThe phone has no Telegram token, and that\'s fine: I post the VIP card myself now.' : ''}` });
  const S = ph && ph.sync;
  if (S && S.on && fresh && (S.auth || !S.last || now - S.last > 24 * 36e5)) out.push({ k: 'backup', text: `☁️ <b>${S.auth ? 'The cloud backup is OFF: GitHub refused the sync token' : S.last ? 'The cloud backup hasn\'t saved for ' + ago(now - S.last) : 'The cloud backup has never saved on this phone'}</b>${S.err ? ' (' + esc(String(S.err).slice(0, 90)) + ')' : ''}.\nFix: TheDesk → Settings → ☁️ Sync → paste a new token for thedesk-data.${ph.vault && ph.vault.ts ? `\nYour encrypted vault copy is from ${ctTime(ph.vault.ts)} CT, so nothing older is at risk.` : ''}` });
  if (S && !S.on && fresh) out.push({ k: 'nosync', text: '☁️ <b>Cloud sync isn\'t connected on the phone.</b> If iOS wipes the app, everything since the last backup is gone. TheDesk → Settings → ☁️ Sync.' });
  if (W.siteErr && (W.siteErr.status === 401 || W.siteErr.status === 403) && now - (W.siteErr.ts || 0) < 12 * 36e5) out.push({ k: 'sitetok', text: `🔑 <b>The publish token inside the card was refused (HTTP ${W.siteErr.status}).</b>\nI can't update the public page or the site's copy until the phone hands over a working one: TheDesk → Settings → Public picks page → paste a fresh token → Save → 🛰️ Re-send today's card.` });
  if (W.keyBad && now - W.keyBad < 12 * 36e5) out.push({ k: 'key', text: '🔐 <b>I can\'t open the card the phone handed over</b> — it was sealed with a different key than the AUTOPILOT_KEY secret (a phone that lost its key makes a new one).\nFix: restore your transfer code on the phone (it carries the key). Or, if this phone\'s key is the one you want: TheDesk → Today → 24/7 worker → copy key → update the AUTOPILOT_KEY secret.' });
  const V = ph && ph.vault; if (V && V.on && fresh && now - (V.ts || 0) > 48 * 36e5) out.push({ k: 'vault', text: `🛟 <b>The encrypted vault backup is ${V.ts ? ago(now - V.ts) + ' old' : 'empty'}.</b> TheDesk → Settings → 🛟 Vault → Save now.` });
  if (ph && fresh && ph.keys && ph.keys.n > 0 && !ph.xfer) out.push({ k: 'xfer', every: 7, text: '🔑 <b>No transfer code saved.</b> It\'s the only thing that brings your API keys back after a wipe (they never go to the cloud). TheDesk → Settings → ☁️ Sync → 🔑 Copy transfer code → your password manager.' });
  const sent = W.sent || {}; const dayN = d => Math.round(Date.parse(d + 'T12:00:00Z') / 864e5);
  return out.filter(a => { const s0 = sent[a.k]; if (!s0 || !s0.d) return true; return a.every ? dayN(today) - dayN(s0.d) >= a.every : s0.d !== today; }); }
export async function runWatchdog(state, deps) { const T = deps?.tg || tg; const now = deps?.now || Date.now(); const h = ctHour(now); if (h < 9 || h >= 22) return 0;
  const due = watchPlan(state, now); if (!due.length) return 0;
  const p = Object.keys(state.posts || {}).sort().map(d => state.posts[d]).filter(x => x && x.chat).pop() || null;
  const owners = p ? await ownersOf(state, T, p) : []; const W = state.watch || (state.watch = {}); W.sent = W.sent || {}; const today = chicagoDay(now); let n = 0;
  for (const a of due) { let ok = false; for (const id of owners) { const r = await T('sendMessage', { chat_id: String(id), text: a.text + '\n\n<i>— your 24/7 worker · /health for the whole picture</i>', parse_mode: 'HTML', disable_web_page_preview: 'true' }); ok = ok || !!r; }
    W.sent[a.k] = { d: today, ts: now, ...(ok ? {} : { fail: true }) }; n++;   /* a DM that can't land (no Start on the bot yet) isn't retried every pass */
    log('watchdog →', ok ? 'owner:' : 'couldn\'t reach the owner (has the owner pressed Start on the bot?):', a.k); }
  return n; }
/* the whole picture — no secrets, no picks: times, counts and yes/no */
export function healthOf(state, now) { now = now || Date.now(); const today = chicagoDay(now); const ds = Object.keys(state.posts || {}).sort(); const last = ds[ds.length - 1] || null; const p = last ? state.posts[last] : null;
  const ph = state.phone || {}, W = state.watch || {}; const S = ph.sync || null;
  return { v: 1, at: now, worker: { lastRun: state.lastRun || 0, runs: state.runs || 0, version: VERSION },
    card: { day: last, today: last === today, legs: p ? (p.legs || []).length : 0, graded: p ? Object.keys(p.st || {}).filter(k => (p.legs || []).some(l => l.k === k)).length : 0, recap: !!(p && p.recap), posted: p ? (p.postedBy || ((p.ids || []).length ? 'phone' : p.needPost ? 'waiting' : 'unposted')) : null },
    phone: { seen: ph.ts || 0, build: ph.build || null, sync: S ? { on: !!S.on, last: S.last || 0, ok: !!S.on && !S.auth && !!S.last && now - S.last < 24 * 36e5 } : null, vault: ph.vault ? { ts: ph.vault.ts || 0 } : null, keysMissing: ph.keys ? (ph.keys.missing || 0) : null, xfer: !!ph.xfer },
    vault: W.vault ? { ts: W.vault.ts || 0, gens: (W.vault.gens || []).map(g => ({ day: g.day, ts: g.ts })) } : null,
    site: { err: W.siteErr ? W.siteErr.status : null, at: W.siteErr ? W.siteErr.ts : (W.siteOk || 0) },
    alerts: watchPlan({ ...state, watch: { ...W, sent: {} } }, now).map(a => a.k) }; }
export function healthText(state, now) { now = now || Date.now(); const H = healthOf(state, now); const ok = b => b ? '✅' : '⚠️'; const t = x => x ? ctTime(x) + ' CT (' + ago(now - x) + ' ago)' : 'never';
  const L = [`<b>🩺 TheDesk health</b> · ${esc(VERSION)}`,
    `${ok(H.worker.lastRun && now - H.worker.lastRun < 3 * 36e5)} Worker: last run ${t(H.worker.lastRun)}`,
    `${ok(H.card.today)} Card: ${H.card.day ? esc(H.card.day) + ' · ' + H.card.graded + '/' + H.card.legs + ' graded · posted by ' + esc(H.card.posted) : 'none on file'}${H.card.today ? '' : ' (nothing for today yet)'}`,
    `${ok(H.phone.seen && now - H.phone.seen < 24 * 36e5)} Phone: ${H.phone.seen ? 'checked in ' + t(H.phone.seen) + (H.phone.build ? ' · ' + esc(H.phone.build) : '') : 'no check-in yet (needs the new app build)'}`,
    `${ok(H.phone.sync && H.phone.sync.ok)} Cloud backup: ${H.phone.sync ? (H.phone.sync.on ? 'last saved ' + t(H.phone.sync.last) : 'not connected') : 'unknown'}`,
    `${ok(H.vault && now - H.vault.ts < 48 * 36e5)} Vault: ${H.vault ? 'newest ' + t(H.vault.ts) + ' · ' + H.vault.gens.length + ' day(s) kept here' : 'no copy yet'}`,
    `${ok(!H.site.err)} Publish token in the card: ${H.site.err ? 'REFUSED (HTTP ' + H.site.err + ')' : 'working'}`,
    `${ok(H.phone.keysMissing === 0)} Keys on the phone: ${H.phone.keysMissing == null ? 'unknown' : H.phone.keysMissing ? H.phone.keysMissing + ' missing' : 'all there'}${H.phone.xfer ? '' : ' · ⚠️ no transfer code saved'}`];
  if (H.alerts.length) L.push('', '<b>Needs you:</b> ' + H.alerts.join(', '));
  return L.join('\n'); }
async function ownerHealth(state, T, p, m, now) { const owners = await ownersOf(state, T, p); if (!m.from || !owners.includes(m.from.id)) return 0;
  const priv = m.chat.type === 'private'; const r = await T('sendMessage', { chat_id: String(priv ? m.chat.id : m.from.id), text: healthText(state, now), parse_mode: 'HTML', disable_web_page_preview: 'true' });
  if (!r && !priv) await T('sendMessage', { chat_id: String(m.chat.id), text: 'Press Start on the bot in a private chat first, then send /health there.', reply_to_message_id: String(m.message_id), allow_sending_without_reply: 'true' });
  return 1; }
/* health.json on its own branch (desk-health, one commit, no history): what the admin tab reads — public, so times and counts only */
let HEALTH_SIG = null; const HBRANCH = 'desk-health';
export async function writeHealth(state, deps) { const F = deps?.fetch || fetch; const now = deps?.now || Date.now(); if (!GH && !deps) return 0;
  const H = healthOf(state, now); const sig = JSON.stringify({ ...H, at: 0, worker: { ...H.worker, lastRun: Math.floor((H.worker.lastRun || 0) / 36e5), runs: 0 } });
  if (sig === HEALTH_SIG) return 0; const api = p => `https://api.github.com/repos/${REPO}/${p}`, JH = { ...ghH, 'Content-Type': 'application/json' };
  try { const b = await F(api('git/blobs'), { method: 'POST', headers: JH, body: JSON.stringify({ content: JSON.stringify(H, null, 1), encoding: 'utf-8' }) }); if (!b.ok) throw new Error('blob HTTP ' + b.status);
    const t = await F(api('git/trees'), { method: 'POST', headers: JH, body: JSON.stringify({ tree: [{ path: 'health.json', mode: '100644', type: 'blob', sha: (await b.json()).sha }] }) }); if (!t.ok) throw new Error('tree HTTP ' + t.status);
    const c = await F(api('git/commits'), { method: 'POST', headers: JH, body: JSON.stringify({ message: 'health ' + new Date(now).toISOString(), tree: (await t.json()).sha, parents: [] }) }); if (!c.ok) throw new Error('commit HTTP ' + c.status); const sha = (await c.json()).sha;
    let r = await F(api(`git/refs/heads/${HBRANCH}`), { method: 'PATCH', headers: JH, body: JSON.stringify({ sha, force: true }) });
    if (r.status === 404 || r.status === 422) r = await F(api('git/refs'), { method: 'POST', headers: JH, body: JSON.stringify({ ref: 'refs/heads/' + HBRANCH, sha }) });
    if (!r.ok) throw new Error('ref HTTP ' + r.status); HEALTH_SIG = sig; return 1; } catch (e) { log('health.json', e.message || e); return 0; } }
/* the state branch's history, squashed to one commit (the newest files, nothing lost): 1 MB encrypted files don't compress, so
   every save used to add a megabyte to the repo forever (938 MB on Nov 18) */
export async function squashBranch(repo, tok, deps) { const F = deps?.fetch || fetch; if (!repo || !tok) return false;
  const H = { ...ghH, Authorization: 'Bearer ' + tok }; const api = p => `https://api.github.com/repos/${repo}/${p}`;
  const head = async () => { const r = await F(api(`git/ref/heads/${BRANCH}`), { headers: H }); return r.ok ? ((await r.json()).object || {}).sha || null : null; };
  const h0 = await head(); if (!h0) return false; const c = await F(api(`git/commits/${h0}`), { headers: H }); if (!c.ok) return false; const cj = await c.json();
  if (!(cj.parents || []).length) return true;   /* already one commit */
  const n = await F(api('git/commits'), { method: 'POST', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'autopilot state · history squashed ' + new Date().toISOString().slice(0, 10), tree: cj.tree.sha, parents: [] }) }); if (!n.ok) return false; const nj = await n.json();
  if ((await head()) !== h0) return false;   /* someone saved in the meantime: try again tomorrow */
  const u = await F(api(`git/refs/heads/${BRANCH}`), { method: 'PATCH', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify({ sha: nj.sha, force: true }) }); return !!u.ok; }
export async function dailySquash(state, deps) { const now = deps?.now || Date.now(); const today = chicagoDay(now); const W = state.watch || (state.watch = {}); W.sq = W.sq || {}; let ch = false;
  for (const [repo, tok] of [[REPO, GH], [SITE !== REPO ? SITE : null, SITE_TOK]]) { if (!repo || !tok || W.sq[repo] === today) continue;
    try { if (await squashBranch(repo, tok, deps)) { W.sq[repo] = today; ch = true; log('state history squashed ·', repo === REPO ? 'here' : repo); } } catch (e) { log('squash', e.message || e); } }
  return ch; }
/* ── the vault courier: the phone's encrypted backup (site repo, branch desk-vault) copied here with four days of generations.
   A copy far smaller than the last one (a half-loaded phone) is held back instead of rotating good days out. */
const VBRANCH = 'desk-vault';
export async function vaultCourier(state, deps) { const F = deps?.fetch || fetch; const now = deps?.now || Date.now(); const W = state.watch || (state.watch = {}); if (!GH && !deps) return 0;
  const raw = (repo, f) => `https://raw.githubusercontent.com/${repo}/${VBRANCH}/${f}?t=${Math.floor(now / 60e3)}`; const UA = { 'User-Agent': 'thedesk-autopilot' };
  let meta = null; try { const r = await F(raw(SITE, 'vault.json'), { headers: UA }); if (!r.ok) return 0; meta = await r.json(); } catch (e) { return 0; }
  if (!meta || !(+meta.ts > 0)) return 0; const have = W.vault || null; if (have && +have.ts >= +meta.ts) return 0;
  const keys = +meta.keys || 0;
  if (have && +have.keys > 0 && keys < have.keys * 0.6 && now - (+have.ts || 0) < 14 * 864e5) {
    if (!W.vaultHold || W.vaultHold.ts !== meta.ts) { W.vaultHold = { ts: meta.ts, keys }; log('vault: the newest copy has', keys, 'keys vs', have.keys, 'before — held back, the good days stay'); return 1; } return 0; }
  const e = await F(raw(SITE, 'vault.enc'), { headers: UA }); if (!e.ok) { log('vault: read HTTP', e.status); return 0; } const enc = (await e.text()).trim();
  if (!/^v2g\.[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+$/.test(enc)) { log('vault: unknown format'); return 0; }
  const api = p => `https://api.github.com/repos/${REPO}/${p}`; const J = async (url, o) => { const r = await F(url, o); if (!r.ok) { const er = new Error('HTTP ' + r.status + ' ' + url.split('/repos/')[1]); er.status = r.status; throw er; } return r.json(); };
  const JH = { ...ghH, 'Content-Type': 'application/json' };
  let cur = null; try { const ref = await J(api(`git/ref/heads/${VBRANCH}`), { headers: ghH }); const c = await J(api(`git/commits/${ref.object.sha}`), { headers: ghH }); const t = await J(api(`git/trees/${c.tree.sha}`), { headers: ghH });
    cur = { files: Object.fromEntries((t.tree || []).filter(x => x.type === 'blob').map(x => [x.path, x.sha])) }; } catch (er) { if (er.status !== 404 && er.status !== 409) throw er; }
  let prev = []; if (cur && cur.files['vault.json']) { try { const b = await J(api(`git/blobs/${cur.files['vault.json']}`), { headers: ghH }); prev = (JSON.parse(Buffer.from(b.content, 'base64').toString('utf8')).gens || []).filter(g => g && cur.files[g.file]); } catch (er) { prev = []; } }
  const day = chicagoDay(+meta.ts); const blob = await J(api('git/blobs'), { method: 'POST', headers: JH, body: JSON.stringify({ content: enc, encoding: 'utf-8' }) });
  const older = prev.length && prev[0].day === day ? prev.slice(1) : prev; const kept = older.slice(0, 3);
  const tree = [{ path: 'vault.enc', mode: '100644', type: 'blob', sha: blob.sha }]; const gens = [{ day, ts: +meta.ts, keys, bytes: +meta.bytes || 0, file: 'vault.enc' }];
  kept.forEach((g, i) => { const f = `vault-${i + 1}.enc`; tree.push({ path: f, mode: '100644', type: 'blob', sha: cur.files[g.file] }); gens.push({ ...g, file: f }); });
  const mb = await J(api('git/blobs'), { method: 'POST', headers: JH, body: JSON.stringify({ content: JSON.stringify({ v: 2, at: now, from: SITE, gens }, null, 1), encoding: 'utf-8' }) });
  tree.push({ path: 'vault.json', mode: '100644', type: 'blob', sha: mb.sha });
  const t2 = await J(api('git/trees'), { method: 'POST', headers: JH, body: JSON.stringify({ tree }) });
  const c2 = await J(api('git/commits'), { method: 'POST', headers: JH, body: JSON.stringify({ message: 'vault copy ' + day, tree: t2.sha, parents: [] }) });
  if (cur) await J(api(`git/refs/heads/${VBRANCH}`), { method: 'PATCH', headers: JH, body: JSON.stringify({ sha: c2.sha, force: true }) });
  else await J(api('git/refs'), { method: 'POST', headers: JH, body: JSON.stringify({ ref: 'refs/heads/' + VBRANCH, sha: c2.sha }) });
  W.vault = { ts: +meta.ts, at: now, keys, bytes: +meta.bytes || 0, gens: gens.map(g => ({ day: g.day, ts: g.ts, keys: g.keys })) }; delete W.vaultHold;
  log('vault: copied', day, '·', gens.length, 'day(s) kept'); return 1; }
/* ── main ── */
if (import.meta.url === 'file://' + process.argv[1]) {
  const t0 = Date.now(), BUDGET = +(env.RELAY_BUDGET_MS || 6.5 * 60e3), STEP = +(env.RELAY_STEP_MS || 75e3), MARGIN = +(env.RELAY_MARGIN_MS || 25e3);
  log(VERSION, '· repo', REPO, '· card from', SITE === REPO ? 'here' : SITE + ' + here', '· today', chicagoDay(t0), '·', env.GITHUB_EVENT_NAME || 'manual', '· lounge hours', (loungeHours(env.LOUNGE) || ['off']).join('-'), '· facebook page', fbOn() ? 'on' : 'off', '· instagram', Soc.on(undefined, 'ig') ? 'on' : 'off', '· threads', (env.THREADS_TOKEN || '').trim() ? 'on' : 'off');
  await socialBoot();
  /* write one copy: on a collision, re-read that copy, merge, retry */
  const saveAt = async (repo, state, cur) => { for (let tries = 0; tries < 3; tries++) { const latest = tries ? await readStateAt(repo) : cur;
      const merged = tries && latest ? mergeState(state, latest.state) : state; const st = await writeStateAt(repo, merged, latest && latest.sha);
      if (st === 200 || st === 201) return true; if (!st) return false; if (st === 401 || st === 403) { log('write refused', repo === REPO ? 'here' : repo, st, '— the token was rejected; not retrying'); return false; } log('write conflict', repo === REPO ? 'here' : repo, st, '— merging and retrying'); } return false; };
  const readSite = async () => { if (SITE === REPO) return null; try { return await readStateAt(SITE); } catch (e) { log('the site\'s copy:', e.message || e); if (keyBadErr(e)) KEY_BAD = Date.now(); return undefined; } };
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
      try { acted += await loungeWatch(state); } catch (e) { log('lounge watch', e.message || e); }
      try { acted += await fbInvite(state); } catch (e) { log('lounge easter egg', e.message || e); }
      if (SOCMEM) try { const a = await runMegaphone(state, SOCMEM.S.mega, today); if (a) { acted += a; await socialSave(); } } catch (e) { log('megaphone', e.message || e); }
      /* v3.3 · the growth desk: the debate (and its settle), Receipts Sunday, the recruiters' shout-out */
      if (SOCMEM) try { const a = (await runDebate(state, SOCMEM.S, today)) + (await runWeekly(state, SOCMEM.S, today)) + (await runFree3(state, SOCMEM.S, today)); if (a) { acted += a; await socialSave(); } } catch (e) { log('growth', e.message || e); }
      if (SOCMEM) try { if (await runGamePages(state, SOCMEM.S, today)) await socialSave(); } catch (e) { log('game pages', e.message || e); }
      try { acted += await runRecruitShout(state); } catch (e) { log('recruiting', e.message || e); }
      /* v3.2 · the safeguards: what the site said about its token, the watchdog, once a run the vault copy and the history squash */
      if (siteNote(state, SITE_ERR, SITE_OK)) dirty = true; SITE_ERR = null;
      if (KEY_BAD) { const W0 = state.watch || (state.watch = {}); if (!W0.keyBad || KEY_BAD - W0.keyBad > 36e5) { W0.keyBad = KEY_BAD; dirty = true; } KEY_BAD = 0; }
      try { acted += await runWatchdog(state); } catch (e) { log('watchdog', e.message || e); }
      if (!pass) { try { if (await vaultCourier(state)) dirty = true; } catch (e) { log('vault', e.message || e); }
        try { if (await dailySquash(state)) dirty = true; } catch (e) { log('squash', e.message || e); } }
      /* the state branch only gets a commit when something was sent — or an hourly heartbeat */
      const beat = !state.lastRun || Date.now() - state.lastRun > 60 * 60e3;
      if (acted || beat || dirty) { state.lastRun = Date.now(); state.runs = (state.runs || 0) + 1; dirty = !(await saveAt(REPO, state, cur)); if (dirty) log('couldn\'t save this pass — kept in memory, retrying next pass'); }
      /* the site's copy too, so the app sees every grade (its token rides inside the card) */
      if (SITE !== REPO && SITE_TOK && sc !== undefined && (acted || siteDirty)) { siteDirty = !(await saveAt(SITE, state, sc)); if (siteDirty) log('couldn\'t update the site\'s copy — next pass'); }
      try { await writeHealth(state); } catch (e) { log('health', e.message || e); }
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
