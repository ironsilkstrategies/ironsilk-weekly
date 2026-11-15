/* v3.1.1 · the owner's dashboard on the server: stats, members, money/XP adjustments, suspensions, the inbox, owner-only. */
import { Accounts, Room } from './chat/worker.mjs';
let pass = 0, fail = 0; const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  — ' + String(x ?? '').slice(0, 400))); };
function storage() { const m = new Map(); let alarm = null; const sorted = () => [...m.keys()].sort();
  return { m, get: async k => structuredClone(m.get(k)), put: async (k, v) => { m.set(k, structuredClone(v)); }, delete: async k => { for (const x of [].concat(k)) m.delete(x); },
    list: async ({ prefix = '', limit } = {}) => { let ks = sorted().filter(k => k.startsWith(prefix)); if (limit) ks = ks.slice(0, limit); return new Map(ks.map(k => [k, structuredClone(m.get(k))])); },
    getAlarm: async () => alarm, setAlarm: async t => { alarm = t; } }; }
let clock = Date.parse('2026-11-16T16:00:00Z');
const env = { ALLOW_ORIGINS: 'https://ironsilkweekly.com', ADMIN_CODE: 'OWNER-CODE-THAT-IS-LONG-ENOUGH-1' };
const room = new Room({ storage: storage(), getWebSockets: () => [] }, env, { now: () => clock });
env.ROOM = { idFromName: () => 1, get: () => ({ fetch: r => room.fetch(r) }) };
const A = new Accounts({ storage: storage() }, env, { now: () => clock });
const call = async (path, body) => { const r = await A.fetch(new Request('https://x.test' + path, { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://ironsilkweekly.com', 'cf-connecting-ip': '9.9.9.' + Math.floor(Math.random() * 250) }, body: JSON.stringify(body) })); return { status: r.status, j: await r.json() }; };
const a = (await call('/acct/signup', { name: 'Puck Head', pass: 'longenough1', age21: true })).j.token, bb = (await call('/acct/signup', { name: 'Lounge Lizard', pass: 'longenough1', age21: true })).j.token;
const own = (await call('/acct/login', { name: 'TheDesk', pass: env.ADMIN_CODE })).j.token;
await call('/acct/me', { token: a });
T('members can\'t open the dashboard', (await call('/acct/admin', { token: a, act: 'stats' })).status === 403);
let r = await call('/acct/admin', { token: own, act: 'stats' });
T('stats: members, new and active, D$ in wallets, the 14-day chart, every member with balance and last seen', r.status === 200 && r.j.k.members === 3 && r.j.k.new1 === 3 && r.j.k.act1 >= 1 && r.j.k.dd === 3000 && r.j.days.length === 14 && r.j.users.find(u => u.name === 'Puck Head').seen === clock, JSON.stringify(r.j.k));
T('…chat stats come through from the lounge', r.j.k.chatTotal === 0 && r.j.k.bans === 0);
T('give D$ as a prize: it lands as earned, with a note in their log', (await call('/acct/admin', { token: own, act: 'grant', name: 'Puck Head', amount: 250, kind: 'prize' })).j.wallet.prize === 250 && (await call('/acct/me', { token: a })).j.wallet.bal === 1250 && (await call('/acct/me', { token: a })).j.xplog[0].why === '🎁 From the desk');
T('take D$ and give XP', (await call('/acct/admin', { token: own, act: 'take', name: 'Puck Head', amount: 50 })).j.wallet.bal === 1200 && (await call('/acct/admin', { token: own, act: 'xp', name: 'Puck Head', amount: 300 })).j.xp === 300);
/* inbox */
r = await call('/acct/inbox/send', { token: bb, text: 'How do I join the league?' });
T('a member writes the desk', r.status === 200 && r.j.inbox.msgs[0].from === 'me');
r = await call('/acct/admin', { token: own, act: 'inbox' });
T('the inbox shows the thread, unread', r.j.threads[0].name === 'Lounge Lizard' && r.j.threads[0].unread === 1 && /join the league/.test(r.j.threads[0].preview));
await call('/acct/admin', { token: own, act: 'thread', name: 'lounge lizard' });
r = await call('/acct/admin', { token: own, act: 'reply', name: 'Lounge Lizard', text: 'Compete → Leagues → Join.' });
T('the desk replies; the member sees it as unread', r.j.thread.msgs.length === 2 && (await call('/acct/me', { token: bb })).j.inbox.unread === 1 && (await call('/acct/admin', { token: own, act: 'inbox' })).j.threads[0].unread === 0);
T('a broadcast reaches every member', (await call('/acct/admin', { token: own, act: 'broadcast', text: 'Leagues open Friday.' })).j.n === 2 && (await call('/acct/me', { token: a })).j.inbox.msgs.at(-1).text === 'Leagues open Friday.');
/* moderation */
T('member detail: wallet, XP, sessions, inbox', (r = await call('/acct/admin', { token: own, act: 'user', name: 'Lounge Lizard' })).j.user.sessions === 1 && r.j.inbox.length === 3);
await call('/acct/admin', { token: own, act: 'suspend', name: 'Lounge Lizard', why: 'spam' });
T('suspend: signed out everywhere, can\'t sign back in, banned from the chat', (await call('/acct/me', { token: bb })).status === 401 && (await call('/acct/login', { name: 'Lounge Lizard', pass: 'longenough1' })).status === 403 && (await call('/acct/admin', { token: own, act: 'chat' })).j.bans.includes('lounge lizard'));
await call('/acct/admin', { token: own, act: 'unsuspend', name: 'Lounge Lizard' });
T('unsuspend: they can sign in again, and the chat ban lifts', (await call('/acct/login', { name: 'Lounge Lizard', pass: 'longenough1' })).status === 200 && !(await call('/acct/admin', { token: own, act: 'chat' })).j.bans.includes('lounge lizard'));
T('chat invites from the dashboard', /^DESK-/.test((await call('/acct/admin', { token: own, act: 'chat', sub: 'invite', uses: 10 })).j.code));
T('the league switch: members can open leagues once it\'s on', (await call('/acct/admin', { token: own, act: 'cfg', lgOpen: true })).j.cfg.lgOpen === true && (await call('/acct/me', { token: a })).j.lgOpen === true);
T('delete a member', (await call('/acct/admin', { token: own, act: 'delete', name: 'Puck Head' })).status === 200 && (await call('/acct/admin', { token: own, act: 'stats' })).j.k.members === 2);
console.log(`${pass} pass / ${fail} fail`); process.exit(fail ? 1 : 0);
