/* v2.87.2 · Nov 7, 11:36 AM: "Today there are more CBB games after 5 PM that aren't appearing?" College basketball works your Intake
   lines, ranked teams and 25 more games a day — and those 25 were the 25 earliest tips, so a Saturday's evening games never got
   worked, and the time-slot view (which listed only worked games) never showed them. Now the 25 are spread across the day, and every
   game with a line shows by time, marked when the characters aren't working it. */
const fs=require('fs');const path=require('path');const W='/home/claude/work';const {JSDOM,VirtualConsole}=require('jsdom');
let pass=0,fail=0;const T=(n,c,x)=>{c?pass++:fail++;console.log((c?'PASS ':'FAIL ')+n+(c?'':'  — '+(x||'')));};
let html=fs.readFileSync(path.join(W,'ncaab.html'),'utf8');html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const errs=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errs.push(String(e&&e.message||e)));
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/ncaab.html',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){w.__NO_GRADELOOP__=true;w.__NO_BACKFILL__=true;w.__NO_SYNC_LOOP__=true;
  w.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('{}')});w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.prompt=()=>null;w.localStorage.setItem('d4.setupDone','1');}}).window;
setTimeout(()=>{try{const E=s=>w.eval(s);const e0=errs.length;const J=JSON.stringify;
  const d=E('today()');const off=E(`(()=>{const p=new Intl.DateTimeFormat('en-US',{timeZone:APP_TZ,timeZoneName:'longOffset'}).formatToParts(new Date(${J(d)}+'T18:00:00Z')).find(x=>x.type==='timeZoneName').value.replace('GMT','');return p||'+00:00';})()`);
  /* 40 lined, unranked games with only ESPN/BetOnline lines: 10 tip at 11 AM-ish, 10 at 2 PM, 10 at 6 PM, 10 at 8:30 PM (Central) */
  const G=[];[['11',0],['14',10],['18',20],['20',30]].forEach(([hh,b])=>{for(let i=0;i<10;i++){const mm=String(i*3).padStart(2,'0');G.push({id:'x'+(b+i),away:{abbr:'A'+(b+i),name:'Away '+(b+i)},home:{abbr:'H'+(b+i),name:'Home '+(b+i)},start:`${d}T${hh}:${hh==='20'?String(30+i).padStart(2,'0'):mm}:00${off}`,__date:d,abstract:'pre'});}});
  E(`(()=>{const G=${J(G)};NCAAB_GAMES.length=0;G.forEach(g=>NCAAB_GAMES.push(g));bbC('ncaab').up.length=0;
    window.bbLinesFor=(C,k)=>[{src:k.endsWith('9')?'bol':'espn',market:'moneyline',side:'home',price:-150,game:k}];delete BB_WORK.ncaab;})()`);
  const S=E(`[...bbWorkSet('ncaab')]`);const win=id=>E(`bbWin(${J((G.find(g=>g.id===id)||{}).start)})`);
  const by={early:0,afternoon:0,evening:0,late:0};S.forEach(id=>by[win(id)]++);
  T('the 25 extra games are spread across the day, not the 25 earliest tips',S.length===25&&by.evening>=6&&by.late>=6&&by.early>=6&&by.afternoon>=6,J(by));
  T('…the earliest game in each window goes first',S.includes('x0')&&S.includes('x10')&&S.includes('x20')&&S.includes('x30'));
  T('…your own lines and ranked teams are still always worked, on top of the 25',E(`(()=>{NCAAB_GAMES.push({id:'rk',away:{abbr:'DUKE',rank:4},home:{abbr:'UNC'},start:${J(`${d}T19:00:00${off}`)},__date:${J(d)},abstract:'pre'});delete BB_WORK.ncaab;const s=bbWorkSet('ncaab');return s.has('rk')&&s.size===26;})()`));
  /* the time-slot view lists every lined game, marking the unworked */
  const sch=E(`tcSched('ncaab',[])`);
  T('the schedule on today\'s card has every lined college game — the unworked ones marked',sch.length===41&&sch.filter(x=>x.w===0).length===15&&sch.some(x=>x.g==='A25@H25'),J({n:sch.length,unworked:sch.filter(x=>x.w===0).length}));
  E(`set(TC_KEY,{d:today(),by:{ncaab:{ts:Date.now(),picks:[],props:[],games:tcSched('ncaab',[])}}});localStorage.setItem('d4.gmmode','slots');localStorage.setItem('d4.slotf',JSON.stringify({win:'all',sp:'all',day:'today'}));slotApply();`);
  const sb=w.document.getElementById('slotBoard');const ev=[...sb.querySelectorAll('.tkt.slot')].filter(s=>/[5-9]:\d\d PM|1[01]:\d\d PM/.test(s.querySelector('div').textContent));
  T('…so the evening college games show in ⏰ All sports by time',ev.length>=10&&sb.querySelectorAll('.slot-game').length===41,`${ev.length} evening slots, ${sb.querySelectorAll('.slot-game').length} games`);
  T('…and an unworked one says why, and how to add it (paste its line in Intake)',/The characters aren't working this one/.test(sb.textContent)&&/Paste its line in Intake/.test(sb.textContent));
  /* Full card › on this page: the board's card, then back */
  const key=E(`(()=>{const g=slotGames().all.find(x=>x.gid==='x25');return g.day+'-'+g.t;})()`);
  E(`slotOpen('ncaab','x25',${J(key)})`);
  T('Full card › on this sport: the board shows, filtered to that game, with "⏰ Back to time slots" ready',!w.document.getElementById('v-games').classList.contains('slots-on')&&E(`BB_VIEW.ncaab.q`)==='H25'&&/Back to time slots/.test((w.document.getElementById('slotBackPill')||{}).textContent||''));
  E('slotBack()');
  T('…and Back puts you in the time slots again, the board\'s own filter restored',w.document.getElementById('v-games').classList.contains('slots-on')&&E(`BB_VIEW.ncaab.q`)===''&&!w.document.getElementById('slotBackPill'));
  T('no errors along the way',errs.length===e0,errs.slice(e0).join(' | '));
}catch(e){T('crashed',false,e.stack);}console.log(pass+' pass / '+fail+' fail');process.exit(0);},2500);
