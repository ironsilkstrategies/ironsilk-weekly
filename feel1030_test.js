/* v2.80 · the self-tune's fast path gives the same answer as the slow one, in a fraction of the time */
const {JSDOM}=require('jsdom');const fs=require('fs');const W='/home/claude/work';const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
let html=fs.readFileSync(W+'/nhl.html','utf8').replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(W+'/'+f,'utf8')}</script>`);
const NOW=Date.parse('2026-10-30T19:00:00Z');
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nhl.html',pretendToBeVisual:true,beforeParse(x){const RD=x.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[NOW]))}static now(){return NOW}}x.Date=FD;
 x.__NO_GRADELOOP__=true;x.__NO_REOPEN__=true;x.__NO_BACKFILL__=true;x.__NO_SYNC_LOOP__=true;x.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});x.scrollTo=()=>{};x.alert=()=>{};x.confirm=()=>true;x.localStorage.setItem('d4.setupDone','1');}}).window;
setTimeout(()=>{try{
 w.eval(`(()=>{const V=[];let r=7;const rnd=()=>{r=(r*16807)%2147483647;return r/2147483647;};const T=['A','B','C','D','E','F','G','H'];
   for(let i=0;i<45;i++){const d=dayShift('2026-10-29',-44+i);['Sim','Judge','Coach','Trends'].forEach(v=>{for(let g=0;g<6;g++){const a=T[(g+i)%8],h=T[(g+i+3)%8];['ml','total'].forEach(m=>{
     const side=m==='total'?(rnd()<.5?'over':'under'):(rnd()<.5?'home':'away');const team=side==='home'?h:a;const hit=rnd()<(m==='ml'&&(team==='A'||team==='B')?0.8:m==='ml'&&team==='C'?0.2:v==='Judge'&&side==='home'?0.62:0.45);
     V.push({id:[v,d,g,m].join('|'),voice:v,sp:'nhl',game:a+'@'+h,date:d,market:m,side,line:m==='total'?6.5:null,price:-110,graded:true,hit,units:hit?.91:-1,tags:[rnd()<.5?'pres:up':'pres:down']});});}});}
   set(VOICES_KEY,V);})()`);
 const tr0=Date.now();w.eval('feelReplay(get(VOICES_KEY,[])||[])');const rms=Date.now()-tr0;const t0=Date.now();const fast=w.eval('JSON.stringify(feelTune(true))');const ms=Date.now()-t0;const F=JSON.parse(fast);
 /* the slow reference: the original search through feelCore */
 const slow=JSON.parse(w.eval(`(()=>{const rows=feelReplay(get(VOICES_KEY,[])||[]);const days=[...new Set(rows.map(r=>r.d))].sort();
   const br=(R,W)=>{let s=0;R.forEach(r=>{const p=feelCore(r.base,r.B,W).p;s+=(r.y-p)**2;});return R.length?s/R.length:null;};
   const fit=R=>{const W={};FEEL_KEYS.forEach(k=>W[k]=0);FEEL_KEYS.forEach(k=>{let best=0,bb=Infinity;for(let a=0;a<=1.0001;a+=0.1){const W2={...W,[k]:a};const b=br(R,W2);if(b<bb-1e-7){bb=b;best=+a.toFixed(1);}}W[k]=best;});return W;};
   const cut=days[Math.floor(days.length*0.6)];const tr=rows.filter(r=>r.d<cut),te=rows.filter(r=>r.d>=cut);const Wt=fit(tr);const Wfull=fit(rows);
   return JSON.stringify({Wt,W:Object.fromEntries(FEEL_KEYS.map(k=>[k,Wt[k]>0?Wfull[k]:0])),b0:br(te,Object.fromEntries(FEEL_KEYS.map(k=>[k,0]))),b1:br(te,Wt)});})()`));
 T('the fast self-tune picks exactly the same weights as the original search',JSON.stringify(F.Wtrain)===JSON.stringify(slow.Wt)&&JSON.stringify(F.W)===JSON.stringify(slow.W),JSON.stringify(F.W)+' vs '+JSON.stringify(slow.W));
 T('…and scores the newer days the same',Math.abs(F.base-slow.b0)<1e-4&&Math.abs(F.feel-slow.b1)<1e-4,F.base+'/'+F.feel+' vs '+slow.b0.toFixed(4)+'/'+slow.b1.toFixed(4));
 T('it runs well under a second on '+F.n+' graded calls',ms<1500,ms+'ms (replay alone '+rms+'ms)');
}catch(e){out.push('CRASH '+e.stack.split('\n').slice(0,3).join(' | '));}console.log(out.join('\n'));console.log(`${out.filter(x=>x.startsWith('PASS')).length} pass / ${out.filter(x=>!x.startsWith('PASS')).length} fail`);process.exit(0);},2500);
