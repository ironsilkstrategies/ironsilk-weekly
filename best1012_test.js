const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
let html=fs.readFileSync(path.join(W,'nhl.html'),'utf8');
html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nhl.html',pretendToBeVisual:true,beforeParse(w){w.__NO_GRADELOOP__=true;w.__NO_BACKFILL__=true;w.__NO_SYNC_LOOP__=true;
  w.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('{}')});w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.localStorage.setItem('d4.setupDone','1');}}).window;
setTimeout(()=>{try{
  const st=h=>w.eval(`today()`)+'T'+String(h).padStart(2,'0')+':59:00-05:00';
  const P=[{game:'OTT@NJ',m:'spread',sd:'away',pick:'OTT +1.5',price:-225,color:' supreme',chars:['Sim'],blend:.68,start:st(23)},
    {game:'FLA@BUF',m:'ml',sd:'home',pick:'BUF ML',price:-108,color:' strong',chars:['Sim'],blend:.50,start:st(23)},
    {game:'VGK@MIN',m:'total',sd:'over',pick:'Over 6',price:104,color:' strong',chars:['Sim'],blend:.47,start:st(23),suspect:'model 72% vs market 49%'}];
  w.eval(`localStorage.removeItem(BEST5_KEY);set(TC_KEY,{d:today(),by:{nhl:{ts:Date.now(),picks:${JSON.stringify(P)},props:[]}}});set(EVAL_LOCK_KEY,{date:today(),by:{nhl:Date.now()}});`);
  const S=w.eval('best5State()');T('nothing qualifies → card stays open (not locked empty) while games are ahead',!S.locked&&!S.top3.length);
  const N=w.eval('best3Near(5)');T('closest calls listed with the exact reason each missed',N.length===3&&N.some(x=>/shorter than -200/.test(x.why))&&N.some(x=>/EV .* after calibration/.test(x.why))&&N.some(x=>/flagged/.test(x.why)),N.map(x=>x.pick+': '+x.why).join(' | '));
  w.eval(`document.body.insertAdjacentHTML('beforeend','<div id="bestCard"></div>');renderBest();`);const h=w.document.getElementById('bestCard').textContent;
  T('banner says the eval ran and nothing clears the bar, and shows the closest calls',/Master evaluation ran — no play clears the bar yet/.test(h)&&/Closest calls today/.test(h)&&/OTT \+1\.5/.test(h));
  T('the card itself no longer says "open each sport once" when it has picks to judge',/Nothing clears the bar yet/.test(h)&&!/open each sport once/.test(h));
  T('the intake queues stay on the device (a deleted queue can\'t come back from the cloud)',w.eval(`syncSkip('d4.intakepending')&&syncSkip('d4.pendingupload')`));
  w.eval(`set('d4.intakepending',{nhl:[{t:'NHL\\nOttawa Senators @ New Jersey Devils\\nML: Ottawa Senators +116 / New Jersey Devils -132',ts:Date.now()-5*86400e3}]});window.__saved=0;const o=intakeSave;intakeSave=function(){window.__saved++;};intakeReplay();intakeSave=o;`);
  T('stale queued lines (older than 36h) are dropped, not filed under today',w.eval('window.__saved')===0&&!w.eval(`(get('d4.intakepending',{})||{}).nhl`));
}catch(e){out.push('CRASH '+e.stack);}
console.log(out.join('\n'));process.exit(0);},1500);
