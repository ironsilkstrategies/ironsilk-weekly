/* v3.5.34 · Nov 26, 7:30 PM, Chris: "a league where the players go against each other .. virtually a mirror of what I have on the machine
   where they pair up and have a draft… also a head to head league option where you pick 3 characters vs another subscriber who picks 3
   characters (draft style) and they each pick 2 picks to build the best parlay that whoever has the most d$ at the end wins".
   The server's half: a room, its snake draft, picks made for you when your clock runs out, head-to-head tickets built only from your own
   characters' calls (2 a character at most, one ticket a day), the team draft's automatic tickets (the machine's Team Parlay Challenge:
   each character's 2 best calls, D$2 a single and D$5 the parlay), the pot to the winner, refunds when a room is called off. */
import { Accounts } from './chat/worker.mjs';
import { drSnake, drAssign, drPool, drAutoLegs, drBoardGame, drCallers } from './chat/draft-lib.mjs';
let pass = 0, fail = 0; const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  — ' + String(x ?? '').slice(0, 500))); };
function storage() { const m = new Map(); let alarm = null; const sorted = () => [...m.keys()].sort();
  return { m, get: async k => m.get(k), put: async (k, v) => { m.set(k, structuredClone(v)); }, delete: async k => { for (const x of [].concat(k)) m.delete(x); },
    list: async ({ prefix = '', limit } = {}) => { let ks = sorted().filter(k => k.startsWith(prefix)); if (limit) ks = ks.slice(0, limit); return new Map(ks.map(k => [k, m.get(k)])); },
    getAlarm: async () => alarm, setAlarm: async t => { alarm = t; }, deleteAlarm: async () => { alarm = null; }, get alarmAt() { return alarm; } }; }
/* Thanksgiving: noon Central */
let clock = Date.parse('2026-11-26T18:00:00Z'); const ctx = { storage: storage() };
const T1 = Date.parse('2026-11-27T01:00:00Z'), T2 = Date.parse('2026-11-27T02:00:00Z'), T3 = Date.parse('2026-11-27T03:00:00Z');
const SLATE = { days: [{ d: '2026-11-26', games: [
  { k: 'nfl|KC@BUF', sp: 'nfl', t: T1, a: { ab: 'KC' }, h: { ab: 'BUF' }, ln: { fav: 'BUF', line: 2.5, tot: 47.5, mlA: 120, mlH: -142 } },
  { k: 'ncaab|BAY@GONZ', sp: 'ncaab', t: T2, a: { ab: 'BAY' }, h: { ab: 'GONZ' }, ln: { fav: 'GONZ', line: 3.5, tot: 151.5, mlA: 140, mlH: -165 } },
  { k: 'nba|DAL@MIN', sp: 'nba', t: T3, a: { ab: 'DAL' }, h: { ab: 'MIN' }, ln: { fav: 'MIN', line: 5.5, tot: 224.5, mlA: 180, mlH: -220 } },
  { k: 'ncaab|SMU@LSU', sp: 'ncaab', t: T1, a: { ab: 'SMU' }, h: { ab: 'LSU' }, ln: { fav: 'LSU', line: 7.5, tot: 150.5, mlA: 260, mlH: -320 } }] }] };
const D = '2026-11-26', recent = (w, l) => [...Array(w).fill(0).map((_, i) => ({ kind: 'game', d: '2026-11-2' + (i % 5), r: 'win' })), ...Array(l).fill(0).map((_, i) => ({ kind: 'game', d: '2026-11-1' + (i % 9 + 1), r: 'loss' }))];
const CH = [['Scout', 'The Scout', 14, 4], ['Judge', 'The Judge', 12, 6], ['Sim', 'The Simulator', 11, 9], ['Coach', 'The Coach', 10, 8], ['Dog', 'The Underdog Spotter', 9, 9], ['Trends', 'The Historian', 8, 10],
  ['Banker', 'The Banker', 7, 11], ['Brain', 'The Brain', 6, 12], ['Power', 'The Commissioner', 5, 13]].map(([v, name, w, l]) => ({ v, name, color: '#123456', picks: [{ sp: 'nfl' }], recent: recent(w, l) }));
/* the board: who called what. ESPN-style board game SMU@LSU filed the other way round (LSU@SMU) to prove the flip */
const call = (v, s, pick, price, p) => ({ v, s, pick, price, p });
const FEED = { characters: CH, board: { d: D, games: [
  { sp: 'nfl', game: 'KC@BUF', day: D, calls: { ml: [call('Scout', 'home', 'BUF ML', -142, 0.6), call('Judge', 'away', 'KC ML', 120, 0.48), call('Sim', 'home', 'BUF ML', -142, 0.58)], total: [call('Scout', 'over', 'Over 47.5', -110, 0.55), call('Coach', 'under', 'Under 47.5', -110, 0.52)] } },
  { sp: 'ncaab', game: 'BAY@GONZ', day: D, calls: { spread: [call('Scout', 'away', 'BAY +3.5', -110, 0.57), call('Judge', 'home', 'GONZ -3.5', -110, 0.51)], total: [call('Sim', 'over', 'Over 151.5', -110, 0.54)] } },
  { sp: 'nba', game: 'DAL@MIN', day: D, calls: { ml: [call('Scout', 'home', 'MIN ML', -220, 0.66), call('Dog', 'away', 'DAL ML', 180, 0.4)], spread: [call('Judge', 'home', 'MIN -5.5', -110, 0.53)] } },
  { sp: 'ncaab', game: 'LSU@SMU', day: D, calls: { ml: [call('Judge', 'away', 'LSU ML', -320, 0.7)], total: [call('Coach', 'under', 'Under 150.5', -110, 0.5)] } }] } };
let ESPN = []; const fetchFn = async u => { if (u.includes('slate.json')) return { ok: true, json: async () => SLATE }; if (u.includes('picks.json')) return { ok: true, json: async () => FEED }; return { ok: true, json: async () => ({ events: ESPN }) }; };
const ev = (a, h, as, hs) => ({ competitions: [{ status: { type: { completed: true } }, competitors: [{ homeAway: 'away', team: { abbreviation: a }, score: String(as) }, { homeAway: 'home', team: { abbreviation: h }, score: String(hs) }] }] });
const env = { ALLOW_ORIGINS: 'https://ironsilkweekly.com', ADMIN_CODE: 'OWNER-CODE-THAT-IS-LONG-ENOUGH-1' };
const A = new Accounts(ctx, env, { now: () => clock, fetch: fetchFn });
const call2 = async (path, body) => { const r = await A.fetch(new Request('https://x.test' + path, { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://ironsilkweekly.com', 'cf-connecting-ip': '1.2.3.' + Math.floor(Math.random() * 200) }, body: JSON.stringify(body) })); return { status: r.status, j: await r.json() }; };
const get = async path => { const r = await A.fetch(new Request('https://x.test' + path, { method: 'GET', headers: { origin: 'https://ironsilkweekly.com' } })); return { status: r.status, j: await r.json() }; };
/* the pure parts first */
T('snake order: 1-2, 2-1, 1-2', JSON.stringify(drSnake(['a', 'b'], 3)) === '["a","b","b","a","a","b"]' && JSON.stringify(drSnake(['a', 'b', 'c'], 2)) === '["a","b","c","c","b","a"]');
T('matching: legs onto characters, 2 a character at most (a third leg that only one character called can still fit when another can take a leg)', JSON.stringify(drAssign([['x', 'y'], ['x'], ['x']], 2)) === '["y","x","x"]' && drAssign([['x'], ['x'], ['x']], 2) === null);
T('the pool: characters still making calls, best form first', drPool(FEED, clock)[0].v === 'Scout' && drPool(FEED, clock).length === 9);
{ const G = new Map(SLATE.days[0].games.map(g => [g.k, g])), bg = drBoardGame(FEED.board, G.get('ncaab|SMU@LSU'));
  T('a board game filed the other way round is still the game, its sides flipped (LSU ML on the board = home on the Slate)', bg && bg.flip && JSON.stringify(drCallers(bg, 'ml', 'home', ['Judge'])) === '["Judge"]' && drCallers(bg, 'ml', 'away', ['Judge']).length === 0); }
/* two members */
const tA = (await call2('/acct/signup', { name: 'Chris', pass: 'longenough1', age21: true })).j.token, tB = (await call2('/acct/signup', { name: 'Rival', pass: 'longenough2', age21: true })).j.token, tC = (await call2('/acct/signup', { name: 'Third', pass: 'longenough3', age21: true })).j.token;
let r = await call2('/acct/dr/create', { token: tA, fmt: 'pick', size: 2, days: 3, fee: 25, name: 'Turkey Bowl' });
T('a head-to-head room: D$25 from the wallet, waiting on one more', r.status === 200 && r.j.room.status === 'open' && r.j.room.pot === 25 && r.j.wallet.bal === 975 && r.j.room.per === 3, JSON.stringify(r.j));
const did = r.j.room.did;
T('it\'s listed for anyone to join', (await get('/acct/dr')).j.rooms.some(x => x.did === did && x.status === 'open'));
r = await call2('/acct/dr/join', { token: tB, id: did });
T('the second player fills it: the draft opens, a snake of 6 picks, everyone at D$1,000', r.status === 200 && r.j.room.status === 'draft' && r.j.room.order.length === 6 && r.j.room.pot === 50 && r.j.room.rows.every(x => x.bal === 1000), JSON.stringify(r.j.room));
T('a full room turns the next player away', (await call2('/acct/dr/join', { token: tC, id: did })).status === 400);
let room = r.j.room; const first = room.order[0] === 'Chris' ? tA : tB, second = first === tA ? tB : tA;
T('it\'s not your pick until it\'s your turn', (await call2('/acct/dr/pick', { token: second, id: did, v: 'Scout' })).status === 400);
r = await call2('/acct/dr/pick', { token: first, id: did, v: 'Scout' });
T('first pick: the Scout', r.status === 200 && r.j.room.picks.length === 1 && r.j.room.picks[0].v === 'Scout');
T('a character goes once', (await call2('/acct/dr/pick', { token: second, id: did, v: 'Scout' })).status === 400);
await call2('/acct/dr/pick', { token: second, id: did, v: 'Judge' });
/* the second player's clock runs out on pick 3 (snake: they pick twice in a row) */
clock += 2 * 36e5 + 60e3; await A.alarm();
r = await call2('/acct/me', { token: second }); room = r.j.drafts.find(x => x.did === did);
T('a pick whose 2-hour clock ran out is made for you: the best form left (the Coach, 10–8, just ahead of the Simulator\'s 11–9 once both are pulled toward 50%)', room.picks.length === 3 && room.picks[2].v === 'Coach' && room.picks[2].auto, JSON.stringify(room.picks));
r = await call2('/acct/dr/auto', { token: first, id: did, on: true });
T('auto-draft on: your picks are made the moment it\'s your turn (two in a row: the Simulator, then the Underdog Spotter)', r.j.room.picks.length === 5 && r.j.room.picks[3].v === 'Sim' && r.j.room.picks[4].v === 'Dog', JSON.stringify(r.j.room.picks));
r = await call2('/acct/dr/pick', { token: second, id: did, v: 'Trends' });
room = r.j.room; const myRoster = room.rows.find(x => x.me).roster;
T('the draft is done: 3 characters each, and the room is live for 3 days', room.status === 'live' && room.rows.every(x => x.roster.length === 3) && room.ends - room.starts === 3 * 864e5, JSON.stringify(room.rows));
/* the first player has the Scout, the Simulator and the Dog; the second the Judge, the Coach and the Historian. Tickets only from their own calls. */
const bet = (tok, legs, stake = 100) => call2('/acct/bet', { token: tok, stake, dr: did, mode: 'parlay', legs });
T('a pick that isn\'t one of your characters\' calls is refused (MIN -5.5 is the Judge\'s)', (await bet(first, [{ k: 'nba|DAL@MIN', mk: 'spread', side: 'home' }, { k: 'nfl|KC@BUF', mk: 'ml', side: 'home' }])).status === 400);
T('three picks only one character made are refused (2 a character): BAY +3.5, MIN ML and Over 47.5 are all the Scout\'s alone', (await bet(first, [{ k: 'ncaab|BAY@GONZ', mk: 'spread', side: 'away' }, { k: 'nba|DAL@MIN', mk: 'ml', side: 'home' }, { k: 'nfl|KC@BUF', mk: 'total', side: 'over' }])).status === 400);
T('a single isn\'t a parlay: at least 2 picks', (await bet(first, [{ k: 'nfl|KC@BUF', mk: 'ml', side: 'home' }])).status === 400);
r = await bet(first, [{ k: 'nfl|KC@BUF', mk: 'ml', side: 'home' }, { k: 'ncaab|BAY@GONZ', mk: 'spread', side: 'away' }, { k: 'nba|DAL@MIN', mk: 'ml', side: 'away' }, { k: 'ncaab|BAY@GONZ', mk: 'total', side: 'over' }].slice(0, 3).concat([]));
const r1 = r;
T('BUF ML and BAY +3.5 from the Scout, DAL from the Dog: placed from the room\'s bankroll, each leg tagged with its character', r.status === 200 && r.j.bet.dr === did && r.j.bet.legs.map(l => l.v).join() === 'Scout,Scout,Dog' && r.j.dentry.bal === 900, JSON.stringify(r.j));
r = await bet(second, [{ k: 'ncaab|SMU@LSU', mk: 'ml', side: 'home' }, { k: 'ncaab|SMU@LSU', mk: 'total', side: 'under' }, { k: 'nba|DAL@MIN', mk: 'spread', side: 'home' }], 50);
T('the other side: the Judge\'s LSU ML (the board files that game LSU@SMU, so its "away" is the Slate\'s home), the Coach\'s under, the Judge\'s MIN -5.5', r.status === 200 && r.j.bet.legs.map(l => l.v).join() === 'Judge,Coach,Judge', JSON.stringify(r.j));
r = r1;
T('one ticket a day', (await bet(first, [{ k: 'nfl|KC@BUF', mk: 'total', side: 'over' }, { k: 'nba|DAL@MIN', mk: 'ml', side: 'away' }])).status === 400);
T('…and the room isn\'t your wallet: the wallet is untouched (D$975)', r.j.wallet.bal === 975);
/* finals: BUF wins, BAY covers, DAL wins, under hits → cashed */
clock = T3 + 4 * 36e5; ESPN = [ev('KC', 'BUF', 20, 27), ev('BAY', 'GONZ', 70, 72), ev('DAL', 'MIN', 110, 104), ev('SMU', 'LSU', 60, 70)]; A._sc = null; await A.alarm();   /* BUF wins, BAY covers, DAL wins: the first player cashes; LSU wins, the under hits (130), MIN loses: the second's misses */
r = await call2('/acct/me', { token: first }); room = r.j.drafts.find(x => x.did === did); const meRow = room.rows.find(x => x.me);
T('graded like any D$ ticket: cashed into the room\'s bankroll', meRow.bal > 1000 && meRow.w === 1 && meRow.open === 0, JSON.stringify(meRow));
/* the room ends */
clock = room.ends + 60e3; await A.alarm();
r = await call2('/acct/me', { token: first }); room = r.j.drafts.find(x => x.did === did);
T('the room ends: most D$ wins the pot (D$50) and the XP, the result kept', room.status === 'final' && room.results[0].name === (first === tA ? 'Chris' : 'Rival') && room.results[0].prize === 50 && r.j.xp >= 310, JSON.stringify([room.results, r.j.xp]));
/* a room nobody fills is called off and refunded; the creator leaving calls it off too */
r = await call2('/acct/dr/create', { token: tC, fmt: 'pick', size: 2, days: 7, fee: 50 }); const lone = r.j.room.did;
clock += 49 * 36e5; await A.alarm(); r = await call2('/acct/me', { token: tC });
T('a room nobody fills in 48 hours is called off: the fee comes back', r.j.wallet.bal === 1000 && !r.j.drafts.some(x => x.did === lone && x.status === 'open'), JSON.stringify(r.j.wallet));
r = await call2('/acct/dr/create', { token: tC, fmt: 'pick', size: 3, days: 7, fee: 25, priv: true }); const priv = r.j.room.did, code = r.j.room.code;
T('a private room has a code only its maker sees, and isn\'t listed', !!code && !(await get('/acct/dr')).j.rooms.some(x => x.did === priv));
T('…joining takes the code', (await call2('/acct/dr/join', { token: tA, id: priv })).status === 403 && (await call2('/acct/dr/join', { token: tA, code })).status === 200);
r = await call2('/acct/dr/leave', { token: tC, id: priv });
T('the maker leaving before the draft calls it off: everyone\'s fee back', r.j.cancelled && (await call2('/acct/me', { token: tC })).j.wallet.bal === 1000);
/* the team draft (the machine's Team Parlay Challenge) */
clock = Date.parse('2026-11-26T18:00:00Z');
r = await call2('/acct/dr/create', { token: tA, fmt: 'auto', size: 2, days: 7, fee: 0 }); const tdid = r.j.room.did;
T('a team draft: 4 characters each, D$200', r.j.room.per === 4 && r.j.room.bank === 200);
await call2('/acct/dr/join', { token: tB, id: tdid }); await call2('/acct/dr/auto', { token: tA, id: tdid, on: true }); r = await call2('/acct/dr/auto', { token: tB, id: tdid, on: true });
T('both on auto-draft: the draft fills itself, best form first', r.j.room.status === 'live' && r.j.room.picks.length === 8, JSON.stringify(r.j.room.picks));
await A.alarm(); r = await call2('/acct/me', { token: tA });
const auto = r.j.bets.filter(b => b.dr === tdid), par = auto.find(b => b.auto === 'parlay'), sng = auto.filter(b => b.auto === 'single');
T('today\'s tickets go on by themselves: each character\'s best calls, one a game, D$5 on the parlay and D$2 on every single', par && par.stake === 5 && sng.length === par.legs.length && sng.every(b => b.stake === 2 && b.legs.length === 1) && new Set(par.legs.map(l => l.k)).size === par.legs.length, JSON.stringify(auto.map(b => [b.auto, b.stake, b.legs.map(l => l.pick + '/' + l.v)])));
await A.alarm(); r = await call2('/acct/me', { token: tA });
T('…once a day (the next pass doesn\'t place them again)', r.j.bets.filter(b => b.dr === tdid).length === auto.length);
T('a head-to-head ticket can\'t be placed in a team draft', (await call2('/acct/bet', { token: tA, stake: 10, dr: tdid, legs: [{ k: 'nfl|KC@BUF', mk: 'ml', side: 'home' }, { k: 'nba|DAL@MIN', mk: 'ml', side: 'home' }] })).status === 400);
console.log(`${pass} pass / ${fail} fail`); process.exit(fail ? 1 : 0);
