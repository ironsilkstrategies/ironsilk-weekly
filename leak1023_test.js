/* v2.51.1 · found in the audit: once today's card locked, its picks also rode in the public page's
   HISTORY list — pick and price in plain sight, hours before each one's 30-minute unlock. Today's card
   now stays out of the history until the day turns (the app's page, its dated archive, and the 24/7
   worker's copy all go through the same rule). */
const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const NOW=Date.parse('2026-10-22T23:00:00Z'),D='2026-10-22';
let html=fs.readFileSync(path.join(W,'nhl.html'),'utf8');html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
(async()=>{try{
  const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nhl.html',pretendToBeVisual:true,beforeParse(x){const RD=x.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[NOW]))}static now(){return NOW}}x.Date=FD;
    x.__NO_GRADELOOP__=true;x.__NO_REOPEN__=true;x.__NO_FLIP_RELOAD__=true;x.__NO_SYNC_LOOP__=true;x.__NO_BACKFILL__=true;
    x.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});x.scrollTo=()=>{};x.alert=()=>{};x.confirm=()=>true;x.localStorage.setItem('d4.setupDone','1');}}).window;
  await wait(2500);
  const pk=(game,pick,price,start)=>({sp:'nhl',game,pick,price,p:0.74,ev:12,start,main:true,color:' strong'});
  const top3=[pk('WPG@DAL','DAL ML',-205,'2026-10-23T00:00Z'),pk('MIN@CGY','MIN ML',-205,'2026-10-23T01:00Z'),pk('NSH@BOS','BOS ML',-155,'2026-10-23T02:00Z')];
  w.eval(`set(BEST5_KEY,{d:'${D}',locked:true,lockedAt:Date.now()-3*36e5,top3:${JSON.stringify(top3)},bySport:{},picks:[],props:[]});
    set('d4.best5log',{'${D}':{v:2,picks:${JSON.stringify(top3)}},'2026-10-21':{v:2,picks:[{sp:'nhl',game:'TOR@MTL',pick:'TOR ML',price:-130,p:.7,main:true,hit:true,start:'2026-10-21T23:00Z'}]}});`);
  const F=w.eval('publicFeed()');const txt=JSON.stringify(F);
  T('3 hours before the first unlock every pick is hidden on the card',F.today&&F.today.picks.length===3&&F.today.picks.every(x=>x.hidden));
  T("today's card is not in the public history list",!(F.history||[]).some(h=>h.d===D),JSON.stringify((F.history||[]).map(h=>h.d)));
  T('…so no locked pick (or its price) appears anywhere in the public file',!/DAL ML|MIN ML|BOS ML/.test(txt),(txt.match(/(DAL|MIN|BOS) ML/)||[''])[0]);
  T('past days stay in the history, with their results',(F.history||[]).some(h=>h.d==='2026-10-21'&&h.picks[0].pick==='TOR ML'&&h.picks[0].hit===true));
  /* the 24/7 worker's copy */
  process.env.AUTOPILOT_KEY='k';process.env.TG_BOT_TOKEN='t';process.env.GITHUB_REPOSITORY='o/r';process.env.GITHUB_TOKEN='g';
  const Wk=await import(path.join(W,'autopilot/worker.mjs'));
  const full={today:{d:D,picks:top3.map(x=>({...x,unlockAt:Date.parse(x.start)-30*60e3}))},history:[{d:D,picks:top3},{d:'2026-10-21',picks:[{pick:'TOR ML',hit:true}]}],record:{w:1,l:0,pu:0,u:0.77}};
  const V=Wk.publicView(full,{},NOW);
  T("the worker's public page drops today's card from the history too (even if an older app build sends it)",!V.history.some(h=>h.d===D)&&V.history.length===1&&!/DAL ML|MIN ML|BOS ML/.test(JSON.stringify(V)),JSON.stringify(V.history.map(h=>h.d)));
  const V2=Wk.publicView(full,{},Date.parse('2026-10-23T00:40:00Z'));
  T('…and each pick still opens on the card at its 30-minute mark',V2.today.picks[0].pick==='DAL ML'&&V2.today.picks[1].pick==='MIN ML'&&V2.today.picks[2].hidden===true,JSON.stringify(V2.today.picks.map(x=>x.hidden?'hidden':x.pick)));
}catch(e){T('no crash',false,String(e&&e.stack||e).slice(0,500));}
  const p=out.filter(x=>x.startsWith('PASS')).length;console.log(out.join('\n'));console.log(`${p} pass / ${out.length-p} fail`);process.exit(0);})();
