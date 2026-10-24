/* v2.56 · UNITS HAVE TO MATCH THE RECORD — two leaks closed.
   1) From Oct 25, no call is official at a price its own confidence says loses (confidence × payout < 1).
      On the ledger those calls went 85-20 (81%) for -4.8 units.
   2) The Best 3 lays -200 at most again (v2.31 had widened it to -300): its picks shorter than -200 went
      2-4 for -3.2 units while everything lighter went 16-9 for +3.7. */
const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
const NOW=Date.parse('2026-10-25T17:00:00Z'),D='2026-10-25',Y='2026-10-24';   /* noon CT Sunday */
let id=0;const c=(sp,date,voice,game,market,side,price,cf)=>({id:'t'+(++id),sp,date,game,gid:'g'+id,voice,market,side,line:market==='spread'?-3:null,price,pick:'x',cf});
const V=[
  c('nhl',D,'Judge','CHI@COL','ml','home',-300,0.72),   /* 0: 72% at -300 needs 75% → loses by its own number → not official */
  c('nhl',Y,'Judge','CHI@COL','ml','home',-300,0.72),   /* 1: the same call on Oct 24 keeps the rule it was graded under → official */
  c('nhl',D,'Coach','SJ@CAR','ml','home',-300,0.80),    /* 2: 80% at -300 pays → official */
  c('nhl',D,'Judge','SEA@VAN','ml','home',-250,0.74),   /* 3: 74% at -250 (needs 71.4%) → official */
  c('nfl',D,'Judge','BUF@MIA','ml','away',-300,0.72),   /* 4: NFL's only 70%+ call loses by its own number… */
  c('nfl',D,'Coach','KC@DEN','spread','away',-110,0.66),/* 5: …so it can't hold NFL's floor at 70%: the 66% spread at -110 is official */
];
let html=fs.readFileSync(path.join(W,'nhl.html'),'utf8');html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nhl.html',pretendToBeVisual:true,beforeParse(w){
  const RD=w.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[NOW]))}static now(){return NOW}}w.Date=FD;w.__NO_GRADELOOP__=true;w.__NO_REOPEN__=true;w.__NO_BACKFILL__=true;w.__NO_SYNC_LOOP__=true;w.__NO_FLIP_RELOAD__=true;
  w.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;
  w.localStorage.setItem('d4.setupDone','1');w.localStorage.setItem('d4.voices',JSON.stringify(V));}}).window;
setTimeout(()=>{try{
  const off=i=>w.eval(`isOfficial(get(VOICES_KEY,[])[${i}])`);
  T('a 72% call at -300 is not official any more: that price needs 75%, so its own number says it loses',off(0)===false);
  T('earlier days keep the rule they were graded under (the same call on Oct 24 stays official)',off(1)===true);
  T('a 70%+ call whose confidence covers the price is unchanged (80% at -300, 74% at -250)',off(2)===true&&off(3)===true);
  T("a call that loses by its own number can't hold its sport's floor at 70%: NFL drops to 65% and its 66% spread at -110 is official",off(4)===false&&off(5)===true,w.eval(`confFloorFor({sp:'nfl',market:'spread',date:'${D}'})`));
  /* the Best 3: -200 at most */
  const st=h=>`${D}T${String(h).padStart(2,'0')}:00:00-05:00`;
  const P=[{game:'SEA@VAN',m:'ml',sd:'home',pick:'VAN ML',price:-250,color:' strong',chars:['Judge'],blend:.70,start:st(21)},
    {game:'ANA@DAL',m:'ml',sd:'home',pick:'DAL ML',price:-180,color:' strong',chars:['Judge'],blend:.64,start:st(21)},
    {game:'NYR@BOS',m:'ml',sd:'home',pick:'BOS ML',price:-120,color:' strong',chars:['Judge'],blend:.55,start:st(22)}];
  w.eval(`set(VOICES_KEY,get(VOICES_KEY,[]).concat([{id:'b1',voice:'Judge',sp:'nhl',game:'ANA@DAL',market:'ml',side:'home',line:null,price:-180,date:'${D}',cf:0.76},
      {id:'b2',voice:'Judge',sp:'nhl',game:'NYR@BOS',market:'ml',side:'home',line:null,price:-120,date:'${D}',cf:0.71}]));
    localStorage.removeItem(BEST5_KEY);set(TC_KEY,{d:today(),by:{nhl:{ts:Date.now(),picks:${JSON.stringify(P)},props:[]}}});set(EVAL_LOCK_KEY,{date:today(),by:{nhl:Date.now()}});`);
  const top=w.eval(`best3Pool(get(TC_KEY,{}).by,null).map(x=>x.pick)`);
  T('the Best 3 skips the 74% favorite at -250 and plays the -180 and the -120',JSON.stringify(top)===JSON.stringify(['DAL ML','BOS ML']),JSON.stringify(top));
  const N=w.eval('best3Near(5)');
  T('…and the closest-calls list says why',N.some(x=>x.pick==='VAN ML'&&/priced -250 — the Best 3 lays -200 at most/.test(x.why)),N.map(x=>x.pick+': '+x.why).join(' | '));
  /* a fallback-floor call that loses by its own number names that rule (NFL's floor is 65% today) */
  w.eval(`set(VOICES_KEY,get(VOICES_KEY,[]).concat([{id:'b3',voice:'Judge',sp:'nfl',game:'NYJ@NE',market:'ml',side:'home',line:null,price:-200,date:'${D}',cf:0.655}]));
    const T0=get(TC_KEY,{});T0.by.nfl={ts:Date.now(),picks:[{game:'NYJ@NE',m:'ml',sd:'home',pick:'NE ML',price:-200,color:' strong',chars:['Judge'],blend:.6,start:'${st(15)}'}],props:[]};set(TC_KEY,T0);`);
  const N2=w.eval('best3Near(8)');
  T('a 65.5% call at -200 (needs 66.7%) is told it loses by its own number',N2.some(x=>x.pick==='NE ML'&&/66% sure, but -200 needs 67% — never official at a price its own number says loses/.test(x.why)),N2.map(x=>x.pick+': '+x.why).join(' | '));
  T('the rule itself: 64% at -190 fails from Oct 25, passes before it',w.eval(`!confEvOk({price:-190},0.64,'${D}')&&confEvOk({price:-190},0.64,'${Y}')&&confEvOk({price:120},0.46,'${D}')`));
}catch(e){T('no crash',false,e.stack.slice(0,500));}
const p=out.filter(x=>x.startsWith('PASS')).length;console.log(out.join('\n'));console.log(`${p} pass / ${out.length-p} fail`);process.exit(0);},3000);
