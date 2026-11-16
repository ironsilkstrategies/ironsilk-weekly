/* v3.1.0 · Challenges (1,000 from the library) + desk-run Leagues on the server. */
import { Accounts } from './chat/worker.mjs';
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
const evL = (a, h, as, hs) => ({ competitions: [{ status: { type: { completed: false } }, competitors: [{ homeAway: 'away', team: { abbreviation: a }, score: String(as) }, { homeAway: 'home', team: { abbreviation: h }, score: String(hs) }] }] });
const a = await sign('Over Guy'); clock = day(0, 23);
const o = await call('/acct/bet', { token: a, stake: 10, legs: [{ k: 'nhl|CHI@MIN', mk: 'total', side: 'over' }] });
const u = await call('/acct/bet', { token: a, stake: 10, legs: [{ k: 'nhl|CHI@MIN', mk: 'total', side: 'under' }] });
clock = day(0, 25.6); ESPN = { 'hockey/nhl': [evL('CHI', 'MIN', 4, 3)] }; await A.alarm();
const B = (await call('/acct/me', { token: a })).j.bets;
T('an over that clears 6.5 mid-game (4-3 in the 2nd) is paid right away', B.find(x => x.id === o.j.bet.id).status === 'won', JSON.stringify(B.map(x => [x.status, x.legs[0].res])));
T('…and the under on the same game is lost right away', B.find(x => x.id === u.j.bet.id).status === 'lost');
console.log(`${pass} pass / ${fail} fail`); process.exit(fail ? 1 : 0);
