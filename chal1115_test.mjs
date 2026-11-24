/* v3.1.0 · Challenges (1,000 from the library) + desk-run Leagues on the server. */
import { Accounts, lgRank } from './chat/worker.mjs';
import { library, chal, checkpoints, ruleCheck, simulate, ROUTES } from './chat/chal-lib.mjs';
import fs from 'fs';
let pass = 0, fail = 0; const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  — ' + String(x ?? '').slice(0, 500))); };
function storage() { const m = new Map(); let alarm = null; const sorted = () => [...m.keys()].sort();
  return { m, get: async k => structuredClone(m.get(k)), put: async (k, v) => { m.set(k, structuredClone(v)); }, delete: async k => { for (const x of [].concat(k)) m.delete(x); },
    list: async ({ prefix = '', limit } = {}) => { let ks = sorted().filter(k => k.startsWith(prefix)); if (limit) ks = ks.slice(0, limit); return new Map(ks.map(k => [k, structuredClone(m.get(k))])); },
    getAlarm: async () => alarm, setAlarm: async t => { alarm = t; } }; }
let clock = Date.parse('2026-11-16T16:00:00Z'); const ctx = { storage: storage() };
const day = (n, h = 18) => Date.parse('2026-11-16T00:00:00Z') + n * 864e5 + h * 36e5;
const G = (k, sp, t, a, h, ln) => ({ k, sp, t, a: { ab: a }, h: { ab: h }, ln });
const SLATE = { days: [{ d: 'x', games: [G('nba|BOS@NYK', 'nba', day(0, 24), 'BOS', 'NYK', { fav: 'BOS', line: 3.5, tot: 221.5, mlA: -160, mlH: 135 }), G('nhl|CHI@MIN', 'nhl', day(0, 25), 'CHI', 'MIN', { fav: 'MIN', line: 1.5, tot: 6.5, mlA: 150, mlH: -175 }),
  G('nfl|NE@DET', 'nfl', day(3, 18), 'NE', 'DET', { fav: 'DET', line: 2.5, tot: 49.5, mlA: 124, mlH: -148 }), G('nba|LAL@PHX', 'nba', day(9, 3), 'LAL', 'PHX', { fav: 'PHX', line: 4.5, tot: 228.5, mlA: 160, mlH: -190 })] }] };
let ESPN = {}; const fetchFn = async u => { if (u.includes('slate.json')) return { ok: true, json: async () => SLATE }; const sp = Object.keys(ESPN).find(s => u.includes(s)); return { ok: true, json: async () => ({ events: sp ? ESPN[sp] : [] }) }; };
const ev = (a, h, as, hs) => ({ competitions: [{ status: { type: { completed: true } }, competitors: [{ homeAway: 'away', team: { abbreviation: a }, score: String(as) }, { homeAway: 'home', team: { abbreviation: h }, score: String(hs) }] }] });
const env = { ALLOW_ORIGINS: 'https://ironsilkweekly.com', ADMIN_CODE: 'OWNER-CODE-THAT-IS-LONG-ENOUGH-1' };
const A = new Accounts(ctx, env, { now: () => clock, fetch: fetchFn });
const call = async (path, body) => { const r = await A.fetch(new Request('https://x.test' + path, body ? { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://ironsilkweekly.com', 'cf-connecting-ip': '1.2.3.' + Math.floor(Math.random() * 200) }, body: JSON.stringify(body) } : { method: 'GET', headers: { origin: 'https://ironsilkweekly.com' } })); return { status: r.status, j: await r.json() }; };
const sign = async n => (await call('/acct/signup', { name: n, pass: 'longenough1', age21: true })).j.token;
/* ── the library ── */
const L = library();
T('1,000 challenges, every id and name unique, 250 each for 3, 7, 14 and 30 days', L.length === 1000 && new Set(L.map(c => c.id)).size === 1000 && new Set(L.map(c => c.name)).size === 1000 && [3, 7, 14, 30].every(d => L.filter(c => c.days === d).length === 250));
T('…every duration has all five tiers, cakewalk to legendary', [3, 7, 14, 30].every(d => new Set(L.filter(c => c.days === d).map(c => c.tier)).size === 5));
T('…twelve leg rules and every sport show up; each has its own reasoning and a route', new Set(L.map(c => c.rule)).size === 12 && new Set(L.map(c => c.sport)).size === 7 && new Set(L.map(c => c.why)).size > 900 && L.every(c => ROUTES[c.route]));
T('…XP and the D$ prize climb with the tier', (() => { const t = ['cakewalk', 'easy', 'normal', 'hard', 'legendary'].map(id => Math.min(...L.filter(c => c.tier === id).map(c => c.prize))); return t.every((v, i) => !i || v > t[i - 1]); })());
T('the app and the server use the same library, byte for byte', fs.readFileSync('chat/chal-lib.mjs', 'utf8') === fs.readFileSync('desk/chal-lib.js', 'utf8'));
const dog = L.find(c => c.rule === 'dogs' && c.sport === 'any'), nhl = L.find(c => c.sport === 'nhl' && c.rule === 'any' && c.days === 7 && c.x === 2) || L.find(c => c.sport === 'nhl' && c.rule === 'any');
T('rule checks: a dog challenge refuses a favorite; an NHL challenge refuses an NBA leg', !!ruleCheck(dog, [{ sp: 'nba', price: -150, mk: 'ml' }]) && !ruleCheck(dog, [{ sp: 'nba', price: 135, mk: 'ml' }]) && !!ruleCheck(nhl, [{ sp: 'nba', price: 100, mk: 'ml' }]));
T('six checkpoints climb to the goal; the simulator returns finish odds', (() => { const c = checkpoints(nhl); return c.length === 6 && c[5].amt === nhl.goal && c[0].amt > nhl.start; })() && simulate(nhl, nhl.route, nhl.start, nhl.days).p >= 0);
/* ── runs ── */
const a = await sign('Puck Head'), bb = await sign('Lounge Lizard'), cc = await sign('Kiowa Kid');
const easy = L.find(c => c.start === 100 && c.goal <= 200 && ['any', 'ml', 'singles'].includes(c.rule) && ['any', 'nba'].includes(c.sport));
T('(fixture) an open-book 1.25x challenge exists', !!easy, easy && easy.id);
T('not every id is a challenge: made-up ids are refused', (await call('/acct/chal/join', { token: a, id: '3d999x100-any-any' })).status === 400);
let r = await call('/acct/chal/join', { token: a, id: easy.id }); const run = r.j.run;
/* v3.5.14 · Nov 23, Chris: "I do want challenge money to come from the players wallet" — the run's bankroll is bought from the wallet */
T('joining: a fresh run at the challenge\'s start, its goal and days, the recommended route — bought from the wallet (D$1,000 → D$900)', r.status === 200 && run.bal === easy.start && run.goal === easy.goal && run.route === easy.route && run.ends === clock + easy.days * 864e5 && run.buyIn === easy.start && r.j.wallet.bal === 1000 - easy.start && (await call('/acct/me', { token: a })).j.wallet.bal === 1000 - easy.start, JSON.stringify(run));
T('switching the route', (await call('/acct/chal/route', { token: a, rid: run.rid, route: 'snowball' })).j.run.route === 'snowball');
r = await call('/acct/chal/join', { token: a, id: dog.id }); const drun = r.j.run; let wa = 1000 - easy.start - dog.start;
T('…every run is bought: a second one comes off the wallet too', r.j.wallet.bal === wa, JSON.stringify(r.j.wallet));
T('a dog challenge refuses a favorite at the window', (await call('/acct/bet', { token: a, run: drun.rid, stake: 10, legs: [{ k: 'nba|BOS@NYK', mk: 'ml', side: 'away' }] })).status === 400);
const third = L.find(c => c.rule === 'any' && c.sport === 'any' && c.id !== easy.id && c.id !== dog.id); r = await call('/acct/chal/join', { token: a, id: third.id }); wa -= third.start; const trun = r.j.run;
T('three runs at a time', (await call('/acct/chal/join', { token: a, id: L[9].id })).status === 400);
r = await call('/acct/bet', { token: a, run: run.rid, stake: 80, legs: [{ k: 'nba|BOS@NYK', mk: 'ml', side: 'home' }] });
T('a bet from the run is taken from the run (the wallet doesn\'t move again)', r.status === 200 && r.j.run.bal === easy.start - 80 && r.j.wallet.bal === wa, JSON.stringify([r.j.run && r.j.run.bal, r.j.wallet]));
/* quitting sends what's left home: the dog run (no bets) gives its whole bankroll back */
r = await call('/acct/chal/quit', { token: a, rid: drun.rid }); wa += dog.start;
T('quit → the run\'s money goes back to the wallet (all of it, no bets were made)', r.status === 200 && r.j.run.status === 'quit' && r.j.run.cashed === dog.start && r.j.wallet.bal === wa, JSON.stringify([r.j.run, r.j.wallet]));
clock = day(1, 12); ESPN = { 'basketball/nba': [ev('BOS', 'NYK', 108, 112)], 'hockey/nhl': [ev('CHI', 'MIN', 4, 2)] }; await A.alarm();
r = await call('/acct/me', { token: a }); const R1 = r.j.runs.find(x => x.rid === run.rid);
const won = Math.round((easy.start - 80 + 80 * (1 + 135 / 100)) * 100) / 100;
T('it cashes past the goal → WON: the run\'s whole balance home, plus the challenge\'s XP and D$ prize, the tier\'s trophy counted', R1.status === 'won' && R1.cashed === won && r.j.xp >= easy.xp && r.j.wallet.bal === Math.round((wa + won + easy.prize) * 100) / 100 && r.j.trophies[easy.tier] === 1 && r.j.xplog.some(x => x.dd === easy.prize) && r.j.xplog.some(x => x.dd === won), JSON.stringify([R1, r.j.xp, r.j.wallet, r.j.trophies]));
T('…it shows on the board: finished, recent, the XP table', (await call('/acct/chal')).j.by[easy.id].won === 1 && (await call('/acct/chal')).j.recent[0].prize === easy.prize && (await call('/acct/chal')).j.xp[0].name === 'Puck Head');
wa = Math.round((wa + won + easy.prize) * 100) / 100;
/* a ticket still out when the run closes pays the wallet when it settles */
r = await call('/acct/bet', { token: a, run: trun.rid, stake: 10, legs: [{ k: 'nfl|NE@DET', mk: 'ml', side: 'away' }] }); const tq = await call('/acct/chal/quit', { token: a, rid: trun.rid }); wa = Math.round((wa + third.start - 10) * 100) / 100;
T('quitting with a ticket out: what\'s left comes home now…', r.status === 200 && tq.j.run.cashed === third.start - 10 && tq.j.wallet.bal === wa, JSON.stringify([tq.j.run, tq.j.wallet]));
clock = day(4, 12); ESPN = { 'football/nfl': [ev('NE', 'DET', 27, 20)] }; await A.alarm(); clock = day(1, 12);

r = await call('/acct/me', { token: a }); wa = Math.round((wa + 10 * (1 + 124 / 100)) * 100) / 100;
T('…and the ticket pays the wallet when it wins (NE +124: D$22.40)', r.j.wallet.bal === wa && r.j.runs.find(x => x.rid === trun.rid).late === 22.4, JSON.stringify([r.j.wallet, r.j.runs.find(x => x.rid === trun.rid)]));
/* a run that runs out of time gives back what it holds; the wallet has to cover the next buy-in */
const poor = await sign('Short Stack'); { const k = 'u:short stack', u = ctx.storage.m.get(k); u.dd = { ...u.dd, bal: 40 }; ctx.storage.m.set(k, u); }
r = await call('/acct/chal/join', { token: poor, id: easy.id });
T('not enough in the wallet: the buy-in is refused, with what it costs and what you have', r.status === 400 && /costs D\$100 from your wallet\. You have D\$40\./.test(r.j.error), JSON.stringify(r.j));
{ const k = 'u:short stack', u = ctx.storage.m.get(k); u.dd = { ...u.dd, bal: 140 }; ctx.storage.m.set(k, u); }
r = await call('/acct/chal/join', { token: poor, id: easy.id }); const prun = r.j.run;
const brd = (await call('/acct/board')).j.rows.find(x => x.name === 'Short Stack');
T('the leaderboard still counts a bought run\'s money while it\'s live (D$40 wallet + D$100 run)', brd && brd.bal === 140, JSON.stringify(brd));
clock = prun.ends + 60e3; await A.alarm(); r = await call('/acct/me', { token: poor });
T('time runs out → EXPIRED, and the run\'s D$100 goes back to the wallet', r.j.runs[0].status === 'expired' && r.j.runs[0].cashed === 100 && r.j.wallet.bal === 140, JSON.stringify([r.j.runs[0], r.j.wallet]));
/* a run started before buy-ins (free) ends the old way: no cash-out */
{ const rid0 = 'old1'; ctx.storage.m.set('c:short stack:' + rid0, { rid: rid0, cid: easy.id, name: 'Short Stack', ts: clock - 864e5, ends: clock - 1000, start: 100, bal: 90, goal: easy.goal, peak: 100, route: easy.route, status: 'live', open: 0, bets: 1, w: 0, l: 1, p: 0, cp: 0, xp: 0 }); ctx.storage.m.set('r:short stack:' + rid0, 1); }
await A.alarm(); r = await call('/acct/me', { token: poor });
T('a free run from before (no buy-in) ends without paying the wallet', r.j.runs.find(x => x.rid === 'old1').status === 'expired' && r.j.runs.find(x => x.rid === 'old1').cashed == null && r.j.wallet.bal === 140, JSON.stringify([r.j.runs.find(x => x.rid === 'old1'), r.j.wallet]));
clock = day(1, 12);
/* ── leagues ── */
const own = (await call('/acct/login', { name: 'TheDesk', pass: env.ADMIN_CODE })).j.token;
T('members can\'t open leagues yet', (await call('/acct/lgs/create', { token: bb, name: 'Mine', starts: clock, ends: clock + 864e5, prizes: [100] })).status === 403);
r = await call('/acct/lgs/create', { token: own, name: 'Thanksgiving Week Classic', blurb: 'Turkey, football, D$.', starts: day(2, 0), ends: day(6, 23), bank: 1000, prizes: [5000, 2500, 1000], max: 100 });
const lid = r.j.league.lid;
T('the desk opens a league: dates, bankroll, prizes', r.status === 200 && r.j.league.official && r.j.league.prizes[0] === 5000);
r = await call('/acct/lgs');
T('the list shows it open, with the pool', r.j.leagues[0].status === 'open' && r.j.leagues[0].pool === 8500, JSON.stringify(r.j));
/* v3.5.14 · "to sign up for leagues there should be a signup fee (D$25 for starters)" */
T('a league opens with the D$25 entry fee unless the desk sets another (the list shows it)', r.j.leagues[0].fee === 25, JSON.stringify(r.j.leagues[0]));
const lj = []; for (const t of [a, bb, cc]) lj.push(await call('/acct/lgs/join', { token: t, id: lid }));
T('members join for the D$25 fee (off the wallet) and get the league bankroll; no double joins', lj.every(x => x.status === 200 && x.j.entry.fee === 25) && lj[1].j.wallet.bal === 975 && (await call('/acct/me', { token: bb })).j.leagues[0].bal === 1000 && (await call('/acct/me', { token: bb })).j.wallet.bal === 975 && (await call('/acct/lgs/join', { token: bb, id: lid })).status === 400, JSON.stringify(lj.map(x => x.j.wallet)));
{ const k = 'u:short stack', u = ctx.storage.m.get(k); u.dd = { ...u.dd, bal: 10 }; ctx.storage.m.set(k, u); }
r = await call('/acct/lgs/join', { token: poor, id: lid });
T('…the fee has to be in the wallet', r.status === 400 && /costs D\$25 to join\. You have D\$10\./.test(r.j.error), JSON.stringify(r.j));
const lg2 = (await call('/acct/lgs/create', { token: own, name: 'Small Stakes Sunday', starts: day(5, 0), ends: day(6, 0), bank: 500, prizes: [100], fee: 10 })).j.league;
{ const k = 'u:short stack', u = ctx.storage.m.get(k); u.dd = { ...u.dd, bal: 10 }; ctx.storage.m.set(k, u); }
r = await call('/acct/lgs/join', { token: poor, id: lg2.lid });
T('the desk can set another fee (D$10)', lg2.fee === 10 && r.status === 200 && r.j.wallet.bal === 0, JSON.stringify(r.j.wallet));
r = await call('/acct/lgs/cancel', { token: own, id: lg2.lid });
T('a league the desk calls off gives every fee back', r.status === 200 && r.j.refunded === 1 && (await call('/acct/me', { token: poor })).j.wallet.bal === 10);
T('no league bets before it starts', (await call('/acct/bet', { token: bb, league: lid, stake: 100, legs: [{ k: 'nfl|NE@DET', mk: 'ml', side: 'home' }] })).status === 400);
clock = day(2, 12);
T('…or on a game after it ends', (await call('/acct/bet', { token: bb, league: lid, stake: 100, legs: [{ k: 'nba|LAL@PHX', mk: 'ml', side: 'home' }] })).status === 400);
r = await call('/acct/bet', { token: bb, league: lid, stake: 500, legs: [{ k: 'nfl|NE@DET', mk: 'ml', side: 'away' }] });
T('a league bet comes off the league bankroll, not the wallet', r.status === 200 && r.j.entry.bal === 500 && r.j.wallet.bal === 975, JSON.stringify(r.j));
await call('/acct/bet', { token: cc, league: lid, stake: 200, legs: [{ k: 'nfl|NE@DET', mk: 'ml', side: 'home' }] });
clock = day(4, 12); ESPN = { 'football/nfl': [ev('NE', 'DET', 27, 20)] }; await A.alarm();
r = await call('/acct/lgs/one?id=' + lid);
T('standings by bankroll: Lounge Lizard 500 left + 1,120 back = 1,620 leads', r.j.rows[0].name === 'Lounge Lizard' && r.j.rows[0].bal === 1620 && r.j.league.status === 'live', JSON.stringify(r.j.rows));
clock = day(7, 12); await A.alarm();
r = await call('/acct/lgs/one?id=' + lid); const meB = await call('/acct/me', { token: bb });
T('it ends, the podium is paid: D$5,000 + XP to the winner; players with no bets aren\'t ranked', r.j.league.status === 'final' && r.j.rows[0].name === 'Lounge Lizard' && r.j.rows[0].prize === 5000 && r.j.rows.length === 2 && meB.j.wallet.bal === 5975 && meB.j.xp >= 650, JSON.stringify([r.j.rows, meB.j.wallet, meB.j.xp]));
T('…and the runner-up gets the second prize', (await call('/acct/me', { token: cc })).j.wallet.bal === 3475);
T('ranking rule', lgRank([{ bal: 5, w: 1, joined: 2 }, { bal: 9, w: 0, joined: 1 }])[0].bal === 9);
T('closing an account removes its runs and league seats', (await call('/acct/close', { token: cc, pass: 'longenough1' })).status === 200 && ![...ctx.storage.m.keys()].some(k => /kiowa kid/.test(k) && /^(c|r|e):/.test(k)));
console.log(`${pass} pass / ${fail} fail`); process.exit(fail ? 1 : 0);
