/* v3.5.33 · Nov 26, Chris: "why aren't these graded when they finish" — Thanksgiving Week Classic, SC ML + Over 138.5, SC 80–73 ASU final,
   still open. Neutral site: the slate has SC@ASU, ESPN has ASU@SC, and the settle pass looked up only "SC@ASU". */
import { Accounts } from './chat/worker.mjs';
let pass = 0, fail = 0; const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  — ' + String(x ?? '').slice(0, 400))); };
function storage() { const m = new Map(); let alarm = null; const sorted = () => [...m.keys()].sort();
  return { m, get: async k => m.get(k), put: async (k, v) => { m.set(k, structuredClone(v)); }, delete: async k => { for (const x of [].concat(k)) m.delete(x); },
    list: async ({ prefix = '', limit } = {}) => { let ks = sorted().filter(k => k.startsWith(prefix)); if (limit) ks = ks.slice(0, limit); return new Map(ks.map(k => [k, m.get(k)])); },
    getAlarm: async () => alarm, setAlarm: async t => { alarm = t; }, deleteAlarm: async () => { alarm = null; }, get alarmAt() { return alarm; } }; }
let clock = Date.parse('2026-11-26T15:00:00Z'); const ctx = { storage: storage() };
const TIP = Date.parse('2026-11-26T19:00:00Z');
const SLATE = { days: [{ d: '2026-11-26', games: [
  { k: 'ncaab|SC@ASU', sp: 'ncaab', t: TIP, a: { ab: 'SC' }, h: { ab: 'ASU' }, ln: { fav: 'ASU', line: 4.5, tot: 138.5, mlA: 160, mlH: -190, ov: -115, un: -105 } },
  { k: 'ncaab|SMU@LSU', sp: 'ncaab', t: TIP + 4 * 36e5, a: { ab: 'SMU' }, h: { ab: 'LSU' }, ln: { fav: 'LSU', line: 7.5, tot: 150.5, mlA: 260, mlH: -320 } }] }] };
let ESPN = []; let boom = false; const fetchFn = async u => { if (u.includes('slate.json')) return { ok: true, json: async () => SLATE }; if (boom) throw new Error('network'); return { ok: true, json: async () => ({ events: ESPN }) }; };
const ev = (a, h, as, hs, done) => ({ competitions: [{ status: { type: { completed: done } }, competitors: [{ homeAway: 'away', team: { abbreviation: a }, score: String(as) }, { homeAway: 'home', team: { abbreviation: h }, score: String(hs) }] }] });
const env = { ALLOW_ORIGINS: 'https://ironsilkweekly.com', ADMIN_CODE: 'OWNER-CODE-THAT-IS-LONG-ENOUGH-1' };
const A = new Accounts(ctx, env, { now: () => clock, fetch: fetchFn });
const call = async (path, body) => { const r = await A.fetch(new Request('https://x.test' + path, { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://ironsilkweekly.com', 'cf-connecting-ip': '1.2.3.4' }, body: JSON.stringify(body) })); return { status: r.status, j: await r.json() }; };
const tok = (await call('/acct/signup', { name: 'Turkey Day', pass: 'longenough1', age21: true })).j.token;
let r = await call('/acct/bet', { token: tok, stake: 50, legs: [{ k: 'ncaab|SC@ASU', mk: 'ml', side: 'away' }, { k: 'ncaab|SC@ASU', mk: 'total', side: 'over' }], mode: 'sgp' });
const r2 = await call('/acct/bet', { token: tok, stake: 25, legs: [{ k: 'ncaab|SMU@LSU', mk: 'spread', side: 'away' }] });
T('bets placed (SC ML + Over 138.5; SMU +7.5)', r.status === 200 && r2.status === 200, JSON.stringify([r.j, r2.j]));
clock = TIP + 3 * 36e5; ESPN = [ev('ASU', 'SC', 73, 80, true), ev('SMU', 'LSU', 0, 0, false)]; await A.alarm();
r = await call('/acct/me', { token: tok }); const b = r.j.bets.find(x => x.stake === 50);
T('ESPN lists it ASU@SC — the bet still finds its final: SC ML hits, Over 138.5 hits (153), cashed', b.status === 'won' && b.legs.every(l => l.res === 'hit') && b.back > 50, JSON.stringify(b));
T('the other open bet keeps the settle pass booked', ctx.storage.alarmAt === clock + 10 * 60e3, ctx.storage.alarmAt);
/* a pass that throws still books the next one */
await ctx.storage.setAlarm(null); boom = true; A._sc = null; clock += 20 * 60e3; await A.alarm(); boom = false;
T('a settle pass that hits an error still books its next run', ctx.storage.alarmAt != null, ctx.storage.alarmAt);
clock = TIP + 7 * 36e5; A._sc = null; ESPN = [ev('LSU', 'SMU', 80, 75, true)]; await A.alarm();
r = await call('/acct/me', { token: tok }); const b2 = r.j.bets.find(x => x.stake === 25);
T('the same game ESPN lists as LSU@SMU, LSU 80–75: SMU +7.5 covers', b2.status === 'won' && b2.legs[0].res === 'hit', JSON.stringify(b2));
console.log(`${pass} pass / ${fail} fail`); process.exit(fail ? 1 : 0);
