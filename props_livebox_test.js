const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
(async()=>{
  const summary1={header:{competitions:[{competitors:[
    {homeAway:'away',team:{abbreviation:'CLE',id:'5'},score:'3',linescores:[{value:3}]},
    {homeAway:'home',team:{abbreviation:'CAR',id:'29'},score:'0',linescores:[{value:0}]}],
    status:{period:1,displayClock:'8:00',type:{state:'in'}}}]},
    boxscore:{players:[{team:{abbreviation:'CAR'},statistics:[
      {name:'receiving',labels:['REC','YDS','TD'],athletes:[{athlete:{displayName:'Jalen Coker'},stats:['3','46','0']}]}]}]}};
  const nflSB={events:[{id:'9001',date:'2026-09-27T17:00Z',competitions:[{status:{type:{state:'in',shortDetail:'1st 8:00'},period:1,displayClock:'8:00'},competitors:[
    {homeAway:'away',team:{abbreviation:'CLE',displayName:'Cleveland Browns',id:'5'},score:'3',linescores:[{value:3}]},
    {homeAway:'home',team:{abbreviation:'CAR',displayName:'Carolina Panthers',id:'29'},score:'0',linescores:[{value:0}]}]}]}]};
  let html=fs.readFileSync(path.join(W,'nfl.html'),'utf8');
  html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
  const errors=[];
  const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nfl.html',pretendToBeVisual:true,beforeParse(w){
    w.fetch=u=>Promise.resolve({ok:true,status:200,
      json:()=>Promise.resolve(/scoreboard/.test(u)?nflSB:/summary\?event/.test(u)?summary1:{}),
      text:()=>Promise.resolve('{}')});
    w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;
    w.localStorage.setItem('d4.key',JSON.stringify('K'));w.localStorage.setItem('d4.setupDone','1');
    const RD=w.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[RD.parse('2026-09-27T17:10:00Z')]))}static now(){return RD.parse('2026-09-27T17:10:00Z')}}w.Date=FD;
    w.addEventListener('error',e=>errors.push((e.error&&e.error.message)||e.message));}});
  const w=dom.window;await new Promise(r=>setTimeout(r,3000));
  const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);

  // --- Prop leg live grading: Jalen Coker has 46 receiving yds live, leg is "45+ Receiving yds" ---
  const leg={game:'CLE@CAR',pick:'Jalen Coker 45+ Receiving yds',sport:'nfl',gameDate:'2026-09-27',
    isProp:1,fbProp:{player:'Jalen Coker',stat:'receiving',thr:45,dir:'atleast'}};
  await w.eval("fetchFBBoxscore('9001','nfl')"); // warm the cache directly, like the panel-open fix now does
  const g1=w.eval('gradeLeg('+JSON.stringify(leg)+',"2026-09-27")');
  T('cleared prop locks WIN while game is still live',g1.hit===true&&g1.live===true,JSON.stringify(g1));

  const legShort={game:'CLE@CAR',pick:'Jalen Coker 60+ Receiving yds',sport:'nfl',gameDate:'2026-09-27',
    isProp:1,fbProp:{player:'Jalen Coker',stat:'receiving',thr:60,dir:'atleast'}};
  const g2=w.eval('gradeLeg('+JSON.stringify(legShort)+',"2026-09-27")');
  T('not-yet-cleared prop stays pending (not falsely decided) while live',g2.hit===null&&g2.live===true,JSON.stringify(g2));

  const legUnder={game:'CLE@CAR',pick:'Jalen Coker under 40.5 Receiving yds',sport:'nfl',gameDate:'2026-09-27',
    isProp:1,fbProp:{player:'Jalen Coker',stat:'receiving',thr:40.5,dir:'under'}};
  const g3=w.eval('gradeLeg('+JSON.stringify(legUnder)+',"2026-09-27")');
  T('busted under-prop locks LOSS while game is still live',g3.hit===false&&g3.live===true,JSON.stringify(g3));

  // --- Progress bar renders from the same graded result ---
  const bar=w.eval('legPctHtml('+JSON.stringify(leg)+','+JSON.stringify(g1)+')');
  T('progress bar renders for a graded prop leg',/46\/45/.test(bar)&&/✓/.test(bar),bar);
  const barPending=w.eval('legPctHtml('+JSON.stringify(legShort)+','+JSON.stringify(g2)+')');
  T('pending prop shows bar without checkmark',/46\/60/.test(barPending)&&!/✓/.test(barPending),barPending);

  // --- Livebox panel: quarter score should populate after opening (fetch+re-render) ---
  w.eval("renderNFL()");await new Promise(r=>setTimeout(r,300));
  const before=w.document.getElementById('p-nfllivebox-9001')?.innerHTML||'MISSING PANEL';
  T('livebox panel exists on the live card',before!=='MISSING PANEL');
  await w.eval("nflTogglePanel('livebox','9001',{parentElement:{querySelectorAll:()=>[],parentElement:{querySelectorAll:()=>[]}},classList:{add(){},contains:()=>false}})");
  await new Promise(r=>setTimeout(r,300));
  const after=w.document.getElementById('p-nfllivebox-9001').innerHTML;
  T('quarter score populates after opening the panel (fetch + re-render fix)',/>3</.test(after)&&/CLE/.test(after),after.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').slice(0,150));

  T('no uncaught errors',errors.length===0,errors.slice(0,3).join(' || '));
  console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length}/${out.length} passed`);
  process.exit(out.some(x=>x.startsWith('FAIL'))?1:0);
})().catch(e=>{console.log('CRASH',e.stack);process.exit(1)});
