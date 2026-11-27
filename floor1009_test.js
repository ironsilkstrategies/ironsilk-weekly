const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
let html=fs.readFileSync(path.join(W,'nhl.html'),'utf8');html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nhl.html',pretendToBeVisual:true,beforeParse(w){
  const RD=w.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[RD.parse('2026-10-09T19:30:00Z')]))}static now(){return RD.parse('2026-10-09T19:30:00Z')}}w.Date=FD;
  w.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});w.scrollTo=()=>{};w.alert=()=>{};w.localStorage.setItem('d4.setupDone','1');}}).window;
setTimeout(()=>{try{
  const CHAR_ORDER=w.eval('CHAR_ORDER');const games=['PIT@CBJ','NYR@WSH','SEA@DET','ANA@WPG','BOS@TOR','CHI@STL'];const d='2026-10-09';const V=[];
  /* the strongest spot on the board is a -450 favorite every character loves */
  for(let i=0;i<200;i++)V.push({id:'h'+i,voice:CHAR_ORDER[i%8],sp:'nhl',market:'ml',side:'home',game:'BOS@TOR',date:'2026-09-'+String(1+i%28).padStart(2,'0'),price:-450,graded:true,hit:true});
  games.forEach((g,gi)=>CHAR_ORDER.forEach((v,vi)=>{V.push({id:['nhl',g,d,v,'ml'].join('|'),voice:v,sp:'nhl',market:'ml',side:g==='BOS@TOR'?'home':((gi+vi)%3?'home':'away'),game:g,date:d,price:g==='BOS@TOR'?-450:g==='CHI@STL'?-320:-130+gi*10,graded:false,hit:null});
    V.push({id:['nhl',g,d,v,'total'].join('|'),voice:v,sp:'nhl',market:'total',side:(gi+vi)%2?'over':'under',game:g,date:d,price:-110,line:6.5,graded:false,hit:null});}));
  w.eval(`set(VOICES_KEY,${JSON.stringify(V)});set(TC_KEY,{d:today(),by:{nhl:{picks:${JSON.stringify(games.map(g=>({game:g,m:'ml',sd:'home',unan:true,blend:0.6,mp:0.6,mkt:0.57})))}}}});localStorage.removeItem(CPAR_KEY);localStorage.removeItem(BKDAY_KEY);evalLockMark('nhl');`);
  const L=JSON.parse(w.eval('JSON.stringify(bkDayState())'));
  const all=[...(L.own?L.own.legs:[]),...L.slate.flatMap(t=>t.legs),...L.roll.legs];
  T('Banker desk: no leg shorter than -300',all.length>0&&all.every(l=>+l.price>=-300),all.map(l=>l.pick+' '+l.price).join(', '));
  T('the -450 and -320 favorites are left off entirely',!all.some(l=>/TOR|STL/.test(l.pick)));
  const C=JSON.parse(w.eval('JSON.stringify(cparState())'));const cl=Object.values(C.by||{}).flatMap(P=>P.legs);
  T('character parlays: no leg shorter than -300',cl.length>0&&cl.every(l=>+l.price>=-300));
  /* a desk locked under the old rule (with a -450 leg, nothing graded) is rebuilt once */
  w.eval(`(()=>{const S=get(BKDAY_KEY,{});S.floor=undefined;S.roll.legs.push({sp:'nhl',game:'BOS@TOR',pick:'TOR ML',price:-450,p:.8,v:'Sim'});set(BKDAY_KEY,S);})()`);
  const L2=JSON.parse(w.eval('JSON.stringify(bkDayState())'));
  T('a desk locked before the rule is rebuilt under it',L2.locked&&L2.floor===-300&&!L2.roll.legs.some(l=>+l.price<-300));
  /* SGP never pushes a rung past fair -300 */
  T('SGP rung picker stops at fair -300 (75%)',w.eval(`(()=>{const r=sgpPickRung([{L:-1.5,p:0.62},{L:-0.5,p:0.72},{L:0.5,p:0.79}]);const n=sgpPickRung([{L:0,p:0.81},{L:1,p:0.88}]);return r.L===-0.5&&n===null})()`));
}catch(e){T('harness',false,e.stack);}
console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length} pass / ${out.filter(x=>x.startsWith('FAIL')).length} fail`);process.exit(0);},2500);
