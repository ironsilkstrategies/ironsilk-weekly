/* v3.0.6 / v3.0.8 · where everything goes (Nov 13): "free picks to the free channel… full slate to the VIP channel and the public lounge",
   and at 100 members the public lounge locks and becomes the VIP lounge (the full card, results, the recap).
   VIP channel: the full card · VIP lounge: the full card at lock, results, recap · public channel: the free picks (listed at lock in the
   beta, again 30 min before each game) · public lounge: the full card in the beta. The app follows the lounge's rename. */
const { JSDOM } = require('jsdom'); const fs = require('fs'); const path = require('path'); const W = '/home/claude/work';
const out = []; const T = (n, ok, d) => out.push(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`);
let html = fs.readFileSync(path.join(W, 'nhl.html'), 'utf8');
html = html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g, (m, f) => `<script>${fs.readFileSync(path.join(W, f), 'utf8')}</script>`);
const NOW = Date.parse('2026-11-14T16:00:00Z');
const w = new JSDOM(html, { runScripts: 'dangerously', url: 'https://ironsilkweekly.com/nhl.html', pretendToBeVisual: true, beforeParse(x) {
  const RD = x.Date; class FD extends RD { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } } x.Date = FD; x.__NO_GRADELOOP__ = true; x.__NO_REOPEN__ = true;
  x.fetch = () => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}), text: () => Promise.resolve('') }); x.scrollTo = () => { }; x.alert = () => { }; x.confirm = () => true; x.localStorage.setItem('d4.setupDone', '1'); } }).window;
const run = async (beta, keep, title, cfg) => {
  w.eval(`window.__SENT=[];${keep ? '' : "set('d4.bcsent',{});"}set('d4.pubbeta',${beta});set(BCAST_KEY,${JSON.stringify(cfg || { pub: '@TheDeskApp', vipLounge: '-100777', pubLounge: '-100888', autoPost: true })});
    deskPublishPage=async()=>({ok:true});deskFrozen=()=>true;deskTgPostCard=async()=>({ok:true,n:2,card:{fake:1}});best5State=()=>({locked:true,top3:[1,2,3]});deskPlan=()=>null;
    subTelegramText=C=>['<b>💎 VIP card</b> part 1','part 2 · Wild ML −150'];
    publicFeedCore=()=>({today:{picks:[{sp:'nhl',game:'MIN@CHI',pick:'MIN ML',price:-150,start:'2026-11-15T01:00:00Z'},{sp:'nba',game:'ATL@CHI',pick:'Under 245.5',price:-110,start:'2026-11-15T01:30:00Z'}],props:[{label:'Kirill Kaprizov 3+ SOG'}]}});
    tgApi=async(m,p)=>{if(m==='getChat')return{ok:true,result:{title:${JSON.stringify(title || 'TheDesk Lounge')}}};window.__SENT.push({m,chat:p.chat_id,text:p.text});return{ok:true,result:{message_id:1}};};`);
  await w.eval(`deskPublishAll('auto')`); return w.eval(`window.__SENT`); };
setTimeout(async () => { try {
  let S = await run(true); const to = c => S.filter(x => x.chat === c);
  T('the VIP lounge gets the full card at lock', to('-100777').length === 2 && /VIP card/.test(to('-100777')[0].text), JSON.stringify(S.map(x => x.chat)));
  const pub = to('@TheDeskApp');
  T('beta: the public channel\'s lock post lists the free picks (with price, game, time) and the props', pub.length === 1 && /free picks/.test(pub[0].text) && /MIN ML<\/b> \(-150\)/.test(pub[0].text) && /MIN at CHI/.test(pub[0].text) && /CT/.test(pub[0].text) && /Kaprizov/.test(pub[0].text) && /30 minutes before its game/.test(pub[0].text), pub[0] && pub[0].text);
  const pl = to('-100888');
  T('beta: the public lounge gets the full card, every part', pl.length === 2 && /VIP card/.test(pl[0].text) && /Wild ML/.test(pl[1].text), JSON.stringify(pl));
  S = await run(true, true);
  T('…each once a day', S.length === 0, JSON.stringify(S));
  S = await run(false); const to2 = c => S.filter(x => x.chat === c);
  T('after the beta: the public channel says the Best 3 are locked, no picks named', to2('@TheDeskApp').length === 1 && /Best 3 are locked/.test(to2('@TheDeskApp')[0].text) && !/MIN ML/.test(to2('@TheDeskApp')[0].text));
  T('after the beta: the public lounge gets a pointer, not the VIP card', to2('-100888').length === 1 && !/VIP card/.test(to2('-100888')[0].text) && /unlock in the channel/.test(to2('-100888')[0].text), JSON.stringify(to2('-100888')));
  T('after the beta: the VIP lounge still gets the full card', to2('-100777').length === 2);
  /* the lounge hit 100 and the worker renamed it: the app moves it to the VIP slot and sends it the full card */
  S = await run(true, false, 'TheDesk VIP Lounge', { pub: '@TheDeskApp', pubLounge: '-100888', autoPost: true }); const B = w.eval('bcCfg()');
  T('once the lounge reads "TheDesk VIP Lounge", the app moves it to the VIP lounge slot for good', B.vipLounge === '-100888' && !B.pubLounge, JSON.stringify(B));
  T('…and it gets the full card as the VIP lounge (once), the public channel still gets the free picks', S.filter(x => x.chat === '-100888').length === 2 && S.filter(x => x.chat === '@TheDeskApp').length === 1, JSON.stringify(S.map(x => x.chat)));
  /* the worker: VIP results and the recap go to the VIP channel and the VIP lounge */
  process.env.AUTOPILOT_KEY = 'k'; process.env.TG_BOT_TOKEN = 't'; for (const k of ['FB_PAGE_ID', 'FB_PAGE_TOKEN', 'IG_USER_ID', 'IG_TOKEN', 'IG_KINDS', 'THREADS_TOKEN', 'THREADS_USER_ID']) delete process.env[k];
  const Wk = await import(path.join(W, 'autopilot/worker.mjs'));
  const calls = []; const tg = async (m, p) => { calls.push({ m, chat: p.chat_id, text: p.text || p.caption || '' }); return { ok: true, result: { message_id: 9 } }; };
  const st = { posts: { '2026-11-14': { d: '2026-11-14', chat: '-100555', parts: ['card'], ids: [5], legs: [{ k: 'a', label: 'MIN ML', kind: 'Best 3', sp: 'nhl', game: 'MIN@CHI', price: -150 }], bc: { vipLounge: '-100777', pub: '@TheDeskApp', pubLounge: '-100888' } } } };
  await Wk.runOnce(st, '2026-11-14', { tg, now: NOW, gradePick: async () => 'W', gradeProp: async () => null, render: async () => null, social: {} });
  T('worker: VIP results and the recap go to the VIP channel and the VIP lounge', ['-100555', '-100777'].every(ch => calls.some(c => c.chat === ch && /Results/.test(c.text)) && calls.some(c => c.chat === ch && /recap/i.test(c.text))), JSON.stringify(calls.map(c => [c.chat, c.text.slice(0, 30)])));
} catch (er) { T('no crash', false, String(er && er.stack || er).slice(0, 500)); }
const f = out.filter(x => x.startsWith('FAIL')).length; console.log(out.join('\n')); console.log(`${out.length - f} pass / ${f} fail`); process.exit(f ? 1 : 0); }, 3000);
