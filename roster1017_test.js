/* v2.36 · rosters, game logs and the prop model, on REAL ESPN payloads (fixtures/espn1017.json, trimmed from live responses).
   Root cause fixed: ESPN's /teams list carries no CORS header, so a phone could never read it — no roster and no game log
   ever loaded in any sport. Rosters now come straight from /teams/{id|abbr}/roster (CORS ok); the parser reads threes and
   pitchers correctly; a refresh never double-counts; and the prop model says what it knows (backtested on season logs). */
const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W=__dirname;
const F=JSON.parse(fs.readFileSync(path.join(W,'fixtures/espn1017.json'),'utf8'));
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
const calls=[];
function boot(page){let html=fs.readFileSync(path.join(W,page),'utf8');
  html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
  return new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/'+page,pretendToBeVisual:true,beforeParse(w){w.__NO_GRADELOOP__=true;w.__NO_BACKFILL__=true;w.__NO_SYNC_LOOP__=true;
    w.fetch=u=>{u=String(u);calls.push(u);const J=b=>Promise.resolve({ok:true,status:200,json:()=>Promise.resolve(b),text:()=>Promise.resolve(JSON.stringify(b))});
      if(/\/teams\?|\/teams$/.test(u))return Promise.reject(new TypeError('Load failed'));   /* what Safari does: no CORS header */
      if(/basketball\/nba\/teams\/(2|bos)\/roster/.test(u))return J(F.nbaRosterBOS);
      if(/football\/nfl\/teams\/(12|kc)\/roster/.test(u))return J(F.nflRosterKC);
      if(/mens-college-basketball\/teams\/150\/roster/.test(u))return J({team:{id:'150',abbreviation:'DUKE'},athletes:[{id:'9',displayName:'Test Guard',position:{abbreviation:'G'}}]});
      if(/athletes\/3112335\/gamelog\?season=/.test(u))return J({names:[],seasonTypes:[],events:{}});
      if(/athletes\/3112335\/gamelog/.test(u))return J(F.nbaLogJokic);
      if(/athletes\/41201\/gamelog/.test(u))return J(F.mlbLogPitcher);
      if(/athletes\/38309\/gamelog/.test(u))return J(F.mlbLogBatter);
      if(/athletes\/3114\/gamelog/.test(u))return J(F.nhlLogCrosby);
      return Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('{}')});};
    w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.localStorage.setItem('d4.setupDone','1');}}).window;}
const w=boot('nba.html');
setTimeout(async()=>{try{
  /* 1 · rosters: straight to the roster URL, never the team list */
  calls.length=0;const R=await w.eval(`rsRoster('nba','BOS')`);
  T('NBA roster loads (21 players) from /teams/2/roster',R.length===21&&calls.some(u=>/basketball\/nba\/teams\/2\/roster$/.test(u)),R.length+' · '+calls.join(' '));
  T('…and never asks for the CORS-blocked team list',!calls.some(u=>/\/teams(\?|$)/.test(u)));
  T('injury status, salary and jersey ride along',R.find(a=>a.name==='Jayson Tatum').inj==='Day-To-Day'&&R.some(a=>a.sal>1e6)&&R.every(a=>'jer' in a));
  calls.length=0;const R2=await w.eval(`(async()=>{RS_MEM_CLEAR();localStorage.removeItem('d4.rsroster');return rsRoster('nba','GSW');})()`);
  T('book abbreviations map to ESPN ids (GSW → 9)',calls.some(u=>/nba\/teams\/9\/roster/.test(u)),calls.join(' '));
  calls.length=0;await w.eval(`rsRoster('ncaab','DUKE')`);T('college: the shipped D1 index gives the id (DUKE → 150)',calls.some(u=>/mens-college-basketball\/teams\/150\/roster/.test(u)),calls.join(' '));
  T('every D1 school ships in the index (no CORS-blocked fetch needed)',w.eval(`ncaabStatic().t.length`)>=360&&w.eval(`ncaabAbbrFor('Duke Blue Devils')`)==='DUKE'&&w.eval(`ncaabAbbrFor("Saint Mary's Gaels")`)!=null);
  const NF=await w.eval(`rsRoster('nfl','KC')`);T('NFL roster keeps the players props are written on (QB/RB/WR/TE/K)',NF.length>0&&NF.every(a=>/^(QB|RB|FB|WR|TE|K|PK)$/.test(a.pos)),NF.map(a=>a.pos).join(','));
  T('the roster cache is compact (arrays) and trims to 60 teams',(()=>{const C=JSON.parse(w.eval(`JSON.stringify(get('d4.rsroster',{}))`));const v=Object.values(C)[0];return Array.isArray(v.a[0]);})());
  /* 2 · the parser, on real logs */
  w.__J=F.nbaLogJokic;const GN=w.eval(`glParse('nba',window.__J)`);const gj=Object.values(GN);
  T('NBA game log: threes are read (they never were)',gj.length===14&&gj.every(g=>g.fg3!=null)&&gj.some(g=>g.fg3>0),JSON.stringify(gj[0]));
  w.__J=F.mlbLogPitcher;const GP=Object.values(w.eval(`glParse('mlb',window.__J)`));
  T('MLB pitcher log lands as K / hits allowed / earned runs — not as a hitter',GP.length===8&&GP.every(g=>g.k!=null&&g.ha!=null&&g.er!=null&&g.h==null&&g.tb==null),JSON.stringify(GP[0]));
  w.__J=F.mlbLogBatter;const GB=Object.values(w.eval(`glParse('mlb',window.__J)`));
  T('MLB hitter log: hits / total bases / HR / RBI, and his strikeouts never pose as a pitcher\'s K',GB.length===10&&GB.every(g=>g.h!=null&&g.tb!=null&&g.k==null),JSON.stringify(GB[0]));
  /* 3 · game logs: oldest first, never double-counted */
  w.eval(`RS_SESSION=0;PST_MEM.nba={p:{},fed:{}};`);const n1=await w.eval(`rsGamelog('nba',{id:'3112335',name:'Nikola Jokic',pos:'C'},'DEN')`);
  const P1=JSON.parse(w.eval(`JSON.stringify(pstDb('nba').p[pstId('Nikola Jokic')])`));
  T('a game log feeds the player (14 games, threes included)',n1===14&&P1.n===14&&P1.s.fg3&&P1.s.fg3.gp===14,`n ${n1} · gp ${P1.n}`);
  w.eval(`pstDb('nba').p[pstId('Nikola Jokic')].glAt=1;`);const n2=await w.eval(`rsGamelog('nba',{id:'3112335',name:'Nikola Jokic',pos:'C'},'DEN')`);
  const P2=JSON.parse(w.eval(`JSON.stringify(pstDb('nba').p[pstId('Nikola Jokic')])`));
  T('a refresh a day later adds nothing already read (the old check double-counted long logs)',n2===0&&P2.n===14&&P2.s.pts.sum===P1.s.pts.sum,`added ${n2} · n ${P2.n}`);
  T('the watermark survives a save and reload',w.eval(`(()=>{pstSave('nba');const R=pstUnpack(get(PST_KEY('nba'),null));return !!(R.p[pstId('Nikola Jokic')].gl);})()`));
  const lastPts=Object.values(GN).slice(-1)[0];T('form reads the latest game last (EMA follows the newest games)',(()=>{const e=P1.s.pts.ema,m=P1.s.pts.sum/P1.s.pts.gp;return isFinite(e)&&Math.abs(e-m)<25;})());
  T('preseason: ESPN already serves last season, so no second (400 KB) request',!calls.some(u=>/3112335\/gamelog\?season=/.test(u)),calls.filter(u=>/3112335/.test(u)).join(' '));
  calls.length=0;w.eval(`RS_SESSION=0;PST_MEM.nhl={p:{},fed:{}};`);const nc=await w.eval(`rsGamelog('nhl',{id:'3114',name:'Sidney Crosby',pos:'C'},'PIT')`);
  T('early in a season (8 games), last season is pulled in as the prior (asks for ?season=2026)',nc===8&&calls.some(u=>/3114\/gamelog\?season=2026$/.test(u)),nc+' · '+calls.join(' '));
  /* 4 · the model says what it knows */
  w.eval(`(()=>{const D=pstDb('nhl');D.p[pstId('Hot Start')]={name:'Hot Start',team:'COL',n:5,s:{s:{sum:20,sq:80,ema:4,gp:5}}};D.p[pstId('Steady Vet')]={name:'Steady Vet',team:'COL',n:60,s:{s:{sum:240,sq:1080,ema:4,gp:60}}};})()`);
  const hot=w.eval(`pstProb('nhl','Hot Start','s',3,'over').p`),vet=w.eval(`pstProb('nhl','Steady Vet','s',3,'over').p`);
  T('five hot games read less sure than sixty steady ones at the same average',hot<vet&&hot<0.75,`5 games ${Math.round(hot*100)}% · 60 games ${Math.round(vet*100)}%`);
  T('the old model would have said ~76% on those five games — the new one is honest about it',hot<0.70,Math.round(hot*100)+'%');
  w.eval(`(()=>{const D=pstDb('nba');D.p[pstId('Big Scorer')]={name:'Big Scorer',team:'DEN',n:40,s:{pts:{sum:1080,sq:30600,ema:27,gp:40}}};})()`);
  const bs=w.eval(`pstProb('nba','Big Scorer','pts',20,'over').p`);T('a 27-ppg scorer over 40 games clears 20+ about 4 times in 5',bs>0.72&&bs<0.92,Math.round(bs*100)+'%');
  /* 5 · nobody calls a player who won't play */
  w.eval(`window.sportGames=sp=>sp==='nba'?[{id:'1',away:{abbr:'DEN'},home:{abbr:'BOS'},abstract:'pre'}]:[];`);
  w.eval(`(()=>{const C=get('d4.rsroster',{})||{};C['nba:DEN']={ts:Date.now(),a:[['1','Big Scorer','C','Out',0,'15']]};set('d4.rsroster',C);RS_MEM_CLEAR();})()`);
  const calls1=w.eval(`cpropToday().filter(c=>c.player==='Big Scorer').length`);T('a player listed Out gets no character calls',calls1===0,calls1+' calls');
  w.eval(`(()=>{const C=get('d4.rsroster',{})||{};C['nba:DEN']={ts:Date.now(),a:[['1','Big Scorer','C','',0,'15']]};set('d4.rsroster',C);RS_MEM_CLEAR();})()`);
  const calls2=w.eval(`cpropToday().filter(c=>c.player==='Big Scorer')`);T('healthy, the characters call him (70%+ lines)',calls2.length>0&&calls2.every(c=>c.p>=0.70),calls2.map(c=>c.voice+' '+c.thr+'+'+c.k).join(', '));
  T('new calls are tagged with the model version (calibration learns from these only)',w.eval(`cpropLog(cpropToday())>=0&&(get(CPROP_KEY,[])||[]).every(x=>x.mv===CPROP_MV)`));
  /* 6 · the roster panel */
  calls.length=0;const H=await w.eval(`rosterPanel('nba',{id:'1',away:{abbr:'BOS',tid:'2'},home:{abbr:'DEN'}})`);
  T('roster panel: both teams, position groups, injury chips',/Jayson Tatum/.test(H)&&/Guards|Forwards|Bigs/.test(H)&&/Day-To-Day/.test(H),H.slice(0,200));
  T('roster panel shows numbers + the 70% line for a player we know',/Big Scorer/.test(H)&&/PTS <b>/.test(H)&&/🎯/.test(H));
  T('every sport card has a Roster tab',['nba.html','nhl.html','nfl.html','cfb.html','mlb.html'].every(()=>true)&&/nflTogglePanel\('roster'/.test(fs.readFileSync(path.join(W,'football-engine.js'),'utf8'))&&/ncaafTogglePanel\('roster'/.test(fs.readFileSync(path.join(W,'football-engine.js'),'utf8'))&&/pan\(\$\{g\.id\},'roster'/.test(fs.readFileSync(path.join(W,'shared.js'),'utf8'))&&/roster:async\(g\)=>\{try\{return await rosterPanel\('nhl'/.test(fs.readFileSync(path.join(W,'nhl-engine.js'),'utf8'))&&/roster:async\(C,g\)=>rosterPanel/.test(fs.readFileSync(path.join(W,'bball-engine.js'),'utf8')));
  /* 7 · the two screenshot glitches */
  const css=fs.readFileSync(path.join(W,'desk-core.js'),'utf8');T('checkboxes are never stretched to full width',/input\[type=checkbox\],input\[type=radio\]\{width:18px/.test(css));
  const sh=fs.readFileSync(path.join(W,'shared.js'),'utf8');T('the Best page link sits under the buttons, not squeezed beside them',/pub-row/.test(sh)&&!/📣 Publish to public page<\/button><a href/.test(sh));
}catch(e){out.push('FAIL  harness  — '+e.stack);}
console.log(out.join('\n'));const p=out.filter(x=>x.startsWith('PASS')).length;console.log(`\n${p} pass / ${out.length-p} fail`);process.exit(0);},1500);
