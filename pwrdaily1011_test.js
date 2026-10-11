const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
let html=fs.readFileSync(path.join(W,'nhl.html'),'utf8');
html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const TM=['TB','NJ','BOS','TOR','NYR','PIT','CAR','FLA'];let seed=3;const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
/* ESPN shapes vary: status only at the EVENT level, scores as objects */
const mkEv=(d,a,h,as,hs)=>({date:d+'T23:00Z',season:{type:2},status:{type:{state:'post',completed:true}},competitions:[{competitors:[{homeAway:'away',score:{value:as,displayValue:String(as)},team:{abbreviation:a}},{homeAway:'home',score:{value:hs,displayValue:String(hs)},team:{abbreviation:h}}]}]});
const EV=[];for(let day=1;day<=40;day+=2){const d=new Date(Date.UTC(2026,7,day));const ds=d.toISOString().slice(0,10);const sh=[...TM].sort(()=>rnd()-0.5);for(let i=0;i<8;i+=2)EV.push(mkEv(ds,sh[i],sh[i+1],Math.floor(rnd()*6),Math.floor(rnd()*6)+(TM.indexOf(sh[i+1])<3?1:0)));}
EV.forEach(e=>{const c=e.competitions[0].competitors;if(c[0].score.value===c[1].score.value)c[1].score.value++;});
const W0=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nhl.html',pretendToBeVisual:true,beforeParse(w){w.__NO_GRADELOOP__=true;w.__NO_BACKFILL__=true;w.__calls=0;w.__fail=false;
  w.fetch=(u)=>{u=String(u);if(/scoreboard\?dates=/.test(u)){w.__calls++;if(w.__fail)return Promise.resolve({ok:false,status:503,json:()=>Promise.resolve({})});const m=u.match(/dates=(\d{8})-(\d{8})/);const f=m[1].replace(/(\d{4})(\d\d)(\d\d)/,'$1-$2-$3'),e=m[2].replace(/(\d{4})(\d\d)(\d\d)/,'$1-$2-$3');
      return Promise.resolve({ok:true,json:()=>Promise.resolve({events:EV.filter(ev=>{const d=ev.date.slice(0,10);return d>=f&&d<=e;})})});}
    return Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('{}')});};
  w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.localStorage.setItem('d4.setupDone','1');}}).window;
const w=W0;
setTimeout(async()=>{try{
  w.eval(`window.pwrSeasonStart=()=>'2026-08-01';`);
  for(let i=0;i<6;i++){if(!await w.eval(`pwrFetch('nhl',8)`))break;}
  const n=w.eval(`pwrGames('nhl').length`);T('ESPN status at the event level + scores as objects still parse',n===EV.length,n+' of '+EV.length);
  const R=w.eval(`pwrRank('nhl')`);T('ranks built',R&&R.teams.length===8);
  T('board abbreviations (TBL, NJD) find ESPN abbreviations (TB, NJ)',w.eval(`teamTag('nhl','TBL')`)===`#${R.by.TB.rank} `&&w.eval(`teamTag('nhl','NJD')`)===`#${R.by.NJ.rank} `);
  /* same day, fresh page: no fetching, no recompute */
  w.__calls=0;w.eval(`Object.keys(PWR_MEMO).forEach(k=>delete PWR_MEMO[k]);PWR_C={};window.__solves=0;const _s=pwrSolve;window.pwrSolve=function(){__solves++;return _s.apply(this,arguments);};`);
  const c2=await w.eval(`pwrFetch('nhl',8)`);const R2=w.eval(`pwrRank('nhl')`);
  T('second visit the same day: zero ESPN calls',c2===0&&w.__calls===0,c2+'/'+w.__calls);
  T('…and the saved table is read, not recomputed',R2&&R2.teams[0].abbr===R.teams[0].abbr&&w.eval('__solves')===0,'solves '+w.eval('__solves'));
  /* next day: rebuilds */
  w.eval(`pwrB('nhl').day=dayShift(today(),-1);`);const c3=await w.eval(`pwrFetch('nhl',8)`);
  T('next day: one daily refresh of the recent weeks only',c3>=1&&c3<=3,c3+' calls');
  /* failure is visible, with a retry */
  w.eval(`Object.keys(PWR_MEMO).forEach(k=>delete PWR_MEMO[k]);PWR_C={};localStorage.removeItem('d4.pwrg.nhl');localStorage.removeItem('d4.pwrrank');`);w.__fail=true;
  await w.eval(`pwrFetch('nhl',8)`);const panel=w.eval(`pwrPanelHtml('nhl')`).replace(/<[^>]+>/g,' ');
  T('ESPN failure shows why + a Build now button',/couldn't finish: ESPN answered 503/.test(panel)&&/Build now/.test(panel),panel.replace(/\s+/g,' ').slice(0,140));
  /* storage full: still ranks for this visit */
  w.__fail=false;w.eval(`window.__set=set;window.set=(k,v)=>String(k).startsWith('d4.pwr')?false:__set(k,v);`);
  for(let i=0;i<6;i++){if(!await w.eval(`pwrFetch('nhl',8,true)`))break;}
  T('storage full: rankings still show this visit, and it says so',!!w.eval(`pwrRank('nhl')`)&&/storage is full/.test(w.eval(`PWR_DIAG.nhl.err`)));
  T('power caches never ride the sync',w.eval(`syncSkip('d4.pwrg.nhl')&&syncSkip('d4.pwrrank')&&syncSkip('d4.inj')`));
}catch(e){out.push('CRASH '+e.stack);}
console.log(out.join('\n'));process.exit(0);},1500);
