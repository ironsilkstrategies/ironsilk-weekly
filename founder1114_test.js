/* v3.0.16 · Founder Parlays: the founder's pasted tickets go to the public site, live, to tail — never the ticket number or the stake;
   a ticket switched off (🌐) or carrying a -1000-or-shorter moneyline stays off; the 30-day record counts every settled ticket. */
const { JSDOM } = require('jsdom'); const fs = require('fs'); const path = require('path'); const W = '/home/claude/work';
const out = []; const T = (n, ok, d) => out.push(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`);
let html = fs.readFileSync(path.join(W, 'nhl.html'), 'utf8');
html = html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g, (m, f) => `<script>${fs.readFileSync(path.join(W, f), 'utf8')}</script>`);
const NOW = Date.parse('2026-11-15T02:00:00Z');
const tk = (id, legs, extra = {}) => ({ id: 'ext' + id, date: '2026-11-14', name: 'Ticket #' + id, source: 'mine', imported: true, stake: '$1.00', toWin: '$57.95', legs, ...extra });
const L = [
  tk('1015000001', [{ id: 'a1', sport: 'nhl', game: 'BUF@DAL', pick: 'DAL ML', price: -135, gameDate: '2026-11-14', book: 'external' }, { id: 'a2', sport: 'nhl', game: 'SJ@UTAH', pick: 'UTAH ML', price: -180, gameDate: '2026-11-14', book: 'external' },
    { id: 'a3', sport: 'nba', game: 'NO@DEN', pick: 'Z. Williamson 20+ points + rebounds', isProp: 1, bbProp: { player: 'Z. Williamson', k: 'pr', thr: 20, dir: 'atleast' }, gameDate: '2026-11-14', book: 'external' }]),
  tk('1015000002', [{ id: 'b1', sport: 'nba', game: 'CHI@MIN', pick: 'MIN ML', price: -1100, gameDate: '2026-11-14', book: 'external' }]),
  tk('1015000003', [{ id: 'c1', sport: 'nhl', game: 'BOS@NYR', pick: 'BOS ML', price: 120, gameDate: '2026-11-14', book: 'external' }], { pubHide: true }),
  tk('1015000004', [{ id: 'd1', sport: 'nhl', game: 'TOR@MTL', pick: 'TOR ML', price: 110, gameDate: '2026-11-10', book: 'external' }], { date: '2026-11-10' }),
  { id: 'loc1', date: '2026-11-14', name: 'The machine', source: 'auto', legs: [{ id: 'e1', sport: 'nhl', game: 'BUF@DAL', pick: 'DAL ML', price: -135 }] }];
const w = new JSDOM(html, { runScripts: 'dangerously', url: 'https://ironsilkweekly.com/nhl.html', pretendToBeVisual: true, beforeParse(x) { const RD = x.Date; class FD extends RD { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } } x.Date = FD; x.__NO_GRADELOOP__ = true; x.__NO_REOPEN__ = true;
  x.fetch = () => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}), text: () => Promise.resolve('') }); x.scrollTo = () => { }; x.alert = () => { }; x.confirm = () => true; x.localStorage.setItem('d4.setupDone', '1'); x.localStorage.setItem('d4.locked', JSON.stringify(L)); } }).window;
setTimeout(() => { try {
  w.eval(`set(LS.locked,${JSON.stringify(L)});const A=get(LS.allfinals,{});A[finalsKey('nhl','BUF@DAL')]={sport:'nhl',a:1,h:3,d:'2026-11-14',ts:Date.now()};A[finalsKey('nhl','TOR@MTL')]={sport:'nhl',a:4,h:2,d:'2026-11-10',ts:Date.now()};set(LS.allfinals,A);ALLF_C=null;
    set('d4.pstlast.nba',{[pstId('Z. Williamson')]:{d:'2026-11-14',v:{pts:14,reb:7}}});`);
  const F = w.eval('pubFounder0(get(LS.locked,[]))');
  T('the founder\'s pasted tickets go up; the machine\'s own tickets don\'t', F.tix.length === 1 && F.tix[0].legs.length === 3, JSON.stringify(F.tix.map(t => t.legs.map(l => l.pick))));
  const t = F.tix[0], s = JSON.stringify(F);
  T('live: DAL ML cashed (3-1 final), Zion 20+ P+R cashed from his line (21), UTAH ML still open → 2 of 3 hit', t.res === 'live' && t.hit === 2 && t.legs[0].st === 'hit' && t.legs[2].st === 'hit' && t.legs[2].prog && t.legs[2].prog.v === 21 && t.legs[1].st === 'open', JSON.stringify(t.legs.map(l => [l.pick, l.st, l.detail, l.prog])));
  T('the odds come from the ticket ($1 to win $57.95 → +5,795), never the stake or the ticket number', Math.abs(t.dec - 58.95) < 0.01 && !/1015000001|\$1\.00|57\.95|stake|toWin/.test(s), s.slice(0, 200));
  T('a ticket switched off, or carrying a -1000 moneyline, stays off the public site', !/BOS ML|MIN ML/.test(s));
  T('the 30-day record counts every settled ticket, even ones older than the cards shown (Nov 10 cashed)', F.rec.cashed === 1 && F.rec.lost === 0 && !F.tix.some(x => x.date === '2026-11-10'), JSON.stringify(F.rec));
  /* v3.0.29 · archive at the freeze: a ticket from the day before stays up until today's card is frozen, then comes off (record keeps it) */
  w.eval(`const L0=get(LS.locked,[]);L0.push({id:'extY',date:dayShift(today(),-1),name:'Ticket #9',source:'mine',imported:true,stake:'$1',toWin:'$9',legs:[{id:'y1',sport:'nhl',game:'TOR@MTL',pick:'TOR ML',price:110,gameDate:dayShift(today(),-1),book:'external'}]});set(LS.locked,L0);set(FREEZE_KEY,null);`);
  const before = w.eval(`pubFounder0(get(LS.locked,[])).tix.map(t=>t.date)`), td = w.eval('today()');
  w.eval(`set(FREEZE_KEY,{d:today()})`);
  const after = w.eval(`pubFounder0(get(LS.locked,[]))`);
  T('archive at the freeze: before today\'s card is frozen the latest day stays up; once frozen, only today\'s tickets show', before.every(d => d === td) && after.tix.every(t => t.date >= td) && after.tix.length >= 1, JSON.stringify([td, before, after.tix.map(t => t.date)]));
  w.eval(`set(LS.locked,get(LS.locked,[]).filter(t=>t.id!=='extY'));set(FREEZE_KEY,null);PUB_FOUNDER_MEMO=null;`);
  w.eval(`const L1=get(LS.locked,[]);for(let i=0;i<10;i++)L1.push({id:'extN'+i,date:today(),name:'Ticket #N'+i,source:'mine',imported:true,stake:'$1',toWin:'$9',legs:[{id:'n'+i,sport:'nhl',game:'A'+i+'@B'+i,pick:'B'+i+' ML',price:120,gameDate:today(),book:'external'}]});set(LS.locked,L1);`);
  T('every ticket of the day goes up (no cap at 8)', w.eval(`pubFounder0(get(LS.locked,[])).tix.filter(t=>t.legs[0].game.startsWith('A')).length`) === 10);
  w.eval(`set(LS.locked,get(LS.locked,[]).filter(t=>!String(t.id).startsWith('extN')));PUB_FOUNDER_MEMO=null;`);
  const P = w.eval('publicFeedCore(false)');
  T('the open beta publishes it, and the feed signature moves with each leg', P.founder && P.founder.tix.length === 1 && /live:hoh21/.test(P.betaSig), (P.betaSig || '').slice(0, 80));
  T('the switch on the ticket: 🌐 Public ✓ → tap → hidden', /Public ✓/.test(w.eval(`tktPubBtn(get(LS.locked,[])[0])`)) && (w.eval(`tktPubToggle('ext1015000001');get(LS.locked,[])[0].pubHide`) === true) && /Hidden/.test(w.eval(`tktPubBtn(get(LS.locked,[])[0])`)) && w.eval(`PUB_FOUNDER_MEMO=null;pubFounder().tix.length`) === 0);
} catch (e) { T('no crash', false, String(e && e.stack || e).slice(0, 500)); }
const f = out.filter(x => x.startsWith('FAIL')).length; console.log(out.join('\n')); console.log(`${out.length - f} pass / ${f} fail`); process.exit(f ? 1 : 0); }, 2500);
