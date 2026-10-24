const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const {webcrypto}=require('crypto');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
let html=fs.readFileSync(path.join(W,'nhl.html'),'utf8');html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const PUT=[];const vc=new (require('jsdom').VirtualConsole)();const errors=[];vc.on('jsdomError',e=>errors.push(String(e.message||e)));
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nhl.html',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  const RD=w.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[RD.parse('2026-10-13T15:00:00Z')]))}static now(){return RD.parse('2026-10-13T15:00:00Z')}}w.Date=FD;
  w.__NO_GRADELOOP__=true;w.__NO_BACKFILL__=true;w.__NO_SYNC_LOOP__=true;Object.defineProperty(w,'crypto',{value:webcrypto,configurable:true});w.TextEncoder=TextEncoder;
  w.fetch=(u,o)=>{u=String(u);o=o||{};const J=(s,b)=>Promise.resolve({ok:s<300,status:s,json:()=>Promise.resolve(b),text:()=>Promise.resolve(JSON.stringify(b))});
    if(/api\.github\.com\/repos\/ironsilkstrategies\/ironsilk-weekly-site/.test(u)){if((o.method||'GET')==='PUT'){PUT.push({u,b:JSON.parse(o.body)});return J(201,{});}return /contents/.test(u)?J(404,{}):J(200,{});}
    return J(404,{});};
  w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.localStorage.setItem('d4.setupDone','1');}}).window;
const J=x=>JSON.stringify(x);
setTimeout(async()=>{try{
  /* ── the app: what cashed, as boxes ─────────────────────────── */
  w.eval(`set(CPAR_KEY,{'2026-10-12':{locked:true,by:{
      Sim:{voice:'Sim',done:true,won:true,legs:[{sp:'mlb',game:'LAD@MIL',pick:'MIL +1.5',price:-153,hit:true},{sp:'nhl',game:'FLA@BUF',pick:'BUF ML',price:-107,hit:true}]},
      'Most common':{voice:'Most common',done:true,won:true,legs:[{sp:'mlb',game:'LAD@MIL',pick:'MIL +1.5',price:-153,hit:true},{sp:'nhl',game:'FLA@BUF',pick:'BUF ML',price:-107,hit:true}]},
      Judge:{voice:'Judge',done:true,won:false,legs:[{sp:'mlb',game:'LAD@MIL',pick:'Under 7',price:-128,hit:false}]}}},
    '2026-09-01':{locked:true,by:{Sim:{voice:'Sim',done:true,won:true,legs:[{sp:'nfl',game:'A@B',pick:'B ML',price:-110,hit:true}]}}}});
    set(BKDAYS_KEY,{'2026-10-12':{d:'2026-10-12',locked:true,own:{dec:5,legs:[{sp:'mlb',game:'CLE@TB',pick:'CLE +1.5',price:-152,hit:true},{sp:'mlb',game:'LAD@MIL',pick:'MIL +1.5',price:-153,hit:true},{sp:'nhl',game:'MIN@WPG',pick:'MIN ML',price:120,hit:true},{sp:'nhl',game:'FLA@BUF',pick:'BUF ML',price:-107,push:true}]}}});`);
  const L=w.eval('cashedList(14)');
  T('every cashed parlay in the last 14 days is listed (losers and old ones aren\'t)',L.length===2&&!L.some(c=>c.d==='2026-09-01'),J(L.map(c=>[c.d,c.who])));
  const sim=L.find(c=>!c.banker),bk=L.find(c=>c.banker);
  T('identical tickets share one box (the Sim and the Scorekeeper)',sim&&sim.who.join('+')==='The Simulator+The Scorekeeper',sim&&J(sim.who));
  T('the Banker\'s ticket is its own box, a push leg doesn\'t count toward the payout',bk&&bk.who[0]==='The Banker'&&bk.legs.length===4&&Math.abs(bk.units-((1+100/152)*(1+100/153)*2.2-1))<0.01,bk&&J([bk.price,bk.units]));
  T('each box carries the parlay record',/Simulator \d+-\d+/.test(sim.rec)&&/Banker \d+-\d+/.test(bk.rec),sim.rec+' | '+bk.rec);
  T('v2.49 · the cashed boxes stay in the app — the public page is the Best 3 only',w.eval('publicFeed().cashed.length')===0&&w.eval('cashedList(14).length')===2);
  /* a cash publishes even before today's card locks */
  w.eval(`set(LS.ghtoken,'ghp_x');set(LS.ghrepo,'ironsilkstrategies/ironsilk-weekly-site');`);
  await w.eval('publishAuto()');const put=PUT.find(p=>/public\/picks\.json/.test(p.u));
  T('a new cash refreshes the public page on its own (its record), and still never ships the boxes',!!put&&(j=>j.cashed.length===0&&j.simple===1)(JSON.parse(Buffer.from(put.b.content,'base64').toString())),PUT.map(p=>p.u.split('/contents/')[1]).join(','));
  PUT.length=0;await w.eval('publishAuto()');T('…once — no new cash, no re-publish',PUT.length===0);
  /* Telegram (in-app autopilot) box */
  w.eval(`window.__C={d:'2026-10-12',banker:{dec:3,legs:[{sp:'nhl',game:'FLA@BUF',pick:'BUF ML',price:-107},{sp:'nhl',game:'MIN@WPG',pick:'MIN ML',price:120}]},
     chars:[{v:'Sim',dec:3,legs:[{sp:'nhl',game:'FLA@BUF',pick:'BUF ML',price:-107},{sp:'nhl',game:'MIN@WPG',pick:'MIN ML',price:120}]},{v:'Judge',dec:2,legs:[{sp:'nhl',game:'FLA@BUF',pick:'FLA ML',price:-110}]}]};`);
  const st={'nhl|FLA@BUF|BUF ML':'W','nhl|MIN@WPG|MIN ML':'W','nhl|FLA@BUF|FLA ML':'L'};w.__st=st;
  const g=w.eval('tgCashGroups(window.__C,window.__st)');
  T('Telegram: the Banker and the Sim on the same ticket → one post naming both; the loser gets none',g.length===1&&g[0].who.join(' + ')==='🏦 The Banker + 🎭 The Simulator',J(g.map(x=>x.who)));
  const tx=w.eval(`tgCashText({d:'2026-10-12'},tgCashGroups(window.__C,window.__st)[0],window.__st)`);
  T('Telegram post: CASHED headline, price, units, every leg ✅',/🎉 <b>CASHED<\/b>/.test(tx)&&/2-leg parlay · \+326/.test(tx)&&/\+3\.26u/.test(tx)&&(tx.match(/✅/g)||[]).length===2,tx.replace(/\n/g,' | '));
  T('the in-app autopilot posts it once (tracked like every result)',/'cash\|'\+g\.sig/.test(fs.readFileSync(path.join(W,'shared.js'),'utf8')));

  /* ── the 24/7 worker ─────────────────────────────────────────── */
  process.env.AUTOPILOT_KEY=process.env.AUTOPILOT_KEY||'k';process.env.TG_BOT_TOKEN=process.env.TG_BOT_TOKEN||'t';const Wk=await import(path.join(W,'autopilot/worker.mjs'));
  const legs=[{k:'a',label:'BUF ML (-107)',price:-107,__fin:'FLA 2–4 BUF'},{k:'b',label:'MIN ML (+120)',price:120},{k:'c',label:'FLA ML (-110)',price:-110}];
  const mk=(d,st,recap)=>({d,chat:'-100',ids:[1],parts:[],legs:JSON.parse(J(legs)),st,sent:{},recap,worker:true,recapPlan:{day:d,banker:{keys:['a','b'],price:'+305'},chars:[{name:'The Simulator',keys:['a','b'],price:'+305'},{name:'The Judge',keys:['c'],price:'-110'}]}});
  const state={posts:{'2026-10-12':mk('2026-10-12',{a:'W',b:'W',c:'L'},true),'2026-10-05':mk('2026-10-05',{a:'W',b:'W',c:'W'},true),'2026-10-13':mk('2026-10-13',{a:'W'},false)}};
  const TGw=[];const tg=async(m,p)=>{TGw.push({m,p});return{ok:true};};const noGrade=async()=>null;
  await Wk.runOnce(state,'2026-10-13',{tg,gradePick:noGrade,gradeProp:noGrade});
  const cash=TGw.filter(x=>/CASHED/.test(x.p.text||''));
  T('worker: yesterday\'s cash is posted even though the day was already recapped',cash.length===1&&/The Banker \+ 🎭 The Simulator/.test(cash[0].p.text)&&/FLA 2–4 BUF/.test(cash[0].p.text)&&/\+3\.26u/.test(cash[0].p.text),cash.map(x=>x.p.text.replace(/\n/g,' | ')).join(' || '));
  T('worker: nothing older than 4 days, nothing still pending, never a loser',!cash.some(x=>/2026-10-05/.test(x.p.text))&&!cash.some(x=>/Judge/.test(x.p.text)));
  TGw.length=0;await Wk.runOnce(state,'2026-10-13',{tg,gradePick:noGrade,gradeProp:noGrade});T('worker: each cash is announced once',!TGw.some(x=>/CASHED/.test(x.p.text||'')));
  T('worker and app merge keeps the "already announced" mark',Wk.mergeState(state,{posts:{}}).posts['2026-10-12'].sent['cash|a¦b']==='W');

  /* ── the public page ─────────────────────────────────────────── */
  const feed={v:3,generated:5,record:{w:1,l:0,u:1},today:null,history:[],cashed:L};
  for(const f of ['picks.html','/home/claude/ironsilk-weekly-site/picks.html']){const src=f.startsWith('/')?f:path.join(W,f);
    const p=new JSDOM(fs.readFileSync(src,'utf8'),{runScripts:'dangerously',url:'https://ironsilkweekly.com/picks.html',pretendToBeVisual:true,beforeParse(pw){Object.defineProperty(pw,'crypto',{value:webcrypto});pw.TextEncoder=TextEncoder;
      pw.fetch=u=>Promise.resolve(/picks\.json/.test(String(u))?{ok:true,json:()=>Promise.resolve(feed)}:{ok:false,json:()=>Promise.resolve({})});}}).window;
    await new Promise(z=>setTimeout(z,700));const h=p.document.getElementById('cashBox').innerHTML;
    T(`public page (${f.startsWith('/')?'new site':'current site'}): a 🎉 Cashed box per winning ticket, with legs, price, units and record`,(h.match(/class="pl cash"/g)||[]).length===2&&/The Simulator \+ The Scorekeeper/.test(h)&&/🏦 The Banker/.test(h)&&/MIL \+1\.5/.test(h)&&/Parlay record/.test(h));}
  T('no uncaught errors',errors.length===0,errors.slice(0,3).join(' || '));
}catch(e){T('harness',false,e.stack);}
console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length} pass / ${out.filter(x=>x.startsWith('FAIL')).length} fail`);process.exit(0);},3000);
