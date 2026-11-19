/* v3.2 · a chat name belongs to the phone that claimed it (Nov 19, Chris: "Lock names to the device"). Before: anyone holding the same
   multi-use invite code could take over a name another member already used. */
import { Room } from './chat/worker.mjs';
let pass = 0, fail = 0; const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  — ' + String(x ?? '').slice(0, 300))); };
function storage() { const m = new Map(); const sorted = () => [...m.keys()].sort();
  return { m, get: async k => m.get(k), put: async (k, v) => { m.set(k, structuredClone(v)); }, delete: async k => { for (const x of [].concat(k)) m.delete(x); },
    list: async ({ prefix = '', reverse = false, limit } = {}) => { let ks = sorted().filter(k => k.startsWith(prefix)); if (reverse) ks.reverse(); if (limit) ks = ks.slice(0, limit); return new Map(ks.map(k => [k, m.get(k)])); } }; }
let clock = Date.parse('2026-11-19T15:00:00Z'); const ctx = { storage: storage(), getWebSockets: () => [], acceptWebSocket() { } };
const ADMIN = 'DESK-TEST-ADMIN-CODE-1234567890';
const room = new Room(ctx, { ADMIN_CODE: ADMIN, ALLOW_ORIGINS: 'https://ironsilkweekly.com' }, { now: () => clock });
const call = async (path, body, ip = '203.0.113.5') => { const r = await room.fetch(new Request('https://chat.test' + path, { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://ironsilkweekly.com', 'cf-connecting-ip': ip }, body: JSON.stringify(body) })); return { status: r.status, j: await r.json() }; };
const own = await call('/chat/join', { code: ADMIN }); const inv = await call('/chat/mod', { token: own.j.token, act: 'invite', uses: 3 }); const CODE = inv.j.code;
const a = await call('/chat/join', { name: 'Hoops Fan', code: CODE }, '198.51.100.1');
T('the first phone to claim a name gets its private key', a.status === 200 && typeof a.j.nameKey === 'string' && a.j.nameKey.length >= 20, JSON.stringify(a.j));
T('…and only a hash of it is kept on the server', !JSON.stringify([...ctx.storage.m.values()]).includes(a.j.nameKey));
const thief = await call('/chat/join', { name: 'hoops fan', code: CODE }, '198.51.100.9');
T('someone else with the SAME invite code can\'t take the name', thief.status === 409 && /belongs to another member/.test(thief.j.error), JSON.stringify(thief.j));
const forged = await call('/chat/join', { name: 'Hoops Fan', code: CODE, nameKey: 'x'.repeat(24) }, '198.51.100.9');
T('…nor with a made-up key', forged.status === 409);
const back = await call('/chat/join', { name: 'Hoops Fan', code: CODE, nameKey: a.j.nameKey }, '198.51.100.1');
T('the owner of the name comes back with its key (a new 30-day pass)', back.status === 200 && back.j.name === 'Hoops Fan' && back.j.nameKey === a.j.nameKey);
T('…and coming back never uses up an invite', (await ctx.storage.get('i:' + CODE)).used === 1, JSON.stringify(await ctx.storage.get('i:' + CODE)));
/* a name claimed before the lock: the code still decides once, then it locks */
await ctx.storage.put('n:old timer', { code: CODE, at: clock - 864e5 });
const old1 = await call('/chat/join', { name: 'Old Timer', code: CODE }, '198.51.100.2');
T('a name from before the lock keeps working with its code — and gets locked now', old1.status === 200 && !!old1.j.nameKey && !!(await ctx.storage.get('n:old timer')).kh);
T('…after which the code alone no longer opens it', (await call('/chat/join', { name: 'Old Timer', code: CODE }, '198.51.100.3')).status === 409);
/* the owner frees a name for a member on a new phone */
const fr = await call('/chat/adm', { admin: ADMIN, act: 'free', name: 'Hoops Fan' });
T('the owner frees a name (Admin → Chat → Free a name)', fr.status === 200 && fr.j.had === true);
const newPhone = await call('/chat/join', { name: 'Hoops Fan', code: CODE }, '198.51.100.7');
T('…and the next phone to join with it claims it, with a fresh key', newPhone.status === 200 && newPhone.j.nameKey && newPhone.j.nameKey !== a.j.nameKey);
T('…the old key no longer opens it', (await call('/chat/join', { name: 'Hoops Fan', code: CODE, nameKey: a.j.nameKey }, '198.51.100.1')).status === 409);
T('freeing a name nobody holds says so', (await call('/chat/adm', { admin: ADMIN, act: 'free', name: 'Nobody Here' })).j.had === false);
T('only the owner can free names', (await call('/chat/adm', { admin: 'wrong-code', act: 'free', name: 'Hoops Fan' })).status === 403);
/* invite limits still hold for NEW names, and wrong keys count toward the 15-minute lockout */
const c3 = await call('/chat/join', { name: 'Third Fan', code: CODE }, '198.51.100.4');
T('new names still use up the invite (3 uses: Hoops Fan, Hoops Fan again after the free, Third Fan)', c3.status === 200 && (await call('/chat/join', { name: 'Fourth Fan', code: CODE }, '198.51.100.5')).status === 403);
for (let i = 0; i < 8; i++) await call('/chat/join', { name: 'Third Fan', code: CODE, nameKey: 'guess' + i }, '198.51.100.66');
T('guessing a name\'s key locks that connection out for 15 minutes', (await call('/chat/join', { name: 'Third Fan', code: CODE, nameKey: c3.j.nameKey }, '198.51.100.66')).status === 429);
console.log(`${pass} pass / ${fail} fail`); process.exit(fail ? 1 : 0);
