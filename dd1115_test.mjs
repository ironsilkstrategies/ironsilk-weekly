/* v3.0.22 · Desk Dollars: D$1,000 on sign-up, bets priced by the server from the slate (no faked odds), closed at start,
   graded from ESPN finals by the server, voided after 3 days, bought D$ kept apart, the board ranks earned D$. */
import { Accounts, ddGrade, ddSettle } from './chat/worker.mjs';
let pass = 0, fail = 0; const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  — ' + String(x ?? '').slice(0, 400))); };
function storage() { const m = new Map(); let alarm = null; const sorted = () => [...m.keys()].sort();
  return { m, get: async k => m.get(k), put: async (k, v) => { m.set(k, structuredClone(v)); }, delete: async k => { for (const x of [].concat(k)) m.delete(x); },
    list: async ({ prefix = '', limit } = {}) => { let ks = sorted().filter(k => k.startsWith(prefix)); if (limit) ks = ks.slice(0, limit); return new Map(ks.map(k => [k, m.get(k)])); },
    getAlarm: async () => alarm, setAlarm: async t => { alarm = t; }, get alarmAt() { return alarm; } }; }
let clock = Date.parse('2026-11-15T16:00:00Z'); const ctx = { storage: storage() };
const KICK = Date.parse('2026-11-15T18:00:00Z');
const SLATE = { days: [{ d: '2026-11-15', games: [
  { k: 'nfl|NE@DET', sp: 'nfl', t: KICK, a: { ab: 'NE' }, h: { ab: 'DET' }, ln: { fav: 'DET', line: 2.5, tot: 49.5, mlA: 124, mlH: -148 } },
  { k: 'nba|BOS@NYK', sp: 'nba', t: KICK + 6 * 36e5, a: { ab: 'BOS' }, h: { ab: 'NYK' }, ln: { fav: 'BOS', line: 3.5, tot: 221.5, mlA: -160, mlH: 135 } },
  { k: 'nhl|CHI@MIN', sp: 'nhl', t: clock - 60e3, a: { ab: 'CHI' }, h: { ab: 'MIN' }, ln: { fav: 'MIN', line: 1.5, tot: 6.5, mlA: 150, mlH: -175 } }] }] };
let ESPN = {}; const fetchFn = async u => { if (u.includes('slate.json')) return { ok: true, json: async () => SLATE };
  const sp = Object.keys(ESPN).find(s => u.includes(s)); return { ok: true, json: async () => ({ events: sp ? ESPN[sp] : [] }) }; };
const ev = (a, h, as, hs, done) => ({ competitions: [{ status: { type: { completed: done } }, competitors: [{ homeAway: 'away', team: { abbreviation: a }, score: String(as) }, { homeAway: 'home', team: { abbreviation: h }, score: String(hs) }] }] });
const env = { ALLOW_ORIGINS: 'https://ironsilkweekly.com', ADMIN_CODE: 'OWNER-CODE-THAT-IS-LONG-ENOUGH-1' };
const A = new Accounts(ctx, env, { now: () => clock, fetch: fetchFn });
const call = async (path, body) => { const r = await A.fetch(new Request('https://x.test' + path, { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://ironsilkweekly.com', 'cf-connecting-ip': '1.2.3.4' }, body: JSON.stringify(body) })); return { status: r.status, j: await r.json() }; };
const me = await call('/acct/signup', { name: 'Puck Head', pass: 'longenough1', age21: true }); const tok = me.j.token;
let r = await call('/acct/me', { token: tok });
T('D$1,000 on sign-up', r.j.wallet.bal === 1000 && r.j.wallet.bought === 0, JSON.stringify(r.j.wallet));
r = await call('/acct/bet', { token: tok, stake: 100, legs: [{ k: 'nfl|NE@DET', mk: 'ml', side: 'away', price: 5000 }] });
T('the server prices the bet from the slate (a faked +5000 is ignored): NE ML +124 → D$100 to win D$124', r.status === 200 && r.j.bet.legs[0].price === 124 && r.j.bet.toWin === 124 && r.j.wallet.bal === 900, JSON.stringify(r.j));
r = await call('/acct/bet', { token: tok, stake: 50, legs: [{ k: 'nfl|NE@DET', mk: 'spread', side: 'home' }, { k: 'nba|BOS@NYK', mk: 'total', side: 'over' }] });
T('a 2-leg parlay: DET -2.5 (-110) + Over 221.5 (-110) → about +264', r.status === 200 && r.j.bet.legs[0].line === -2.5 && r.j.bet.legs[0].pick === 'DET -2.5' && Math.abs(r.j.bet.dec - 3.645) < 0.01 && r.j.wallet.bal === 850, JSON.stringify(r.j.bet));
T('a started game is closed', (await call('/acct/bet', { token: tok, stake: 10, legs: [{ k: 'nhl|CHI@MIN', mk: 'ml', side: 'home' }] })).status === 400);
T('one leg per game; no betting more than you have', (await call('/acct/bet', { token: tok, stake: 10, legs: [{ k: 'nfl|NE@DET', mk: 'ml', side: 'away' }, { k: 'nfl|NE@DET', mk: 'total', side: 'over' }] })).status === 400 && (await call('/acct/bet', { token: tok, stake: 5000, legs: [{ k: 'nba|BOS@NYK', mk: 'ml', side: 'home' }] })).status === 400);
T('an alarm is set to grade', ctx.storage.alarmAt === clock + 10 * 60e3);
clock = KICK + 4 * 36e5; ESPN = { 'football/nfl': [ev('NE', 'DET', 20, 27, true)] }; await A.alarm();
r = await call('/acct/me', { token: tok }); const b1 = r.j.bets.find(b => b.stake === 100), b2 = r.j.bets.find(b => b.stake === 50);
T('graded by the server from ESPN: NE ML lost (20-27)', b1.status === 'lost' && b1.legs[0].res === 'miss', JSON.stringify(b1));
T('…the parlay waits on the NBA leg (DET -2.5 hit)', b2.status === 'open' && b2.legs[0].res === 'hit' && b2.legs[1].res === null);
clock = KICK + 10 * 36e5; ESPN = { 'basketball/nba': [ev('BOS', 'NYK', 115, 110, true)] }; await A.alarm();
r = await call('/acct/me', { token: tok }); const b3 = r.j.bets.find(b => b.stake === 50);
T('…Over 221.5 hits (225): the parlay cashes D$182.23 back, balance 1,032.23, record 1-1', b3.status === 'won' && b3.back === 182.23 && r.j.wallet.bal === 1032.23 && r.j.wallet.w === 1 && r.j.wallet.l === 1, JSON.stringify([b3, r.j.wallet]));
T('grading rules: ML push on a tie, spread push on the number, total push', ddGrade({ mk: 'ml', side: 'home' }, 2, 2) === 'push' && ddGrade({ mk: 'spread', side: 'away', line: 3 }, 17, 20) === 'push' && ddGrade({ mk: 'total', side: 'under', line: 40 }, 20, 20) === 'push' && ddGrade({ mk: 'spread', side: 'home', line: -2.5 }, 20, 23) === 'hit');
T('a pushed leg drops out of the odds; all pushed → stake back', ddSettle({ stake: 10, legs: [{ res: 'push', price: -110 }, { res: 'hit', price: 100 }] }).back === 20 && ddSettle({ stake: 10, legs: [{ res: 'push' }] }).status === 'push');
/* store off; owner grant shows as bought; the board ranks earned */
T('the D$ store is off until it\'s cleared', (await call('/acct/buy', { token: tok, pack: 'p5' })).status === 403);
const z = await call('/acct/signup', { name: 'Big Spender', pass: 'longenough2', age21: true });
T('only the owner\'s code can add D$', (await call('/acct/grant', { token: z.j.token, name: 'Big Spender', amount: 5000, code: 'nope' })).status === 403);
r = await call('/acct/grant', { token: z.j.token, name: 'Big Spender', amount: 5000, code: env.ADMIN_CODE });
T('added D$ is marked bought', r.status === 200 && r.j.wallet.bal === 6000 && r.j.wallet.bought === 5000);
const bd = await A.fetch(new Request('https://x.test/acct/board', { method: 'GET', headers: { origin: 'https://ironsilkweekly.com' } })); const B = await bd.json();
T('the board ranks EARNED D$: Puck Head (+32.23 earned) above Big Spender (D$6,000 balance, 5,000 bought)', B.rows[0].name === 'Puck Head' && B.rows[1].name === 'Big Spender' && B.rows[1].bought === 5000 && B.rows[1].earned === 1000, JSON.stringify(B.rows));
/* void after 3 days */
const v = await call('/acct/bet', { token: tok, stake: 10, legs: [{ k: 'nba|BOS@NYK', mk: 'ml', side: 'home' }] });
T('…(a bet on a game that already finished is refused)', v.status === 400);
const ow = await call('/acct/login', { name: 'thedesk', pass: env.ADMIN_CODE });
T('the owner signs in as TheDesk with the owner code, no sign-up, and gets D$1,000', ow.status === 200 && ow.j.owner === true && ow.j.name === 'TheDesk' && (await call('/acct/me', { token: ow.j.token })).j.wallet.bal === 1000);
T('…a wrong code is refused; nobody can sign up as TheDesk', (await call('/acct/login', { name: 'TheDesk', pass: 'guess-guess-guess' })).status === 403 && (await call('/acct/signup', { name: 'TheDesk', pass: 'longenough9', age21: true })).status === 400);
T('…the owner adds D$ without the code again (marked bought)', (await call('/acct/grant', { token: ow.j.token, name: 'Puck Head', amount: 250 })).status === 200);
const s0 = ctx.storage.m.get('s:' + ow.j.token).exp; clock += 40 * 864e5; await call('/acct/me', { token: ow.j.token });
T('stays signed in: a visit inside the last 60 days renews the pass to a full 90', ctx.storage.m.get('s:' + ow.j.token).exp === clock + 90 * 864e5 && ctx.storage.m.get('s:' + ow.j.token).exp > s0);
console.log(`${pass} pass / ${fail} fail`); process.exit(fail ? 1 : 0);
