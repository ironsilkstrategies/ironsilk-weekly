/* v2.33 · the worker's relay: GitHub fires the 10-minute schedule only every few hours, so while a slate
   is live the worker polls inside its run and starts its own next run. It rests once today's card is graded,
   waits on a quiet morning, and caps itself. The app's merge keeps the relay counter. */
const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
(async()=>{try{
  process.env.AUTOPILOT_KEY='k';process.env.TG_BOT_TOKEN='t';process.env.GITHUB_REPOSITORY='o/r';process.env.GITHUB_TOKEN='g';
  const Wk=await import(path.join(W,'autopilot/worker.mjs'));
  const now=Date.parse('2026-10-16T23:40:00Z');   /* 6:40 PM CT Friday */
  const day=Wk.chicagoDay(now);
  const post=(o)=>({posts:{[day]:{d:day,chat:'-100',legs:[{k:'a',label:'COL ML'},{k:'b',label:'BOS ML'}],st:{},sent:{},pub:{legs:[{k:'a',start:'2026-10-17T01:00:00Z',unlockAt:Date.parse('2026-10-17T00:30:00Z')}]},...o}}});
  T('a game tonight within the hour keeps the relay going',Wk.relayPending(post({pub:{legs:[{k:'a',start:'2026-10-17T00:20:00Z',unlockAt:Date.parse('2026-10-16T23:50:00Z')}]}}),now)===true);
  T('a game in progress keeps it going',Wk.relayPending(post({pub:{legs:[{k:'a',start:'2026-10-16T23:00:00Z'}]}}),now)===true);
  T('a quiet morning (first game 6 hours away) rests',Wk.relayPending(post({pub:{legs:[{k:'a',start:'2026-10-17T05:50:00Z',unlockAt:Date.parse('2026-10-17T05:20:00Z')}]}}),now)===false);
  T('the first game 3 hours out: the relay is on (its unlock posts at T-30)',Wk.relayPending(post({pub:{legs:[{k:'a',start:'2026-10-17T02:40:00Z',unlockAt:Date.parse('2026-10-17T02:10:00Z')}]}}),now)===true);
  T('no start times on the card: live until graded',Wk.relayPending(post({pub:null}),now)===true);
  T('everything graded: rests',Wk.relayPending(post({st:{a:'W',b:'L'}}),now)===false);
  T('yesterday\'s card doesn\'t keep it awake',Wk.relayPending({posts:{'2026-10-15':{d:'2026-10-15',legs:[{k:'x'}],st:{}}}},now)===false);
  T('a late game after midnight still counts as tonight (slate day turns at 5 AM)',Wk.chicagoDay(Date.parse('2026-10-17T06:30:00Z'))===day&&Wk.relayPending(post({pub:{legs:[{k:'a',start:'2026-10-17T04:00:00Z'}]}}),Date.parse('2026-10-17T06:30:00Z'))===true);
  /* the hand-off: one workflow dispatch, and the cap */
  const calls=[];let RUNS=12;const fetch=(u,o)=>{if(/\/runs\?/.test(u))return Promise.resolve({status:200,json:()=>Promise.resolve({total_count:RUNS})});calls.push({u,o});return Promise.resolve({status:204});};
  const ok=await Wk.relayNext({relay:{d:day,n:3}},{fetch,now});
  T('hand-off = one workflow dispatch on this repo',ok&&calls.length===1&&/\/repos\/o\/r\/actions\/workflows\/tg-autopilot\.yml\/dispatches$/.test(calls[0].u)&&calls[0].o.method==='POST'&&JSON.parse(calls[0].o.body).ref,calls[0]&&calls[0].u);
  RUNS=150;const capped=await Wk.relayNext({},{fetch,now});T('capped at 150 relayed runs a day (counted from GitHub, nothing extra written)',capped===false&&calls.length===1);
  RUNS=3;const fresh=await Wk.relayNext({},{fetch,now});T('under the cap it hands off again',fresh===true&&calls.length===2);
  const wsrc=require('fs').readFileSync(path.join(W,'autopilot/worker.mjs'),'utf8');T('the state branch only gets a commit when something was sent (or an hourly heartbeat)',/if \(acted \|\| beat/.test(wsrc)&&/60 \* 60e3/.test(wsrc));
  /* merges keep the counter */
  const M=Wk.mergeState({posts:{},relay:{d:day,n:5}},{posts:{},relay:{d:day,n:9}});T('the worker\'s merge keeps the higher count',M.relay&&M.relay.n===9);
  const src=require('fs').readFileSync(path.join(W,'shared.js'),'utf8');T('the app\'s merge carries the relay too',/out\.relay=!x\?y:!y\?x:/.test(src));
  const wf=require('fs').readFileSync(path.join(W,'.github/workflows/tg-autopilot.yml'),'utf8');T('the workflow may start its own next run',/actions: write/.test(wf)&&/workflow_dispatch/.test(wf));
}catch(e){T('harness',false,e.stack);}
console.log(out.join('\n'));const p=out.filter(x=>x.startsWith('PASS')).length;console.log(`\n${p} pass / ${out.length-p} fail`);process.exit(0);})();
