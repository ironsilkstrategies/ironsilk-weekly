/* v3.1.4 · NO LINE, NO LISTING (Chris, Nov 20: "I don't like picks being made by any character if there's not a real line on
   them… no line no listing on game cards"). From Nov 20 on: no character calls a market without a real line (a moneyline needs its
   price; the sim's own spread/total never stands in), a game card lists only the markets with a real line, a game with none says
   so, Today's card never takes a price-less square, and a no-line call already in the ledger leaves it. Days before Nov 20 stand. */
const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
const load=page=>{let h=fs.readFileSync(path.join(W,page),'utf8');return h.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);};
const errors=[];const vc=new (require('jsdom').VirtualConsole)();vc.on('jsdomError',e=>errors.push(String(e.message||e)));
const NOW=Date.parse('2026-11-20T20:00:00Z');   // Friday 2 PM CT
const comp=(side,t)=>({homeAway:side,team:{abbreviation:t[0],displayName:t[1],shortDisplayName:t[1].split(' ').slice(-1)[0],location:t[1].split(' ').slice(0,-1).join(' '),id:t[2]},
  score:'',linescores:[],records:[{summary:'8-6'}],curatedRank:{current:99}});
const ev=(id,date,a,h,odds)=>({id,date,season:{type:2,slug:'regular-season'},competitions:[{status:{type:{state:'pre',shortDetail:'7:00 PM'},period:0},
  neutralSite:false,venue:{fullName:'Arena'},odds:odds?[odds]:[],competitors:[comp('away',a),comp('home',h)]}]});
const odds=(hsp,tot,aml,hml)=>({details:'',overUnder:tot,spread:hsp,awayTeamOdds:{moneyLine:aml,spreadOdds:-110},homeTeamOdds:{moneyLine:hml,spreadOdds:-110},overOdds:-110,underOdds:-110,provider:{name:'DraftKings'}});
const NBA={BOS:['BOS','Boston Celtics','2'],NY:['NY','New York Knicks','18'],LAL:['LAL','Los Angeles Lakers','13'],GS:['GS','Golden State Warriors','9'],MIA:['MIA','Miami Heat','14'],ORL:['ORL','Orlando Magic','19']};
const ymd=d=>d.replace(/-/g,'');
const nbaEvents=u=>{const m=u.match(/dates=(\d{8})(?:-(\d{8}))?/);const a=m?m[1]:'',b=m&&m[2]?m[2]:a;const inR=d=>ymd(d)>=a&&ymd(d)<=b;const E=[];
  if(inR('2026-11-20'))E.push(
    ev('full','2026-11-21T00:30Z',NBA.MIA,NBA.ORL,odds(-2,215,110,-130)),             // every market priced
    ev('noml','2026-11-21T01:00Z',NBA.LAL,NBA.GS,odds(-14.5,228.5,null,null)),        // spread + total, the moneyline off the board
    ev('none','2026-11-21T01:30Z',NBA.BOS,NBA.NY,null));                              // nothing posted
  return{events:E};};
const std=rows=>({children:[{standings:{entries:rows.map(([ab,pf,pa,gp])=>({team:{abbreviation:ab,id:ab},stats:[{name:'avgPointsFor',value:pf},{name:'avgPointsAgainst',value:pa},{name:'gamesPlayed',value:gp},{name:'wins',value:Math.round(gp/2)},{name:'losses',value:Math.round(gp/2)}]}))}}]});
const NBA_LAST=std([['BOS',117,108,82],['NY',116,111,82],['LAL',115,113,82],['GS',114,112,82],['MIA',110,110,82],['ORL',106,105,82]]);
const boot=page=>new JSDOM(load(page),{runScripts:'dangerously',url:'https://ironsilkweekly.com/'+page,pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  const RD=w.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[NOW]))}static now(){return NOW}}w.Date=FD;
  w.__NO_GRADELOOP__=true;w.__NO_BACKFILL__=true;w.__NO_SYNC_LOOP__=true;
  w.fetch=u=>{u=String(u);const J=b=>Promise.resolve({ok:true,status:200,json:()=>Promise.resolve(b),text:()=>Promise.resolve(JSON.stringify(b))});
    if(/basketball\/nba\/scoreboard/.test(u))return J(nbaEvents(u));
    if(/basketball\/nba\/standings/.test(u))return J(/season=2027/.test(u)?std([]):NBA_LAST);
    return Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('{}')});};
  w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.localStorage.setItem('d4.setupDone','1');}}).window;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{try{
  const w=boot('nba.html');const E=s=>w.eval(s);await sleep(3500);
  T('the slate is Friday Nov 20 with the three test games',E('today()')==='2026-11-20'&&E('NBA_GAMES.length')===3,E('NBA_GAMES.map(g=>g.id).join(",")'));
  T('the cut-over is Nov 20 (days before stand)',E("noLineDay('2026-11-20')&&noLineDay('2026-11-21')&&!noLineDay('2026-11-19')"));
  const calls=id=>JSON.parse(E(`(()=>{const g=NBA_GAMES.find(x=>x.id==='${id}');const s=bbSim(BB_CFG.nba,g);return JSON.stringify(characterCalls('nba',g,s).map(c=>({v:c.voice,m:c.market,sd:c.side,line:c.line,price:c.price,sim:!!c.simLine})))})()`));
  const F=calls('full'),N=calls('noml'),Z=calls('none');
  const mk=A=>[...new Set(A.map(c=>c.m))].sort().join(',');
  T('every market priced: the characters call all three, against the real numbers',mk(F)==='ml,spread,total'&&F.every(c=>!c.sim)&&F.filter(c=>c.m==='ml').every(c=>c.price!=null),mk(F)+' · '+F.length+' calls');
  T('moneyline off the board: spread and total calls only — no character calls the moneyline',mk(N)==='spread,total'&&!N.some(c=>c.m==='ml')&&N.every(c=>!c.sim),mk(N)+' · '+N.filter(c=>c.m==='ml').map(c=>c.v).join(','));
  T('nothing posted: no character calls anything',Z.length===0,Z.map(c=>c.v+':'+c.m).join(','));
  T('the spread calls sit on the book\'s -14.5, not the sim\'s number',N.filter(c=>c.m==='spread').every(c=>Math.abs(Math.abs(c.line)-14.5)<1e-9),N.filter(c=>c.m==='spread').map(c=>c.line).join(','));
  /* a game from before the cut-over keeps the old behaviour (sim-line calls stood then) */
  const old=JSON.parse(E(`(()=>{const g0=NBA_GAMES.find(x=>x.id==='none');const g={...g0,id:'none-old',__date:'2026-11-19'};const s=bbSim(BB_CFG.nba,g0);return JSON.stringify(characterCalls('nba',g,s).map(c=>({m:c.market,sim:!!c.simLine,price:c.price})))})()`));
  T('Nov 19 and before stand: the old sim-line calls are still produced for those days',old.some(c=>c.sim)&&old.some(c=>c.m==='ml'&&c.price==null),old.length+' calls');
  /* the cards */
  const card=id=>E(`document.getElementById('nba-card-${id}')?document.getElementById('nba-card-${id}').outerHTML:(()=>{const g=NBA_GAMES.find(x=>x.id==='${id}');return bbCard(BB_CFG.nba,g)})()`);
  const cF=card('full'),cN=card('noml'),cZ=card('none');
  const slate=E("document.getElementById('slate').innerHTML");
  T('no game card shows a "sim only" tile or a "(model line)" market anymore',!/sim only|no real line yet|model line/.test(slate+cF+cN+cZ));
  T('every market priced: moneyline, spread and total all listed',/MONEYLINE/.test(cF)&&/SPREAD/.test(cF)&&/TOTAL 215/.test(cF));
  T('moneyline off the board: spread and total listed, the moneyline not listed at all',/SPREAD/.test(cN)&&/TOTAL 228\.5/.test(cN)&&!/MONEYLINE/.test(cN));
  T('nothing posted: no market listed, the card says no line, no listing',!/MONEYLINE|SPREAD|TOTAL \d/.test(cZ)&&/no line, no listing/.test(cZ));
  T('no tier tag or agreement meter on the line-less game',!/tier-tag|on this side/.test(cZ));
  /* Today's card */
  const tc=JSON.parse(E("JSON.stringify(todayCandidates('nba').map(x=>({g:x.game,m:x.m,price:x.price})))"));
  T('Today\'s card never takes a square without a real price',tc.every(x=>x.price!=null&&x.g!=='BOS@NY'&&!(x.g==='LAL@GS'&&x.m==='ml')),JSON.stringify(tc).slice(0,160));
  /* the ledger: a no-line call from Nov 20 on leaves (graded or not), older days and priced calls stay */
  const kept=JSON.parse(E(`JSON.stringify(voicesTrim([
    {id:'a',sp:'nba',date:'2026-11-20',voice:'Sim',market:'ml',side:'home',price:null},
    {id:'b',sp:'nba',date:'2026-11-20',voice:'Judge',market:'spread',side:'home',line:-3,simLine:true,price:null},
    {id:'c',sp:'nba',date:'2026-11-20',voice:'Coach',market:'ml',side:'home',price:null,graded:1,hit:true},
    {id:'d',sp:'nba',date:'2026-11-20',voice:'Sim',market:'ml',side:'home',price:-130},
    {id:'e',sp:'nba',date:'2026-11-20',voice:'Judge',market:'total',side:'over',line:215,price:-110},
    {id:'f',sp:'nba',date:'2026-11-19',voice:'Sim',market:'ml',side:'home',price:null,graded:1,hit:true},
    {id:'g',sp:'nba',date:'2026-11-18',voice:'Judge',market:'spread',side:'away',line:3,simLine:true,graded:1,hit:false}]).map(x=>x.id))`));
  T('ledger trim: no-line calls from Nov 20 leave (even graded), priced calls and earlier days stay',kept.join('')==='defg',kept.join(','));
  /* a stale no-line call already logged today leaves on the next pass, even with nothing new to write */
  E(`set(VOICES_KEY,[{id:'nba|BOS@NY|2026-11-20|Sim|ml',sp:'nba',date:'2026-11-20',game:'BOS@NY',voice:'Sim',market:'ml',side:'home',price:null,pick:'NY ML'}])`);
  E("voicesLog('nba',true)");
  const L=JSON.parse(E('JSON.stringify(get(VOICES_KEY,[]))'));
  T('a no-line call logged before the update is gone after the next pass',!L.some(x=>x.game==='BOS@NY')&&!L.some(x=>x.game==='LAL@GS'&&x.market==='ml'),L.length+' calls · '+[...new Set(L.map(x=>x.game+':'+x.market))].join(','));
  T('…and the priced games are in the ledger',L.some(x=>x.game==='MIA@ORL'&&x.market==='ml')&&L.some(x=>x.game==='LAL@GS'&&x.market==='spread'));
  /* the shared helpers the other boards use */
  T('NHL: a market with no tiles draws nothing',E("typeof nhlMkt!=='function'||nhlMkt('MONEYLINE',false,'  ')===''"));
  T('football: a section with no tiles draws nothing',E("typeof fbMktSec!=='function'||fbMktSec('Spread','',true)===''"));
  T('the glossary explains the rule',/no line, no listing/.test(E("document.documentElement.innerHTML")+E("typeof GLOSSARY!=='undefined'?JSON.stringify(GLOSSARY):''"))||fs.readFileSync(path.join(W,'shared.js'),'utf8').includes("['no line, no listing'"));
  T('no uncaught errors',errors.length===0,errors.slice(0,2).join(' | '));
}catch(e){T('test ran',false,String(e&&e.stack||e).slice(0,300));}
  console.log(out.join('\n'));const f=out.filter(x=>x.startsWith('FAIL')).length;console.log(`\n${out.length-f}/${out.length} passed`);process.exit(f?1:0);})();
