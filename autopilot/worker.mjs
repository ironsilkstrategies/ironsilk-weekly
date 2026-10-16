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
const VERSION = 'worker v2.32';
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
async function readState() { const r = await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE}?ref=${BRANCH}`, { headers: ghH });
  if (r.status === 404) return null; if (!r.ok) throw new Error('read state HTTP ' + r.status);
  const j = await r.json(); return { sha: j.sha, state: await decrypt(Buffer.from(j.content, 'base64').toString('utf8')) }; }
async function writeState(state, sha) { const body = { message: 'autopilot ' + new Date().toISOString(), branch: BRANCH, content: Buffer.from(await encrypt(state), 'utf8').toString('base64'), ...(sha ? { sha } : {}) };
  const r = await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE}`, { method: 'PUT', headers: { ...ghH, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return r.status; }
/* the same merge the app uses: statuses and announcements only ever accumulate */
export function mergeState(a, b) { const out = { v: 1, posts: {}, lastRun: Math.max(a?.lastRun || 0, b?.lastRun || 0), runs: Math.max(a?.runs || 0, b?.runs || 0), pubSig: { ...(b?.pubSig || {}), ...(a?.pubSig || {}) } };
  const ds = new Set([...Object.keys(a?.posts || {}), ...Object.keys(b?.posts || {})]);
  ds.forEach(d => { const x = a?.posts?.[d], y = b?.posts?.[d]; if (!x || !y) { out.posts[d] = x || y; return; }
    const base = (x.postedTs || 0) >= (y.postedTs || 0) ? x : y;
    const fx = (x.feedTs || 0) >= (y.feedTs || 0) ? x : y;   /* the newest public card the app handed over wins */
    out.posts[d] = { ...base, st: { ...(y.st || {}), ...(x.st || {}) }, sent: { ...(y.sent || {}), ...(x.sent || {}) }, recap: !!(x.recap || y.recap), worker: x.worker !== false && y.worker !== false,
      ...(fx.feedTs ? { feed: fx.feed, pub: fx.pub, bc: fx.bc, site: fx.site, feedTs: fx.feedTs } : {}) }; });
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
  if (!F || !evFinal(F.ev)) return null;
  let j; try { const r = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${PATH[x.sp]}/summary?event=${F.ev.id}`); j = await r.json(); } catch (e) { return null; }
  const rows = []; ((j.boxscore || {}).players || []).forEach(t => (t.statistics || []).forEach(g => { const labels = (g.labels || []).map(l => String(l).toUpperCase());
    (g.athletes || []).forEach(a => rows.push({ name: a.athlete?.displayName || '', grp: String(g.name || g.type || '').toLowerCase(), labels, stats: a.stats || [] })); }));
  if (!rows.length) return null;
  const want = norm(x.player), wp = want.split(' '), wl = wp[wp.length - 1], wi = (wp[0] || '')[0];
  let mine = rows.filter(r => norm(r.name) === want); if (!mine.length) { const c = rows.filter(r => { const q = norm(r.name).split(' '); return q[q.length - 1] === wl && (q[0] || '')[0] === wi; }); const names = new Set(c.map(r => r.name)); if (names.size === 1) mine = c; }
  if (!mine.length) return 'P';   /* not in the final box → didn't play → void, the book rule */
  const stat = x.stat; const spec = PROP[stat]; if (!spec) return null; let val = 0, found = false;
  spec.forEach(([grp, lab]) => { mine.forEach(r => { if (grp !== '*' && !r.grp.includes(grp)) return; const i = r.labels.indexOf(lab); if (i < 0) return;
      const raw = String(r.stats[i] ?? ''); const v = parseFloat(raw.split('-')[0]); if (isFinite(v)) { val += v; found = true; } }); });
  if (!found) { if (['rec', 'wy', 'ry', 'py', 'td', 'rtd', 'wtd', 'ptd'].includes(stat)) return +x.thr > 0 ? 'L' : 'W'; return null; }   /* played, recorded none in that category */
  if (x.side === 'under') return val < +x.thr ? 'W' : val > +x.thr ? 'L' : 'P';
  return val >= +x.thr ? 'W' : 'L'; }

/* ── Telegram ── */
async function tg(method, params) { try { const r = await fetch(`https://api.telegram.org/bot${TG}/${method}`, { method: 'POST', body: new URLSearchParams(params) }); const j = await r.json().catch(() => ({})); if (!j.ok) log(method, 'said', j.description || r.status); return j; } catch (e) { log(method, 'failed', e.message); return null; } }
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

/* ── one pass ── */
export async function runOnce(state, today, deps) { const T = deps?.tg || tg; let acted = 0;
  for (const d of Object.keys(state.posts || {}).sort()) { const p = state.posts[d]; if (!p || p.recap || p.worker === false || !p.chat) continue;
    p.st = p.st || {}; p.sent = p.sent || {};
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
  for (const d of Object.keys(state.posts || {}).sort()) { const p = state.posts[d]; if (!p || p.worker === false || !p.pub || d < shift(today, -2)) continue;
    try { acted += await runPublic(p, deps); } catch (e) { log('public side', e.message || e); } state.posts[d] = p; }
  /* cashed tickets — also for days already recapped (the last 4), each announced once */
  for (const d of Object.keys(state.posts || {}).sort()) { const p = state.posts[d]; if (!p || p.worker === false || !p.chat || d < shift(today, -4)) continue; p.sent = p.sent || {};
    for (const g of cashedParlays(p)) { const key = 'cash|' + g.sig; if (p.sent[key]) continue;
      const r = await T('sendMessage', { chat_id: p.chat, text: cashText(p, g), parse_mode: 'HTML', disable_web_page_preview: 'true' }); if (r) { p.sent[key] = 'W'; acted++;
        /* v2.31 · a cash goes everywhere: the VIP lounge, the public channel and its lounge (it's after the fact) */
        for (const [lab, c] of [['vl', p.bc && p.bc.vipLounge], ['pub', p.bc && p.bc.pub], ['pl', p.bc && p.bc.pubLounge]]) { if (!c || p.sent[key + '|' + lab]) continue;
          const r2 = await T('sendMessage', { chat_id: c, text: cashText(p, g), parse_mode: 'HTML', disable_web_page_preview: 'true' }); if (r2) p.sent[key + '|' + lab] = 'W'; } } }
    state.posts[d] = p; }
  return acted; }

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
  if (!dests.length) return 0;
  const send = async text => { let ok = false; for (const c of dests) { const r = await T('sendMessage', { chat_id: c, text, parse_mode: 'HTML', disable_web_page_preview: 'true' }); ok = ok || !!r; } return ok; };
  /* unlocks */
  const open = legs.filter(l => l.unlockAt && now >= l.unlockAt && !p.sent['unlock|' + l.k] && !p.st[l.k]);
  if (open.length) { const day = (p.pub && p.pub.day) || DAYFMT(p.d);
    const txt = [`🔓 <b>UNLOCKED — TheDesk · ${esc(day)}</b>`, ...open.map(l => `${KIND[l.kind] || l.kind}${l.n && l.kind !== 'Prop' ? ' #' + l.n : ''}: <b>${esc(l.label)}</b>${l.game ? ' · ' + (EM[l.sp] || '') + ' ' + esc(l.game) : ''}${l.start ? ' · ' + tStr(l.start) : ''}`),
      '', '<i>Locked this morning, posted 30 minutes before each game. Graded at the final.</i>'].join('\n');
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
  const R = F.record || { w: 0, l: 0, pu: 0, u: 0 };
  T0.picks = (T0.picks || []).map(x => { if (x.hidden) return x; const s = st[key(x)];
    if (x.hit == null && !x.push && s) { if (s === 'P') x.push = true; else { x.hit = s === 'W'; if (x.hit) { R.w++; R.u += units(x.price, 'W'); } else { R.l++; R.u -= 1; } } }
    return x.hit == null && !x.push && x.unlockAt && now < x.unlockAt ? hide(x) : x; });
  T0.props = (T0.props || []).map(x => { if (x.hidden) return x; const s = st['pprop|' + x.sp + '|' + x.player + '|' + x.stat + '|' + x.thr];
    if (x.hit == null && !x.push && s) { if (s === 'P') x.push = true; else x.hit = s === 'W'; } return x.hit == null && !x.push && x.unlockAt && now < x.unlockAt ? hide(x) : x; });
  T0.allStarted = (T0.picks || []).every(x => !x.hidden);
  if (F.parlay && F.parlay.legs) { F.parlay.legs = F.parlay.legs.map(l => { if (l.hidden) return l; const s = st[key(l)]; if (l.hit == null && !l.push && s) { if (s === 'P') l.push = true; else l.hit = s === 'W'; }
      return l.hit == null && !l.push && l.unlockAt && now < l.unlockAt ? hide(l) : l; });
    const live = F.parlay.legs.filter(l => !l.push); F.parlay.result = live.some(l => l.hit === false) ? false : live.length && live.every(l => l.hit === true) ? true : null; }
  F.record = { ...R, u: +(+R.u).toFixed(2) }; F.generated = now; F.by = 'worker'; return F; }
async function sitePut(site, text, deps) { const tok = (site && site.tok) || env.SITE_TOKEN; if (!tok || !site || !site.repo) return { ok: false, reason: 'no site token' };
  const F = deps?.fetch || fetch; const api = `https://api.github.com/repos/${site.repo}/contents/${site.path || 'public/picks.json'}`; const H = { Authorization: 'Bearer ' + tok, Accept: 'application/vnd.github+json', 'User-Agent': 'thedesk-autopilot' };
  let sha = null; try { const g = await F(api, { headers: H }); if (g.status === 200) sha = (await g.json()).sha; } catch (e) { }
  const r = await F(api, { method: 'PUT', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'Public page — worker update', content: Buffer.from(text, 'utf8').toString('base64'), ...(sha ? { sha } : {}) }) });
  return { ok: r.ok, status: r.status }; }
export async function publishPublic(state, deps) { const now = deps?.now || Date.now(); const ds = Object.keys(state.posts || {}).sort(); const d = ds.reverse().find(x => state.posts[x] && state.posts[x].feed && state.posts[x].site);
  if (!d) return 0; const p = state.posts[d]; const V = publicView(p.feed, p.st, now); const sig = JSON.stringify({ ...V, generated: 0 });
  state.pubSig = state.pubSig || {}; if (state.pubSig[d] === sig) return 0; const r = await sitePut(p.site, JSON.stringify(V, null, 1), deps);
  if (r.ok) { state.pubSig[d] = sig; return 1; } log('public page', r.reason || r.status); return 0; }
/* the slate day turns over at 5 AM Central — a game ending after midnight still belongs to its day */
export function chicagoDay(now) { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date((now || Date.now()) - 5 * 36e5)); }
export { decrypt, encrypt, gradePick, gradeProp };
/* ── main ── */
if (import.meta.url === 'file://' + process.argv[1]) {
  const today = chicagoDay(Date.now());
  log(VERSION, '· repo', REPO, '· today', today);
  const cur = await readState(); if (!cur) { log('no card handed over yet'); process.exit(0); }
  log('posts on file:', Object.entries(cur.state.posts || {}).map(([d, p]) => `${d} ${Object.keys(p.st || {}).length}/${(p.legs || []).length} graded${p.recap ? ' · recap done' : ''}`).join(' · '));
  const state = cur.state; let acted = await runOnce(state, today); try { acted += await publishPublic(state); } catch (e) { log('public page', e.message || e); }
  state.lastRun = Date.now(); state.runs = (state.runs || 0) + 1;
  for (let tries = 0; tries < 3; tries++) { const latest = tries ? await readState() : cur; const merged = tries ? mergeState(state, latest.state) : state;
    const st = await writeState(merged, latest.sha); if (st === 200 || st === 201) { log('ok ·', acted, 'update(s) sent'); process.exit(0); } log('write conflict', st, '— merging and retrying'); }
  process.exit(1); }
