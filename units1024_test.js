/* v2.53 · UNDER 70%, A CALL HAS TO PAY — from Oct 24 an official call below 70% must be priced -150 or longer.
   On the graded ledger, 60-70% calls at -150 or shorter went 57-47 for -18.3 units. 70%+ calls are unchanged,
   earlier days keep the rule they were graded under, and the Best card shows the price check. */
const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
const NOW=Date.parse('2026-10-24T15:00:00Z'),D='2026-10-24';
let id=0;const c=(sp,date,voice,game,market,side,price,cf,x)=>({id:'t'+(++id),sp,date,game,gid:'g'+id,voice,market,side,line:null,price,pick:'x',cf,...(x||{})});
const V=[
  c('nfl',D,'Judge','KC@DEN','spread','away',-110,0.66),   /* 0: NFL has no 70% call → ladder 65 → a 66% at -110 pays → official */
  c('nfl',D,'Coach','BUF@MIA','ml','home',-180,0.67),      /* 1: 67% at -180 → chalk under 70% → not official */
  c('nhl',D,'Sim','DAL@CHI','ml','away',-250,0.74),         /* 2: 74% at -250 → 70%+ unchanged → official */
  c('nfl','2026-10-23','Judge','A@B','ml','home',-180,0.67),/* 3: before Oct 24 → the old rule (ladder) stands → official */
  c('ncaaf',D,'Judge','OSU@IU','ml','home',-200,0.66),       /* 4: CFB's only 65%+ call is chalk… */
  c('ncaaf',D,'Sim','PITT@BC','spread','away',-110,0.62),    /* 5: …so it doesn't hold the floor at 65: the 62% at -110 is official */
];
let html=fs.readFileSync(path.join(W,'nhl.html'),'utf8');html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nhl.html',pretendToBeVisual:true,beforeParse(w){
  const RD=w.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[NOW]))}static now(){return NOW}}w.Date=FD;w.__NO_GRADELOOP__=true;w.__NO_REOPEN__=true;w.__NO_BACKFILL__=true;w.__NO_SYNC_LOOP__=true;
  w.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;
  w.localStorage.setItem('d4.setupDone','1');w.localStorage.setItem('d4.voices',JSON.stringify(V));}}).window;
setTimeout(()=>{try{
  const off=i=>w.eval(`isOfficial(get(VOICES_KEY,[])[${i}])`);
  T('a 66% NFL spread at -110 still makes it on the fallback floor (football stays in)',off(0)===true);
  T('a 67% moneyline at -180 is NOT official any more: under 70%, a call has to pay -150 or longer',off(1)===false);
  T('70%+ is unchanged: a 74% call at -250 stays official',off(2)===true);
  T('earlier days keep the rule they were graded under (Oct 23: the 67% at -180 stays official)',off(3)===true);
  T("chalk that can't pay doesn't hold a sport's floor at 65%: CFB drops to 60% and its 62% spread at -110 is official",off(4)===false&&off(5)===true,w.eval(`confFloorFor({sp:'ncaaf',market:'spread',date:'${D}'})`));
  /* the price check */
  const R=w.eval(`(()=>{set('d4.best5log',{'2026-10-20':{v:2,picks:[{main:true,pick:'A ML',price:-200,hit:true},{main:true,pick:'B ML',price:-200,hit:true},{main:true,pick:'C ML',price:-200,hit:false}]},
     '2026-10-21':{v:2,picks:[{main:true,pick:'D',price:-110,hit:true},{main:true,pick:'E',price:-110,hit:false},{main:true,pick:'F',price:-110,hit:false}]}});return best3Record();})()`);
  T('the record knows its price: 3-3 at an average near -147 needs ~60% to break even',R.w===3&&R.l===3&&Math.abs(R.be-0.5952)<0.002&&R.ap===-147,JSON.stringify(R));
  w.eval(`if(!document.getElementById('bestCard')){const d=document.createElement('div');d.id='bestCard';document.body.appendChild(d);}renderBest();`);
  const h=w.document.getElementById('bestCard').innerHTML;
  T('the Best card shows the price check (and it stays out of the shareable card image)',/Price check: the Best 3 has averaged -147, which needs 60% to profit — it's hitting 50%/.test(h)&&!/Price check/.test((w.document.getElementById('bestShareTarget')||{innerHTML:''}).innerHTML),(h.match(/Price check[^<]*/)||[''])[0]);
}catch(e){T('no crash',false,e.stack.slice(0,400));}
const p=out.filter(x=>x.startsWith('PASS')).length;console.log(out.join('\n'));console.log(`${p} pass / ${out.length-p} fail`);process.exit(0);},3000);
