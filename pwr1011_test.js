const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
let html=fs.readFileSync(path.join(W,'nhl.html'),'utf8');
html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
/* a 16-team league with known strengths, 10 weeks of games, noisy margins */
let seed=7;const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};const gauss=()=>{let u=0,v=0;while(!u)u=rnd();while(!v)v=rnd();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);};
const TEAMS=Array.from({length:16},(_,i)=>'T'+String.fromCharCode(65+i));const TRUE={};TEAMS.forEach((t,i)=>TRUE[t]=10-i*1.3);
const events=[];
const base=new Date(Date.UTC(2026,7,3));
for(let wk=0;wk<10;wk++){const sh=[...TEAMS].sort(()=>rnd()-0.5);for(let i=0;i<16;i+=2){const a=sh[i],h=sh[i+1];const m=TRUE[h]-TRUE[a]+2+gauss()*10;const hs=Math.max(0,Math.round(21+m/2)),as=Math.max(0,Math.round(21-m/2));
  const d=new Date(base.getTime()+wk*7*864e5);events.push({date:d.toISOString(),season:{type:2},competitions:[{neutralSite:false,status:{type:{completed:true}},competitors:[{homeAway:'away',score:String(as),team:{abbreviation:a,displayName:a+' FC',location:a,color:'112233',logo:''}},{homeAway:'home',score:String(hs===as?hs+1:hs),team:{abbreviation:h,displayName:h+' FC',location:h,color:'445566',logo:''}}]}]});}}
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nhl.html',pretendToBeVisual:true,beforeParse(w){
  w.__NO_GRADELOOP__=true;w.__NO_BACKFILL__=true;w.__EV=events;
  w.fetch=(u)=>{u=String(u);if(/scoreboard\?dates=/.test(u)){const m=u.match(/dates=(\d{8})-(\d{8})/);const f=m[1].replace(/(\d{4})(\d\d)(\d\d)/,'$1-$2-$3'),e=m[2].replace(/(\d{4})(\d\d)(\d\d)/,'$1-$2-$3');
      return Promise.resolve({ok:true,json:()=>Promise.resolve({events:w.__EV.filter(ev=>{const d=ev.date.slice(0,10);return d>=f&&d<=e;})})});}
    return Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('{}')});};
  w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.localStorage.setItem('d4.setupDone','1');}}).window;
setTimeout(async()=>{try{
  w.eval(`PWR_CFG.nfl.mo=1;window.pwrSeasonStart=()=>'2026-08-01';`);
  let calls=0;for(let i=0;i<6;i++){const n=await w.eval(`pwrFetch('nfl',8)`);calls+=n;if(!n)break;}
  const G=w.eval(`pwrGames('nfl')`);T('season pulled a week at a time and cached',G.length===80,G.length+' games, '+calls+' calls');
  const again=await w.eval(`pwrFetch('nfl',8)`);T('finished weeks are never fetched twice (only the last 2 recent windows refresh)',again<=2,again+' refetch');
  const R=w.eval(`pwrRank('nfl')`);
  const ord=R.teams.map(x=>x.abbr);const top4=ord.slice(0,4).filter(t=>['TA','TB','TC','TD','TE'].includes(t)).length;
  const sp=(()=>{const n=16;let d=0;ord.forEach((t,i)=>{const tr=TEAMS.indexOf(t);d+=(i-tr)*(i-tr);});return 1-6*d/(n*(n*n-1));})();
  T('ratings recover the true order (Spearman ≥ 0.8)',sp>=0.8,'ρ='+sp.toFixed(2)+' · top: '+ord.slice(0,5).join(' '));
  T('home edge learned near the true +2',R.h>0.5&&R.h<4,R.h.toFixed(2));
  T('records, off/def, SOS, luck and last-5 filled in',R.teams.every(x=>x.gp>0&&isFinite(x.off)&&isFinite(x.def)&&x.sosRank>0&&isFinite(x.luck)&&x.last5.length>0));
  T('walk-forward accuracy measured vs records alone',R.acc&&R.acc.n>=40&&R.acc.acc>0.5,R.acc&&`${Math.round(R.acc.acc*100)}% vs records ${Math.round(R.acc.accRec*100)}% over ${R.acc.n}`);
  const strip=w.eval(`pwrStrip('nfl',{away:{abbr:'${ord[10]}'},home:{abbr:'${ord[0]}'}})`).replace(/<[^>]+>/g,'');
  T('game card strip: ranks, records, ratings and the power line',/#1 /.test(strip)&&/power line/.test(strip)&&/by \d/.test(strip),strip);
  const panel=w.eval(`pwrPanelHtml('nfl')`);T('power rankings panel lists every team',(panel.match(/<tr>/g)||[]).length===16&&/walk-forward/.test(panel));
}catch(e){out.push('CRASH '+e.stack);}
console.log(out.join('\n'));process.exit(0);},1500);
