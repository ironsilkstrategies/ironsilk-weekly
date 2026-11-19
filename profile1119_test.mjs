/* v3.3 · the chat server's growth pieces (Nov 19, the playbook): where a member came from (?src= at sign-up, counted in Admin),
   the Open Scoreboard (a public record a member switches on, or the desk verifies as a capper), and what stays private. */
import { Accounts, srcTag } from './chat/worker.mjs';
let pass = 0, fail = 0; const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  — ' + String(x ?? '').slice(0, 300))); };
function storage() { const m = new Map(); let alarm = null;
  return { m, get: async k => m.get(k), put: async (k, v) => { m.set(k, structuredClone(v)); }, delete: async k => { for (const x of [].concat(k)) m.delete(x); },
    list: async ({ prefix = '', limit } = {}) => { let ks = [...m.keys()].sort().filter(k => k.startsWith(prefix)); if (limit) ks = ks.slice(0, limit); return new Map(ks.map(k => [k, m.get(k)])); },
    getAlarm: async () => alarm, setAlarm: async t => { alarm = t; } }; }
let clock = Date.parse('2026-11-19T18:00:00Z'); const env = { ALLOW_ORIGINS: 'https://ironsilkweekly.com', ADMIN_CODE: 'OWNER-CODE-THAT-IS-LONG-ENOUGH-1' };
const ctx = { storage: storage() }; const A = new Accounts(ctx, env, { now: () => clock });
let ipn = 1; const call = async (path, body, method = 'POST') => { const r = await A.fetch(new Request('https://x.test' + path, method === 'GET' ? { method: 'GET' } : { method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': '10.0.0.' + (ipn++ % 250) }, body: JSON.stringify(body) })); return { status: r.status, j: await r.json() }; };
T('srcTag keeps a short, plain tag and drops the rest', srcTag('TT') === 'tt' && srcTag('x<script>') === 'xscript' && srcTag('') === null && srcTag('a'.repeat(40)).length === 24);
const a1 = await call('/acct/signup', { name: 'BigShot', pass: 'longenough1', age21: true, src: 'TT' });
const a2 = await call('/acct/signup', { name: 'Quiet One', pass: 'longenough1', age21: true });
const a3 = await call('/acct/signup', { name: 'Xfan', pass: 'longenough1', age21: true, src: 'x' });
T('sign-up keeps where the member came from', a1.status === 200 && (await ctx.storage.get('u:bigshot')).src === 'tt' && !(await ctx.storage.get('u:quiet one')).src && (await ctx.storage.get('u:xfan')).src === 'x');
const own = await call('/acct/login', { name: 'TheDesk', pass: env.ADMIN_CODE }); const OT = own.j.token;
const st = await call('/acct/admin', { token: OT, act: 'stats' });
T('Admin counts members by source (no tag = direct), and the week\'s new ones', st.j.k.bySrc && st.j.k.bySrc.tt === 1 && st.j.k.bySrc.x === 1 && st.j.k.bySrc.direct === 1 && st.j.k.src7.tt === 1, JSON.stringify(st.j.k.bySrc));
T('…and each member row says where they came from', st.j.users.find(u => u.name === 'BigShot').src === 'tt');
/* settled and open bets, put straight into storage the way the server keeps them */
const leg = (pick, t, res) => ({ k: 'nfl|BUF@MIA', sp: 'nfl', t, game: 'BUF@MIA', mk: 'spread', side: 'away', line: -3.5, price: -110, pick, res });
await ctx.storage.put('b:bigshot:b1', { id: 'b1', ts: clock - 5 * 864e5, stake: 50, mode: 'parlay', dec: 1.909, toWin: 45.45, legs: [leg('BUF -3.5', clock - 5 * 864e5 + 2 * 36e5, 'hit')], status: 'won', back: 95.45, done: clock - 4 * 864e5 });
await ctx.storage.put('b:bigshot:b2', { id: 'b2', ts: clock - 3 * 864e5, stake: 20, mode: 'parlay', dec: 1.909, toWin: 18.18, legs: [leg('MIA +3.5', clock - 3 * 864e5 + 36e5, 'miss')], status: 'lost', back: 0, done: clock - 2 * 864e5 });
await ctx.storage.put('b:bigshot:b3', { id: 'b3', ts: clock - 36e5, stake: 25, mode: 'parlay', dec: 1.909, toWin: 22.7, legs: [leg('KC ML', clock + 5 * 36e5, null)], status: 'open', run: 'r1' });
let pr = await call('/acct/u?name=BigShot', null, 'GET');
T('a private record shows only the totals the leaderboard already shows', pr.status === 200 && pr.j.private === true && pr.j.w === 1 && pr.j.l === 1 && !pr.j.settled && !pr.j.open, JSON.stringify(pr.j));
T('…the record counts every settled bet, with its ROI', Math.abs(pr.j.roi - Math.round(1000 * (95.45 - 70) / 70) / 10) < 1e-9, pr.j.roi);
const pub = await call('/acct/pub', { token: a1.j.token, on: true, open: false });
T('a member switches their record public', pub.status === 200 && pub.j.pub === true && pub.j.open === false);
pr = await call('/acct/u?name=bigshot', null, 'GET');
T('…then anyone sees every settled bet, newest first, with when it was placed and when each game started', !pr.j.private && pr.j.settled.length === 2 && pr.j.settled[0].status === 'lost' && pr.j.settled[1].legs[0].t > pr.j.settled[1].ts && pr.j.settled[1].back === 95.45, JSON.stringify(pr.j.settled));
T('…open bets stay hidden unless they choose to show them', pr.j.open === null && pr.j.openHidden === true);
await call('/acct/pub', { token: a1.j.token, on: true, open: true }); pr = await call('/acct/u?name=BigShot', null, 'GET');
T('…and show when they do (marked as a challenge bet)', pr.j.open.length === 1 && pr.j.open[0].legs[0].pick === 'KC ML' && pr.j.open[0].ctx === 'challenge');
T('…nothing private rides along (no ids, tokens, password data or wallet internals)', !/salt|hash|token|"id"|"k":/.test(JSON.stringify(pr.j)), JSON.stringify(pr.j).slice(0, 300));
await call('/acct/pub', { token: a1.j.token, on: false, open: true }); pr = await call('/acct/u?name=BigShot', null, 'GET');
T('switching it off makes it private again (and open bets can\'t stay on alone)', pr.j.private === true && (await ctx.storage.get('u:bigshot')).pubOpen === false);
/* the desk verifies a capper */
const cap = await call('/acct/admin', { token: OT, act: 'cap', name: 'Xfan', on: true });
T('the owner verifies a capper: the ✔ and a public record', cap.j.cap === true && cap.j.pub === true);
pr = await call('/acct/u?name=Xfan', null, 'GET'); T('…their profile carries the ✔', pr.j.cap === true && !pr.j.private);
T('…a member can\'t verify anyone', (await call('/acct/admin', { token: a1.j.token, act: 'cap', name: 'BigShot', on: true })).status === 403);
const bd = await call('/acct/board', null, 'GET'); const xr = bd.j.rows.find(r => r.name === 'Xfan'), br = bd.j.rows.find(r => r.name === 'BigShot');
T('the leaderboard marks public records (so names can link to them) and verified cappers', xr && xr.pub === true && xr.cap === true && br && !br.pub, JSON.stringify(bd.j.rows));
const me = await call('/acct/me', { token: a3.j.token }); T('a member\'s own page knows its switches', me.j.pub === true && me.j.cap === true && me.j.pubOpen === false);
/* what doesn't resolve */
T('no such member → 404', (await call('/acct/u?name=Nobody', null, 'GET')).status === 404);
T('a junk name → 404, nothing looked up', (await call('/acct/u?name=' + encodeURIComponent('<script>'), null, 'GET')).status === 404);
await ctx.storage.put('X:xfan', { at: clock }); T('a suspended member\'s record is gone', (await call('/acct/u?name=Xfan', null, 'GET')).status === 404);
console.log(`${pass} pass / ${fail} fail`); process.exit(fail ? 1 : 0);
