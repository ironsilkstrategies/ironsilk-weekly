/* ═══ THE FREE 3 (v3.3.2) ═══════════════════════════════════════════════════════════════════════════════════════════════
   Nov 20, Chris: "I like the way this guy promotes his page I need templates built daily like this" … "we do the free 3 so make
   sure if there 3 that's it's reflected."

   One promo post a day, built from the public card (public/picks.json, the same file the app publishes): the day's free picks —
   all three when there are three, two or one on the days the board only gives that many, never a forced third — each with the
   pick, one stat-backed reason from its lead character's read, the agreement count and its tier, matchup and start time; then the
   last graded card and the running record. The picture is 1080×1350 (the portrait size every feed shows whole), drawn here with
   the same renderer as every other card; the words follow the same skeleton.

   House rules it keeps: no player photos (the leagues and photo agencies own them: each pick gets a team-color tile instead), no
   team logos, no sportsbook or DFS links and no promo codes, no "lock" or "guaranteed", 21+ with 1-800-MY-RESET on every post.
   A pick that hasn't unlocked yet (outside the open beta) is drawn as locked with its unlock time — never shown early.        */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { renderer, txt } from './social.mjs';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const env = process.env;
const log = (...a) => console.log('[autopilot]', ...a);

/* ── the words a pick is told with ────────────────────────────────────────────────────────────────────────────────────── */
const EM = { nfl: '🏈', ncaaf: '🏈', nhl: '🏒', mlb: '⚾', nba: '🏀', ncaab: '🏀' };
const LEAGUE = { nfl: 'NFL', ncaaf: 'CFB', nhl: 'NHL', mlb: 'MLB', nba: 'NBA', ncaab: 'CBB' };
const COLLEGE = new Set(['ncaaf', 'ncaab']);
const VOTERS = 9;   /* the roster that votes on every market (the app's VOTER_ORDER) */
export const sgn = n => n == null || !isFinite(+n) ? '' : (+n > 0 ? '+' : '−') + Math.abs(+n);   /* a real minus sign */
const implied = a => { a = +a; return !isFinite(a) || !a ? null : a < 0 ? -a / (-a + 100) : 100 / (a + 100); };
export const ctTime = t => { try { const d = new Date(t); if (!isFinite(d)) return ''; return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }) + ' CT'; } catch (e) { return ''; } };
const dayLabel = d => { try { return new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }); } catch (e) { return d; } };
const sentences = s => String(s || '').replace(/\s+/g, ' ').split(/(?<=[.!?])\s+(?=[A-Z"“])/).map(x => x.trim()).filter(Boolean);
const FIRST = /\b(I|I'm|I've|I'd|I'll|me|my|mine)\b/;
const RISK = /^(where it goes wrong|the worry|the risk)|can beat this|swing a total|nothing here is a lock|goes wrong/i;
const MATH = /break-even|my number|the book is pricing|translation|the price pays|i say \d/i;
const NOISE = /^(listen|bodies get tired|that's football|look)\b/i;
const BANNED = /\b(lock|locks|guarantee[ds]?|risk-free|can't lose|sure thing)\b/i;
/* a character's own record, out of its first-person line: "I'm 29-22 on NBA underdogs against the spread." /
   "CBB unders is a lane I know: 41-21." → { rec: '29-22', lane: 'NBA dogs ATS' } / { rec: '41-21', lane: 'CBB unders' } */
export function recordOf(text) {
  for (const s of sentences(text)) { let m = s.match(/\bI'?m (\d{1,3}-\d{1,3}) on (.+?)(?: against the spread)?[.!]?$/i);
    if (m) return { rec: m[1], lane: m[2].replace(/\bunderdogs\b/i, 'dogs').trim() + (/against the spread/i.test(s) ? ' ATS' : '') };
    m = s.match(/^(.+?) is a lane I know:? (\d{1,3}-\d{1,3})/i); if (m) return { rec: m[2], lane: m[1].trim() };
    m = s.match(/\bI'?ve gone (\d{1,3}-\d{1,3}) (?:on|in|with) (.+?)[.!]?$/i); if (m) return { rec: m[1], lane: m[2].trim() }; }
  return null; }
/* the line on the picture: the read's best stat-backed sentence about THIS pick (its team, or the total's own words), never the
   risk paragraph or the price math; else the character's take (its first-person rider trimmed), with its record when it has one */
const HUMAN = s => String(s || '').replace(/\bCBB\b/g, 'college hoops').replace(/\bCFB\b/g, 'college football');
export function reasonOf(x, teams) {
  const r = (x.why && x.why.read) || {}; const who = String(r.who || 'TheDesk'); const whoMid = who.replace(/^The /, 'the ');
  const names = [...(teams || []).flatMap(t => t ? [t.name, t.short, t.loc, t.abbr] : []), ...(String(x.pick || '').match(/^[A-Z]{2,5}\b/) || [])].filter(n => n && n.length >= 3).map(n => n.toLowerCase());
  const dir = (String(x.pick || '').match(/^(over|under)\b/i) || [])[1]; const line = (String(x.pick || '').match(/[+-]?\d+(?:\.\d+)?/) || [])[0];
  const totalWords = dir ? new RegExp(`\\b(total|pace|script|possessions|scoring|${dir.toLowerCase()}s?)\\b(?!\\s+(?:his|her|their|its|the last|recent))`, 'i') : null;
  const score = s => { if (RISK.test(s) || MATH.test(s) || NOISE.test(s) || BANNED.test(s) || FIRST.test(s) || s.length > 150) return -99; let v = 0; const L = s.toLowerCase();
    if (/\d/.test(s)) v += 3; if (names.some(n => L.includes(n))) v += 3; if (totalWords && totalWords.test(s)) v += 3;
    if (line && s.includes(String(Math.abs(+line)))) v += 2; if (/\bwe're\b|still testing/i.test(s)) v -= 1; return v; };
  const best = sentences(r.text).map(s => ({ s, v: score(s) })).filter(o => o.v >= 5).sort((a, b) => b.v - a.v)[0];
  if (best) return { text: HUMAN(best.s), usesRec: false };
  const take = sentences(r.take).filter(s => !NOISE.test(s) && !/\briding it\b/i.test(s) && !BANNED.test(s)).join(' ');
  const rec = recordOf(r.text); const lead = take && !FIRST.test(take) ? take : '';
  if (lead && rec) return { text: HUMAN(`${lead.replace(/[.!]$/, '')}, and ${whoMid} is ${rec.rec} on ${rec.lane}.`), usesRec: true };
  if (lead) return { text: HUMAN(lead), usesRec: false };
  if (rec) return { text: HUMAN(`${who} is ${rec.rec} on ${rec.lane}.`), usesRec: true };
  return { text: take ? HUMAN(`“${take}” — ${who}`) : '', usesRec: false }; }

/* ── team names and colors (ESPN's own, fetched once a run; a pick without them still draws in TheDesk's colors) ────────── */
const ESPN = { nba: 'basketball/nba', ncaab: 'basketball/mens-college-basketball', nfl: 'football/nfl', ncaaf: 'football/college-football', nhl: 'hockey/nhl', mlb: 'baseball/mlb' };
const TEAMS = {};
export async function teamsFor(sp, deps) { if (deps?.teams) return deps.teams[sp] || {}; if (TEAMS[sp]) return TEAMS[sp];
  const F = deps?.fetch || fetch; const out = {};
  try { const r = await F(`https://site.api.espn.com/apis/site/v2/sports/${ESPN[sp]}/teams?limit=1000${COLLEGE.has(sp) ? '&groups=' + (sp === 'ncaab' ? 50 : 80) : ''}`, { headers: { 'User-Agent': 'thedesk-autopilot' } });
    if (r.ok) { const j = await r.json(); for (const t of (((j.sports || [])[0] || {}).leagues || [])[0]?.teams || []) { const T = t.team || t; if (!T.abbreviation) continue;
      out[T.abbreviation.toUpperCase()] = { abbr: T.abbreviation.toUpperCase(), name: T.displayName || '', short: T.name || T.shortDisplayName || '', loc: T.location || T.shortDisplayName || '', color: hex(T.color), alt: hex(T.alternateColor) }; } } }
  catch (e) { log('free 3: team colors unavailable —', String(e && e.message || e).slice(0, 60)); }
  return (TEAMS[sp] = out); }
const hex = c => /^[0-9a-f]{6}$/i.test(String(c || '')) ? '#' + c : /^#[0-9a-f]{6}$/i.test(String(c || '')) ? c : null;
const lum = c => { const n = parseInt(String(c || '#000').slice(1), 16); const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const shade = (c, k) => { const n = parseInt(String(c).slice(1), 16); const f = v => Math.max(0, Math.min(255, Math.round(v * k))); return '#' + [f(n >> 16), f((n >> 8) & 255), f(n & 255)].map(v => v.toString(16).padStart(2, '0')).join(''); };
/* a tile color that reads on the dark card: very dark team colors fall to their alternate, near-white ones get darkened */
const tileColor = t => { let c = t?.color || '#C9A227'; if (lum(c) < 0.012 && t?.alt && lum(t.alt) > 0.02) c = t.alt; if (lum(c) > 0.75) c = shade(c, 0.55); return c; };

/* ── the day's free picks, out of the public card ─────────────────────────────────────────────────────────────────────── */
export async function free3Of(F, deps) {
  const T = F && F.today; if (!T || !T.d || !Array.isArray(T.picks) || !T.picks.length) return null; const now = deps?.now || Date.now();
  const board = F.board && F.board.d === T.d ? F.board.games || [] : [];
  const picks = [];
  for (const x of T.picks.slice(0, 3)) {
    if (x.hidden) { picks.push({ hidden: true, sp: x.sp, start: x.start, unlockAt: x.unlockAt }); continue; }
    const [A, H] = String(x.game || '').split('@'); const tm = await teamsFor(x.sp, deps);
    const away = tm[A] || { abbr: A }, home = tm[H] || { abbr: H }; const total = /^(over|under)\b/i.test(x.pick || '');
    const sideAb = (String(x.pick || '').match(/^([A-Z0-9&.]{2,6})\b/) || [])[1]; const side = !total ? (sideAb === H ? home : sideAb === A ? away : null) : null;
    const G = board.find(g => g.sp === x.sp && g.game === x.game); const bp = G ? (G.picks || []).find(p => String(p.pick).toLowerCase() === String(x.pick).toLowerCase()) : null;
    const on = bp && Array.isArray(bp.by) ? bp.by.length : null;
    const rec = recordOf(x.why && x.why.read && x.why.read.text);
    picks.push({ sp: x.sp, game: x.game, away, home, side, total, pick: String(x.pick || ''), price: x.price != null ? +x.price : null, p: x.p != null ? +x.p : null,
      mkt: implied(x.price), tier: String(x.tier || '').toUpperCase(), start: x.start, who: (x.why && x.why.read && x.why.read.who) || '', ...(o => ({ reason: o.text, recInReason: o.usesRec }))(reasonOf(x, total ? [away, home] : [side])), rec, on,
      hit: x.hit == null ? null : x.hit, push: !!x.push, live: x.start && now >= Date.parse(x.start) && x.hit == null && !x.push }); }
  /* the last graded card before today, and the running record */
  const H0 = (F.history || []).filter(h => h.d < T.d && (h.picks || []).some(p => p.hit != null || p.push)).sort((a, b) => a.d < b.d ? 1 : -1)[0];
  const last = H0 ? { d: H0.d, w: H0.picks.filter(p => p.hit === true).length, l: H0.picks.filter(p => p.hit === false && !p.push).length, p: H0.picks.filter(p => p.push).length } : null;
  const R = F.record || {}; const record = isFinite(+R.w) && isFinite(+R.l) ? { w: +R.w, l: +R.l, p: +R.pu || 0, first: R.first || '' } : null;
  return { d: T.d, day: dayLabel(T.d), picks, n: picks.length, open: picks.filter(p => !p.hidden).length, last, record }; }

/* ── the words ────────────────────────────────────────────────────────────────────────────────────────────────────────── */
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const nameOf = (t, sp, total) => { if (!t) return ''; if (total) return COLLEGE.has(sp) ? (t.loc || t.abbr) : (t.short || t.abbr); return t.name || t.loc || t.abbr; };
const pickLine = x => `${x.pick.toUpperCase().replace(/(^|\s)-(?=\d)/g, '$1−')}${x.price != null ? ` (${sgn(x.price)})` : ''}`;
const recLine = (w, l, p) => `${w}–${l}${p ? '–' + p : ''}`;
export function free3Caption(D, deps) {
  const app = ((deps?.app || env.APP_URL || '').trim() || 'https://ironsilkweekly.com/desk/').replace(/\/$/, '');
  const open = D.picks.filter(x => !x.hidden); const ems = [...new Set(open.map(x => EM[x.sp]).filter(Boolean))];
  const head = `${ems.length === 1 ? ems[0] + ' ' : ''}<b>THE FREE 3 · ${esc(D.day)}</b> — ${D.n === 3 ? 'today\'s three free picks' : D.n === 2 ? 'two free picks today' : 'one free pick today'} 🎯`;
  const out = [head];
  if (D.n < 3) out.push(`<i>${D.n === 2 ? 'Only two' : 'Only one'} cleared the bar today. We don't force a third.</i>`);
  for (const x of D.picks) {
    if (x.hidden) { out.push('', `🔒 <b>Free pick</b> — unlocks ${esc(ctTime(x.unlockAt || (Date.parse(x.start || '') - 30 * 60e3)))}, 30 minutes before its game.`); continue; }
    const vs = `${nameOf(x.away, x.sp, true)} @ ${nameOf(x.home, x.sp, true)}`;
    const bits = [x.on ? `${x.on} of our ${VOTERS} characters are on it.` : '', x.p != null ? `Our number: ${Math.round(x.p * 100)}%${x.mkt != null ? `. The price says ${Math.round(x.mkt * 100)}%` : ''}.` : ''].filter(Boolean).join(' ');
    out.push('', `${EM[x.sp] || '•'} <b>${esc(pickLine(x))}</b> (${esc(vs)}, ${esc(ctTime(x.start))}) — ${[x.reason, bits].filter(Boolean).map(esc).join(' ')}`.replace(/ — $/, '')); }
  const tail = [];
  if (D.last) tail.push(`Last card: ${recLine(D.last.w, D.last.l, D.last.p)}, graded.`);
  if (D.record) tail.push(`Record: ${D.record.w} wins, ${D.record.l} losses${D.record.p ? `, ${D.record.p} pushes` : ''}.`);
  if (tail.length) out.push('', tail.join(' '));
  /* v3.3.2 · the Facebook inbox (chat/fb-inbox.mjs) answers a FREE 3 comment with a private reply — promised only once it's on */
  const dm = String(deps?.dm ?? env.FB_DM ?? '').trim().toLowerCase() === 'on';
  out.push('', '👆 FOLLOW TheDesk — the Free 3, every day.', ...(dm ? ['💬 Comment FREE 3 and we\'ll send today\'s picks to your messages.'] : []), `📲 The full card, live scores and every result: ${app}`,
    '', '21+. For entertainment only. Need help? Call or text 1-800-MY-RESET. Receipts tomorrow — win or lose.');
  return out.join('\n'); }

/* ── the picture (1080×1350) ──────────────────────────────────────────────────────────────────────────────────────────── */
const h = (type, style, ...children) => ({ type, props: { style: { display: 'flex', ...style }, children: children.flat().filter(c => c != null && c !== false && c !== '') } });
const C = { bg: '#05070B', ink: '#F3F5F8', soft: '#C9D2DE', mute: '#8D9AAE', gold: '#F2C94C', gold2: '#C9A227', green: '#3DDC84', red: '#FF6B5B', rule: '#1E2733' };
/* a word wrap by measure (average glyph widths per font, kept on the safe side) */
const W = { anton: 0.46, archivo: 0.53, archivoU: 0.66, plex: 0.52 };
export function wrap(s, size, width, k, max) { const per = Math.max(8, Math.floor(width / (size * k))); const words = txt(s).split(' '); const lines = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (t.length <= per) cur = t; else { if (cur) lines.push(cur); cur = w.length > per ? w.slice(0, per - 1) + '…' : w; } }
  if (cur) lines.push(cur); if (lines.length > max) { const keep = lines.slice(0, max); keep[max - 1] = keep[max - 1].replace(/[\s,;:—-]*\S*$/, '').replace(/[.,;:]$/, '') + '…'; return keep; } return lines; }
const fit = (s, width, big, small, k) => { const n = txt(s).length || 1; return Math.max(small, Math.min(big, Math.floor(width / (n * k)))); };
function tile(x, S) {
  const sz = S.tile, R = 30;
  if (x.hidden) return h('div', { width: sz, height: sz, borderRadius: R, border: `3px solid ${C.rule}`, background: '#0D131B', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' },
    h('div', { fontFamily: 'Anton', fontSize: sz * 0.3, color: C.mute }, 'LOCKED'));
  const lab = LEAGUE[x.sp] || '';
  if (x.total) { const ca = tileColor(x.away), ch = tileColor(x.home);
    return h('div', { width: sz, height: sz, borderRadius: R, flexDirection: 'column', overflow: 'hidden', border: `3px solid ${C.gold}` },
      h('div', { height: sz / 2 - 2, paddingTop: Math.round(sz * 0.07), background: `linear-gradient(135deg, ${ca}, ${shade(ca, 0.45)})`, alignItems: 'center', justifyContent: 'center' }, h('div', { fontFamily: 'Anton', fontSize: Math.min(sz * 0.25, fit(x.away.abbr, sz - 40, 120, 34, W.anton)), color: '#fff' }, txt(x.away.abbr))),
      h('div', { height: 4, background: C.gold }),
      h('div', { height: sz / 2 - 2, background: `linear-gradient(135deg, ${ch}, ${shade(ch, 0.45)})`, alignItems: 'center', justifyContent: 'center' }, h('div', { fontFamily: 'Anton', fontSize: Math.min(sz * 0.25, fit(x.home.abbr, sz - 40, 120, 34, W.anton)), color: '#fff' }, txt(x.home.abbr))),
      h('div', { position: 'absolute', left: 14, top: 12, fontFamily: 'Archivo', fontWeight: 900, fontSize: 17, letterSpacing: 2, color: 'rgba(255,255,255,0.85)' }, lab),
      h('div', { position: 'absolute', right: 12, bottom: sz / 2 - 19, background: C.gold, color: C.bg, borderRadius: 10, padding: '4px 10px', fontFamily: 'Archivo', fontWeight: 900, fontSize: 19 }, /^under/i.test(x.pick) ? 'UNDER' : 'OVER')); }
  const t = x.side || { abbr: x.pick.split(' ')[0] }; const c = tileColor(t);
  return h('div', { width: sz, height: sz, borderRadius: R, background: `linear-gradient(140deg, ${c} 0%, ${shade(c, 0.42)} 100%)`, border: `3px solid ${t.alt && lum(t.alt) > 0.02 ? t.alt : C.gold}`, alignItems: 'center', justifyContent: 'center', flexDirection: 'column', position: 'relative', overflow: 'hidden' },
    h('div', { position: 'absolute', right: -sz * 0.25, top: -sz * 0.25, width: sz * 0.9, height: sz * 0.9, borderRadius: sz, border: '14px solid rgba(255,255,255,0.07)' }),
    h('div', { position: 'absolute', left: 14, top: 12, fontFamily: 'Archivo', fontWeight: 900, fontSize: 17, letterSpacing: 2, color: 'rgba(255,255,255,0.85)' }, lab),
    h('div', { fontFamily: 'Anton', fontSize: fit(t.abbr, sz - 34, sz * 0.42, 40, W.anton), color: '#fff', lineHeight: 1 }, txt(t.abbr)),
    h('div', { marginTop: 6, fontFamily: 'Archivo', fontWeight: 900, fontSize: S.tileSub, color: 'rgba(255,255,255,0.92)' }, txt((x.pick.match(/[+−-]\d+(?:\.\d+)?$/) || [x.pick.match(/\bML$/) ? 'TO WIN' : ''])[0].replace('-', '−')))); }
function block(x, i, S, D) {
  if (x.hidden) return h('div', { alignItems: 'center', gap: 34, height: S.blockH },
    h('div', { flexDirection: 'column', flexGrow: 1, flexShrink: 1 },
      h('div', { fontFamily: 'Anton', fontSize: S.name * 0.8, color: C.mute, lineHeight: 1 }, `FREE PICK #${i + 1}`),
      h('div', { marginTop: 12, fontFamily: 'Archivo', fontWeight: 800, fontSize: S.reason, color: C.soft }, txt(`Unlocks ${ctTime(x.unlockAt || (Date.parse(x.start || '') - 30 * 60e3))} — 30 minutes before its game.`))),
    tile(x, S));
  const name = x.total ? `${nameOf(x.away, x.sp, true)} @ ${nameOf(x.home, x.sp, true)}` : nameOf(x.side, x.sp, false) || x.pick.split(' ')[0];
  const textW = 1080 - 120 - S.tile - 34; const nameSize = fit(name.toUpperCase(), textW, S.name, S.name * 0.62, W.anton);
  const reason = wrap(x.reason, S.reason, textW, W.archivo, S.reasonLines);
  const res = x.hit === true ? ['WIN', C.green] : x.hit === false && !x.push ? ['LOSS', C.red] : x.push ? ['PUSH', C.mute] : x.live ? ['LIVE', C.gold] : null;
  const gold = [x.who && x.rec && !x.recInReason ? `${x.who.replace(/^The /, '').toUpperCase()} ${x.rec.rec} ON ${x.rec.lane.toUpperCase()}` : '', x.on ? `${x.on} OF ${VOTERS} ON IT` : '',
    x.p != null ? `OUR NUMBER ${Math.round(x.p * 100)}%` : ''].filter(Boolean);
  let goldTxt = gold.join(' · '); while (goldTxt.length * S.meta * W.archivoU > textW && gold.length > 1) { gold.pop(); goldTxt = gold.join(' · '); }
  const green = [x.tier || '', `${x.away.abbr} @ ${x.home.abbr}`, ctTime(x.start)].filter(Boolean).join(' · ');
  return h('div', { alignItems: 'center', gap: 34, height: S.blockH },
    h('div', { flexDirection: 'column', flexGrow: 1, flexShrink: 1, width: textW },
      h('div', { fontFamily: 'Anton', fontSize: nameSize, color: C.ink, lineHeight: 1, letterSpacing: 0.5 }, txt(name.toUpperCase())),
      h('div', { marginTop: S.gap, alignItems: 'center', gap: 14 },
        h('div', { border: `3px solid ${C.green}`, borderRadius: 14, padding: `${S.pillPad}px 18px`, fontFamily: 'Archivo', fontWeight: 900, fontSize: S.pill, color: C.ink, letterSpacing: 0.5 }, txt(pickLine(x))),
        res ? h('div', { background: res[1], color: C.bg, borderRadius: 12, padding: '6px 14px', fontFamily: 'Archivo', fontWeight: 900, fontSize: S.pill * 0.62, letterSpacing: 2 }, res[0]) : null),
      reason.length ? h('div', { marginTop: S.gap, flexDirection: 'column' }, reason.map(l => h('div', { fontFamily: 'Archivo', fontWeight: 800, fontSize: S.reason, lineHeight: 1.22, color: C.ink }, l))) : null,
      goldTxt ? h('div', { marginTop: S.gap * 0.8, fontFamily: 'Archivo', fontWeight: 800, fontSize: S.meta, color: C.gold, letterSpacing: 0.4 }, txt(goldTxt)) : null,
      h('div', { marginTop: 6, fontFamily: 'Archivo', fontWeight: 800, fontSize: S.meta, color: C.green, letterSpacing: 0.4 }, txt(green))),
    tile(x, S)); }
const SIZES = { 1: { blockH: 560, name: 104, pill: 46, pillPad: 10, reason: 36, reasonLines: 4, meta: 26, tile: 330, tileSub: 34, gap: 18 },
  2: { blockH: 368, name: 86, pill: 38, pillPad: 7, reason: 30, reasonLines: 3, meta: 23, tile: 268, tileSub: 28, gap: 14 },
  3: { blockH: 256, name: 64, pill: 30, pillPad: 5, reason: 25, reasonLines: 2, meta: 20, tile: 214, tileSub: 23, gap: 9 } };
export function free3Tree(D) {
  const S = SIZES[Math.max(1, Math.min(3, D.n))];
  const title = D.n === 1 ? '1 FREE PICK' : `${D.n} FREE PICKS`;
  const sub = D.n === 3 ? 'Graded in public. Receipts tomorrow — win or lose.' : D.n === 2 ? 'Only two cleared the bar today. We don\'t force a third.' : 'Only one cleared the bar today. We don\'t force the rest.';
  const blocks = []; D.picks.forEach((x, i) => { if (i) blocks.push(h('div', { height: 3, marginTop: 4, marginBottom: 4, background: `linear-gradient(90deg, ${C.gold2}, ${C.gold} 40%, rgba(242,201,76,0) 100%)` })); blocks.push(block(x, i, S, D)); });
  const foot = [D.last ? `LAST CARD ${recLine(D.last.w, D.last.l, D.last.p)}` : '', D.record ? `RECORD ${recLine(D.record.w, D.record.l, D.record.p)}` : ''].filter(Boolean).join('  ·  ');
  return h('div', { width: 1080, height: 1350, flexDirection: 'column', background: C.bg, color: C.ink, fontFamily: 'Plex', padding: '50px 60px 0', position: 'relative', overflow: 'hidden' },
    /* the stage: two glows and three light streaks */
    h('div', { position: 'absolute', right: -300, top: -340, width: 900, height: 900, borderRadius: 450, background: 'radial-gradient(circle, rgba(242,201,76,0.24), rgba(242,201,76,0) 64%)' }),
    h('div', { position: 'absolute', left: -380, bottom: -420, width: 1000, height: 1000, borderRadius: 500, background: 'radial-gradient(circle, rgba(61,220,132,0.16), rgba(61,220,132,0) 62%)' }),
    h('div', { position: 'absolute', left: -200, top: 640, width: 1600, height: 6, transform: 'rotate(-14deg)', background: 'linear-gradient(90deg, rgba(61,220,132,0), rgba(61,220,132,0.42) 45%, rgba(61,220,132,0))' }),
    h('div', { position: 'absolute', left: -200, top: 930, width: 1600, height: 3, transform: 'rotate(-14deg)', background: 'linear-gradient(90deg, rgba(242,201,76,0), rgba(242,201,76,0.38) 60%, rgba(242,201,76,0))' }),
    h('div', { position: 'absolute', left: -200, top: 1190, width: 1600, height: 8, transform: 'rotate(-14deg)', background: 'linear-gradient(90deg, rgba(61,220,132,0), rgba(61,220,132,0.24) 30%, rgba(61,220,132,0))' }),
    h('div', { position: 'absolute', left: 0, top: 0, width: 1080, height: 12, background: `linear-gradient(90deg, ${C.gold2}, ${C.gold} 45%, rgba(5,7,11,0) 92%)` }),
    /* header */
    h('div', { alignItems: 'center', justifyContent: 'space-between' },
      h('div', { alignItems: 'center', gap: 16 },
        h('div', { width: 58, height: 58, borderRadius: 15, background: `linear-gradient(135deg, ${C.gold}, ${C.gold2})`, color: C.bg, fontFamily: 'Archivo', fontWeight: 900, fontSize: 26, alignItems: 'center', justifyContent: 'center' }, 'TD'),
        h('div', { fontFamily: 'Archivo', fontWeight: 900, fontSize: 28, letterSpacing: 3 }, 'THEDESK')),
      h('div', { fontFamily: 'Archivo', fontWeight: 900, fontSize: 24, letterSpacing: 4, color: C.gold }, txt(`THE FREE 3 · ${D.day}`).toUpperCase())),
    h('div', { marginTop: 22, fontFamily: 'Anton', fontSize: 118, lineHeight: 1, color: C.ink, letterSpacing: 1 }, title),
    h('div', { marginTop: 10, fontFamily: 'Archivo', fontWeight: 800, fontSize: 27, color: C.soft }, txt(sub)),
    h('div', { marginTop: 26, height: 3, background: `linear-gradient(90deg, ${C.gold2}, ${C.gold} 40%, rgba(242,201,76,0) 100%)` }),
    h('div', { flexDirection: 'column', marginTop: 14, height: 862, justifyContent: 'space-around' }, blocks),
    /* footer */
    h('div', { position: 'absolute', left: 60, right: 60, bottom: 40, flexDirection: 'column', borderTop: `2px solid ${C.rule}`, paddingTop: 18 },
      h('div', { justifyContent: 'space-between', alignItems: 'center' },
        h('div', { fontFamily: 'Archivo', fontWeight: 900, fontSize: 26, color: C.ink, letterSpacing: 1 }, txt(foot || 'GRADED IN PUBLIC')),
        h('div', { fontFamily: 'Archivo', fontWeight: 900, fontSize: 26, color: C.gold }, 'ironsilkweekly.com/desk')),
      h('div', { marginTop: 10, justifyContent: 'space-between', fontSize: 19, color: C.mute },
        h('div', {}, 'Receipts tomorrow — win or lose.'),
        h('div', {}, 'For entertainment only · 21+ · Need help? 1-800-MY-RESET')))); }
let ANTON = null;
export async function renderFree3(D) { const r = await renderer(); if (!r || !D) return null;
  try { if (!ANTON) ANTON = readFileSync(path.join(HERE, 'node_modules', '@fontsource', 'anton', 'files', 'anton-latin-400-normal.woff'));
    const svg = await r.satori(free3Tree(D), { width: 1080, height: 1350, fonts: [...r.fonts, { name: 'Anton', data: ANTON, weight: 400, style: 'normal' }] });
    const img = new r.Resvg(svg, { fitTo: { mode: 'width', value: 1080 } }).render(); const png = Buffer.from(img.asPng());
    const jpg = Buffer.from(r.jpeg.encode({ data: Buffer.from(img.pixels), width: img.width, height: img.height }, 92).data); return { png, jpg }; }
  catch (e) { log('free 3: picture failed —', String(e && e.message || e).slice(0, 90)); return null; } }
