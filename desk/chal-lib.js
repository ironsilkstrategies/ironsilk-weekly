/* TheDesk · the challenge library (v3.1.0, Chris, Nov 15: "1000 different ones, different reasoning, a roadmap to show the path and
   how to achieve it, the levels of difficulty, the 3/7/14/30 day challenges, the XP"). One file, shared word for word by the
   server (chat/) and the public app (desk/): the server enforces it, the app draws it. Pure functions, no imports, deterministic —
   the same id always means the same challenge. Built on the machine's mission system: its routes, leg rules, checkpoints, five
   difficulty tiers and ranks, recast for Desk Dollars (play money; prizes are D$, never cash). */
export const LIB_V = 1;
export const DURS = [3, 7, 14, 30];
const MULTS = { 3: [1.1, 1.25, 1.5, 2, 3, 5], 7: [1.2, 1.5, 2, 3, 5, 10], 14: [1.3, 2, 3, 5, 10, 20], 30: [1.5, 3, 5, 10, 25, 50] };
const STARTS = [50, 100, 250];
export const SPORTS = { any: 'Any sport', nfl: 'NFL', ncaaf: 'College football', nba: 'NBA', ncaab: 'College hoops', nhl: 'NHL', mlb: 'MLB' };
/* leg rules — checked by the server on every bet from a run */
export const RULES = {
  any: { lab: 'Open book', icon: '📖', desc: 'any line on the Slate', why: 'No handcuffs: the whole board is yours, so the plan does the work.', f: 1, ok: () => true },
  singles: { lab: 'Singles only', icon: '1️⃣', desc: 'every bet is one leg', why: 'Singles are the slowest climb and the hardest to bust. Patience is the edge.', f: 1.15, ok: L => L.length === 1 },
  two: { lab: 'Two-teamers', icon: '✌️', desc: 'every ticket has exactly 2 legs', why: 'A two-teamer pays about 2.6×: enough to move the roll, short enough to hit.', f: 1.05, ok: L => L.length === 2 },
  three: { lab: 'Three-piece', icon: '🧩', desc: 'every ticket has 3+ legs', why: 'Three legs or more, about 6× a hit. Fewer wins, bigger jumps.', f: 1.2, ok: L => L.length >= 3 },
  chalk: { lab: 'Chalk walk', icon: '🧱', desc: 'every leg a favorite, −130 or shorter', why: 'Favorites win more and pay less. It\'s a volume game: stack small wins.', f: 1.1, ok: L => L.every(l => l.price <= -130), dec: 1.6, fair: 0.63 },
  dogs: { lab: 'Dog pound', icon: '🐕', desc: 'every leg pays plus money', why: 'Underdogs lose more often and pay more when they hit. One good day carries the run.', f: 1.3, ok: L => L.every(l => l.price > 0), dec: 2.4, fair: 0.42 },
  overs: { lab: 'Over party', icon: '🔥', desc: 'totals only, overs', why: 'Root for points. Overs only, so you live and die with the pace of every game.', f: 1.15, ok: L => L.every(l => l.mk === 'total' && l.side === 'over') },
  unders: { lab: 'Under club', icon: '🧊', desc: 'totals only, unders', why: 'Defense and clock. Unders only: the quiet way to grind a roll.', f: 1.15, ok: L => L.every(l => l.mk === 'total' && l.side === 'under') },
  ml: { lab: 'Straight up', icon: '🥊', desc: 'moneylines only', why: 'Pick winners, nothing else. No spreads to sweat and no totals.', f: 1.05, ok: L => L.every(l => l.mk === 'ml') },
  spreads: { lab: 'Cover crew', icon: '📏', desc: 'spreads only', why: 'It\'s about the number, not just the winner. Spreads only, all priced at −110.', f: 1.1, ok: L => L.every(l => l.mk === 'spread') },
  totals: { lab: 'Total recall', icon: '🔢', desc: 'totals only', why: 'Overs or unders, your call. You only need to read the scoreboard, not the winner.', f: 1.05, ok: L => L.every(l => l.mk === 'total') },
  world: { lab: 'World tour', icon: '🌐', desc: 'every ticket spans 2+ sports', why: 'Every ticket crosses sports, so one bad league can\'t sink a whole ticket.', f: 1.2, ok: L => new Set(L.map(l => l.sp)).size >= 2 } };
/* staking routes (the machine's) — how much of the roll goes in each day, and on how many legs */
export const ROUTES = {
  compound: { name: 'Compound', icon: '📈', desc: 'A small slice of the balance every day on short prices. Slow, steady, interest-style growth.', k: 1, f: 0.1 },
  stairs: { name: 'Stair-step', icon: '🪜', desc: 'A fixed slice of the balance each day; the rest waits. Survives bad days.', k: 1, f: 0.25 },
  housemoney: { name: 'House money', icon: '🏠', desc: 'A small fixed stake until you\'re up, then stakes grow only from profit. Your start stops being at risk after the first cash.', k: 2, f: 0.5, unit: 0.05 },
  heist: { name: 'Heist', icon: '🏦', desc: 'Roll it all, but bank 25% of every win\'s profit. A busted run keeps what\'s banked.', k: 2, f: 1, safe: 0.25 },
  elevator: { name: 'Elevator', icon: '🛗', desc: 'Ride all-in and bank half the balance every time you pass a checkpoint.', k: 2, f: 1 },
  snowball: { name: 'Snowball', icon: '🎲', desc: 'Roll everything, every step. The fewest steps, and one miss ends it.', k: 2, f: 1 },
  twolane: { name: 'Two-lane', icon: '⚖️', desc: '20% of the balance a day: 60% on a 2-leg anchor, 40% on a 4-leg moonshot.', k: 2, f: 0.2 },
  drip: { name: 'Drip', icon: '🎟', desc: 'The same tiny stake every day on a long parlay. Tiny risk, lottery upside.', k: 4, f: 0.04 } };
export const CHECKPOINTS = ['The Corner', 'Chop Shop', 'Back Room', 'Casino Floor', 'Penthouse', 'The Vault'];
/* five tiers (the machine's), the XP they pay, and the D$ prize for finishing */
export const TIERS = [
  { id: 'cakewalk', name: 'Cakewalk', color: '#7ee8a6', xp: 50, prize: 25, max: 0.12 },
  { id: 'easy', name: 'Easy', color: '#2ecc71', xp: 100, prize: 60, max: 0.24 },
  { id: 'normal', name: 'Normal', color: '#5FD3E8', xp: 250, prize: 150, max: 0.42 },
  { id: 'hard', name: 'Hard', color: '#f5a524', xp: 700, prize: 500, max: 0.8 },
  { id: 'legendary', name: 'Legendary', color: '#f0563c', xp: 1500, prize: 2000, max: 99 }];
export const RANKS = [[0, 'Rookie'], [200, 'Runner'], [500, 'Hustler'], [1000, 'Sharp'], [2500, 'Syndicate'], [5000, 'Kingpin'], [10000, 'Legend'], [25000, 'Hall of Famer']];
export const rankOf = xp => { let i = 0; RANKS.forEach((r, j) => { if (xp >= r[0]) i = j; }); const nx = RANKS[i + 1]; return { name: RANKS[i][1], i, at: RANKS[i][0], next: nx ? nx[0] : null, nextName: nx ? nx[1] : null, pct: nx ? (xp - RANKS[i][0]) / (nx[0] - RANKS[i][0]) : 1 }; };
/* names: the rule sets the flavor, the size of the climb sets the noun, the sport tags it */
const NOUN = [['Warm-Up', 'Stretch', 'First Step', 'Pocket Change', 'Tip Jar', 'Coffee Run'], ['Climb', 'Grind', 'Hustle', 'Paper Route', 'Side Gig', 'Shift'],
  ['Double Down', 'Flip', 'Run It Back', 'Breakout', 'Payday', 'Come Up'], ['Heist', 'Big Score', 'Takeover', 'Jackpot', 'Bank Job', 'Vault Run'],
  ['Moonshot', 'Kingmaker', 'Empire', 'Dynasty', 'Legend Run', 'Mount Olympus']];
const FLAVOR = { any: ['The', 'Classic', 'Open-Book', 'Free-Range'], singles: ['Lone Wolf', 'One-Shot', 'Sniper', 'Solo'], two: ['Tag-Team', 'Double-Barrel', 'Two-Step', 'Pairs'],
  three: ['Three-Piece', 'Trifecta', 'Hat-Trick', 'Triple-Threat'], chalk: ['Chalk', 'Blue-Chip', 'Safe-House', 'Favorite'], dogs: ['Dog-Pound', 'Underdog', 'Long-Shot', 'Stray'],
  overs: ['Shootout', 'Fireworks', 'Over-Party', 'Points-Rain'], unders: ['Lockdown', 'Ice-Box', 'Under-Club', 'Brick-Wall'], ml: ['Straight-Up', 'Knockout', 'Winner\'s', 'Bare-Knuckle'],
  spreads: ['Cover', 'Number', 'Line-Crosser', 'Point-Spread'], totals: ['Scoreboard', 'Total', 'Tally', 'Over/Under'], world: ['World-Tour', 'Passport', 'Globetrotter', 'Multi-Sport'] };
const SPTAG = { any: '', nfl: 'Sunday', ncaaf: 'Saturday', nba: 'Hardwood', ncaab: 'Bracket', nhl: 'Puck', mlb: 'Diamond' };
function rng(seed) { let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const hash = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
/* id = "<days>d<mult>x<start>-<rule>-<sport>", e.g. "7d2x100-dogs-nhl" */
export const idOf = c => `${c.days}d${c.x}x${c.start}-${c.rule}-${c.sport}`;
export function tierOf(days, x, rule) { const s = Math.log(x) / Math.sqrt(days) * (RULES[rule] ? RULES[rule].f : 1); return TIERS.find(t => s < t.max) || TIERS[4]; }
export function routeFor(days, x, rule) { const g = Math.log(x) / days; /* growth needed per day */
  if (rule === 'singles') return g < 0.04 ? 'compound' : 'stairs';
  if (rule === 'three') return g > 0.35 ? 'drip' : 'housemoney';
  if (g < 0.025) return 'compound'; if (g < 0.06) return 'stairs'; if (g < 0.12) return 'housemoney'; if (g < 0.2) return 'heist'; if (g < 0.35) return 'elevator'; return 'snowball'; }
export function chal(id) { const m = /^(\d+)d([\d.]+)x(\d+)-([a-z]+)-([a-z]+)$/.exec(String(id || '')); if (!m) return null;
  const days = +m[1], x = +m[2], start = +m[3], rule = m[4], sport = m[5];
  if (!DURS.includes(days) || !(MULTS[days] || []).includes(x) || !STARTS.includes(start) || !RULES[rule] || !SPORTS[sport]) return null;
  if (rule === 'world' && sport !== 'any') return null;
  const T = tierOf(days, x, rule), ti = TIERS.indexOf(T), r = rng(hash(id)), R = RULES[rule], route = routeFor(days, x, rule);
  const noun = NOUN[ti][Math.floor(r() * NOUN[ti].length)], fl = FLAVOR[rule][Math.floor(r() * FLAVOR[rule].length)].replace(/-/g, ' ');
  const name = [SPTAG[sport], fl === 'The' ? 'The ' + noun : fl + ' ' + noun].filter(Boolean).join(' ');
  const goal = Math.round(start * x), perDay = Math.pow(x, 1 / days), ro = ROUTES[route];
  const sMult = (R.f > 1 ? R.f : 1) * (sport !== 'any' ? 1.1 : 1), xp = Math.round(T.xp * sMult / 5) * 5, prize = Math.round(T.prize * sMult / 5) * 5;
  const why = [`${start === goal ? '' : `D$${start} to D$${goal.toLocaleString('en-US')}`} in ${days} days means growing the roll about ×${perDay.toFixed(2)} a day.`,
    R.why, sport !== 'any' ? `${SPORTS[sport]} only: you learn one board inside out, and nothing else counts.` : '',
    `The road map runs the ${ro.name} route: ${ro.desc.charAt(0).toLowerCase() + ro.desc.slice(1)}`].filter(Boolean).join(' ');
  return { id, days, x, start, goal, rule, sport, tier: T.id, tierName: T.name, color: T.color, xp, prize, route, name, why, perDay }; }
/* the full library: 250 per duration, spread over every size, rule and sport, picked by a fixed seed so it never changes */
let LIB = null;
export function library() { if (LIB) return LIB; const out = [];
  for (const d of DURS) { const all = []; for (const x of MULTS[d]) for (const st of STARTS) for (const ru of Object.keys(RULES)) for (const sp of Object.keys(SPORTS)) { if (ru === 'world' && sp !== 'any') continue; all.push(`${d}d${x}x${st}-${ru}-${sp}`); }
    const r = rng(1000 + d); for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [all[i], all[j]] = [all[j], all[i]]; }
    /* every size gets its share first, so each duration covers all five tiers */
    const pick = [], seen = new Set(); for (const x of MULTS[d]) all.filter(id => id.startsWith(`${d}d${x}x`)).slice(0, 25).forEach(id => { pick.push(id); seen.add(id); });
    for (const id of all) { if (pick.length >= 250) break; if (!seen.has(id)) { pick.push(id); seen.add(id); } }
    pick.forEach(id => out.push(chal(id))); }
  const names = new Map(); out.forEach(c => { const n = names.get(c.name) || 0; names.set(c.name, n + 1); if (n) c.name += ' ' + ['II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][Math.min(n - 1, 10)]; });
  out.forEach(c => { c.n = out.indexOf(c) + 1; }); return (LIB = out); }
let MAP = null;
/* the library's own entry (with its final name and number); null for anything outside the 1,000 */
export const get = id => { if (!MAP) MAP = new Map(library().map(c => [c.id, c])); return MAP.get(id) || null; };
export const inLib = id => !!get(id);
/* the roadmap: six checkpoints on the way up, and the bankroll the pace wants each day */
export const checkpoints = c => CHECKPOINTS.map((name, i) => ({ name, amt: Math.round(c.start * Math.pow(c.goal / c.start, (i + 1) / CHECKPOINTS.length) * 100) / 100 }));
export const paceAt = (c, day) => Math.round(c.start * Math.pow(c.goal / c.start, Math.min(1, day / c.days)) * 100) / 100;
/* today's order on a route: the stake and the legs, from where the run stands */
export function orderFor(route, bal, start, cps) { const R = ROUTES[route] || ROUTES.stairs; let stake;
  if (route === 'housemoney') stake = Math.min(bal, start * R.unit + R.f * Math.max(0, bal - start)); else if (route === 'drip') stake = Math.max(1, Math.min(bal, start * R.f)); else stake = Math.max(1, bal * R.f);
  stake = Math.min(bal, Math.max(1, Math.round(stake * 100) / 100)); return { stake, k: R.k }; }
/* finish odds: a quick simulation of the route over the time left (fair coin-ish legs at −110 unless the rule prices them) */
export function simulate(c, route, bal, daysLeft, runs = 600) { const R = ROUTES[route] || ROUTES.stairs, ru = RULES[c.rule] || {}, dec = ru.dec || 1.909, p = ru.fair || 0.515;
  const k = c.rule === 'singles' ? 1 : c.rule === 'two' ? 2 : c.rule === 'three' ? Math.max(3, R.k) : R.k; const r = rng(hash(c.id + route + Math.round(bal) + daysLeft)); let ok = 0, bust = 0; const cps = checkpoints(c).map(x => x.amt);
  for (let n = 0; n < runs; n++) { let b = bal, safe = 0, cp = 0, won = false;
    for (let d = 0; d < daysLeft; d++) { if (b < 1) break; const st = Math.min(b, orderFor(route, b, c.start).stake), ln = route === 'twolane' ? null : k;
      if (route === 'twolane') { const a = st * 0.6, m = st * 0.4; b -= st; if (r() < p && r() < p) b += a * dec * dec; let w = 1; for (let i = 0; i < 4; i++) if (r() >= p) w = 0; if (w) b += m * Math.pow(dec, 4); }
      else { let w = 1; for (let i = 0; i < ln; i++) if (r() >= p) { w = 0; break; } b -= st; if (w) { const ret = st * Math.pow(dec, ln); if (route === 'heist') { const prof = ret - st; safe += prof * 0.25; b += ret - prof * 0.25; } else b += ret; } }
      if (route === 'elevator') while (cp < cps.length && b + safe >= cps[cp]) { safe += b / 2; b /= 2; cp++; }
      if (b + safe >= c.goal) { won = true; break; } }
    if (won) ok++; else if (b < 1) bust++; }
  return { p: ok / runs, bust: bust / runs }; }
/* does a ticket obey the challenge? '' when fine, else the reason */
export function ruleCheck(c, legs) { const R = RULES[c.rule]; if (c.sport !== 'any' && legs.some(l => l.sp !== c.sport)) return `${c.name} is ${SPORTS[c.sport]} only`;
  if (R && !R.ok(legs)) return `${c.name}: ${R.desc}`; return ''; }
