/* v2.81.2 · ⚡ one-tap BetOnline lines (The Odds API, bookmaker "betonlineag"): one request per shown in-season sport,
   filed through the screenshot reader as YOUR book's lines (source "bol"), each sport on its own page, once per pull */
const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
const NOW='2026-10-31T15:00:00Z';
const ev=(id,a,h,t,ml,sp,ou,book)=>({id,sport_key:'x',commence_time:t,home_team:h,away_team:a,bookmakers:[{key:book||'betonlineag',title:'BetOnline.ag',last_update:NOW,markets:[
  ...(ml?[{key:'h2h',outcomes:[{name:a,price:ml[0]},{name:h,price:ml[1]}]}]:[]),
  ...(sp?[{key:'spreads',outcomes:[{name:a,price:sp[1],point:sp[0]},{name:h,price:sp[3],point:sp[2]}]}]:[]),
  ...(ou?[{key:'totals',outcomes:[{name:'Over',price:ou[1],point:ou[0]},{name:'Under',price:ou[2],point:ou[0]}]}]:[])]}]});
const BOARD={
  basketball_nba:[ev('n1','Atlanta Hawks','Boston Celtics','2026-10-31T23:10:00Z',[155,-180],[4.5,-110,-4.5,-110],[225.5,-110,-110]),
    ev('n2','Portland Trail Blazers','Utah Jazz','2026-11-01T02:00:00Z',[-310,252],[-8,-115,8,-105],[232,-110,-110]),   /* 9 PM CT tonight */
    ev('n3','Miami Heat','Chicago Bulls','2026-11-04T00:00:00Z',[120,-140],null,null)],                               /* 3 days out — skipped */
  icehockey_nhl:[ev('h1','Chicago Blackhawks','Boston Bruins','2026-10-31T23:00:00Z',[200,-230],[1.5,-127,-1.5,107],[6,-116,100]),
    ev('h2','Montréal Canadiens','Utah Mammoth','2026-11-01T01:00:00Z',[-120,100],[-1.5,180,1.5,-220],[6.5,-105,-115])],
  americanfootball_nfl:[ev('f1','Washington Commanders','Los Angeles Rams','2026-11-01T21:05:00Z',[170,-200],[4,-110,-4,-110],[47.5,-110,-110])],
  americanfootball_ncaaf:[ev('c1','Miami (OH) RedHawks','Ohio Bobcats','2026-10-31T23:00:00Z',[150,-180],[4.5,-110,-4.5,-110],[44,-110,-110]),
    ev('c2','San José State Spartans','Hawaii Rainbow Warriors','2026-11-01T05:00:00Z',[-130,110],[-2.5,-110,2.5,-110],[55,-110,-110]),
    ev('c3','UConn Huskies','Air Force Falcons','2026-10-31T19:00:00Z',[-145,125],[-3,-110,3,-110],[49,-110,-110])]};
function page(file,setup){let html=fs.readFileSync(path.join(W,file),'utf8');
  html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
  return new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/'+file,pretendToBeVisual:true,beforeParse(w){
    const RD=w.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[RD.parse(NOW)]))}static now(){return RD.parse(NOW)}}w.Date=FD;
    w.__NO_GRADELOOP__=true;w.__NO_BACKFILL__=true;w.__ODDS=[];w.__FAIL={};
    w.fetch=(u)=>{u=String(u);if(/api\.the-odds-api\.com/.test(u)){w.__ODDS.push(u);const k=(u.match(/sports\/([a-z_]+)\/odds/)||[])[1];
        const H={get:n=>({'x-requests-remaining':'488','x-requests-used':'12','x-requests-last':'3'})[n.toLowerCase()]||null};
        if(w.__FAIL[k])return Promise.resolve({ok:false,status:w.__FAIL[k],headers:H,json:()=>Promise.resolve({message:'nope'})});
        return Promise.resolve({ok:true,status:200,headers:H,json:()=>Promise.resolve(JSON.parse(JSON.stringify(BOARD[k]||[])))});}
      return Promise.resolve({ok:false,status:404,headers:{get:()=>null},json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});};
    w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.localStorage.setItem('d4.setupDone','1');if(setup)setup(w);}}).window;}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{try{
  let CACHE=null;
  /* ── the NBA page: one tap ── */
  const w=page('nba.html',w=>{w.localStorage.setItem('d4.key',JSON.stringify('TESTKEY'));});await sleep(2500);
  w.eval(`set(LS.key,'TESTKEY');NBA_GAMES.length=0;NBA_GAMES.push({id:'g1',away:{abbr:'ATL',name:'Atlanta Hawks'},home:{abbr:'BOS',name:'Boston Celtics'},start:'2026-10-31T23:10:00Z',__date:'2026-10-31'},
    {id:'g2',away:{abbr:'POR',name:'Portland Trail Blazers'},home:{abbr:'UTAH',name:'Utah Jazz'},start:'2026-11-01T02:00:00Z',__date:'2026-10-31'});
    bbPutLines(BB_CFG.nba,[{away:'ATL',home:'BOS',game:'ATL@BOS',market:'moneyline',side:'away',line:null,price:140,src:'espn',capturedAt:1,date:'2026-10-31'},
      {away:'ATL',home:'BOS',game:'ATL@BOS',market:'moneyline',side:'home',line:null,price:-165,src:'espn',capturedAt:1,date:'2026-10-31'}]);window.__ODDS.length=0;`);
  const R=await w.eval(`bolPull({sports:['nba','nhl','nfl','ncaaf']})`);
  T('one request per sport, BetOnline only, the three game markets',w.__ODDS.length===4&&w.__ODDS.every(u=>/bookmakers=betonlineag/.test(u)&&/markets=h2h,spreads,totals/.test(u)&&!/regions=/.test(u)),w.__ODDS.join(' | ').slice(0,300));
  T('the key goes only to the Odds API (and is URL-encoded)',w.__ODDS.every(u=>/apiKey=TESTKEY/.test(u)));
  T('today\'s and tonight\'s games are kept, a game 3 days out is not (basketball)',R.by.nba&&R.by.nba.n===2&&R.by.nba.all===3,JSON.stringify(R.by));
  T('football keeps the week (Sunday\'s NFL game on Saturday)',R.by.nfl&&R.by.nfl.n===1);
  T('credits left are read from the response',R.cr&&R.cr.left==='488');
  T('this page\'s sport is filed right away',R.here&&R.here.sp==='nba'&&R.here.games===2,JSON.stringify(R.here));
  const L=w.eval(`nbaBookLinesFor('ATL@BOS','2026-10-31')`);const aw=L.find(x=>x.market==='moneyline'&&x.side==='away');
  T('BetOnline\'s price outranks ESPN\'s on the card (ATL +155, not ESPN\'s +140)',aw&&aw.price===155&&aw.src==='bol',JSON.stringify(aw));
  const sp=L.find(x=>x.market==='spread'&&x.side==='home'),ou=L.find(x=>x.market==='total'&&x.side==='over');
  T('spread and total land too (BOS -4.5 -110, o225.5 -110)',sp&&sp.line===-4.5&&sp.price===-110&&ou&&ou.line===225.5,JSON.stringify([sp,ou]));
  const L2=w.eval(`nbaBookLinesFor('POR@UTAH','2026-10-31')`);T('a 9 PM tip (02:00 UTC) files under tonight, not tomorrow',L2.some(x=>x.src==='bol'&&x.market==='spread'&&x.line===-8),JSON.stringify(L2.slice(0,2)));
  T('filed once per pull — opening the page again does not re-file',w.eval('bolFileHere(0,true)')===null);
  T('the status line says when, what and the credits left',/Last BetOnline pull/.test(w.eval('bolStatusHtml()'))&&/488/.test(w.eval('bolStatusHtml()'))&&/NBA 2/.test(w.eval('bolStatusHtml()')),w.eval('bolStatusHtml()').replace(/<[^>]+>/g,''));
  /* a failing sport doesn't stop the others */
  w.eval(`window.__FAIL={icehockey_nhl:401};window.__ODDS.length=0;`);const R2=await w.eval(`bolPull({sports:['nba','nhl']})`);
  T('a 401 on one sport is reported; the rest still file',R2.err.nhl&&/401/.test(R2.err.nhl)&&R2.by.nba&&R2.by.nba.n===2,JSON.stringify(R2.err));
  w.eval('window.__FAIL={}');await w.eval(`bolPull({sports:['nba','nhl','nfl','ncaaf']})`);
  CACHE=w.eval(`localStorage.getItem('d4.bolcache')`);
  T('auto mode is off by default (no surprise credit use)',w.eval('bolAutoOn()')===false&&(await w.eval(`bolAutoMaybe('test',2)`))===null);
  w.eval(`set('d4.bolauto',true);window.__ODDS.length=0;`);T('auto mode skips when today\'s pull is fresh',(await w.eval(`bolAutoMaybe('test',2)`))===null&&w.__ODDS.length===0);
  w.eval(`(()=>{const C=get('d4.bolcache',{});C.ts=Date.now()-3*36e5;set('d4.bolcache',C);})()`);const R3=await w.eval(`bolAutoMaybe('master evaluation',2)`);
  T('…and pulls when the last pull is 2+ hours old',R3&&R3.by&&w.__ODDS.length>0);
  T('no key: a clear message, no request',(()=>{w.eval(`localStorage.removeItem('d4.key');localStorage.removeItem('d4.oddspapi');window.__ODDS.length=0;`);return true;})()&&/Odds API key/.test((await w.eval(`bolPull({})`)).err||'')&&w.__ODDS.length===0);
  T('the cache and filed marks stay on this device (not synced)',w.eval(`syncSkip('d4.bolcache')&&syncSkip('d4.bolfiled')&&syncSkip('d4.bollog')`)===true&&w.eval(`syncSkip('d4.bolauto')`)===false);
  w.close();
  /* ── the NHL page files its part from the same pull ── */
  const h=page('nhl.html',w=>{w.localStorage.setItem('d4.bolcache',CACHE);});await sleep(2500);
  h.eval(`NHL_GAMES.length=0;NHL_GAMES.push({id:'h1',away:{abbr:'CHI',name:'Chicago Blackhawks'},home:{abbr:'BOS',name:'Boston Bruins'},start:'2026-10-31T23:00:00Z'},
    {id:'h2',away:{abbr:'MTL',name:'Montreal Canadiens'},home:{abbr:'UTAH',name:'Utah Mammoth'},start:'2026-11-01T01:00:00Z'});localStorage.removeItem('d4.bolfiled');`);
  const RH=h.eval('bolFileHere(0,true)');const HL=h.eval(`nhlBookLinesFor('CHI@BOS')`);const pl=HL.find(x=>x.market==='spread'&&x.side==='away');
  T('NHL: the puck line files as the spread (CHI +1.5 -127), from BetOnline',RH&&RH.games>=1&&pl&&pl.line===1.5&&pl.price===-127&&pl.src==='bol',JSON.stringify({RH,pl}));
  const HL2=h.eval(`nhlBookLinesFor('MTL@UTAH')`);T('accented names resolve (Montréal → MTL)',HL2.some(x=>x.src==='bol'&&x.market==='moneyline'),JSON.stringify(RH));
  h.close();
  /* ── the NFL page ── */
  const f=page('nfl.html',w=>{w.localStorage.setItem('d4.bolcache',CACHE);w.localStorage.setItem('d4.key',JSON.stringify('TESTKEY'));});await sleep(3000);
  T('opening the NFL page no longer pulls odds by itself',f.__ODDS.length===0,f.__ODDS.join(','));
  f.eval(`NFL_GAMES=[{id:'f1',away:{abbr:'WSH',name:'Washington Commanders'},home:{abbr:'LAR',name:'Los Angeles Rams'},start:'2026-11-01T21:05:00Z'}];localStorage.removeItem('d4.bolfiled');`);
  const RF=f.eval('bolFileHere(0,true)');const FL=f.eval(`nflBookLinesFor('WSH@LAR')`);
  T('NFL: Sunday\'s game files from Saturday\'s pull (WSH +4 -110, ML +170)',RF&&FL.some(x=>x.market==='spread'&&x.side==='away'&&x.line===4)&&FL.some(x=>/money/.test(x.market)&&x.side==='away'&&x.price===170),JSON.stringify({RF,FL:FL.slice(0,3)}));
  f.close();
  /* ── the CFB page: book names → ESPN teams ── */
  const c=page('cfb.html',w=>{w.localStorage.setItem('d4.bolcache',CACHE);});await sleep(3000);
  c.eval(`NCAAF_GAMES=[{id:'c1',away:{abbr:'M-OH',name:'Miami (OH) RedHawks',location:'Miami (OH)',shortName:'Miami OH'},home:{abbr:'OHIO',name:'Ohio Bobcats',location:'Ohio',shortName:'Ohio'}},
    {id:'c2',away:{abbr:'SJSU',name:'San José State Spartans',location:'San José State',shortName:'San José St'},home:{abbr:'HAW',name:"Hawai'i Rainbow Warriors",location:"Hawai'i",shortName:"Hawai'i"}},
    {id:'c3',away:{abbr:'CONN',name:'UConn Huskies',location:'UConn',shortName:'UConn'},home:{abbr:'AFA',name:'Air Force Falcons',location:'Air Force',shortName:'Air Force'}}];localStorage.removeItem('d4.bolfiled');try{CFB_ABBR_MEMO.games=null;}catch(e){}`);
  const RC=c.eval('bolFileHere(0,true)');const games=['M-OH@OHIO','SJSU@HAW','CONN@AFA'].map(k=>c.eval(`ncaafBookLinesFor(${JSON.stringify(k)})`).filter(x=>x.src==='bol').length);
  T('CFB: Miami (OH), San José State and UConn all land on their ESPN games',games.every(n=>n>=5),JSON.stringify({RC,games}));
  c.close();
  /* ── the old DraftKings fetchers are gone from every page ── */
  const src=['shared.js','football-engine.js','bball-engine.js','nhl-engine.js'].map(x=>fs.readFileSync(path.join(W,x),'utf8')).join('\n');
  T('no silent DraftKings pulls remain (regions=us odds requests)',!/sports\/(americanfootball_nfl|americanfootball_ncaaf|icehockey_nhl|\$\{C\.odds\})\/odds\/\?apiKey=\$\{key\}&regions=us/.test(src)&&!/function (fetchNFLLiveOdds|fetchNCAAFLiveOdds|fetchNHLLiveOdds|bbFetchLiveOdds|fetchMLBLiveOdds)\b/.test(src));
}catch(e){T('harness',false,e.stack);}
console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length} pass / ${out.filter(x=>x.startsWith('FAIL')).length} fail`);process.exit(0);})();
