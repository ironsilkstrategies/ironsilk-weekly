/* v3.0.21 · accounts on our Cloudflare (chat/worker.mjs · Accounts): sign up 21+, passwords hashed, sign in, a 90-day token,
   tickets saved per member (cleaned, capped), nobody reads another member's tickets. Fake Durable Object storage, no network. */
import { Accounts, cleanTicket } from './chat/worker.mjs';
let pass = 0, fail = 0; const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  — ' + String(x ?? '').slice(0, 300))); };
function storage() { const m = new Map(); const sorted = () => [...m.keys()].sort();
  return { m, get: async k => m.get(k), put: async (k, v) => { m.set(k, structuredClone(v)); }, delete: async k => { for (const x of [].concat(k)) m.delete(x); },
    list: async ({ prefix = '' } = {}) => new Map(sorted().filter(k => k.startsWith(prefix)).map(k => [k, m.get(k)])) }; }
let clock = Date.parse('2026-11-15T18:00:00Z'); const ctx = { storage: storage() };
const A = new Accounts(ctx, { ALLOW_ORIGINS: 'https://ironsilkweekly.com' }, { now: () => clock });
const call = async (path, body, ip = '203.0.113.5') => { const r = await A.fetch(new Request('https://x.test' + path, { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://ironsilkweekly.com', 'cf-connecting-ip': ip }, body: JSON.stringify(body) })); return { status: r.status, j: await r.json() }; };
let r = await call('/acct/signup', { name: 'Hoops Fan', pass: 'longenough1' });
T('sign-up needs the 21+ box', r.status === 400 && /21/.test(r.j.error));
r = await call('/acct/signup', { name: 'Hoops Fan', pass: 'short', age21: true });
T('…and a password of 8+', r.status === 400);
const a = await call('/acct/signup', { name: 'Hoops Fan', pass: 'longenough1', age21: true });
T('sign up → a 90-day token', a.status === 200 && a.j.token.length >= 32 && a.j.exp === clock + 90 * 864e5, JSON.stringify(a.j));
const u = ctx.storage.m.get('u:hoops fan');
T('the password is never stored, only a salted hash', u && u.hash && u.salt && !JSON.stringify(u).includes('longenough1'));
T('the name is taken (any case)', (await call('/acct/signup', { name: 'hoops fan', pass: 'another123', age21: true })).status === 409);
T('a wrong password is refused', (await call('/acct/login', { name: 'Hoops Fan', pass: 'wrongwrong' })).status === 403);
const l = await call('/acct/login', { name: 'HOOPS FAN', pass: 'longenough1' });
T('the right one signs in (name any case)', l.status === 200 && l.j.name === 'Hoops Fan');
for (let i = 0; i < 8; i++) await call('/acct/login', { name: 'Hoops Fan', pass: 'x' + i + 'xxxxxxx' }, '198.51.100.9');
T('8 misses from one address → wait 15 minutes', (await call('/acct/login', { name: 'Hoops Fan', pass: 'longenough1' }, '198.51.100.9')).status === 429);
const tk = { id: 't1', ts: clock, title: 'Sunday <b>3-leg</b>', stake: 5, legs: [{ src: 'prop', ref: 'nhl|kk|s|3|over', sp: 'nhl', game: 'CHI@MIN', pick: 'Kirill Kaprizov 3+ SOG', price: -150 }, { src: 'own', pick: 'Bills -3', price: -110 }, { src: 'own', pick: '' }] };
r = await call('/acct/save', { token: l.j.token, ticket: tk });
T('a ticket saves, cleaned: no markup, empty legs dropped', r.status === 200 && r.j.ticket.legs.length === 2 && !/</.test(r.j.ticket.title), JSON.stringify(r.j));
r = await call('/acct/save', { token: l.j.token, ticket: { ...tk, legs: [{ ...tk.legs[0], res: 'hit' }, { ...tk.legs[1], res: 'miss' }] } });
const me = await call('/acct/me', { token: a.j.token });
T('…saving again replaces it; the member sees it on every device', me.status === 200 && me.j.tickets.length === 1 && me.j.tickets[0].legs[0].res === 'hit', JSON.stringify(me.j));
const b = await call('/acct/signup', { name: 'Puck Head', pass: 'longenough2', age21: true });
T('another member sees only their own tickets', (await call('/acct/me', { token: b.j.token })).j.tickets.length === 0);
T('no token, no tickets', (await call('/acct/me', { token: 'nope' })).status === 401);
clock += 91 * 864e5;
T('the token runs out after 90 days', (await call('/acct/me', { token: a.j.token })).status === 401);
T('a ticket with no legs is refused; at most 15 legs', cleanTicket({ id: 'x', legs: [] }) === null && cleanTicket({ id: 'x', legs: Array.from({ length: 30 }, (_, i) => ({ pick: 'p' + i })) }).legs.length === 15);
const b2 = await call('/acct/login', { name: 'Puck Head', pass: 'longenough2' }); b.j.token = b2.j.token;
T('delete my account: needs the password; then the account, tickets and sign-ins are gone', (await call('/acct/close', { token: b.j.token, pass: 'wrong' })).status === 403 && (await call('/acct/close', { token: b.j.token, pass: 'longenough2' })).status === 200 && !ctx.storage.m.has('u:puck head') && (await call('/acct/me', { token: b.j.token })).status === 401 && (await call('/acct/signup', { name: 'Puck Head', pass: 'newpass123', age21: true })).status === 200);
console.log(`${pass} pass / ${fail} fail`); process.exit(fail ? 1 : 0);
