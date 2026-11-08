/* v2.92.0 · Nov 8: "bring back the forecast feature… a sports pick forecast that would show what was working and what wasn't —
   cloudy and sunny emojis while giving the statistics." Invented picks, no network. */
const fs=require('fs');const path=require('path');const W='/home/claude/work';const {JSDOM,VirtualConsole}=require('jsdom');
let pass=0,fail=0;const T=(n,c,x)=>{c?pass++:fail++;console.log((c?'PASS ':'FAIL ')+n+(c?'':'  — '+(x||'')));};
let html=fs.readFileSync(path.join(W,'nba.html'),'utf8');html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const errs=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errs.push(String(e&&e.message||e)));
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nba.html',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){w.__NO_GRADELOOP__=true;w.__NO_BACKFILL__=true;w.__NO_SYNC_LOOP__=true;
  const RD=w.Date;const OFF=RD.parse('2026-11-08T12:00:00-06:00')-RD.now();class FD extends RD{constructor(...a){if(a.length)super(...a);else super(RD.now()+OFF);}static now(){return RD.now()+OFF;}}FD.parse=RD.parse;FD.UTC=RD.UTC;w.Date=FD;
  w.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('{}')});w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.prompt=()=>null;w.localStorage.setItem('d4.setupDone','1');}}).window;
setTimeout(()=>{try{const E=s=>w.eval(s);const e0=errs.length;const J=JSON.stringify;const D='2026-11-08';
  const V=[];let id=0;const day=b=>E(`dayShift('${D}',-${b})`);
  /* NBA unders: 15-5 this week at -110 (working); NBA spread dogs: 4-14 (not working, broken past 20? no — 18 picks); both made by two characters each */
  for(let i=0;i<20;i++){const d=day(1+(i%6));['Sim','Judge'].forEach(v=>V.push({id:'u'+(id++),sp:'nba',date:d,game:'U'+i+'@H'+i,voice:v,market:'total',side:'under',line:220,price:-110,graded:true,hit:i<15}));}
  for(let i=0;i<18;i++){const d=day(1+(i%6));['Sim','Coach'].forEach(v=>V.push({id:'d'+(id++),sp:'nba',date:d,game:'D'+i+'@E'+i,voice:v,market:'spread',side:'away',line:5.5,price:-110,graded:true,hit:i<4}));}
  for(let i=0;i<4;i++)V.push({id:'f'+(id++),sp:'nfl',date:day(2),game:'F'+i+'@G'+i,voice:'Sim',market:'ml',side:'home',price:-150,graded:true,hit:true});
  E(`set(VOICES_KEY,${J(V)});set(CPROP_KEY,[]);Object.keys(RO_CACHE).forEach(k=>delete RO_CACHE[k]);FC_C=null;`);
  const L=E(`fcData().lanes.map(o=>({k:o.k,n:o.n,w:o.w7,l:o.l7,u:+o.u7.toFixed(2),ic:fcIcon(o)[0]}))`);
  const un=L.find(o=>o.k==='nba|total|under'),dg=L.find(o=>o.k==='nba|spread|dog'),nf=L.find(o=>o.k==='nfl|ml|fav');
  T('each pick counted once, however many characters made it (20 unders, not 40)',un&&un.n===20&&un.w===15&&un.l===5,J(un));
  T('working → ☀️ (15-5 at -110 is +8.6u)',un&&un.ic==='☀️'&&un.u>8,J(un));
  T('not working → 🌧 (spread dogs 4-14)',dg&&dg.ic==='🌧',J(dg));
  T('too few picks to say → 💤 (4 NFL favorites)',nf&&nf.ic==='💤',J(nf));
  const h=E(`fcHtml()`).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
  T('the statistics behind every icon: 7-day record, units, vs the prices, 30-day record',/7 days 15-5 \(75%\) · \+8\.6u · \+\d+ vs the prices · 30 days 15-5/.test(h),h.slice(0,400));
  T('the outlook: lean into what\'s working, stay away from what isn\'t',/Lean into: NBA unders ☀️/.test(h)&&/Stay away: NBA spread dogs 🌧/.test(h),h.slice(0,400));
  T('who\'s hot and cold among the characters this week',/hot this week:/.test(h)&&/cold this week:/.test(h));
  E(`TODAY_VIEW='picks';renderToday(true)`);
  T('it sits at the top of Today',/The Forecast/.test((w.document.querySelector('#todayBody .fc-card')||{}).textContent||''));
  T('no errors along the way',errs.length===e0,errs.slice(e0).join(' | '));
}catch(e){T('crashed',false,e.stack);}console.log(pass+' pass / '+fail+' fail');process.exit(0);},2500);
