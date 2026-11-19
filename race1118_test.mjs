/* v3.2 · two server fixes from the Nov 18 audit: a D$ bet reads the wallet only after the lines are fetched (a Durable Object lets
   another request in only during outside I/O, so read-check-write is then atomic), and one connection can make at most 10 accounts a day */
import { Accounts } from './chat/worker.mjs';
let pass = 0, fail = 0; const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  — ' + String(x ?? '').slice(0, 300))); };
const order = []; function storage() { const m = new Map(); let alarm = null;
  return { m, get: async k => { order.push('get ' + k.split(':')[0]); return m.get(k); }, put: async (k, v) => { m.set(k, structuredClone(v)); }, delete: async k => { for (const x of [].concat(k)) m.delete(x); },
    list: async ({ prefix = '', limit } = {}) => { let ks = [...m.keys()].sort().filter(k => k.startsWith(prefix)); if (limit) ks = ks.slice(0, limit); return new Map(ks.map(k => [k, m.get(k)])); },
    getAlarm: async () => alarm, setAlarm: async t => { alarm = t; } }; }
const clock = Date.parse('2026-11-18T16:00:00Z'); const KICK = clock + 3 * 36e5;
const SLATE = { days: [{ d: '2026-11-18', games: [{ k: 'nba|BOS@NYK', sp: 'nba', t: KICK, a: { ab: 'BOS' }, h: { ab: 'NYK' }, ln: { fav: 'BOS', line: 3.5, tot: 221.5, mlA: -160, mlH: 135 } }] }] };
const fetchFn = async u => { order.push('fetch ' + (u.includes('slate') ? 'slate' : 'other')); await new Promise(r => setTimeout(r, 5)); return { ok: true, json: async () => SLATE }; };
const env = { ALLOW_ORIGINS: 'https://ironsilkweekly.com', ADMIN_CODE: 'OWNER-CODE-THAT-IS-LONG-ENOUGH-1' };
const ctx = { storage: storage() }; const A = new Accounts(ctx, env, { now: () => clock, fetch: fetchFn });
const call = async (path, body, ip = '1.2.3.4') => { const r = await A.fetch(new Request('https://x.test' + path, { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://ironsilkweekly.com', 'cf-connecting-ip': ip }, body: JSON.stringify(body) })); return { status: r.status, j: await r.json() }; };
const me = await call('/acct/signup', { name: 'Race Tester', pass: 'longenough1', age21: true }); const tok = me.j.token;
order.length = 0; A._sl = null;   /* a cold cache: the lines have to be fetched for this bet */
const r = await call('/acct/bet', { token: tok, stake: 100, legs: [{ k: 'nba|BOS@NYK', mk: 'ml', side: 'home' }] });
const iF = order.indexOf('fetch slate'), iU = order.findIndex(x => x === 'get u');
T('the bet still goes through', r.status === 200 && r.j.wallet.bal === 900, JSON.stringify(r.j).slice(0, 200));
T('the lines are fetched before the wallet is read (no outside I/O between read and write)', iF >= 0 && iU > iF, order.join(' → '));
const after = order.slice(iU); T('…and nothing after reading the wallet waits on the network', !after.some(x => x.startsWith('fetch')), after.join(' → '));
T('a bet with no legs is refused before anything is read', (await call('/acct/bet', { token: tok, stake: 5, legs: [] })).j.error === 'add a leg');
/* sign-ups: 10 a day from one connection */
let ok = 0, last = null; for (let i = 0; i < 11; i++) { last = await call('/acct/signup', { name: 'Farm' + i, pass: 'longenough1', age21: true }, '9.9.9.9'); if (last.status === 200) ok++; }
T('one connection can make 10 accounts in a day…', ok === 10, ok);
T('…the 11th is told to wait until tomorrow', last.status === 429 && /tomorrow/.test(last.j.error), JSON.stringify(last.j));
T('another connection is not affected', (await call('/acct/signup', { name: 'Elsewhere', pass: 'longenough1', age21: true }, '8.8.8.8')).status === 200);
const A2 = new Accounts(ctx, env, { now: () => clock + 25 * 36e5, fetch: fetchFn });
const r2 = await A2.fetch(new Request('https://x.test/acct/signup', { method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': '9.9.9.9' }, body: JSON.stringify({ name: 'NextDay', pass: 'longenough1', age21: true }) }));
T('the next day it opens again', r2.status === 200);
console.log(`${pass} pass / ${fail} fail`); process.exit(fail ? 1 : 0);
