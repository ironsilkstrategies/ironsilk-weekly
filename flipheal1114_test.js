/* v3.0.13 · ticket 1015366949 mixed the book's two dialects (football "(Game)", basketball "(Match)"), so games came out home/away
   flipped and their game lines sat "waiting on the score feed" while a prop in the same game was live. Each SGP block now decides its
   own orientation, and a flipped leg heals itself the first time the real game shows up. */
const { JSDOM } = require('jsdom'); const fs = require('fs'); const path = require('path'); const W = '/home/claude/work';
const out = []; const T = (n, ok, d) => out.push(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`);
let html = fs.readFileSync(path.join(W, 'nhl.html'), 'utf8');
html = html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g, (m, f) => `<script>${fs.readFileSync(path.join(W, f), 'utf8')}</script>`);
const w = new JSDOM(html, { runScripts: 'dangerously', url: 'https://ironsilkweekly.com/nhl.html', pretendToBeVisual: true, beforeParse(x) { x.__NO_GRADELOOP__ = true; x.__NO_REOPEN__ = true;
  x.fetch = () => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}), text: () => Promise.resolve('') }); x.scrollTo = () => { }; x.alert = () => { }; x.confirm = () => true; x.localStorage.setItem('d4.setupDone', '1'); } }).window;
const TK = ['Ticket Number:', '1099000001', 'Accepted Date:', '11/15/26', 'Amount:', '$1.00', 'Status:', 'Pending', 'To win:', '$9.00', 'Type:', 'SGPs Combined', 'Description:', '5 Leg Parlay (Includes 2 SGPs)',
  'SGP 1: FOOTBALL - NCAA - Iowa Hawkeyes v Purdue Boilermakers', 'Total points - Over 39.5 (Game)', 'Spread - Iowa -8.5 (Game)',
  'SGP 2: BASKETBALL - NBA - Cleveland Cavaliers v Dallas Mavericks', 'Result - Mavericks win (Match)', 'Total points - Over 217.5 (Match)', 'Player points - Cooper Flagg 18+ (Match)'].join('\n');
setTimeout(() => { try {
  w.__T = TK; const r = w.eval('parseSGPTicketText(sgpNormalize(window.__T))');
  const G = w.eval(`(get(LS.locked,[])||[]).find(t=>t.id==='ext1099000001').legs.map(l=>l.sport+' '+l.game+' '+l.pick)`);
  T('one ticket, two dialects: the football block reads away-first "(Game)", the basketball block home-first "(Match)"', r.ok && G.includes('ncaaf IOWA@PUR Over 39.5') && G.includes('ncaaf IOWA@PUR IOWA -8.5') && G.includes('nba DAL@CLE DAL ML'), JSON.stringify(G));
  /* the real game is the other way round: CLE at DAL, final 110-118 */
  w.eval(`const A=get(LS.allfinals,{});A[finalsKey('nba','CLE@DAL')]={sport:'nba',a:110,h:118,d:'2026-11-15',ts:Date.now()};set(LS.allfinals,A);ALLF_C=null;`);
  const R = w.eval(`(()=>{const t=(get(LS.locked,[])||[]).find(t=>t.id==='ext1099000001');const l=t.legs.find(x=>x.pick==='DAL ML');const g=gradeLeg(l,t.date);return{g,game:l.game,saved:(get(LS.locked,[])||[]).find(t=>t.id==='ext1099000001').legs.find(x=>x.pick==='DAL ML').game};})()`);
  T('a flipped leg heals: DAL ML finds CLE@DAL, grades the Mavericks\' win, and the ticket is saved the right way round', R.game === 'CLE@DAL' && R.saved === 'CLE@DAL' && R.g && R.g.hit === true, JSON.stringify(R));
  const tot = w.eval(`(()=>{const t=(get(LS.locked,[])||[]).find(t=>t.id==='ext1099000001');const l=t.legs.find(x=>x.pick==='Over 217.5');return{g:gradeLeg(l,t.date),game:l.game};})()`);
  T('…the total in the same game heals and grades too (228 > 217.5)', tot.game === 'CLE@DAL' && tot.g.hit === true, JSON.stringify(tot));
  /* v3.0.14 / v3.0.15 · the book's accepted stamp ("11/15") is a day ahead of Saturday-night games; ESPN's scoreboard index knows the real day */
  w.eval(`const I=get(FBP_IDX_KEY,{});I['nba:'+fbpGameKey('NO@DEN','nba')+':'+fbpYmd('2026-11-14')]='401999';I['nba:'+fbpGameKey('DET@MIA','nba')+':'+fbpYmd('2026-11-14')]='401998';I['mlb:'+fbpGameKey('NYY@BOS','mlb')+':'+fbpYmd('2026-11-14')]='401997';set(FBP_IDX_KEY,I);`);
  const den = w.eval(`(()=>{const l={id:'dd1',sport:'nba',game:'DEN@NO',pick:'DEN ML',gameDate:'2026-11-15',book:'external'};resolveLeg(l,'2026-11-15');return l.game+' '+l.gameDate;})()`);
  T('a flipped leg dated a day ahead heals both ways: DEN@NO on 11/15 becomes NO@DEN on 11/14', den === 'NO@DEN 2026-11-14', den);
  const det = w.eval(`(()=>{const l={id:'dd2',sport:'nba',game:'DET@MIA',pick:'Over 218.5',gameDate:'2026-11-15',book:'external'};resolveLeg(l,'2026-11-15');return l.game+' '+l.gameDate;})()`);
  T('…a leg with the right teams but the book\'s next-day stamp moves to the real night: DET@MIA 11/15 → 11/14', det === 'DET@MIA 2026-11-14', det);
  const mlb = w.eval(`(()=>{const l={id:'dd3',sport:'mlb',game:'NYY@BOS',pick:'NYY ML',gameDate:'2026-11-15',book:'external'};resolveLeg(l,'2026-11-15');return l.gameDate;})()`);
  T('…never in baseball (a series plays the same teams on back-to-back days)', mlb === '2026-11-15', mlb);
  const timed = w.eval(`(()=>{const l={id:'dd4',sport:'nba',game:'DET@MIA',pick:'DET ML',gameDate:'2026-11-15',book:'external',start:'2026-11-16T00:00:00Z'};resolveLeg(l,'2026-11-15');return l.gameDate;})()`);
  T('…nor a leg that carries its own start time (the book printed it, so the date is right)', timed === '2026-11-15', timed);
  const keep = w.eval(`(()=>{const l={id:'zz',sport:'nba',game:'BOS@NYK',pick:'BOS ML',gameDate:'2026-11-15'};resolveLeg(l,'2026-11-15');return l.game;})()`);
  T('a leg whose game simply isn\'t posted yet is left alone', keep === 'BOS@NYK');
} catch (e) { T('no crash', false, String(e && e.stack || e).slice(0, 500)); }
const f = out.filter(x => x.startsWith('FAIL')).length; console.log(out.join('\n')); console.log(`${out.length - f} pass / ${f} fail`); process.exit(f ? 1 : 0); }, 2500);
