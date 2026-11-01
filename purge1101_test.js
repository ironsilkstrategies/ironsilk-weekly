/* v2.84.2 · tickets fall off 3 days after their last game (archived or not), results kept in the lifetime log */
const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);const NOW='2026-11-01T20:00:00Z';
let html=fs.readFileSync(path.join(W,'nba.html'),'utf8');html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const leg=(g,d)=>({sport:'nba',game:g,pick:'X ML',price:-110,gameDate:d});
const TIX=[{id:1,date:'2026-10-20',source:'mine',legs:[leg('A@B','2026-10-20')]},{id:2,date:'2026-10-25',archived:true,archivedAt:Date.parse(NOW)-2*36e5,source:'mine',legs:[leg('C@D','2026-10-25')]},
  {id:3,date:'2026-10-30',source:'mine',legs:[leg('E@F','2026-10-30')]},{id:4,date:'2026-10-27',source:'mine',legs:[leg('G@H','2026-10-27'),leg('I@J','2026-10-31')]},{id:5,date:'2026-11-01',source:'mine',legs:[leg('K@L','2026-11-01')]}];
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nba.html',pretendToBeVisual:true,beforeParse(x){const RD=x.Date;const t0=RD.now();class FD extends RD{constructor(...a){super(...(a.length?a:[RD.parse(NOW)+(RD.now()-t0)]))}static now(){return RD.parse(NOW)+(RD.now()-t0)}}x.Date=FD;
  x.__NO_GRADELOOP__=true;x.__NO_BACKFILL__=true;x.__NO_REOPEN__=true;x.__NO_SYNC_LOOP__=true;x.fetch=()=>Promise.resolve({ok:false,status:404,headers:{get:()=>null},json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});x.scrollTo=()=>{};x.alert=()=>{};x.confirm=()=>true;
  x.localStorage.setItem('d4.setupDone','1');x.localStorage.setItem('d4.locked',JSON.stringify(TIX));x.localStorage.setItem('d4.lastMaint3','');}}).window;
setTimeout(()=>{try{w.eval("localStorage.removeItem('d4.lastMaint3');maybeRunDailyMaintenance()");const ids=w.eval("get(LS.locked,[]).map(t=>t.id).sort()");
  T('tickets whose last game was over 3 days ago are gone (archived or not)',JSON.stringify(ids)==='[3,4,5]',JSON.stringify(ids));
  T('a ticket with a leg inside the last 3 days stays',ids.includes(4));
  T('dropped tickets are tombstoned so a sync can\'t bring them back',!!w.eval("syncTomb()['1']"));
}catch(e){T('harness',false,e.stack);}console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length} pass / ${out.filter(x=>x.startsWith('FAIL')).length} fail`);process.exit(0);},3000);
