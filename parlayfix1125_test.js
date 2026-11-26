/* v3.5.27 · Nov 25, 5:42 PM, Chris: "Something is wrong with how it's picking parlays with the machine… some players are getting listed that
   shouldn't". Ryan Kalkbrenner (ruled OUT) still carried CHI@CHA prop calls; the prop ledger dropped the day's early calls (and every earlier
   day); and a prop parlay's unders were graded — and shown publicly — as overs. */
const { JSDOM } = require('jsdom'); const fs = require('fs'); const path = require('path'); const W = '/home/claude/work';
let pass = 0, fail = 0; const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  — ' + String(x ?? '').slice(0, 900))); };
let html = fs.readFileSync(path.join(W, 'nba.html'), 'utf8'); html = html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g, (m, f) => `<script>${fs.readFileSync(path.join(W, f), 'utf8')}</script>`);
const NOW = Date.parse('2026-11-25T22:00:00Z');
const INJ = { injuries: [{ team: { abbreviation: 'CHA' }, injuries: [{ athlete: { displayName: 'Ryan Kalkbrenner' }, status: 'Out' }, { athlete: { displayName: 'Kon Knueppel' }, status: 'Out' }, { athlete: { displayName: 'Sion James' }, status: 'Day-To-Day' }] }, { team: { abbreviation: 'CHI' }, injuries: [{ athlete: { displayName: 'Jalen Smith' }, status: 'Questionable' }] }] };
let fetched = [];
const w = new JSDOM(html, { runScripts: 'dangerously', url: 'https://ironsilkweekly.com/nba.html', pretendToBeVisual: true, beforeParse(x) {
  const RD = x.Date; class FD extends RD { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } } x.Date = FD; x.__NO_GRADELOOP__ = true; x.__NO_SYNC_LOOP__ = true; x.__NO_REOPEN__ = true; x.__NO_BACKFILL__ = true;
  x.fetch = u => { fetched.push(String(u)); if (/basketball\/nba\/injuries$/.test(String(u))) return Promise.resolve({ ok: true, json: () => Promise.resolve(INJ) }); if (/\/injuries$/.test(String(u))) return Promise.resolve({ ok: true, json: () => Promise.resolve({ injuries: [] }) }); return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}), text: () => Promise.resolve('') }); };
  x.scrollTo = () => { }; x.alert = () => { }; x.confirm = () => true; x.localStorage.setItem('d4.setupDone', '1'); } }).window;
setTimeout(async () => { try {
  const E = s => w.eval(s), J = JSON.stringify, P = s => JSON.parse(E(s));
  /* a stale roster: Charlotte's from two days ago says everyone is healthy, and says a Bull is out who's back */
  E(`set('d4.rsroster',{'nba:CHA':{ts:Date.now()-2*864e5,a:[['1','Ryan Kalkbrenner','C','',0,'11'],['2','Brandon Miller','F','',0,'24']]},'nba:CHI':{ts:Date.now()-2*864e5,a:[['3','Coby Whyte','G','Out',0,'0']]},'ncaab:DUKE':{ts:Date.now(),a:[['4','Cooper Flagg','F','Out',0,'2']]}});delete RO_CACHE['d4.rsroster'];RS_INJ=null;`);
  T('before the fresh report: the two-day-old roster says Kalkbrenner plays (that was the bug)', E(`rsInjury('nba','Ryan Kalkbrenner')`) === '', E(`rsInjury('nba','Ryan Kalkbrenner')`));
  const ch = await w.eval('injlRefresh(true)');
  T('the machine reads ESPN\'s league injury report (one call a sport) and keeps it', ch === true && fetched.some(u => /sports\/basketball\/nba\/injuries$/.test(u)) && fetched.some(u => /hockey\/nhl\/injuries$/.test(u)) && fetched.some(u => /football\/nfl\/injuries$/.test(u)), J(fetched));
  T('…the fresh report has the say: Kalkbrenner is Out → no call', E(`rsInjury('nba','Ryan Kalkbrenner')`) === 'Out' && E(`rsOut(rsInjury('nba','Ryan Kalkbrenner'))`) === true, E(`rsInjury('nba','Ryan Kalkbrenner')`));
  T('…someone off the report plays, whatever an old roster said; Questionable / Day-To-Day still play', E(`rsInjury('nba','Coby Whyte')`) === '' && E(`rsOut(rsInjury('nba','Jalen Smith'))`) === false && E(`rsOut(rsInjury('nba','Sion James'))`) === false);
  T('…college (no league report from ESPN) keeps reading the rosters', E(`rsInjury('ncaab','Cooper Flagg')`) === 'Out');
  E(`(()=>{const C=get(INJL_KEY,{});C.nba.ts=Date.now()-4*36e5;set(INJL_KEY,C);delete RO_CACHE[INJL_KEY];RS_INJ=null;})()`);
  T('…a report older than three hours stops counting (back to the rosters until the next read)', E(`rsInjury('nba','Ryan Kalkbrenner')`) === '', E(`rsInjury('nba','Ryan Kalkbrenner')`));
  await w.eval('injlRefresh(true)');
  /* the game card: a ruled-out player is off it; an under reads as an under */
  E(`cpropToday=()=>[];`);
  const card = E(`(()=>{const CPI=new Map([['nba|CHA',[{id:'a',sp:'nba',player:'Ryan Kalkbrenner',team:'CHA',k:'reb',thr:8,p:0.8,d:today()},{id:'b',sp:'nba',player:'Brandon Miller',team:'CHA',k:'pts',thr:30,p:0.83,d:today()},{id:'c',sp:'nba',player:'Brandon Miller',team:'CHA',k:'ast',thr:6,side:'under',p:0.78,d:today()}]]]);
    return slotPropsHtml({sp:'nba',game:'CHI@CHA',day:today(),props:[]},CPI).replace(/<[^>]+>/g,' ').replace(/\\s+/g,' ');})()`);
  T('the game card\'s character prop calls: a player ruled out is gone', !/Kalkbrenner/.test(card) && /Brandon Miller 30\+ PTS/.test(card), card);
  /* v3.5.28 · Nov 25, 6:28 PM, Chris: "A lot of bets on my book in regards to props can't even be made by unders so we like to lean to overs" */
  T('…and no unders on the card (the day\'s earlier logged unders included): the characters lean to overs (v3.5.28)', !/under/.test(card) && !/6\+ AST/.test(card), card);
  const ov = P(`(()=>{const D=pstDb('nba');const mk=(n,team,pts)=>{D.p[pstId(n)]={name:n,team,n:20,s:{pts:{sum:pts*20,sq:pts*pts*20+20*30,ema:pts,gp:20},reb:{sum:60,sq:220,ema:3,gp:20}}};};
    mk('Star Guard','CHA',28);mk('Bench Wing','CHA',6);teamsToday=()=>new Set(['CHA','CHI']);delete window.cpropToday;CPT_MEMO=null;
    return JSON.stringify((typeof cpropToday0==='function'?cpropToday0():[]).filter(c=>/Star Guard|Bench Wing/.test(c.player)).map(c=>({pl:c.player,k:c.k,thr:c.thr,side:c.side,p:c.p})));})()`);
  T('the characters call overs only: no unders at all (unders are off at the source)', E('CPROP_UNDERS_ON') === false && ov.length > 0 && ov.every(c => c.side === 'over'), J(ov));
  T('…a scorer\'s over is at the highest line it\'s still 70%+ sure of (not a gimme "10+ PTS")', ov.filter(c => c.pl === 'Star Guard' && c.k === 'pts').every(c => c.thr >= 20 && c.p >= 0.7), J(ov.filter(c => c.pl === 'Star Guard')));
  T('…a bench player with no 70% over gets no call (it used to be "under 14.5 PTS" at 90%)', !ov.some(c => c.pl === 'Bench Wing' && c.k === 'pts'), J(ov.filter(c => c.pl === 'Bench Wing')));
  /* a prop parlay's legs grade by their side, combos from their parts */
  E(`set('d4.pstlast.nba',{nicdowd:{d:'2026-11-24',v:{pts:2,reb:1,ast:0}},tremann:{d:'2026-11-24',v:{pts:10,reb:5,ast:3}}});delete RO_CACHE['d4.pstlast.nba'];`);
  const g1 = P(`(()=>{const a={kind:'prop',sp:'nba',player:'Nic Dowd',k:'ast',thr:2,side:'under',pick:'Nic Dowd under 1.5 AST',price:-300};const b={kind:'prop',sp:'nba',player:'Tre Mann',k:'pra',thr:20,pick:'Tre Mann 20+ PTS+REB+AST',price:-150};const c={kind:'prop',sp:'nba',player:'Tre Mann',k:'pra',thr:20,pick:'Tre Mann under 19.5 PTS+REB+AST',price:-150};
    cpxGradeLeg(a,'2026-11-24');cpxGradeLeg(b,'2026-11-24');cpxGradeLeg(c,'2026-11-24');return JSON.stringify([a,b,c]);})()`);
  T('a prop leg grades by its side: "under 1.5 AST" with 0 assists is a win (it was graded a loss)', g1[0].hit === true && g1[0].actual === 0, J(g1[0]));
  T('…a combo stat sums its parts (10+5+3 = 18): 20+ PRA loses, under 19.5 PRA (side read from its text) wins', g1[1].actual === 18 && g1[1].hit === false && g1[2].hit === true && !g1[1].push, J(g1.slice(1)));
  /* once: the old unders graded as overs, and their tickets */
  E(`set(CPX_KEY,{'2026-11-13':{locked:true,by:{Sim:{voice:'Sim',legs:[{kind:'prop',sp:'nhl',player:'Nic Dowd',k:'s',thr:2,pick:'Nic Dowd under 1.5 SOG',price:-400,actual:0,hit:false},{kind:'prop',sp:'nhl',player:'Filip Hronek',k:'s',thr:3,pick:'Filip Hronek under 2.5 SOG',price:-300,actual:1,hit:false}],p:0.6,done:true,won:false},
    Coach:{voice:'Coach',legs:[{kind:'prop',sp:'nhl',player:'Jayden Struble',k:'s',thr:2,pick:'Jayden Struble under 1.5 SOG',price:-250,actual:2,hit:true},{kind:'prop',sp:'nhl',player:'Elias Pettersson',k:'s',thr:3,pick:'Elias Pettersson 3+ SOG',price:-150,actual:4,hit:true}],p:0.5,done:true,won:true}}}});delete RO_CACHE[CPX_KEY];cpxGrade();`);
  const X = P(`JSON.stringify(get(CPX_KEY,{})['2026-11-13'].by)`);
  T('the unders already on the books get their real result once: 0 and 1 shots under 1.5 / 2.5 are wins — the Sim\'s ticket cashed', X.Sim.legs.every(l => l.hit === true && l.sfix === 1) && X.Sim.done === true && X.Sim.won === true, J(X.Sim));
  T('…2 shots under 1.5 is a loss — the Coach\'s "cash" was a miss; the over leg is left alone', X.Coach.legs[0].hit === false && X.Coach.legs[1].hit === true && !X.Coach.legs[1].sfix && X.Coach.done === true && X.Coach.won === false, J(X.Coach));
  E('cpxGrade();');
  T('…and only once (grading again changes nothing)', J(P(`JSON.stringify(get(CPX_KEY,{})['2026-11-13'].by)`)) === J(X));
  /* the ledger: an under the live tracker graded as an over, fixed once */
  E(`set(CPROP_KEY,[{id:'u1',sp:'nba',voice:'Sim',player:'Will Felton',team:'X',k:'ast',thr:3,side:'under',p:0.8,d:'2026-11-14',hit:false,actual:2,mv:2},{id:'o1',sp:'nba',voice:'Sim',player:'Will Felton',team:'X',k:'pts',thr:10,p:0.8,d:'2026-11-14',hit:true,actual:12,mv:2}]);delete RO_CACHE[CPROP_KEY];cpropGrade();`);
  const LG = P('JSON.stringify(get(CPROP_KEY,[]))');
  T('the prop ledger: "under 2.5 AST" with 2 assists becomes the win it was; the over stays', LG[0].hit === true && LG[0].sfix === 1 && LG[1].hit === true && !LG[1].sfix, J(LG));
  /* the ledger keeps every day: a character's best 30 a sport a day */
  E(`set(CPROP_KEY,[]);delete RO_CACHE[CPROP_KEY];`);
  const n1 = E(`(()=>{const c=[];for(let i=0;i<100;i++)c.push({id:'ncaab|p'+i+'|pts|10|Sim|'+today(),sp:'ncaab',voice:'Sim',player:'P'+i,team:'T',k:'pts',thr:10,p:0.7+i/1000,cal:0.7+i/1000,d:today()});
    for(let i=0;i<10;i++)c.push({id:'ncaab|q'+i+'|pts|10|Judge|'+today(),sp:'ncaab',voice:'Judge',player:'Q'+i,team:'T',k:'pts',thr:10,p:0.75,cal:0.75,d:today()});return cpropLog(c);})()`);
  const L2 = P('JSON.stringify(get(CPROP_KEY,[]))');
  T('one character logs its best 30 calls a sport a day (not every call it can make) — another character has its own 30', n1 === 40 && L2.filter(x => x.voice === 'Sim').length === 30 && L2.filter(x => x.voice === 'Judge').length === 10 && Math.min(...L2.filter(x => x.voice === 'Sim').map(x => x.p)) >= 0.77, J([n1, L2.length]));
  T('…so a big college day can\'t push the other days out (the ledger keeps 10,000)', E('CPROP_KEEP') === 10000 && E('CPROP_DAY_CAP') === 30);
  /* a ticket's prop leg keeps its side; the public leg reads as written */
  const tk = P(`JSON.stringify(deskTicket([{kind:'prop',sp:'ncaab',game:'CONN@DUKE',player:'Joaquim Boumtje Boumtje',team:'DUKE',k:'reb',thr:10,side:'under',pick:'Joaquim Boumtje Boumtje under 9.5 REB',price:-3233,p:0.97},{kind:'game',sp:'nba',game:'SA@POR',pick:'SA ML',price:-160,p:0.66}],'Sim'))`);
  T('a parlay\'s prop leg keeps its side (it used to be dropped)', tk.legs[0].side === 'under' && tk.legs[1].side === undefined, J(tk.legs[0]));
  const pl = P(`JSON.stringify(pubLeg({kind:'prop',sp:'ncaab',game:'CONN@DUKE',player:'Joaquim Boumtje Boumtje',team:'DUKE',k:'reb',thr:10,pick:'Joaquim Boumtje Boumtje under 9.5 REB',price:-3233,p:0.97}))`);
  T('…and the public app shows today\'s already-locked under as the under it is (it read "10+ REB")', pl.pick === 'Joaquim Boumtje Boumtje under 9.5 REB', J(pl));
} catch (e) { T('test ran', false, String(e && e.stack || e).slice(0, 900)); }
  console.log(`\n${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0); }, 3000);
