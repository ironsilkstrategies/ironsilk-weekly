const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
let html=fs.readFileSync(path.join(W,'nhl.html'),'utf8');
html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nhl.html',pretendToBeVisual:true,beforeParse(w){
  const RD=w.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[RD.parse('2026-10-08T00:11:00Z')]))}static now(){return RD.parse('2026-10-08T00:11:00Z')}}w.Date=FD;
  w.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});
  w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.localStorage.setItem('d4.setupDone','1');}}).window;
setTimeout(()=>{try{
  const td=w.eval('today()');T('clock: 7:11 PM CT on Oct 7',td==='2026-10-07',td);
  const pk=(sp,game,pick,price,color,p,ev,h)=>({sp,game,pick,price,color,p,blend:p,evCal:ev,m:/Over|Under/.test(pick)?'total':'ml',sd:'home',chars:['Sim','Judge'],start:`2026-10-07T${h}:00:00-05:00`});
  /* exactly what v1.72 locked at the master evaluation this afternoon */
  const sides=[pk('nhl','COL@WPG','COL ML',-184,' supreme',.68,3.5,'18:37'),pk('mlb','TB@NYY','NYY ML',-167,' strong',.64,2.4,'19:00'),pk('nhl','EDM@ANA','EDM ML',-130,'value',.58,4.1,'21:07'),pk('mlb','LAD@ATL','LAD ML',-145,' strong',.6,1.2,'17:00')];
  const totals=[pk('mlb','MIL@SD','Under 7.5',-107,' supreme',.56,6.0,'21:00')];
  w.eval(`set(BEST5_KEY,{d:today(),locked:true,lockedAt:Date.now()-4*3600e3,why:'master evaluation ran',sides:${JSON.stringify(sides)},totals:${JSON.stringify(totals)},picks:[],props:[],sports:['nhl','mlb']});
    set('d4.best5log',{[today()]:{sides:${JSON.stringify(sides)},totals:${JSON.stringify(totals)},picks:${JSON.stringify([...sides,...totals])},props:[]}});`);
  const S=w.eval('best5State()');
  T('old-build locked card now shows its 3 (was blank)',(S.top3||[]).length===3,(S.top3||[]).map(x=>x.pick).join(', '));
  T('the 3 come from what was locked, ranked supreme → strong, EV next',S.top3[0].pick==='Under 7.5'&&S.top3[1].pick==='COL ML',S.top3.map(x=>x.pick+' '+x.color.trim()).join(' > '));
  T('still frozen and labelled as carried over',S.locked&&/carried over/.test(S.why));
  const log=w.eval(`get('d4.best5log',{})[today()]`);
  T('the ledger marks those 3 as the record picks',log.v===2&&log.picks.filter(x=>x.main).length===3);
  w.eval(`if(!document.getElementById('bestCard')){const d=document.createElement('div');d.id='bestCard';document.body.appendChild(d);}renderBest();`);
  const h=w.document.getElementById('bestCard').innerHTML;
  T('the card renders the picks',/Under 7\.5/.test(h)&&/COL ML/.test(h)&&!/No play cleared/.test(h));
  // building card: master ran but nothing qualifies → stays open and says why
  w.eval(`localStorage.removeItem(BEST5_KEY);set(LS_EVAL,{date:today()});set(TC_KEY,{d:today(),by:{mlb:{ts:Date.now(),picks:${JSON.stringify([pk('mlb','MIL@SD','SD ML',-250,' supreme',.7,3,'21:00'),pk('mlb','X@Y','Y ML',-110,' strong',.55,-2,'21:00')])},props:[]}}})`);
  const S2=w.eval('best5State()');
  T('master eval with nothing qualifying does NOT freeze an empty card',!S2.locked&&!(S2.top3||[]).length);
  w.eval('renderBest()');const h2=w.document.getElementById('bestCard').innerHTML;
  T('empty card explains itself (1 priced shorter than -200, 1 EV under +1%)',/Why it's empty/.test(h2)&&/1 priced shorter than -200/.test(h2)&&/1 EV under \+1%/.test(h2),h2.match(/Why it's empty[^<]*/)&&h2.match(/Why it's empty[^<]*/)[0]);
  // props fall back to character calls / game logs when no prop lines pasted
  w.eval(`(()=>{const D=pstDb('nhl');D.p[pstId('Connor McDavid')]={name:'Connor McDavid',team:'EDM',n:20,s:{s:{sum:80,sq:360,ema:5.2,gp:20},pts:{sum:34,sq:80,ema:2.1,gp:20}}};
    set(TC_KEY,{d:today(),by:{nhl:{ts:Date.now(),picks:${JSON.stringify([pk('nhl','EDM@ANA','EDM ML',-130,'value',.58,4.1,'21:07')])},props:[]}}});})()`);
  const P=w.eval('best3Props()');
  T('props fill without pasted prop lines (characters\' 70%+ calls / game logs)',P.length>=1&&P[0].player==='Connor McDavid',P.map(x=>x.player+' '+x.thr+' '+x.stat).join(', '));
}catch(e){T('harness',false,e.stack.split('\n').slice(0,3).join(' | '));}
console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length}/${out.length} passed`);process.exit(0);},3500);
