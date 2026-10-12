const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
let html=fs.readFileSync(path.join(W,'nfl.html'),'utf8');
html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nfl.html',pretendToBeVisual:true,beforeParse(w){w.__NO_GRADELOOP__=true;w.__NO_BACKFILL__=true;
  w.fetch=()=>Promise.resolve({ok:false,status:400,json:()=>Promise.resolve({}),text:()=>Promise.resolve('{}')});w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.localStorage.setItem('d4.setupDone','1');}}).window;
setTimeout(()=>{try{
  /* ESPN's season pull fails (400) — the index still builds from what the app holds */
  const teams={KC:{w:4,l:0,gp:4,pf:118,pa:70},BUF:{w:3,l:1,gp:4,pf:110,pa:80},DEN:{w:2,l:2,gp:4,pf:88,pa:90},LV:{w:1,l:3,gp:4,pf:70,pa:100},MIA:{w:0,l:4,gp:4,pf:60,pa:120},NYJ:{w:2,l:2,gp:4,pf:85,pa:85}};
  w.eval(`set('d4.seasonstats',{nfl:{d:today(),teams:${JSON.stringify(teams)},meta:{KC:{n:'Kansas City Chiefs',l:'',c:'e31837'}}}});
    set(LS.allfinals,{'nfl:LV@KC':{sport:'nfl',d:'2026-09-14',a:13,h:31},'nfl:MIA@BUF':{sport:'nfl',d:'2026-09-14',a:10,h:30},'nfl:DEN@NYJ':{sport:'nfl',d:'2026-09-21',a:20,h:17},'nfl:KC@MIA':{sport:'nfl',d:'2026-09-28',a:35,h:14},'nfl:BUF@DEN':{sport:'nfl',d:'2026-09-28',a:24,h:21},'nfl:NYJ@LV':{sport:'nfl',d:'2026-10-05',a:16,h:19},'nfl:BUF@LV':{sport:'nfl',d:'2026-10-05',a:27,h:10}});
    window.sportGames=sp=>sp==='nfl'?[{id:'1',away:{abbr:'DEN'},home:{abbr:'KC'},abstract:'in'}]:[];
    window.voicesLines=(sp,g)=>({spH:{line:-30,price:-110}});   /* a LIVE line — must be ignored */
    set('d4.clv',{[today()]:{'nfl|DEN@KC|spread|home':{open:{line:-6.5},close:{line:-7}},'nfl|DEN@KC|spread|away':{close:{line:7}}}});`);
  const R=w.eval(`pwrRank('nfl')`);
  T('index builds with ESPN refusing the season pull',R&&R.teams.length===6,R&&R.teams.map(x=>x.rank+' '+x.abbr+' '+x.r.toFixed(1)).join(' · '));
  T('KC (4-0, best differential) ranks #1, MIA (0-4) last',R.teams[0].abbr==='KC'&&R.teams[R.teams.length-1].abbr==='MIA');
  const k=R.by.KC.comp;T('every component is in the breakdown',['res','mpg','rec','mkt','form'].every(c=>k[c]!=null&&isFinite(k[c])),JSON.stringify(Object.fromEntries(Object.entries(k).map(([a,b])=>[a,+(+b).toFixed(1)]))));
  T('market reads the CLOSING line (KC −7), never the live −30',Math.abs(k.mkt-(7-R.h+R.by.DEN.comp.res))<0.01&&k.mkt<14,'mkt '+k.mkt.toFixed(2));
  T('names/colors come from the standings',R.by.KC.name==='Kansas City Chiefs'&&R.by.KC.color==='#e31837');
  const P=w.eval(`pwrPanelHtml('nfl')`);T('panel shows the breakdown columns and how it is built',/results<\/td><td>diff<\/td><td>market<\/td><td>form<\/td><td>health/.test(P)&&/TheDesk Power Index/.test(P)&&/sharpest money/.test(P));
  T('home edge stays sane on a small sample',R.h>=0.7&&R.h<=4.5,R.h.toFixed(2));
  /* CFB prior: school by longest name prefix, never the mislabeled mascot row */
  w.eval(`set('d4.ncaafpower',{ts:Date.now(),v:{'Ohio State':{sp:28.8},'Ohio State Buckeyes':{sp:-10.5},'Oregon':{sp:21.6},'Oregon State':{sp:1.2}}});PWR_CFBN={OSU:'Ohio State Buckeyes',ORST:'Oregon State Beavers'};`);
  T('CFB SP+ prior matches the school, not the mislabeled mascot row',Math.abs(w.eval(`pwrPrior('ncaaf','OSU',{})`)-0.8*28.8)<1e-9&&Math.abs(w.eval(`pwrPrior('ncaaf','ORST',{})`)-0.8*1.2)<1e-9);
  /* once a day */
  w.eval(`PWR_C={};window.__b=0;const _b=pwrIndexBuild;window.pwrIndexBuild=function(){__b++;return _b.apply(this,arguments);};`);
  w.eval(`pwrRank('nfl')`);T('same day: the saved table is read, not rebuilt',w.eval('__b')===0);
}catch(e){out.push('CRASH '+e.stack);}
console.log(out.join('\n'));process.exit(0);},1500);
