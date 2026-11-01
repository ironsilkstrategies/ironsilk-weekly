/* v2.84 · strength teams: every 4-character team replayed with each character playing only its dominant lanes (decided from
   what was graded BEFORE each day), compared with the same team playing everything, and today's 8-leggers ready for the slip. */
const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
const NOW='2026-11-01T15:00:00Z';
let html=fs.readFileSync(path.join(W,'nba.html'),'utf8');html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nba.html',pretendToBeVisual:true,beforeParse(x){
  const RD=x.Date;const t0=RD.now();class FD extends RD{constructor(...a){super(...(a.length?a:[RD.parse(NOW)+(RD.now()-t0)]))}static now(){return RD.parse(NOW)+(RD.now()-t0)}}x.Date=FD;
  x.__NO_GRADELOOP__=true;x.__NO_BACKFILL__=true;x.__NO_REOPEN__=true;x.__NO_SYNC_LOOP__=true;
  x.fetch=()=>Promise.resolve({ok:false,status:404,headers:{get:()=>null},json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});x.scrollTo=()=>{};x.alert=()=>{};x.confirm=()=>true;x.localStorage.setItem('d4.setupDone','1');}}).window;
setTimeout(()=>{try{
  const R=w.eval('TM_ROSTER().slice(0,5)');const [A,B,C,D,E]=R;
  /* 30 days of calls: each character has a strong lane and a weak lane; C's lane only turns strong in the last 8 days */
  w.eval(`(()=>{const V=[];const R=${JSON.stringify(R)};const lanes={[R[0]]:[['nhl','ml',0.78],['nba','total',0.35]],[R[1]]:[['nba','spread',0.74],['nhl','total',0.40]],[R[2]]:[['nfl','ml',-1,0.85]],[R[3]]:[['nhl','spread',0.72],['nba','ml',0.38]],[R[4]]:[['nba','ml',0.70],['nfl','total',0.42]]};
    let id=0;const day=i=>dayShift('2026-11-01',-i);
    for(let i=30;i>=0;i--){const d=day(i);Object.entries(lanes).forEach(([v,L])=>L.forEach(([sp,m,p,late],j)=>{for(let g=0;g<2;g++){if(p<0&&i>10)continue;const rate=p<0?late:p;const hit=((i*7+g*3+j*5)%100)/100<rate;
      const game=sp.toUpperCase()+String.fromCharCode(65+((i+g+j)%20))+'@H'+String.fromCharCode(65+((i*3+g)%20))+v.slice(0,2);
      V.push({id:'t'+(id++),voice:v,sp,game,market:m,side:m==='total'?'over':'home',line:m==='ml'?null:-1.5,price:-110,date:d,cf:0.64+0.01*g,graded:i>0,hit:i>0?hit:null,push:false,units:hit?0.91:-1});}}));}
    set(VOICES_KEY,V);TM_POOL=null;TM_TOP=null;})()`);
  const S=w.eval(`tmStrengths(tmPool().D,today())`);
  T('each character\'s strengths are its winning lanes only (58%+, in profit, 8+ calls)',S[A]&&S[A].map(x=>x.k).join()==='nhl|ml'&&S[B].map(x=>x.k).join()==='nba|spread'&&S[D].map(x=>x.k).join()==='nhl|spread',JSON.stringify(S));
  const Searly=w.eval(`tmStrengths(tmPool().D,'2026-10-18')`);const Snow=w.eval(`tmStrengths(tmPool().D,'2026-10-31')`);
  T('no peeking: a lane that only turned good lately isn\'t a strength on earlier days',!Searly[C]&&!!Snow[C],JSON.stringify({early:Searly[C]||null,late:Snow[C]||null}));
  const L=w.eval('tmLabStr(true)');
  T('the replay runs every 4-character team and ranks them',L&&L.top.length>0&&L.days>=10,L&&JSON.stringify({days:L.days,tried:L.tried}));
  T('…and shows what the strength rule bought against playing everything',L.top.every(t=>t.plr==null||t.lr>=t.plr-0.001),JSON.stringify(L.top.slice(0,3).map(t=>[Math.round(t.lr*100),t.plr==null?null:Math.round(t.plr*100)])));
  const X=w.eval('tmStrToday(get(TM_STR_KEY,null),3)');
  T('today\'s 8-leggers use only open calls inside each character\'s lanes',X.length>0&&X.every(x=>x.legs.every(l=>!l.c.graded&&(S[l.v]||[]).some(s=>s.k===l.c.sp+'|'+l.c.market))),JSON.stringify(X.map(x=>x.legs.length)));
  T('…two per character at most, never the same game twice for one character',X.every(x=>{const by={};return x.legs.every(l=>{by[l.v]=(by[l.v]||0)+1;return by[l.v]<=2;})&&new Set(x.legs.map(l=>l.c.sp+l.c.game+l.c.market)).size===x.legs.length;}));
  w.eval('tmLab(true)');const h=w.eval('tmLabHtml()');
  T('the lab card shows the strength teams, each character\'s lanes and today\'s tickets',/Strength teams/.test(h)&&/Each character's lanes today/.test(h)&&/Today's 8-leggers/.test(h)&&/Load into the slip/.test(h));
  w.eval('SLIP.length=0;tmStrSlip(0)');T('"Load into the slip" puts that ticket\'s legs in the slip',w.eval('SLIP.length')===X[0].legs.length,String(w.eval('SLIP.length')));
  w.eval('tmStrSlip(0)');T('…and doesn\'t double them if tapped twice',w.eval('SLIP.length')===X[0].legs.length);
}catch(e){T('harness',false,e.stack);}
console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length} pass / ${out.filter(x=>x.startsWith('FAIL')).length} fail`);process.exit(0);},2500);
