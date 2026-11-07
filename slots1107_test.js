/* v2.86.9 · ⏰ ALL SPORTS BY TIME. Nov 7: "a by-time-slot option where I can see all games across all sports … and all the stats we give
   (unanimous, strong, predicted score, predicted props …)". Some bettors spread their tickets across the day, some stack a whole parlay
   inside one slot. Plus: a game's start time everywhere a game is shown. Synthetic card here; the real-browser replay with the phone's
   data is scratchpad/slotcheck.js (private data, never committed). */
const fs=require('fs');const path=require('path');const W='/home/claude/work';const {JSDOM,VirtualConsole}=require('jsdom');
let pass=0,fail=0;const T=(n,c,x)=>{c?pass++:fail++;console.log((c?'PASS ':'FAIL ')+n+(c?'':'  — '+(x||'')));};
let html=fs.readFileSync(path.join(W,'nhl.html'),'utf8');html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const errs=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errs.push(String(e&&e.message||e)));
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nhl.html',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){w.__NO_GRADELOOP__=true;w.__NO_BACKFILL__=true;w.__NO_SYNC_LOOP__=true;
  w.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('{}')});w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.prompt=()=>null;w.localStorage.setItem('d4.setupDone','1');}}).window;
setTimeout(async()=>{try{const E=s=>w.eval(s);const e0=errs.length;const W8=ms=>new Promise(r=>setTimeout(r,ms));
  const now=Date.now(),at=h=>new Date(Math.ceil((now+h*36e5)/60000)*60000).toISOString();const A2=at(2),A5=at(5),PAST=at(-5);
  const d=E('today()'),dd=E(`tdDay(${JSON.stringify(A2)})`);
  const pk=(o)=>Object.assign({sp:'nhl',m:'ml',price:-110,mp:0.55,chars:['Sim'],rules:[]},o);
  const card={d,by:{
    nhl:{ts:now,games:[{g:'BOS@NYR',id:'101',s:A2},{g:'TOR@MTL',id:'102',s:A2},{g:'EDM@CGY',id:'103',s:A5},{g:'VAN@SEA',id:'104',s:PAST}],
      picks:[pk({gid:'101',game:'BOS@NYR',start:A2,sd:'away',pick:'BOS ML',price:-150,unan:true,mp:0.66,brainP:0.66,gap:3.1,blend:0.64,mkt:0.6,color:' supreme',chars:['Sim','Judge']}),
        pk({gid:'101',game:'BOS@NYR',start:A2,m:'total',sd:'under',pick:'Under 6.5',mp:0.56,color:'value'}),
        pk({gid:'102',game:'TOR@MTL',start:A2,sd:'home',pick:'MTL ML',price:120,mp:0.5,brainP:0.5,color:' strong',chars:['Judge']}),
        pk({gid:'104',game:'VAN@SEA',start:PAST,sd:'home',pick:'SEA ML',price:-130,mp:0.6,color:' strong'})],props:[]},
    /* a card written before this version: picks only, no schedule */
    nba:{ts:now,picks:[pk({sp:'nba',gid:'9001',game:'LAL@GSW',start:A2,m:'spread',sd:'home',pick:'GSW -4.5',mp:0.58,brainP:0.58,color:' strong',chars:['Sim','Power']})],
      props:[{game:'LAL@GSW',name:'Stephen Curry',team:'GSW',lab:'PTS',line:25,p:0.74,proj:28.1}]}}};
  E(`set(TC_KEY,${JSON.stringify(card)});localStorage.removeItem('d4.slotf');localStorage.removeItem('d4.gmmode');SLIP.length=0;`);
  E(`set(SCORECALL_KEY,{${JSON.stringify(`nhl|BOS@NYR|${dd}|Sim`)}:{sp:'nhl',game:'BOS@NYR',date:${JSON.stringify(dd)},voice:'Sim',a:4,h:2},${JSON.stringify(`nhl|BOS@NYR|${dd}|Most common`)}:{sp:'nhl',game:'BOS@NYR',date:${JSON.stringify(dd)},voice:'Most common',a:3,h:2}})`);
  const vo=(voice,market,side,line)=>({id:voice+market+side,sp:'nhl',date:dd,game:'BOS@NYR',gid:'101',voice,market,side,line,price:-110});
  E(`set(VOICES_KEY,${JSON.stringify([vo('Sim','ml','away'),vo('Judge','ml','away'),vo('Coach','ml','away'),vo('Sim','total','under',6.5),vo('Judge','total','over',6.5),vo('Banker','ml','home')])})`);
  E(`set(CPROP_KEY,${JSON.stringify([{id:'c1',sp:'nhl',voice:'Sim',player:'David Pastrnak',team:'BOS',k:'s',thr:4,p:0.71,d:dd},{id:'c2',sp:'nhl',voice:'Judge',player:'David Pastrnak',team:'BOS',k:'s',thr:4,p:0.68,d:dd}])})`);
  /* the mode bar */
  const bar=w.document.getElementById('gmMode');
  T('every sport\'s Games tab has the mode bar: "<sport> board | ⏰ All sports by time", at the top of the tab (above Intake)',
    !!bar&&/NHL board/.test(bar.textContent)&&/All sports by time/.test(bar.textContent)&&!!(bar.compareDocumentPosition(w.document.getElementById('intakePaste'))&w.Node.DOCUMENT_POSITION_FOLLOWING),bar&&bar.textContent);
  T('…and it starts on the sport\'s own board',!w.document.getElementById('v-games').classList.contains('slots-on'));
  E('slotModeSet(true)');await W8(50);
  const v=w.document.getElementById('v-games'),sb=w.document.getElementById('slotBoard');
  T('tapping "All sports by time" switches the tab to the time-slot board, and remembers it',v.classList.contains('slots-on')&&E(`localStorage.getItem('d4.gmmode')`)==='slots'&&/All sports by start time/.test(sb.textContent));
  /* slots */
  const txt=()=>sb.textContent.replace(/\s+/g,' ');
  const slots=[...sb.querySelectorAll('.tkt.slot')];
  T('games from every sport that start at the same minute share one slot (NHL ×2 + NBA at one time; the late NHL game in its own)',slots.length===2&&slots[0].querySelectorAll('.slot-game').length===3&&slots[1].querySelectorAll('.slot-game').length===1,slots.map(s=>s.querySelectorAll('.slot-game').length).join(','));
  T('…in start-time order, each slot headed by its time',slots[0].textContent.includes(E(`slotTime(${JSON.stringify(A2)})`))&&slots[1].textContent.includes(E(`slotTime(${JSON.stringify(A5)})`)));
  T('a game already over stays off the default view ("⏭ Not over yet")',!/VAN/.test(txt()));
  T('a sport whose card has no schedule yet still shows its games with picks (NBA)',/LAL/.test(slots[0].textContent)&&/GSW -4\.5/.test(slots[0].textContent));
  T('a game with no pick is still listed (EDM@CGY), from the schedule on today\'s card',/EDM/.test(slots[1].textContent)&&/No pick on today's card for this game/.test(slots[1].textContent));
  /* the stats a card carries */
  const s0=slots[0].textContent.replace(/\s+/g,' ');
  T('each pick is Today\'s own row: tier, price, brain %, edge, blend, characters, ★ unanimous',/SUPREME/.test(s0)&&/BOS ML/.test(s0)&&/-150/.test(s0)&&/brain 66%/.test(s0)&&/edge \+3\.1/.test(s0)&&/blend 64% \(mkt 60%\)/.test(s0)&&/★ unanimous/.test(s0)&&/JUDGE/.test(s0),s0.slice(0,400));
  T('the predicted score (the Sim, and the most common score when it differs)',/Predicted Sim BOS 4–2 NYR · most common 3–2/.test(s0));
  T('how the characters split, per market (Banker and other blends left out)',/Characters: ML BOS ML all 3 · Total (Under|Over) 6\.5 1–1/.test(s0),(s0.match(/Characters:[^🎯🎭]*/)||[''])[0]);
  T('prop calls: the board\'s props ≥70% and the characters\' prop calls',/Stephen Curry 25\+ PTS 74%/.test(s0)&&/David Pastrnak 4\+ SOG 71% \(2 characters\)/.test(s0));
  T('every game has its start time and an Open › to its full card',sb.querySelectorAll('.slot-game .gm-when').length===4&&sb.querySelectorAll('.slot-game button[onclick^="slotOpen("]').length===4);
  T('slot header: game count, sports, pick counts by tier, unanimous count, and how long until it starts',/3 games · 🏒 NHL · 🏀 NBA|3 games · 🏀 NBA · 🏒 NHL/.test(s0)&&/5 picks|4 picks/.test(s0)&&/1 SUPREME/.test(s0)&&/★ 1 unanimous/.test(s0)&&/in [12]h/.test(s0),s0.slice(0,260));
  /* the slot parlay */
  const pb=slots[0].querySelector('button[onclick^="slotParlay("]');
  T('＋ Slot parlay shows the legs, what it pays and the model\'s chance it all hits',!!pb&&/3 legs · [+-]\d+ · \d+%/.test(pb.textContent),pb&&pb.textContent);
  pb.click();await W8(50);
  const legs=E('SLIP.map(x=>x.sport+"|"+x.game+"|"+x.pick)');
  T('…and tapping it puts each game\'s strongest pick on the slip — one per game (BOS ML over the Under)',legs.length===3&&legs.includes('nhl|BOS@NYR|BOS ML')&&legs.includes('nhl|TOR@MTL|MTL ML')&&legs.includes('nba|LAL@GSW|GSW -4.5'),JSON.stringify(legs));
  T('…those picks read ✓, and the slot has nothing left to add',w.document.querySelectorAll('#slotBoard button.primary[onclick^="slotAdd("]').length===3&&!w.document.querySelector('#slotBoard .tkt.slot button[onclick^="slotParlay("]'));
  E('SLIP.length=0;slotFSet("legs","2")');await W8(30);
  const pb2=w.document.querySelector('#slotBoard button[onclick^="slotParlay("]');
  T('the parlay size is yours: at 2 legs it takes the 2 strongest (SUPREME first)',/2 legs/.test(pb2.textContent));pb2.click();await W8(30);
  T('…(BOS ML + the next strongest)',E('SLIP.length')===2&&E('SLIP[0].pick')==='BOS ML',JSON.stringify(E('SLIP.map(x=>x.pick)')));
  E('SLIP.length=0;slotRender0()');
  /* single picks */
  const one=w.document.querySelector('#slotBoard button[onclick^="slotAdd("]');one.click();await W8(30);
  T('a pick\'s ＋ puts it on the slip',E('SLIP.length')===1);
  w.document.querySelector('#slotBoard button.primary[onclick^="slotAdd("]').click();await W8(30);
  T('…and ✓ takes it off',E('SLIP.length')===0);
  /* filters */
  E('slotFSet("tier","unan")');await W8(30);
  T('★ Unanimous shows only games with a unanimous pick',w.document.querySelectorAll('#slotBoard .slot-game').length===1&&/BOS/.test(w.document.querySelector('#slotBoard .slot-game').textContent));
  E('slotFSet("tier","all");slotFSet("sp","nba")');await W8(30);
  T('the sport chips narrow it to one sport',[...w.document.querySelectorAll('#slotBoard .slot-game')].every(g=>/NBA/.test(g.textContent))&&w.document.querySelectorAll('#slotBoard .slot-game').length===1);
  E('slotFSet("sp","all");slotFSet("win","all")');await W8(30);
  T('"Any time" brings back the game that\'s over, marked final',/VAN/.test(txt())&&/final/.test(txt()));
  T('a started game has no ＋ (nothing goes on a slip after the start)',![...w.document.querySelectorAll('#slotBoard .slot-game')].filter(g=>/VAN/.test(g.textContent)).some(g=>g.querySelector('button[onclick^="slotAdd("]')));
  E('slotFReset()');
  /* same board on Today */
  E(`tab('today',[...document.querySelectorAll('nav button')].find(b=>/Today/.test(b.textContent)))`);await W8(300);E(`tfSet('view','slots')`);await W8(100);
  const tb=w.document.getElementById('todayBody');
  T('Today has the same view ("⏰ By time"), the same games',/⏰ By time/.test(tb.textContent)&&tb.querySelectorAll('.slot-game').length===4,String(tb.querySelectorAll('.slot-game').length));
  E(`tfSet('tier','all');tfSet('view','picks')`);await W8(100);
  T('Today\'s own pick rows are drawn by the same renderer',/BOS ML/.test(tb.textContent)&&/function renderToday[\s\S]*const row=\(sp,x,L\)=>tcRowHtml\(sp,x,L\);/.test(fs.readFileSync(path.join(W,'shared.js'),'utf8')));
  /* the schedule rides on today's card */
  E(`NHL_GAMES=[{id:'201',away:{abbr:'BOS'},home:{abbr:'NYR'},start:${JSON.stringify(A2)}},{id:'202',away:{abbr:'DAL'},home:{abbr:'STL'},start:${JSON.stringify(A5)}},{id:'203',away:{abbr:'OLD'},home:{abbr:'GME'},start:'2020-01-01T00:00:00Z'}]`);
  const sch=E(`tcSched('nhl',get(TC_KEY,{}).by.nhl.games)`);
  T('the schedule rides on today\'s card: every game on the board (today → 2 days out), games already listed keep their place',sch.some(x=>x.g==='DAL@STL'&&x.id==='202')&&sch.some(x=>x.g==='EDM@CGY')&&!sch.some(x=>x.g==='OLD@GME'),JSON.stringify(sch.map(x=>x.g)));
  T('…and a game\'s start time shows anywhere, even for a game this page never loaded',/🕒/.test(E(`gameWhenHtml('nhl','EDM@CGY')`))&&E(`gameWhen('nba','LAL@GSW')`)===E(`slotTime(${JSON.stringify(A2)})`));
  const src=['shared.js','desk-core.js','desk-revive.js'].map(f=>fs.readFileSync(path.join(W,f),'utf8')).join('\n');
  T('a game\'s start time is drawn wherever a game is named (Today rows and props, the Best card, hot hands, who agrees, the board list, the audit…)',(src.match(/gameWhenHtml\(/g)||[]).length>=20,String((src.match(/gameWhenHtml\(/g)||[]).length));
  /* deep link + the mode on reload */
  T('Open › on another sport goes to that sport\'s page carrying the game',/slotOpen\(&quot;nba&quot;,&quot;9001&quot;\)/.test(sb.innerHTML)&&/game='\+encodeURIComponent\(gid\)/.test(fs.readFileSync(path.join(W,'desk-core.js'),'utf8')));
  T('…and a page opened that way shows its own board, whatever mode was saved',/const dl=new URLSearchParams\(location\.search\|\|''\)\.get\('game'\);if\(dl\)\{SLOT_FORCE_BOARD=true;/.test(fs.readFileSync(path.join(W,'desk-core.js'),'utf8')));
  T('the mode and the filters follow you to your other devices, like Today\'s filter',E(`syncSkip('d4.gmmode')`)===false&&E(`syncSkip('d4.slotf')`)===false&&E(`syncSkip('d4.todayfilter')`)===false);
  T('no errors along the way',errs.length===e0,errs.slice(e0).join(' | '));
}catch(e){T('crashed',false,e.stack);}console.log(pass+' pass / '+fail+' fail');process.exit(0);},2500);
