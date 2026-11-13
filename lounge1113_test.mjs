/* v3.1.3 · Nov 13: "the socials will leave an Easter egg from time to time about the TG public lounge… once the public lounge hits
   100 members the public lounge will be locked and renamed the VIP lounge… and VIP subscribers can utilize the telegram vip."
   The egg plan (two a week, unpredictable), the count and the lock, the routing after it, the door, the owner's /vipinvite, X. Fake Telegram, no network. */
let pass = 0, fail = 0; const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  — ' + String(x ?? '').slice(0, 300))); };
process.env.AUTOPILOT_KEY = 'k'; process.env.TG_BOT_TOKEN = 't'; for (const k of ['FB_PAGE_ID', 'FB_PAGE_TOKEN', 'IG_USER_ID', 'IG_TOKEN', 'THREADS_TOKEN', 'X_API_KEY', 'X_API_SECRET', 'X_ACCESS_TOKEN', 'X_ACCESS_SECRET', 'X_KINDS', 'LOUNGE_CAP']) delete process.env[k];
const Wk = await import('/home/claude/work/autopilot/worker.mjs');
const Soc = await import('/home/claude/work/autopilot/social.mjs');

/* the plan: two different days a week, 11:00 AM – 8:59 PM Central, a new pattern every week, unreadable without the key */
const weeks = ['2026-11-09', '2026-11-16', '2026-11-23', '2026-11-30', '2026-12-07', '2026-12-14'].map(d => Wk.eggPlan(d, 'salt-A'));
T('two eggs a week, on two different days', weeks.every(P => P.length === 2 && P[0].day !== P[1].day && P.every(e => e.day >= 0 && e.day <= 6)), JSON.stringify(weeks));
T('…between 11:00 AM and 8:59 PM Central', weeks.every(P => P.every(e => e.min >= 660 && e.min < 1260)));
T('…not the same days or times week to week', new Set(weeks.map(P => JSON.stringify(P))).size >= 5);
T('…and a different key draws a different plan (nobody can work it out from the code)', JSON.stringify(Wk.eggPlan('2026-11-09', 'salt-A')) !== JSON.stringify(Wk.eggPlan('2026-11-09', 'salt-B')));
T('…every day of the same week shares the plan', JSON.stringify(Wk.eggPlan('2026-11-09', 'x')) === JSON.stringify(Wk.eggPlan('2026-11-15', 'x')));
{ const P = Wk.eggPlan('2026-11-09', 'salt-A'), e = P[0]; const day = new Date(Date.parse('2026-11-09T12:00:00Z') + e.day * 864e5).toISOString().slice(0, 10);
  const at = m => Date.parse(day + 'T06:00:00Z') + m * 60e3;   /* midnight Central (CST) + m minutes */
  T('eggDue: not before its minute, yes after it, never on the other five days', !Wk.eggDue(day, at(e.min - 1), { eggSalt: 'salt-A' }) && Wk.eggDue(day, at(e.min + 1), { eggSalt: 'salt-A' })
    && [0, 1, 2, 3, 4, 5, 6].filter(dd => !P.some(x => x.day === dd)).every(dd => !Wk.eggDue(new Date(Date.parse('2026-11-09T12:00:00Z') + dd * 864e5).toISOString().slice(0, 10), Date.parse('2026-11-09T12:00:00Z') + dd * 864e5 + 10 * 36e5, { eggSalt: 'salt-A' }))); }

/* the count and the lock */
const sent = []; let count = 57; const tg = async (m, b) => { sent.push({ m, ...b }); if (m === 'getChatMemberCount') return { ok: true, result: count }; if (m === 'getChatAdministrators') return { ok: true, result: [{ status: 'creator', user: { id: 4242, is_bot: false } }] };
  if (m === 'createChatInviteLink') return { ok: true, result: { invite_link: 'https://t.me/+VIPseat1', name: b.name } }; return { ok: true, result: true }; };
const mk = () => ({ d: '2026-11-14', chat: '-100555', legs: [], st: {}, sent: {}, bc: { pub: '@TheDeskApp', pubLounge: '-100888' } });
const st = { posts: { '2026-11-14': mk() } }; let now = Date.parse('2026-11-14T18:00:00Z');
let a = await Wk.loungeWatch(st, { tg, now });
T('the worker counts the lounge: 57 of 100, nothing else happens', a === 0 && st.lounge.n === 57 && !st.lounge.locked && sent.filter(x => x.m === 'getChatMemberCount').length === 1);
count = 100; a = await Wk.loungeWatch(st, { tg, now: now + 5 * 60e3 });
T('…it counts again only every 15 minutes', a === 0 && sent.filter(x => x.m === 'getChatMemberCount').length === 1);
now += 16 * 60e3; a = await Wk.loungeWatch(st, { tg, now });
const title = sent.find(x => x.m === 'setChatTitle'), note = sent.find(x => x.m === 'sendMessage' && String(x.chat_id) === '-100888'), dm = sent.find(x => x.m === 'sendMessage' && x.chat_id === '4242');
T('at 100: renamed "TheDesk VIP Lounge", a fresh invite link (the old one stops working)', a === 1 && title && title.title === 'TheDesk VIP Lounge' && sent.some(x => x.m === 'exportChatInviteLink' && x.chat_id === '-100888'));
T('…the room hears it: founders keep their seats free, for good', note && /100 seats filled/.test(note.text) && /free, for good/.test(note.text) && /VIP only/.test(note.text), note && note.text);
T('…the owner gets the one step only they can take (make the group private) and /vipinvite', dm && /Group type → Private/.test(dm.text) && /\/vipinvite/.test(dm.text), dm && dm.text);
T('…remembered: locked, 100 founders', st.lounge.locked === now && st.lounge.founders === 100);
const n0 = sent.length; await Wk.loungeWatch(st, { tg, now: now + 60 * 60e3 }); T('…and never again', sent.length === n0);
T('the lock survives a merge with an older copy (first lock wins)', (() => { const m = Wk.mergeState({ posts: {}, lounge: { chat: '-100888', n: 99, at: 1 } }, { posts: {}, lounge: st.lounge }); return m.lounge.locked === now && m.lounge.founders === 100; })());

/* routing after the lock: the room is the VIP lounge — the full card, results, the recap */
Wk.loungeRoute(st); const bc = st.posts['2026-11-14'].bc;
T('routing follows the lock: the room moves from the public lounge slot to the VIP lounge slot', bc.vipLounge === '-100888' && !bc.pubLounge && bc.pub === '@TheDeskApp', JSON.stringify(bc));
const egg = await Wk.fbInvite(st, { tg, now, eggDue: () => true, tgPhoto: async () => true, render: async () => null }); T('no more eggs once it\'s locked', egg === 0);

/* the door: after the lock, a join without a VIP invite is shown out; a VIP invite or the owner adding someone gets in */
const upd = []; const tg2 = async (m, b) => { if (m === 'getUpdates') return { ok: true, result: upd.splice(0) }; return tg(m, b); };
const join = (id, extra = {}) => ({ update_id: 900 + id, chat_member: { chat: { id: -100888, type: 'supergroup' }, from: { id, is_bot: false }, date: Math.floor((now + 60e3) / 1000), old_chat_member: { status: 'left', user: { id } }, new_chat_member: { status: 'member', user: { id, is_bot: false } }, ...extra } });
upd.push(join(11), join(12, { invite_link: { invite_link: 'https://t.me/+VIPseat1', name: 'VIP 2026-11-14' } }), join(13, { from: { id: 4242, is_bot: false } }));
const n1 = sent.length; await Wk.runCommands(st, { tg: tg2, now: now + 2 * 60e3 }); const kicks = sent.slice(n1).filter(x => x.m === 'banChatMember');
T('the door: a join by the old link or the @name is shown out (a 1-minute ban, then unbanned so they could come back as VIP)', kicks.length === 1 && kicks[0].user_id === '11' && sent.slice(n1).some(x => x.m === 'unbanChatMember' && x.user_id === '11'), JSON.stringify(sent.slice(n1).map(x => [x.m, x.user_id])));
T('…a VIP invite gets in, and so does someone the owner adds', !kicks.some(k => ['12', '13'].includes(k.user_id)));

/* the owner's tools */
const cmd = (text, chatType = 'private', from = 4242) => ({ update_id: 1000 + Math.floor(Math.random() * 1e6), message: { message_id: 5, date: Math.floor(now / 1000), text, chat: { id: chatType === 'private' ? from : -100888, type: chatType }, from: { id: from, is_bot: false } } });
upd.push(cmd('/vipinvite')); let n2 = sent.length; await Wk.runCommands(st, { tg: tg2, now: now + 3 * 60e3 });
const inv = sent.slice(n2).find(x => x.m === 'createChatInviteLink'), rep = sent.slice(n2).find(x => x.m === 'sendMessage' && x.chat_id === 4242);
T('/vipinvite (owner, in private): a one-person VIP link for the lounge, good for 7 days', inv && inv.chat_id === '-100888' && inv.member_limit === '1' && /^VIP /.test(inv.name) && +inv.expire_date - Math.floor((now + 3 * 60e3) / 1000) === 7 * 86400 && rep && /t\.me\/\+VIPseat1/.test(rep.text), JSON.stringify([inv, rep && rep.text]));
upd.push(cmd('/vipinvite', 'supergroup')); n2 = sent.length; await Wk.runCommands(st, { tg: tg2, now: now + 4 * 60e3 });
T('…asked in the group, it says DM me (the link never lands in public)', !sent.slice(n2).some(x => x.m === 'createChatInviteLink') && sent.slice(n2).some(x => x.m === 'sendMessage' && /DM me/.test(x.text)));
upd.push(cmd('/vipinvite', 'private', 777)); n2 = sent.length; await Wk.runCommands(st, { tg: tg2, now: now + 5 * 60e3 });
T('…anyone else gets no link', !sent.slice(n2).some(x => x.m === 'createChatInviteLink'));
upd.push(cmd('/lounge')); n2 = sent.length; await Wk.runCommands(st, { tg: tg2, now: now + 6 * 60e3 });
T('/lounge (owner): the VIP lounge and its founders', sent.slice(n2).some(x => x.m === 'sendMessage' && /VIP lounge since/.test(x.text) && /100 founders/.test(x.text)));

/* X: off until all four keys are set; the recap and the eggs by default; signed; 280 characters with the app's link */
T('X is off without its keys', !Soc.on({}, 'x'));
const XC = []; const fx = async (u, o) => { XC.push({ u, o }); return { ok: true, status: 201, json: async () => ({ data: { id: '1' } }) }; };
const x = { key: 'ck', secret: 'cs', tok: 'at', tsec: 'as', kinds: '' };
T('…on with them; by default it takes only the recap and the eggs (X bills per post)', Soc.on({ x }, 'x') && Soc.xWants('recap', { x }) && Soc.xWants('egg', { x }) && !Soc.xWants('unlock', { x }) && Soc.xWants('unlock', { x: { ...x, kinds: 'all' } }));
const long = '📊 <b>Day recap</b>\n' + 'NO -3 ✅ · SF ML ❌ · '.repeat(30);
const r1 = await Soc.xSend(long, { x, fetch: fx }); const b1 = JSON.parse(XC[0].o.body).text;
T('a post: signed OAuth 1.0a, to api.x.com/2/tweets, within 280 with the public app at the end', r1 === true && XC[0].u === 'https://api.x.com/2/tweets' && /^OAuth /.test(XC[0].o.headers.Authorization) && /oauth_signature="/.test(XC[0].o.headers.Authorization) && /oauth_consumer_key="ck"/.test(XC[0].o.headers.Authorization)
  && !/<b>/.test(b1) && b1.endsWith('https://ironsilkweekly.com/desk/') && b1.length - 'https://ironsilkweekly.com/desk/'.length + 23 <= 280, b1);
T('…the secrets never ride in the header', !/"cs"|"as"/.test(XC[0].o.headers.Authorization));
T('…the same request signs the same way (and changes when anything changes)', Soc.xAuth('POST', 'https://api.x.com/2/tweets', x, 1700000000, 'n1') === Soc.xAuth('POST', 'https://api.x.com/2/tweets', x, 1700000000, 'n1') && Soc.xAuth('POST', 'https://api.x.com/2/tweets', x, 1700000000, 'n1') !== Soc.xAuth('POST', 'https://api.x.com/2/tweets', { ...x, tsec: 'other' }, 1700000000, 'n1'));
const r2 = await Soc.xSend('🥚 You weren\'t supposed to find this.\n→ https://t.me/TheDeskLounge', { x, fetch: fx }, { bare: true }); const b2 = JSON.parse(XC[1].o.body).text;
T('…an egg keeps its own link and gets no app link', r2 === true && /t\.me\/TheDeskLounge/.test(b2) && !/ironsilkweekly/.test(b2), b2);
const r3 = await Soc.xSend('x', { x, fetch: async () => ({ ok: false, status: 402, json: async () => ({ title: 'CreditsDepleted' }) }) });
T('…a refused post (no credit) is skipped, never retried in a loop', r3 === 'skip');

console.log(`${pass} pass / ${fail} fail`); if (fail) process.exit(1);
