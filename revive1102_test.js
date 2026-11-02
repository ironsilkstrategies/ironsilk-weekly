const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const WD='/home/claude/work';let pass=0,fail=0;const T=(n,c,x)=>{c?pass++:fail++;console.log((c?'PASS ':'FAIL ')+n+(c?'':'  — '+(x||'')));};
let html=fs.readFileSync(path.join(WD,'nfl.html'),'utf8');html=html.replace(/<script src="min\/([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(WD,f),'utf8')}</script>`);
const vc=new (require('jsdom').VirtualConsole)();
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nfl.html',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){w.__NO_GRADELOOP__=true;w.__NO_BACKFILL__=true;w.__NO_SYNC_LOOP__=true;w.__NO_FLIP_RELOAD__=1;
  w.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('{}')});w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.localStorage.setItem('d4.setupDone','1');}}).window;
setTimeout(()=>{try{
const f=(sp,a,h,name)=>w.eval(`factorsFor('${sp}',{away:{abbr:'${a}',name:'${name||a}'},home:{abbr:'${h}',name:'${name||h}'},date:'2026-11-02T18:00:00Z'},{})`);
T('MLB division',f('mlb','NYY','BOS').includes('divgame'));T('MLB interleague',f('mlb','NYY','LAD').includes('interleague'));
T('MLB hitter park at Coors + altitude-free',f('mlb','SD','COL').includes('hitterpark'));T('MLB pitcher park in SF',f('mlb','SD','SF').includes('pitcherpark'));
T('MLB roof',f('mlb','NYY','TB').includes('roofpark'));
T('NFL conference not division',f('nfl','KC','BUF').includes('confgame'));T('NFL non-conference',f('nfl','KC','DAL').includes('nonconf'));T('NFL altitude in Denver',f('nfl','KC','DEN').includes('altitude'));
T('NHL division',f('nhl','BOS','TOR').includes('divgame'));T('NHL altitude in Colorado',f('nhl','DAL','COL').includes('altitude'));
T('NBA division',f('nba','LAL','GS').includes('divgame'));T('NBA non-conf',f('nba','BOS','LAL').includes('nonconf'));
const g=w.eval(`ctxGaugesHtml('nhl',{away:{abbr:'DAL'},home:{abbr:'COL'},date:'2026-11-02T18:00:00Z'})`);T('game card gauges render',/Matchup context/.test(g)&&/Altitude/.test(g)&&/<svg/.test(g),g.slice(0,200));
const h=w.eval('edgeDeskHtml()');T('Edge Desk renders all six panels',['Exposure check','Crowd favorites','Source conflicts','Situations board','Loss post-mortems','Missions'].every(k=>h.includes(k)),h.slice(0,300));
w.eval(`set(LS.locked,[{id:1,date:today(),legs:[{game:'KC@DEN',pick:'KC ML'},{game:'A@B',pick:'A ML'}]},{id:2,date:today(),legs:[{game:'KC@DEN',pick:'KC ML'}]},{id:3,date:today(),legs:[{game:'KC@DEN',pick:'Over 44'}]}])`);
const X=w.eval('revExposure()');T('exposure flags a game on 3 tickets',X.flagged.length===1&&X.flagged[0].game==='KC@DEN');T('same bet on 2 tickets is listed',X.dupes.some(d=>d.pick==='KC ML'&&d.t.size===2));
T('coachHtml still works with no game',typeof w.eval("coachHtml({screen:'record'})")==='string');
}catch(e){T('crashed',false,e.stack)}console.log(pass+' pass / '+fail+' fail');process.exit(0);},1500);
