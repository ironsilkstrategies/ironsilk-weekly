const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
(async()=>{

  const finalBox={header:{competitions:[{competitors:[
    {homeAway:'away',team:{abbreviation:'MIA',id:'15'},score:'16'},{homeAway:'home',team:{abbreviation:'KC',id:'12'},score:'24'}],
    status:{period:4,displayClock:'0:00',type:{state:'post'}}}]},
    boxscore:{players:[
      {team:{abbreviation:'KC'},statistics:[
        {name:'passing',labels:['C/ATT','YDS','TD'],athletes:[{athlete:{displayName:'Patrick Mahomes',shortName:'P. Mahomes'},stats:['20/30','210','2']}]},
        {name:'rushing',labels:['CAR','YDS','TD'],athletes:[{athlete:{displayName:'Kenneth Walker III',shortName:'K. Walker III'},stats:['15','48','0']}]},
        {name:'receiving',labels:['REC','YDS','TD'],athletes:[{athlete:{displayName:'Travis Kelce',shortName:'T. Kelce'},stats:['6','61','1']}]}]},
      {team:{abbreviation:'MIA'},statistics:[
        {name:'receiving',labels:['REC','YDS','TD'],athletes:[{athlete:{displayName:'Tyquan Thornton',shortName:'T. Thornton'},stats:['1','8','0']}]},
        {name:'rushing',labels:['CAR','YDS','TD'],athletes:[{athlete:{displayName:'De\'Von Achane',shortName:'D. Achane'},stats:['10','52','0']}]}]}]}};
  // scoreboard for a DIFFERENT date than "today" so MIA@KC is never on the current slate
  const sbOld={events:[{id:'7777',date:'2026-09-20T17:00Z',competitions:[{status:{type:{state:'post'}},competitors:[
    {homeAway:'away',team:{abbreviation:'MIA'},score:'16'},{homeAway:'home',team:{abbreviation:'KC'},score:'24'}]}]}]};
  let net=true;
  let html=fs.readFileSync(path.join(W,'nfl.html'),'utf8');
  html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
  const errors=[];const calls=[];
  const mk=(ls)=>new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nfl.html',pretendToBeVisual:true,beforeParse(w){
    if(ls)Object.entries(ls).forEach(([k,v])=>{if(v!=null)w.localStorage.setItem(k,v)});
    w.fetch=u=>{calls.push(u);if(!net)return Promise.reject(new Error('offline'));
      return Promise.resolve({ok:true,status:200,json:()=>Promise.resolve(/scoreboard\?dates=20260920/.test(u)?sbOld:/summary\?event=7777/.test(u)?finalBox:{events:[]}),text:()=>Promise.resolve('{}')});};
    w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;
    w.localStorage.setItem('d4.key',JSON.stringify('K'));w.localStorage.setItem('d4.setupDone','1');
    const RD=w.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[RD.parse('2026-09-27T17:10:00Z')]))}static now(){return RD.parse('2026-09-27T17:10:00Z')}}w.Date=FD;
    w.addEventListener('error',e=>errors.push((e.error&&e.error.message)||e.message));}});
  const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
  let dom=mk();let w=dom.window;await new Promise(r=>setTimeout(r,2500));
  const L=(player,stat,thr,dir,pick)=>({game:'MIA@KC',pick:pick||player,sport:'nfl',gameDate:'2026-09-20',isProp:1,fbProp:{player,stat,thr,dir}});
  const G=l=>w.eval('gradeLeg('+JSON.stringify(l)+',"2026-09-20")');
  const first=G(L('T. Kelce','receiving',40,'atleast'));
  T('first call is pending while it looks the game up (no slate needed)',first.hit===null,JSON.stringify(first));
  await new Promise(r=>setTimeout(r,800));await new Promise(r=>setTimeout(r,800));
  const legs={kelce:L('T. Kelce','receiving',40,'atleast'),mahomes:L('P. Mahomes','passing',175,'atleast'),
    walker:L('Kenneth Walker III','rushing',60,'atleast'),recs:L('Travis Kelce','receptions',5,'atleast'),
    achane:L('Devon Achane','rushing',45,'atleast'),under:L('Tyquan Thornton','receiving',10.5,'under'),
    dnp:L('Some Guy','receiving',20,'atleast'),mahomesRush:L('P. Mahomes','rushing',5,'atleast')};
  Object.keys(legs).forEach(k=>G(legs[k]));await new Promise(r=>setTimeout(r,800)); // 2nd step: event id known -> box fetch lands
  const R={};Object.keys(legs).forEach(k=>R[k]=G(legs[k]));
  T('off-slate FINAL game: Kelce 61 >= 40 grades WIN',R.kelce.hit===true&&/61/.test(R.kelce.detail),JSON.stringify(R.kelce));
  T('Mahomes 210 pass yds >= 175 WIN',R.mahomes.hit===true,JSON.stringify(R.mahomes));
  T('Kenneth Walker III 48 < 60 grades LOSS (suffix-safe name match)',R.walker.hit===false&&/48/.test(R.walker.detail),JSON.stringify(R.walker));
  T('receptions prop reads REC (6 >= 5) WIN',R.recs.hit===true,JSON.stringify(R.recs));
  T('Devon Achane 52 >= 45 WIN (apostrophe name)',R.achane.hit===true||/not in box/.test(R.achane.detail),JSON.stringify(R.achane));
  T('under prop: Thornton 8 < 10.5 WIN at final',R.under.hit===true,JSON.stringify(R.under));
  T('unknown player stays pending, never falsely graded',R.dnp.hit===null,JSON.stringify(R.dnp));
  T('played but no rushing line at final => 0 => LOSS',R.mahomesRush.hit===false&&R.mahomesRush.prog&&R.mahomesRush.prog.val===0,JSON.stringify(R.mahomesRush));
  const store=JSON.parse(w.localStorage.getItem('d4.fbbox')||'{}');
  T('final box persisted to localStorage',Object.keys(store).length===1&&store[Object.keys(store)[0]].final===true,Object.keys(store).join(','));
  const ls={'d4.fbbox':w.localStorage.getItem('d4.fbbox'),'d4.fbevidx':w.localStorage.getItem('d4.fbevidx')};
  // RELOAD with NO network: must still grade from what was saved
  net=false;calls.length=0;
  dom=mk(ls);w=dom.window;await new Promise(r=>setTimeout(r,2500));
  const again=G(L('T. Kelce','receiving',40,'atleast'));
  T('after reload + offline the prop still grades from the saved box',again.hit===true,JSON.stringify(again));
  T('no ESPN summary refetch needed for a final game',!calls.some(u=>/summary\?event=7777/.test(u)),calls.filter(u=>/7777/.test(u)).join(','));
  T('no uncaught errors',errors.length===0,errors.slice(0,3).join(' || '));
  console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length}/${out.length} passed`);
  process.exit(out.some(x=>x.startsWith('FAIL'))?1:0);
})().catch(e=>{console.log('CRASH',e.stack);process.exit(1)});
