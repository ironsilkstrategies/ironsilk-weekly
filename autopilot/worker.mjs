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
export function mergeState(a, b) { const out = { v: 1, posts: {}, lastRun: Math.max(a?.lastRun || 0, b?.lastRun || 0), runs: Math.max(a?.runs || 0, b?.runs || 0) };
  const ds = new Set([...Object.keys(a?.posts || {}), ...Object.keys(b?.posts || {})]);
  ds.forEach(d => { const x = a?.posts?.[d], y = b?.posts?.[d]; if (!x || !y) { out.posts[d] = x || y; return; }
    const base = (x.postedTs || 0) >= (y.postedTs || 0) ? x : y;
    out.posts[d] = { ...base, st: { ...(y.st || {}), ...(x.st || {}) }, sent: { ...(y.sent || {}), ...(x.sent || {}) }, recap: !!(x.recap || y.recap), worker: x.worker !== false && y.worker !== false }; });
  const keep = Object.keys(out.posts).sort().slice(-5); Object.keys(out.posts).forEach(d => { if (!keep.includes(d)) delete out.posts[d]; });
  return out; }

/* ── ESPN ── */
const PATH = { nfl: 'football/nfl', ncaaf: 'football/college-football', nhl: 'hockey/nhl', mlb: 'baseball/mlb', nba: 'basketball/nba' };
const ALIAS = { mlb: { CHW: 'CWS', ARI: 'AZ', OAK: 'ATH', WAS: 'WSH' }, nfl: { WAS: 'WSH', JAC: 'JAX', LA: 'LAR', LVR: 'LV', OAK: 'LV', ARZ: 'ARI' }, ncaaf: {},
  nhl: { LAK: 'LA', NJD: 'NJ', SJS: 'SJ', TBL: 'TB', VEG: 'VGK', LV: 'VGK', MON: 'MTL', UTA: 'UTAH', WAS: 'WSH' }, nba: { GSW: 'GS', NYK: 'NY', NOP: 'NO', SAS: 'SA', UTA: 'UTAH', WAS: 'WSH', BRK: 'BKN', PHO: 'PHX', CHO: 'CHA' } };
const ab = (sp, x) => { x = String(x || '').toUpperCase(); return (ALIAS[sp] || {})[x] || x; };
const ymd = d => d.replace(/-/g, '');
const shift = (d, n) => new Date(Date.parse(d + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10);
const SB = {};
async function scoreboard(sp, d) { const k = sp + d; if (SB[k]) return SB[k];
  const url = `https://site.api.espn.com/apis/site/v2/sports/${PATH[sp]}/scoreboard?dates=${ymd(d)}` + (sp === 'ncaaf' ? '&groups=80&limit=300' : '&limit=300');
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
      const r = await T('sendMessage', msg); if (r) { fresh.forEach(l => { p.sent[l.k] = p.st[l.k]; }); acted++; } }
    const legs = p.legs || []; const allDone = legs.every(l => p.st[l.k]); const games = legs.filter(l => !l.player);
    const ready = legs.length && (allDone || (p.d < today && games.every(l => p.st[l.k])) || p.d < shift(today, -1));
    if (ready) { const r = await T('sendMessage', { chat_id: p.chat, text: recapText(p, p.st), parse_mode: 'HTML', disable_web_page_preview: 'true' }); if (r) { p.recap = true; acted++; } }
    state.posts[d] = p; }
  return acted; }

export { decrypt, encrypt, gradePick, gradeProp };
/* ── main ── */
if (import.meta.url === 'file://' + process.argv[1]) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const cur = await readState(); if (!cur) { log('no card handed over yet'); process.exit(0); }
  const state = cur.state; const acted = await runOnce(state, today); state.lastRun = Date.now(); state.runs = (state.runs || 0) + 1;
  for (let tries = 0; tries < 3; tries++) { const latest = tries ? await readState() : cur; const merged = tries ? mergeState(state, latest.state) : state;
    const st = await writeState(merged, latest.sha); if (st === 200 || st === 201) { log('ok ·', acted, 'update(s) sent'); process.exit(0); } log('write conflict', st, '— merging and retrying'); }
  process.exit(1); }
