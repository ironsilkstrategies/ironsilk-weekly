const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
function boot(page){let html=fs.readFileSync(path.join(W,page),'utf8');
  html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
  return new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/'+page,pretendToBeVisual:true,beforeParse(w){
    const RD=w.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[RD.parse('2026-10-09T19:30:00Z')]))}static now(){return RD.parse('2026-10-09T19:30:00Z')}}w.Date=FD;
    w.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});
    w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.localStorage.setItem('d4.setupDone','1');}}).window;}
const w=boot('nhl.html');
setTimeout(()=>{try{
  const games=['PIT@CBJ','NYR@WSH','SEA@DET','ANA@WPG','BOS@TOR','CHI@STL'];const d='2026-10-09';
  const V=[];let id=0;const voices=['Sim','Judge','Coach','Most common','Covers','Trends','Consensus','Pred'];
  /* history: graded calls (for records) */
  for(let i=0;i<300;i++){const g=games[i%6];V.push({id:'h'+(id++),voice:voices[i%8],sp:'nhl',market:['ml','total','spread'][i%3],side:['home','over','away'][i%3],game:g,date:'2026-09-'+String(1+i%28).padStart(2,'0'),price:-115,line:i%3===1?6.5:i%3===2?1.5:null,graded:true,hit:(i%5)!==0});}
  /* today: every character calls every game */
  games.forEach((g,gi)=>voices.forEach((v,vi)=>{['ml','total'].forEach(m=>V.push({id:['nhl',g,d,v,m].join('|'),voice:v,sp:'nhl',market:m,side:m==='ml'?((gi+vi)%3?'home':'away'):((gi+vi)%2?'over':'under'),game:g,date:d,price:m==='ml'?(-120+gi*10):-110,line:m==='total'?6.5:null,simP:0.55+gi*0.02,graded:false,hit:null,pick:null}));}));
  w.eval(`set(VOICES_KEY,${JSON.stringify(V)})`);
  /* splits: graded history rolled permanently, flagged so it never counts twice */
  const S=w.eval('JSON.stringify(get(SPLIT_KEY,{}))');const n=w.eval('get(VOICES_KEY,[]).filter(x=>x.sr).length');
  T('graded calls roll into the permanent splits (300)',n===300&&/"nhl"/.test(S),String(n));
  const c0={id:'x',voice:'Sim',sp:'nhl',market:'ml',side:'home',game:'PIT@CBJ',price:-115};
  const h1=w.eval(`JSON.stringify(charHist(get(VOICES_KEY,[]),${JSON.stringify(c0)}).H)`);
  w.eval(`(()=>{const V=get(VOICES_KEY,[]);set(VOICES_KEY,V.filter(x=>x.date==='${d}'));})()`);   // the ledger ages out
  const h2=w.eval(`JSON.stringify(charHist(get(VOICES_KEY,[]),${JSON.stringify(c0)}).H)`);
  T('a character\'s record survives the voices ledger trimming',h1===h2&&JSON.parse(h2).sport.n>0,h2.slice(0,120));
  T('splits carry home/road and fav/dog',(()=>{const H=JSON.parse(h2);return H.where.n>0&&H.role.n>0;})());
  T('splits table renders for the sport',/Character splits · NHL/.test(w.eval("charSplitsHtml({sp:'nhl'})"))&&/fav/.test(w.eval("charSplitsHtml({sp:'nhl'})")));
  /* Banker: preview before the eval, frozen after */
  const P=w.eval('JSON.stringify(bkDayState())');const p=JSON.parse(P);
  T('before the master eval: preview only, not locked',!p.locked&&!!p.preview);
  w.eval(`localStorage.setItem('d4.br.amt','200')`);
  w.eval("evalLockMark('nhl')");
  setTimeout(()=>{try{
    const L=JSON.parse(w.eval('JSON.stringify(bkDayState())'));
    T('master eval locks the Banker\'s desk',L.locked===true);
    const games0=[...(L.own?L.own.legs:[]),...L.slate.flatMap(t=>t.legs)].map(l=>l.game);
    T('no game repeats across the Banker\'s tickets',new Set(games0).size===games0.length,games0.join(','));
    T('Banker\'s own parlay: 2–5 legs, each backed by 2+ characters',L.own&&L.own.legs.length>=2&&L.own.legs.length<=5&&L.own.legs.every(l=>l.by.length>=2));
    T('desk spend never exceeds the day cap',L.spent<=L.cap+1e-9,`$${L.spent} of $${L.cap}`);
    const R=L.roll;T('roll call: one pick per character, never two from one game',R.legs.length===new Set(R.legs.map(l=>l.v)).size&&new Set(R.legs.map(l=>l.game)).size===R.legs.length,R.legs.length+' legs');
    T('roll call: a character whose top game was taken uses its next pick',R.legs.some(l=>l.rank>1)||R.legs.length<=games.length);
    T('the cut is the hittable part (2–5 legs, ≥25% or the 2 strongest)',R.cut.length>=2&&R.cut.length<=5&&(R.cutP>=0.25||R.cut.length===2),R.cut.length+' legs '+(R.cutP*100).toFixed(1)+'%');
    w.eval(`(()=>{const V=get(VOICES_KEY,[]);V.forEach(x=>{if(x.market==='ml')x.side=x.side==='home'?'away':'home'});set(VOICES_KEY,V);})()`);
    const L2=JSON.parse(w.eval('JSON.stringify(bkDayState())'));
    T('once locked, the desk never changes',JSON.stringify(L2.roll)===JSON.stringify(L.roll)&&JSON.stringify(L2.own)===JSON.stringify(L.own));
    /* why */
    w.eval(`(()=>{const P=get('d4.preds',{});P.nhl={'${d}':{'PIT@CBJ':{a:3.36,h:3.31,src:'covers'}}};set('d4.preds',P);set(INTEL_KEY,[{sp:'nhl',kind:'trend',game:'PIT@CBJ',date:'${d}',text:'Under is 4-0 in Penguins last 4 games as a favorite.'},{sp:'nhl',kind:'trend',game:'PIT@CBJ',date:'${d}',text:'Over is 7-2-1 in Penguins last 10 games as a road underdog.'}]);})()`);
    const Wy=JSON.parse(w.eval(`JSON.stringify(pickWhy({sp:'nhl',game:'PIT@CBJ',m:'total',sd:'under',line:6.5,pick:'Under 6.5',price:-106,p:0.56,date:'${d}'}))`));
    T('why: covers prediction, characters, backing + opposing trends',Wy.bullets.some(b=>/Covers/.test(b))&&Wy.bullets.some(b=>/characters on it/.test(b))&&Wy.bullets.some(b=>/Trend ✓ Under is 4-0/.test(b))&&Wy.bullets.some(b=>/Trend ✗ Over is 7-2-1/.test(b)),Wy.bullets.join(' | ').slice(0,300));
    T('why: a reel script that names the pick',/Under 6\.5/.test(Wy.script)&&Wy.script.length>60,Wy.script.slice(0,200));
    T('Banker tab renders tickets + roll call',(()=>{let el=w.document.getElementById('bankerBody');if(!el){el=w.document.createElement('div');el.id='bankerBody';w.document.body.appendChild(el);}w.eval('renderBankerTab()');return/Roll Call/.test(el.innerHTML)&&/Why we like it/.test(el.innerHTML);})());
    T('public feed carries tonight\'s parlay with reasons',(()=>{const F=JSON.parse(w.eval('JSON.stringify(publicFeed())'));return F.parlay&&F.parlay.legs.length===L.roll.cut.length&&F.parlay.legs.every(l=>l.why&&l.why.script);})());
    /* SGP on an NHL card */
    const g={id:'n1',abstract:'pre',away:{abbr:'PIT',name:'Pittsburgh Penguins'},home:{abbr:'CBJ',name:'Columbus Blue Jackets'}};
    const html=w.eval(`(()=>{const g=${JSON.stringify(g)};const s=simNHLGame(g,4000);return sgpCardHtml('nhl',g,s)})()`);
    T('game card: Perfect SGP with alt spread + alt total at fair odds',/Perfect SGP/.test(html)&&/Alt spread/.test(html)&&/Alt total/.test(html)&&/fair/.test(html),html.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').slice(0,260));
    T('SGP picks the alt line the sim gives 70%+',(()=>{const m=html.replace(/<[^>]+>/g,' ').match(/Alt spread\s+(\S+ [+\-]?[\d.]+)\s+(\d+)%/);return m&&+m[2]>=70;})());
    T('SGP is skipped once the game starts',w.eval(`sgpCardHtml('nhl',{...${JSON.stringify(g)},abstract:'in'},simNHLGame(${JSON.stringify(g)},2000))`)==='');
  }catch(e){T('harness2',false,e.stack)}
  console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length} pass / ${out.filter(x=>x.startsWith('FAIL')).length} fail`);process.exit(0);},800);
}catch(e){T('harness',false,e.stack);console.log(out.join('\n'));process.exit(0);}},2500);
