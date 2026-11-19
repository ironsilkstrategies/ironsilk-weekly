/* ═══ THE GROWTH DESK (v3.3, Nov 19) ══════════════════════════════════════════════════════════════════════════════
   Nov 19, 11:07 AM, on the growth playbook: "Let's execute it all." The machine side of the playbook, as pure functions
   (the worker and the video workflow do the sending):
     ⚔️ The Desk Debate   the day's headline game where the cast splits: a card, a poll, a ready-to-post X caption for the
                          owner, and a settle post after the final
     🧾 Receipts Sunday   the week's graded free card, losses included, every Sunday morning
     🔗 Recruiting        personal invite links (/mylink) and one named link per platform (/sourcelinks), each join counted
                          once, for the link it came through
     📄 Tonight's Game    static pages for search (gamePages): one per game plus the day's page and a sitemap
     🎬 The daily video   the frames the video workflow draws (videoSpec), worded so TikTok reads it as sports talk
   Only what's already public. The board (every character's call) rides in the public picks.json only during the open beta,
   so the debate and the cast's split exist only then; a game page shows a locked pick only once the public card shows it. */
import { SP_EM, SP_LAB, names as teamNames } from './megaphone.mjs';

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const attr = s => esc(s).replace(/"/g, '&quot;');
const fin = x => typeof x === 'number' && Number.isFinite(x);
export const tCT = ts => new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', hour: 'numeric', minute: '2-digit' }).format(new Date(ts)) + ' CT';
export const ctHour = ts => +new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', hour: 'numeric', hourCycle: 'h23' }).format(new Date(ts)) % 24;
export const dayLab = d => new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
export const md = d => new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
export const shift = (d, n) => new Date(Date.parse(d + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10);
const dec = pr => !fin(+pr) || +pr === 0 || pr === null || pr === '' ? null : +pr > 0 ? 1 + +pr / 100 : 1 + 100 / Math.abs(+pr);
const am = pr => pr === null || pr === '' || !fin(+pr) ? '' : (+pr > 0 ? '+' : '') + Math.round(+pr);
const appOf = ctx => String((ctx && ctx.app) || 'https://ironsilkweekly.com/desk/').replace(/\/?$/, '/');
const host = u => String(u).replace(/^https?:\/\//, '').replace(/\/$/, '');

/* ══ ⚔️ THE DESK DEBATE ═══════════════════════════════════════════════════════════════════════════════════════════
   Every market of every game on the board where the cast lands on both sides. The headline: the sport people care about
   most (the Megaphone's weights), the closest split, the most voices, a game that starts 90 minutes to 14 hours out. Each
   side is argued by its best-ranked caller in that kind of bet (the board's own ranks), else its most confident one. */
export const WEIGHT = { nfl: 100, nba: 60, ncaaf: 55, nhl: 40, mlb: 35, ncaab: 20 };
export const MKT = { ml: 'who wins', spread: 'the spread', total: 'the total' };
const rk = c => c && c.r && fin(c.r.rk) ? c.r.rk : 99;
export function debates(board, now, opt = {}) { const lead = opt.lead ?? 90, within = opt.within ?? 14, out = [];
  for (const g of (board && board.games) || []) { const t = Date.parse(g.start || ''); if (!fin(t) || t < now + lead * 60e3 || t > now + within * 36e5) continue; if (g.st && g.st !== 'pre') continue;
    const [a, h] = String(g.game || '').split('@'); if (!a || !h || !g.sp) continue;
    for (const [m, calls] of Object.entries(g.calls || {})) { if (!MKT[m]) continue; const by = {};
      for (const c of calls || []) if (c && c.v && c.s && c.pick) (by[c.s] = by[c.s] || []).push(c);
      const sides = Object.values(by).sort((x, y) => y.length - x.length || String(x[0].pick).localeCompare(String(y[0].pick))); if (sides.length < 2) continue;
      const [A, B] = sides, n = A.length + B.length; if (n < 3) continue;
      const top = arr => arr.slice().sort((x, y) => rk(x) - rk(y) || (+y.p || 0) - (+x.p || 0) || String(x.v).localeCompare(String(y.v)))[0];
      const score = (WEIGHT[g.sp] || 15) * (0.5 + B.length / A.length) * Math.log2(1 + n) * (m === 'total' ? 0.85 : 1);
      out.push({ k: g.sp + '|' + g.game + '|' + m, sp: g.sp, game: g.game, a, h, start: t, m, A, B, la: top(A), lb: top(B), n, score }); } }
  return out.sort((x, y) => y.score - x.score || x.start - y.start || x.k.localeCompare(y.k)); }
const who = (c, cast) => (cast && cast[c.v] && cast[c.v].name) || String(c.v);
export const rankLine = c => { const r = c && c.r; if (!r || !r.lab) return ''; return (fin(r.rk) ? `#${r.rk} of ${r.of || '?'} on ${r.lab}` : r.lab) + (fin(r.w) && fin(r.l) ? ` (${r.w}-${r.l})` : ''); };
const namesOf = (D, coach) => teamNames({ k: D.sp + '|' + D.game, sp: D.sp, a: D.a, h: D.h }, coach);
/* the X caption has 280 characters and the link must survive: the first version that fits wins, fullest first */
export function fitX(versions, link) { for (const L of versions) { const t = [...L, link].join('\n'); if (t.length <= 280) return t; }
  const L = versions[versions.length - 1]; return [...L.map(s => s.slice(0, Math.floor((278 - link.length) / L.length) - 1)), link].join('\n'); }
export function debatePost(D, ctx = {}) { const cast = ctx.cast || {}, N = namesOf(D, ctx.coach); const matchup = `${N.A.nick} at ${N.H.nick}`, fullM = `${N.A.full} at ${N.H.full}`;
  const wa = who(D.la, cast), wb = who(D.lb, cast), t = tCT(D.start), split = `${D.A.length}-${D.B.length}`;
  const text = ['⚔️ <b>THE DESK DEBATE</b>', `<b>${esc(fullM)}</b> · ${SP_EM[D.sp] || ''} ${esc(SP_LAB[D.sp] || D.sp.toUpperCase())} · ${t}`, '',
    `<b>${esc(wa)}</b> takes <b>${esc(D.la.pick)}</b>${rankLine(D.la) ? ' · ' + esc(rankLine(D.la)) : ''}`,
    `<b>${esc(wb)}</b> takes <b>${esc(D.lb.pick)}</b>${rankLine(D.lb) ? ' · ' + esc(rankLine(D.lb)) : ''}`,
    `The cast splits <b>${split}</b> on ${MKT[D.m]}${D.A.length > D.B.length ? `, most of them with ${esc(D.la.pick)}` : ''}.`, '',
    'Who\'s right? Vote or comment below 👇 The scoreboard settles it tonight.'].join('\n');
  const card = { kicker: 'The Desk Debate' + (ctx.day ? ' · ' + ctx.day : ''), title: matchup, wrap: true, sub: `${SP_LAB[D.sp] || D.sp} · ${t} · ${MKT[D.m]}`, big: { value: split, label: 'the cast splits' },
    rows: [{ label: `${wa}: ${D.la.pick}`, meta: rankLine(D.la) || `with ${D.A.length - 1} more of the cast` }, { label: `${wb}: ${D.lb.pick}`, meta: rankLine(D.lb) || `with ${D.B.length - 1} more of the cast` }],
    foot: 'Every call graded in public · ' + host(appOf(ctx)) };
  const poll = { question: `${matchup} (${t}): who's right?`.slice(0, 290), options: [`${wa}: ${D.la.pick}`.slice(0, 95), `${wb}: ${D.lb.pick}`.slice(0, 95)] };
  const sa = `${wa}: ${D.la.pick}`, sb = `${wb}: ${D.lb.pick}`, sl = `Our cast splits ${split}. Who's right?`, h1 = `⚔️ THE DESK DEBATE: ${fullM}, ${t}`, h2 = `⚔️ THE DESK DEBATE: ${matchup}, ${t}`;
  const x = fitX([[h1, sa, sb, sl, 'Every call graded in public 👇'], [h1, sa, sb, sl], [h2, sa, sb, sl], [h2, sa, sb]], appOf(ctx) + '?src=x');
  return { kind: 'debate', key: 'deb|' + D.k, text, card, poll, x, matchup, fullM, wa, wb }; }
/* the settle post: each side graded on its own (two totals or two spreads can both win, or both lose) */
export function settlePost(S, ra, rb, ctx = {}) { const sides = [{ w: S.wa, p: S.pa, r: ra }, { w: S.wb, p: S.pb, r: rb }]; const won = sides.filter(s => s.r === 'W');
  const head = won.length === 2 ? 'Both called it' : won.length === 1 ? `${won[0].w} called it` : sides.every(s => s.r === 'P') ? 'A push' : sides.some(s => s.r === 'P') ? `${(sides.find(s => s.r !== 'P') || {}).w} missed` : 'Both missed';
  const mark = { W: '✅', L: '❌', P: '➖' };
  const text = [`⚔️ <b>DEBATE SETTLED — ${esc(S.fullM || S.matchup)}</b>`, ctx.fin ? `Final: ${esc(ctx.fin)}` : '', ...sides.map(s => `${mark[s.r] || ''} <b>${esc(s.w)}</b>: ${esc(s.p)}`), '', `<b>${esc(head)}.</b> Every call stays on the board, graded in public. Tomorrow's debate drops in the morning.`]
    .filter((x, i, a) => x !== '' || a[i - 1] !== '').join('\n');
  const card = { kicker: 'Debate settled' + (S.d ? ' · ' + dayLab(S.d) : ''), title: head, wrap: true, sub: ctx.fin ? 'Final: ' + ctx.fin : S.matchup, rows: sides.map(s => ({ label: `${s.w}: ${s.p}`, meta: s.r === 'W' ? 'called it' : s.r === 'P' ? 'a push' : 'missed', res: s.r })) };
  return { kind: 'debate', key: 'debs|' + S.k, text, card }; }

/* ══ 🧾 RECEIPTS SUNDAY ══════════════════════════════════════════════════════════════════════════════════════════
   Sundays: the seven slate days that ended Saturday, from the public record (the same history the app's Receipts tab
   shows). One unit a pick at the posted price; the best call is the longest-priced winner, the worst the shortest-priced
   loser; the season line is the record the public page already shows. Under two graded picks: no post. */
export function weeklyPost(F, today, ctx = {}) { if (new Date(today + 'T12:00:00Z').getUTCDay() !== 0) return null;
  const end = shift(today, -1), start = shift(today, -7), picks = [];
  for (const h of (F && F.history) || []) { if (!h || !h.d || h.d < start || h.d > end) continue; for (const x of h.picks || []) if (x && (x.hit === true || x.hit === false || x.push)) picks.push({ ...x, d: h.d }); }
  if (picks.length < 2) return null; let w = 0, l = 0, pu = 0, u = 0;
  for (const x of picks) { if (x.push) { pu++; continue; } const D = dec(x.price); if (x.hit) { w++; u += D ? D - 1 : 100 / 110; } else { l++; u -= 1; } }
  const W = picks.filter(x => x.hit === true && !x.push), L = picks.filter(x => x.hit === false && !x.push);
  const best = W.slice().sort((a, b) => (dec(b.price) || 0) - (dec(a.price) || 0) || a.d.localeCompare(b.d))[0] || null;
  const worst = L.slice().sort((a, b) => (dec(a.price) || 9) - (dec(b.price) || 9) || a.d.localeCompare(b.d))[0] || null;
  const R = F.record, range = `${md(start)}–${md(end)}`, rec = `${w}-${l}${pu ? '-' + pu : ''}`, us = (u >= 0 ? '+' : '') + u.toFixed(2) + 'u';
  const line = x => `${x.pick}${am(x.price) ? ' (' + am(x.price) + ')' : ''}${x.game ? ' · ' + String(x.game).replace('@', ' at ') : ''}`;
  const season = R && fin(R.w) && fin(R.l) ? `${R.w}-${R.l}${R.pu ? '-' + R.pu : ''}` : '';
  const text = [`🧾 <b>RECEIPTS SUNDAY — the week of ${range}</b>`, `<b>${rec}</b> on the free card · <b>${us}</b> at the prices we posted`,
    best ? `✅ Best call: <b>${esc(line(best))}</b>` : '', worst ? `❌ Worst call: <b>${esc(line(worst))}</b>` : '', season ? `Season: <b>${season}</b>${R.first ? ' since ' + md(R.first) : ''}` : '', '',
    `Every pick locked before its game. Every grade public, losses included. → ${appOf(ctx)}`].filter((x, i, a) => x !== '' || a[i - 1] !== '').join('\n');
  const card = { kicker: 'Receipts Sunday · ' + range, title: `The week: ${rec}`, big: { value: (u >= 0 ? '+' : '') + u.toFixed(1) + 'u', label: '1 unit a pick, posted prices' },
    rows: [best && { label: 'Best: ' + best.pick, meta: [best.game, am(best.price), md(best.d)].filter(Boolean).join(' · '), res: 'W' },
      worst && { label: 'Worst: ' + worst.pick, meta: [worst.game, am(worst.price), md(worst.d)].filter(Boolean).join(' · '), res: 'L' },
      season ? { label: 'Season: ' + season, meta: (R.first ? 'since ' + md(R.first) + ' · ' : '') + 'every pick public' } : null].filter(Boolean) };
  return { kind: 'weekly', key: 'wk|' + today, text, card, w, l, pu, u }; }

/* ══ 🔗 RECRUITING ═══════════════════════════════════════════════════════════════════════════════════════════════
   Links are named "ref <telegram id>" (a member's own) or "src <tag>" (a platform's). A join counts once per person per
   kind, never for the person who owns the link, and only when Telegram says it came through that link. */
export const SRC_TAGS = [['x', 'X'], ['ig', 'Instagram'], ['fb', 'Facebook'], ['th', 'Threads'], ['tt', 'TikTok'], ['yt', 'YouTube'], ['rd', 'Reddit']];
export const weekOf = d => shift(d, -new Date(d + 'T12:00:00Z').getUTCDay());   /* the Sunday that starts d's week */
export const refsOf = state => { const R = state.refs || (state.refs = {}); for (const k of ['links', 'by', 'seen', 'src', 'srcLinks']) R[k] = R[k] || {}; return R; };
export function countJoin(state, linkName, uid, now, today) { const R = refsOf(state); uid = String(uid); let m;
  if ((m = /^ref (\d{3,20})$/.exec(String(linkName || '')))) { const ref = m[1]; if (ref === uid || R.seen[uid]) return false;
    R.seen[uid] = { r: ref, ts: now }; const B = R.by[ref] || { n: 0 }, wk = weekOf(today), W = { ...(B.wk || {}) }; W[wk] = (W[wk] || 0) + 1;
    for (const k of Object.keys(W).sort().slice(0, -8)) delete W[k]; R.by[ref] = { ...B, n: (B.n || 0) + 1, wk: W, ts: now }; trim(R.seen, 5000); return 'ref'; }
  if ((m = /^src ([a-z]{1,8})$/.exec(String(linkName || '')))) { if (R.seen['s' + uid]) return false; R.seen['s' + uid] = { r: 'src ' + m[1], ts: now };
    const S0 = R.src[m[1]] || { n: 0 }, wk = weekOf(today), W = { ...(S0.wk || {}) }; W[wk] = (W[wk] || 0) + 1; for (const k of Object.keys(W).sort().slice(0, -8)) delete W[k];
    R.src[m[1]] = { n: (S0.n || 0) + 1, wk: W, ts: now }; trim(R.seen, 5000); return 'src'; }
  return false; }
const tsOf = v => (v && typeof v === 'object' ? v.ts || 0 : +v || 0);
function trim(o, n) { const ks = Object.keys(o); if (ks.length <= n) return; ks.sort((a, b) => tsOf(o[a]) - tsOf(o[b])).slice(0, ks.length - n).forEach(k => delete o[k]); }
/* two copies of the worker's state: per key the newer record wins; the shout-out remembers the latest week */
export function mergeRefs(x, y) { if (!x || !y) return x || y; const newer = (A, B) => { const o = { ...(B || {}) }; for (const k in (A || {})) { const a = A[k], b = o[k]; o[k] = b == null || tsOf(a) >= tsOf(b) ? a : b; } return o; };
  const out = { links: newer(x.links, y.links), by: newer(x.by, y.by), seen: newer(x.seen, y.seen), src: newer(x.src, y.src), srcLinks: newer(x.srcLinks, y.srcLinks) };
  const sh = [x.shout, y.shout].filter(Boolean).sort().pop(); if (sh) out.shout = sh; return out; }
export function recruitersOf(R, wk) { return Object.entries((R && R.by) || {}).map(([id, b]) => ({ id, nm: b.nm || 'A member', n: wk ? (b.wk || {})[wk] || 0 : b.n || 0 })).filter(r => r.n > 0)
  .sort((a, b) => b.n - a.n || a.nm.localeCompare(b.nm)); }
export function shoutText(R, wk) { const L = recruitersOf(R, wk).slice(0, 5); if (!L.length) return null; const medal = ['🥇', '🥈', '🥉', '4.', '5.'];
  return [`🏆 <b>Recruiters of the week (${md(wk)}–${md(shift(wk, 6))})</b>`, ...L.map((r, i) => `${medal[i]} <b>${esc(r.nm)}</b> · ${r.n} joined`), '', 'Want your own link? DM the bot /mylink. Everyone who joins through it counts for you.'].join('\n'); }
export function joinsText(R, wk) { const src = SRC_TAGS.map(([t, lab]) => { const s = (R.src || {})[t]; return s && s.n ? `${lab} ${s.n}${(s.wk || {})[wk] ? ` (${s.wk[wk]} this week)` : ''}` : null; }).filter(Boolean);
  const all = recruitersOf(R).slice(0, 10), week = recruitersOf(R, wk).slice(0, 5);
  return ['📈 <b>Joins by link</b>', src.length ? 'By platform: ' + src.join(' · ') : 'By platform: none yet. /sourcelinks makes the links.', '',
    '<b>Top recruiters, all time</b>', ...(all.length ? all.map((r, i) => `${i + 1}. ${esc(r.nm)} · ${r.n}`) : ['None yet. Members get their link with /mylink.']), '',
    '<b>This week</b>', ...(week.length ? week.map((r, i) => `${i + 1}. ${esc(r.nm)} · ${r.n}`) : ['Nobody yet.'])].join('\n'); }

/* ══ 🎬 THE DAILY VIDEO ═════════════════════════════════════════════════════════════════════════════════════════
   The words for a 15–20 second vertical video, said the way TikTok reads as sports talk: no odds, no lines, no "bet", no
   units. The debate when the board has one today (the open beta); otherwise yesterday's receipts from the public record. */
const UNIT = { nhl: 'goals', mlb: 'runs' };
export function plainSide(pick, sp, N) { const p = String(pick || '').trim(); let m;
  const team = ab => { const s = N && (ab === N.A.ab ? N.A : ab === N.H.ab ? N.H : null); return s ? s.full : ab; };
  if ((m = p.match(/^(Over|Under)\s+([\d.]+)$/i))) { const L = +m[2], u = UNIT[sp] || 'points'; return /over/i.test(m[1]) ? `${Math.floor(L) + 1}+ ${u}` : `${Math.ceil(L) - 1} or fewer ${u}`; }
  if ((m = p.match(/^(\S+)\s+ML$/i))) return `${team(m[1])} to win`;
  if ((m = p.match(/^(\S+)\s+([+-])(\d+(?:\.\d+)?)$/))) { const x = +m[3]; return m[2] === '-' ? `${team(m[1])} by ${Math.floor(x) + 1}+` : x < 1 ? `${team(m[1])} to win` : `${team(m[1])} within ${Math.floor(x)}`; }
  return p; }
const TAG = { nfl: '#NFL', nba: '#NBA', ncaaf: '#CollegeFootball', ncaab: '#CollegeBasketball', nhl: '#NHL', mlb: '#MLB' };
export function videoSpec(F, now, today, ctx = {}) {
  const B = F && F.beta === true && F.board && F.board.d === today ? F.board : null, D = B ? debates(B, now, { lead: 30 })[0] : null;
  if (D) { const N = namesOf(D, ctx.coach), nm = { A: { ...N.A, ab: D.a }, H: { ...N.H, ab: D.h } }, cast = B.cast || {};
    const sa = plainSide(D.la.pick, D.sp, nm), sb = plainSide(D.lb.pick, D.sp, nm), wa = who(D.la, cast), wb = who(D.lb, cast);
    const lane = c => c && c.r && fin(c.r.rk) ? `#${c.r.rk} of ${c.r.of || '?'} at this kind of call` : '';
    const frames = [{ k: 'hook', kicker: 'The Desk Debate', big: 'Our cast can\'t agree.', sub: `${N.A.full} at ${N.H.full} · ${tCT(D.start)}` },
      { k: 'side', kicker: 'One side', big: wa, mid: 'is with', gold: sa, small: lane(D.la) },
      { k: 'side', kicker: 'The other side', big: wb, mid: 'is with', gold: sb, small: lane(D.lb) },
      { k: 'count', kicker: 'The whole cast', gold: `${D.A.length} of ${D.n}`, sub: `are with ${sa}` },
      { k: 'cta', kicker: 'Who you got?', big: 'Every call graded in public.', sub: host(appOf(ctx)) }];
    return { kind: 'debate', key: D.k, frames, title: `${N.A.nick} at ${N.H.nick}`,
      caption: `Our cast split on ${N.A.nick} at ${N.H.nick} tonight. ${wa}: ${sa}. ${wb}: ${sb}. Who you got? 👇\nEvery call graded in public. Link in bio.\n${TAG[D.sp] || '#sports'} #sports #predictions` }; }
  const y = shift(today, -1), h = ((F && F.history) || []).find(x => x && x.d === y), graded = ((h && h.picks) || []).filter(x => x && (x.hit === true || x.hit === false || x.push));
  if (graded.length < 2) return null;
  const w = graded.filter(x => x.hit === true && !x.push).length, l = graded.filter(x => x.hit === false && !x.push).length;
  const rowOf = x => { const [a, hh] = String(x.game || '').split('@'); const N = teamNames({ k: x.sp + '|' + x.game, sp: x.sp, a, h: hh }, ctx.coach), nm = { A: { ...N.A, ab: a }, H: { ...N.H, ab: hh } };
    return { label: plainSide(x.pick, x.sp, nm), meta: a && hh ? `${N.A.nick} at ${N.H.nick}` : '', res: x.push ? 'P' : x.hit ? 'W' : 'L' }; };
  const frames = [{ k: 'hook', kicker: 'Receipts', big: 'Yesterday\'s calls.', sub: `${dayLab(y)} · wins and losses` },
    { k: 'list', kicker: 'Graded at the final', rows: graded.slice(0, 5).map(rowOf), more: Math.max(0, graded.length - 5) },
    { k: 'count', kicker: 'Yesterday', gold: `${w}-${l}`, sub: 'every call posted before its game' },
    { k: 'cta', kicker: 'No deleted slips', big: 'Every call graded in public.', sub: host(appOf(ctx)) }];
  return { kind: 'receipts', key: 'rec|' + y, frames, title: `Yesterday: ${w}-${l}`,
    caption: `Yesterday: ${w}-${l}. Every call posted before its game and graded at the final, wins and losses. 🧾\nLink in bio.\n#sports #predictions` }; }
