/* v3.0.36 · Challenges + Leagues on the server: a run is its own D$100 bankroll (the wallet untouched), bets from it are real
   server-priced, server-graded D$ bets; won at the goal, busted under D$1, expired at the clock. Leagues: wallet bets count for the
   week they were placed in, the board ranks net on settled bets, private leagues by code, last week's champ (3+ settled). */
import { Accounts, weekOf, weekEnd, lgRows, lgChamp, CHAL } from './chat/worker.mjs';
let pass = 0, fail = 0; const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  — ' + String(x ?? '').slice(0, 500))); };
function storage() { const m = new Map(); let alarm = null; const sorted = () => [...m.keys()].sort();
  return { m, get: async k => structuredClone(m.get(k)), put: async (k, v) => { m.set(k, structuredClone(v)); }, delete: async k => { for (const x of [].concat(k)) m.delete(x); },
    list: async ({ prefix = '', limit } = {}) => { let ks = sorted().filter(k => k.startsWith(prefix)); if (limit) ks = ks.slice(0, limit); return new Map(ks.map(k => [k, structuredClone(m.get(k))])); },
    getAlarm: async () => alarm, setAlarm: async t => { alarm = t; } }; }
let clock = Date.parse('2026-11-16T16:00:00Z'); /* Monday 10 AM Central */ const ctx = { storage: storage() };
const day = (n, h = 18) => Date.parse('2026-11-16T00:00:00Z') + n * 864e5 + h * 36e5;
const G = (k, sp, t, a, h, ln) => ({ k, sp, t, a: { ab: a }, h: { ab: h }, ln });
const SLATE = { days: [{ d: 'x', games: [G('nba|BOS@NYK', 'nba', day(0, 24), 'BOS', 'NYK', { fav: 'BOS', line: 3.5, tot: 221.5, mlA: -160, mlH: 135 }), G('nhl|CHI@MIN', 'nhl', day(0, 25), 'CHI', 'MIN', { fav: 'MIN', line: 1.5, tot: 6.5, mlA: 150, mlH: -175 }),
  G('nfl|NE@DET', 'nfl', day(6, 18), 'NE', 'DET', { fav: 'DET', line: 2.5, tot: 49.5, mlA: 124, mlH: -148 }), G('nba|LAL@PHX', 'nba', day(9, 3), 'LAL', 'PHX', { fav: 'PHX', line: 4.5, tot: 228.5, mlA: 160, mlH: -190 })] }] };
let ESPN = {}; const fetchFn = async u => { if (u.includes('slate.json')) return { ok: true, json: async () => SLATE }; const sp = Object.keys(ESPN).find(s => u.includes(s)); return { ok: true, json: async () => ({ events: sp ? ESPN[sp] : [] }) }; };
const ev = (a, h, as, hs) => ({ competitions: [{ status: { type: { completed: true } }, competitors: [{ homeAway: 'away', team: { abbreviation: a }, score: String(as) }, { homeAway: 'home', team: { abbreviation: h }, score: String(hs) }] }] });
const env = { ALLOW_ORIGINS: 'https://ironsilkweekly.com', ADMIN_CODE: 'OWNER-CODE-THAT-IS-LONG-ENOUGH-1' };
const A = new Accounts(ctx, env, { now: () => clock, fetch: fetchFn });
const call = async (path, body) => { const r = await A.fetch(new Request('https://x.test' + path, body ? { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://ironsilkweekly.com', 'cf-connecting-ip': '1.2.3.' + Math.floor(Math.random() * 200) }, body: JSON.stringify(body) } : { method: 'GET', headers: { origin: 'https://ironsilkweekly.com' } })); return { status: r.status, j: await r.json() }; };
const sign = async n => (await call('/acct/signup', { name: n, pass: 'longenough1', age21: true })).j.token;
const a = await sign('Puck Head'), bb = await sign('Lounge Lizard'), cc = await sign('Kiowa Kid');
T('weeks run Monday–Sunday, Central; a Sunday night bet is still that week', weekOf(Date.parse('2026-11-16T16:00:00Z')) === '2026-11-16' && weekOf(Date.parse('2026-11-23T05:30:00Z')) === '2026-11-16' && weekOf(Date.parse('2026-11-23T06:30:00Z')) === '2026-11-23', [weekOf(Date.parse('2026-11-23T05:30:00Z')), weekOf(Date.parse('2026-11-23T06:30:00Z'))]);
T('…and ends at Monday midnight Central', weekEnd('2026-11-16') === Date.parse('2026-11-23T06:00:00Z'), new Date(weekEnd('2026-11-16')).toISOString());
let r = await call('/acct/chal');
T('the catalog: four challenges, D$100 starts, 2x/7d to 20x/30d', r.status === 200 && r.j.chal.length === 4 && r.j.chal[0].id === '2x7' && r.j.chal[3].x === 20 && r.j.chal.every(c => c.start === 100 && c.live === 0), JSON.stringify(r.j.chal[0]));
r = await call('/acct/chal/join', { token: a, cid: '2x7' }); const run = r.j.run;
T('joining gives a fresh D$100 run with a D$200 goal and 7 days; the wallet stays D$1,000', r.status === 200 && run.bal === 100 && run.goal === 200 && run.ends === clock + 7 * 864e5 && (await call('/acct/me', { token: a })).j.wallet.bal === 1000, JSON.stringify(run));
T('one live run per challenge', (await call('/acct/chal/join', { token: a, cid: '2x7' })).status === 400);
T('a run can\'t bet more than it holds', (await call('/acct/bet', { token: a, run: run.rid, stake: 150, legs: [{ k: 'nba|BOS@NYK', mk: 'ml', side: 'home' }] })).status === 400);
r = await call('/acct/bet', { token: a, run: run.rid, stake: 80, legs: [{ k: 'nba|BOS@NYK', mk: 'ml', side: 'home' }] });
T('a bet from the run: priced by the server (NYK +135), taken from the run, wallet untouched, no league credit', r.status === 200 && r.j.run.bal === 20 && r.j.wallet.bal === 1000 && r.j.bet.run === run.rid && !r.j.bet.wk, JSON.stringify(r.j));
r = await call('/acct/bet', { token: a, stake: 100, legs: [{ k: 'nhl|CHI@MIN', mk: 'ml', side: 'away' }] });
T('a wallet bet counts for this week\'s league', r.status === 200 && r.j.bet.wk === '2026-11-16' && r.j.wallet.bal === 900);
await call('/acct/bet', { token: bb, stake: 50, legs: [{ k: 'nba|BOS@NYK', mk: 'total', side: 'over' }] });
await call('/acct/bet', { token: bb, stake: 50, legs: [{ k: 'nhl|CHI@MIN', mk: 'total', side: 'under' }] });
await call('/acct/bet', { token: bb, stake: 50, legs: [{ k: 'nba|BOS@NYK', mk: 'spread', side: 'away' }] });
r = await call('/acct/lg?code=ALL');
T('TheDesk League before anything settles: everyone who bet, net 0, stakes at risk shown', r.status === 200 && r.j.rows.length === 2 && r.j.rows.every(x => x.net === 0) && r.j.rows.find(x => x.name === 'Lounge Lizard').os === 150 && r.j.current && r.j.ends === Date.parse('2026-11-23T06:00:00Z'), JSON.stringify(r.j));
/* settle Monday night: NYK wins 112-108 (NYK ML hit, BOS -3.5 miss, Over 221.5 miss (220)); CHI 4 MIN 2 (CHI ML hit, under 6.5 hit) */
clock = day(1, 12); ESPN = { 'basketball/nba': [ev('BOS', 'NYK', 108, 112)], 'hockey/nhl': [ev('CHI', 'MIN', 4, 2)] }; await A.alarm();
r = await call('/acct/me', { token: a }); const R1 = r.j.runs.find(x => x.rid === run.rid);
T('the run\'s bet cashes into the run: 20 + 80×2.35 = D$208 → goal reached, the run is WON, trophy on the account', R1.bal === 208 && R1.status === 'won' && r.j.trophies && r.j.trophies['2x7'] === 1, JSON.stringify([R1, r.j.trophies]));
T('…and the wallet bet cashes into the wallet (CHI +150: D$250 back → D$1,150)', r.j.wallet.bal === 1150, JSON.stringify(r.j.wallet));
r = await call('/acct/chal');
T('the challenge board: Double Up 1 for 1, the fastest finish, the finish in "recent"', r.j.chal[0].won === 1 && r.j.chal[0].tries === 1 && r.j.chal[0].fastest.name === 'Puck Head' && r.j.recent[0].status === 'won' && r.j.recent[0].name === 'Puck Head', JSON.stringify(r.j));
r = await call('/acct/lg?code=ALL');
const pk = r.j.rows.find(x => x.name === 'Puck Head'), lz = r.j.rows.find(x => x.name === 'Lounge Lizard');
T('league net on settled bets: Puck Head +150 (1-0), Lounge Lizard 1-2 = −54.55, ranked by net', r.j.rows[0].name === 'Puck Head' && pk.net === 150 && pk.w === 1 && lz.w === 1 && lz.l === 2 && Math.abs(lz.net - (-54.55)) < 0.02, JSON.stringify(r.j.rows));
/* private league */
r = await call('/acct/lg/create', { token: bb, name: 'Hobart Sharps' }); const code = r.j.league.code;
T('a private league gets a 6-letter code', r.status === 200 && /^[A-Z2-9]{6}$/.test(code));
T('joining with the code (any case) works; a bad code says so', (await call('/acct/lg/join', { token: cc, code: code.toLowerCase() })).status === 200 && (await call('/acct/lg/join', { token: cc, code: 'ZZZZZZ' })).status === 404);
r = await call('/acct/lg?code=' + code);
T('its board shows only its members (Kiowa Kid with no bets yet sits at 0)', r.status === 200 && r.j.league.name === 'Hobart Sharps' && r.j.rows.length === 2 && r.j.rows.some(x => x.name === 'Kiowa Kid' && x.n === 0) && !r.j.rows.some(x => x.name === 'Puck Head'), JSON.stringify(r.j.rows));
T('/acct/me lists the member\'s leagues', (await call('/acct/me', { token: cc })).j.leagues[0].code === code);
/* a busted run and an expired run */
r = await call('/acct/chal/join', { token: bb, cid: '4x7' }); const r2 = r.j.run;
await call('/acct/bet', { token: bb, run: r2.rid, stake: 100, legs: [{ k: 'nfl|NE@DET', mk: 'ml', side: 'away' }] });
r = await call('/acct/chal/join', { token: cc, cid: '10x21' }); const r3 = r.j.run;
clock = day(7, 12); ESPN = { 'football/nfl': [ev('NE', 'DET', 10, 31)] }; await A.alarm();
T('all-in and lost → BUSTED', (await call('/acct/me', { token: bb })).j.runs.find(x => x.rid === r2.rid).status === 'busted');
T('no new bets once a run is over', (await call('/acct/bet', { token: bb, run: r2.rid, stake: 5, legs: [{ k: 'nba|LAL@PHX', mk: 'ml', side: 'home' }] })).status === 400);
clock = day(22, 12); await A.alarm();
T('time runs out with nothing open → EXPIRED', (await call('/acct/me', { token: cc })).j.runs.find(x => x.rid === r3.rid).status === 'expired');
/* champion of last week: needs 3+ settled bets and a positive net */
r = await call('/acct/lg?code=ALL');
T('a new week starts the board fresh; last week\'s champ needs 3+ settled bets (Puck Head had 1, Lounge Lizard was down) → none crowned', r.j.week !== '2026-11-16' && r.j.rows.length === 0 && r.j.champ === null, JSON.stringify([r.j.week, r.j.champ]));
T('the champ rule', lgChamp(lgRows([{ name: 'A', n: 4, st: 40, bk: 90, w: 3, l: 1, p: 0, open: 0, os: 0 }, { name: 'B', n: 1, st: 10, bk: 200, w: 1, l: 0, p: 0, open: 0, os: 0 }])).name === 'A');
T('quitting ends a run', (await call('/acct/chal/quit', { token: a, rid: (await call('/acct/chal/join', { token: a, cid: '20x30' })).j.run.rid })).j.run.status === 'quit');
T('closing the account removes its runs and league seats', (await call('/acct/close', { token: cc, pass: 'longenough1' })).status === 200 && ![...ctx.storage.m.keys()].some(k => /^(c|r):kiowa kid:/.test(k)) && !(await ctx.storage.get('L:' + code)).members.includes('kiowa kid'));
console.log(`${pass} pass / ${fail} fail`); process.exit(fail ? 1 : 0);
