const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
let html=fs.readFileSync(path.join(W,'nfl.html'),'utf8');
html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const errors=[];
const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nfl.html',pretendToBeVisual:true,beforeParse(w){
  w.fetch=()=>Promise.resolve({ok:true,status:200,json:()=>Promise.resolve({}),text:()=>Promise.resolve('{}')});w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.prompt=()=>null;
  w.localStorage.setItem('d4.key',JSON.stringify('K'));w.localStorage.setItem('d4.setupDone','1');
  w.addEventListener('error',e=>errors.push((e.error&&e.error.message)||e.message));}});
const w=dom.window;
setTimeout(async()=>{try{
  T('five tiers: Cakewalk, Easy, Normal, Hard, Legendary',JSON.stringify(w.eval('MS_DIFF.map(d=>d[1])'))==='["Cakewalk","Easy","Normal","Hard","Legendary"]');
  const counts=w.eval(`(()=>{const c={};MS_LIB.forEach(r=>{if(r[0]==='custom')return;const T=MS_TEMPLATES[r[0]];
    const f={id:7,start:T.start,goal:T.goal,days:T.days,startDate:today(),balance:T.start,safe:0,routeKey:T.route||null,rule:T.rule,pots:T.pots?T.pots.map(([n,s,rt,ru,sp])=>({name:n,share:s,routeKey:rt,rule:ru,sport:sp,start:T.start*s,balance:T.start*s})):null};
    const d=msDifficulty(msSimFor(f,null,1500).p)[1];c[d]=(c[d]||0)+1;});return c})()`);
  T('every tier has missions in it (coin-flip legs)',['Cakewalk','Easy','Normal','Hard','Legendary'].every(k=>counts[k]>=3),JSON.stringify(counts));
  T('12 Warm-ups, board opens on them',w.eval("MS_LIB.filter(r=>r[1]==='warmup').length")===12&&w.eval('MS_CAT')==='warmup');
  w.eval("tab('money',null)");await new Promise(r=>setTimeout(r,200));
  let mb=w.document.getElementById('missionsBody').innerHTML;
  T('tier filter row on the board',['By category','Cakewalk','Easy','Normal','Hard','Legendary'].every(x=>mb.includes('>'+x+'<')));
  w.eval("MS_TIER='Cakewalk';msRender()");mb=w.document.getElementById('missionsBody').innerHTML;
  const shown=[...mb.matchAll(/<b>([^<]+)<\/b><span class="mono" style="font-size:9px;color:([^"]+)">([A-Z]+) ·/g)].map(m=>m[1]+':'+m[3]);
  T('Cakewalk filter shows only Cakewalk missions, from any category',shown.length>=3&&shown.every(x=>x.endsWith(':CAKEWALK')),shown.join(', '));
  w.eval("MS_TIER='Legendary';msRender()");mb=w.document.getElementById('missionsBody').innerHTML;
  T('Legendary filter pulls from every category (Dollar to a Grand, The Heist…)',/Dollar to a Grand/.test(mb)&&/The Heist/.test(mb)&&!/Pocket Change/.test(mb));
  // finishing a Cakewalk mission pays its XP (+ clean-run bonus)
  w.eval("MS_TIER='all';msStart('pocket_change')");const m=w.eval('msAll()[0]');
  T('Pocket Change starts rated Cakewalk',m.diff==='Cakewalk',m.diff+' '+(m.p0*100).toFixed(0)+'%');
  w.eval(`(()=>{set(LS.locked,[{id:1,date:today(),source:'mine',imported:true,stake:'3',toWin:'2.73',legs:[{game:'A@B',pick:'B ML',sport:'nfl',price:-110}]}]);const F=get(LS.allfinals,{});F[finalsKey('nfl','A@B')]={sport:'nfl',a:10,h:20,ts:1};set(LS.allfinals,F);})()`);
  w.eval(`msAttach(msAll()[0].id,{value:'1'})`);const d=w.eval('msSync()[0]');
  T('winning it: $10 → $12.73, status WON, +50 XP (+25 clean)',d.status==='won'&&Math.abs(d.balance-12.73)<0.01&&d.xp>=75,`${d.balance} · ${d.status} · ${d.xp} XP`);
  T('no uncaught errors',errors.length===0,errors.slice(0,2).join('|'));
}catch(e){console.log('CRASH',e.stack)}
  console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length}/${out.length} passed`);process.exit(out.some(x=>x.startsWith('FAIL'))?1:0);},2500);
