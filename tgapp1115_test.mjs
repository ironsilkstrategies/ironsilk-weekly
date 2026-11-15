/* v3.1.6 · /app: the owner posts and pins an "Open TheDesk" button in the lounge that opens the Telegram Mini App (t.me/<bot>/desk) */
import path from 'path';
process.env.AUTOPILOT_KEY = 'k'; process.env.TG_BOT_TOKEN = 't';
const W = await import(path.resolve('autopilot/worker.mjs'));
let pass = 0, fail = 0; const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  — ' + String(x ?? '').slice(0, 300))); };
const run = async (from, text, chat = { id: -100888, type: 'supergroup', title: 'TheDesk Lounge' }) => { const calls = [];
  const tg = async (m, p) => { calls.push({ m, p }); if (m === 'getUpdates') return { ok: true, result: [{ update_id: 1, message: { message_id: 5, date: Math.floor(Date.now() / 1000), chat, from: { id: from }, text } }] };
    if (m === 'getMe') return { ok: true, result: { username: 'TheDeskBot', id: 42 } }; if (m === 'getChatAdministrators') return { ok: true, result: [{ user: { id: 7 }, status: 'creator' }] };
    if (m === 'getChat') return { ok: true, result: chat }; if (m === 'getChatMember') return { ok: true, result: { status: from === 7 ? 'creator' : 'member' } };
    return { ok: true, result: { message_id: 99 } }; };
  const st = { posts: { '2026-11-15': { d: '2026-11-15', chat: '-100555', bc: { pubLounge: '-100888', owner: 7 }, cmd: { r: {}, menu: [] }, legs: [] } }, owners: [7] };
  await W.runCommands(st, { tg }); return { calls, st }; };
let R = await run(7, '/app');
const send = R.calls.find(c => c.m === 'sendMessage' && /Open TheDesk/.test(c.p.reply_markup || ''));
T('the owner sends /app in the lounge: a post with an "Open TheDesk" button to t.me/<bot>/TheDesk (the registered short name)', send && JSON.parse(send.p.reply_markup).inline_keyboard[0][0].url === 'https://t.me/thedeskbot/TheDesk', JSON.stringify(R.calls.map(c => c.m)));
T('…and it gets pinned', R.calls.some(c => c.m === 'pinChatMessage' && c.p.message_id === '99'));
R = await run(7, '/app desk2');
T('…a different Mini App short name: /app desk2', R.calls.some(c => c.m === 'sendMessage' && /t\.me\/thedeskbot\/desk2"/.test(c.p.reply_markup || '')) && R.st.appShort === 'desk2');
R = await run(12345, '/app');
T('nobody else can post it', !R.calls.some(c => c.m === 'sendMessage' && /Open TheDesk/.test(c.p.reply_markup || '')) && !R.calls.some(c => c.m === 'pinChatMessage'), JSON.stringify(R.calls.map(c => c.m)));
{ const calls = []; const chat = { id: -100888, type: 'supergroup', title: 'TheDesk Lounge' };
  const tg = async (m, p) => { calls.push({ m, p }); if (m === 'getUpdates') return { ok: true, result: [{ update_id: 1, message: { message_id: 5, date: Math.floor(Date.now() / 1000), chat, from: { id: 1087968824, is_bot: true, first_name: 'Group' }, sender_chat: chat, text: '/app thedesk' } }] };
    if (m === 'getMe') return { ok: true, result: { username: 'TheDeskBot', id: 42 } }; if (m === 'getChatAdministrators') return { ok: true, result: [{ user: { id: 7 }, status: 'creator' }] }; if (m === 'getChat') return { ok: true, result: chat };
    return { ok: true, result: { message_id: 99 } }; };
  await W.runCommands({ posts: { '2026-11-15': { d: '2026-11-15', chat: '-100555', bc: { pubLounge: '-100888' }, cmd: { r: {}, menu: [] }, legs: [] } } }, { tg });
  T('an admin posting anonymously as the group can send /app too (Telegram hides who it is)', calls.some(c => c.m === 'sendMessage' && /t\.me\/thedeskbot\/thedesk"/.test(c.p.reply_markup || '')) && calls.some(c => c.m === 'pinChatMessage'), JSON.stringify(calls.map(c => c.m))); }
console.log(`${pass} pass / ${fail} fail`); process.exit(fail ? 1 : 0);
