/* v2.87.0 · BET TYPES + EVERY CHARACTER + WHY ITS WORD CARRIES WEIGHT. Nov 7, 10:51 AM: "on that today menu I want to be able to break
   it down by bet types (props, spreads, o/u, 1st half, moneyline, heavy moneylines (over -1000) and light moneylines) and can we include
   every character because there are characters missing… same for the tickets build section… we want to be able to see what each
   character would do with the options… also label the characters strong points and his weaknesses so as a public user it would let me
   know why their word doesn't hold weight or why it does". Synthetic ledger here; the replay with the phone's full history is
   scratchpad/charcheck.js (private data, never committed). */
const fs=require('fs');const path=require('path');const W='/home/claude/work';const {JSDOM,VirtualConsole}=require('jsdom');
let pass=0,fail=0;const T=(n,c,x)=>{c?pass++:fail++;console.log((c?'PASS ':'FAIL ')+n+(c?'':'  — '+(x||'')));};
let html=fs.readFileSync(path.join(W,'nhl.html'),'utf8');html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const errs=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errs.push(String(e&&e.message||e)));
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nhl.html',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){w.__NO_GRADELOOP__=true;w.__NO_BACKFILL__=true;w.__NO_SYNC_LOOP__=true;
  w.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('{}')});w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.prompt=()=>null;w.localStorage.setItem('d4.setupDone','1');}}).window;
setTimeout(async()=>{try{const E=s=>w.eval(s);const e0=errs.length;const W8=ms=>new Promise(r=>setTimeout(r,ms));const J=JSON.stringify;
  /* bet types */
  T('bet types: heavy = a moneyline -500 or shorter (v2.95), light = every other moneyline',E(`btPass('heavy','ml',-500)&&btPass('heavy','ml',-2500)&&!btPass('heavy','ml',-499)&&btPass('light','ml',-499)&&btPass('light','ml',150)&&!btPass('light','ml',-1200)&&btPass('ml','moneyline',-1200)`));
  T('…spreads, O/U, 1st half (h1/p1 markets), props each stand alone',E(`btPass('spread','spread',-110)&&!btPass('spread','total',-110)&&btPass('total','total')&&btPass('half','h1spread')&&btPass('half','p1total')&&!btPass('half','spread')&&btPass('props','prop')&&!btPass('props','ml')&&!btPass('ml','h1ml')`));
  /* a slate: today's card + every character's calls */
  const now=Date.now(),at=h=>new Date(Math.ceil((now+h*36e5)/60000)*60000).toISOString();const A2=at(2);const d=E('today()'),dd=E(`tdDay(${J(A2)})`);
  const pk=o=>Object.assign({sp:'nhl',gid:'1',start:A2,m:'ml',price:-110,mp:0.6,brainP:0.6,chars:['Sim'],rules:[],color:' strong'},o);
  E(`set(TC_KEY,${J({d,by:{nhl:{ts:now,games:[{g:'BOS@NYR',id:'1',s:A2},{g:'TOR@MTL',id:'2',s:A2}],
    picks:[pk({game:'BOS@NYR',sd:'away',pick:'BOS ML',price:-1400,mp:0.95,brainP:0.95,color:' supreme',unan:true,chars:['Sim','Judge']}),pk({game:'BOS@NYR',m:'spread',sd:'away',pick:'BOS -1.5',price:120}),
      pk({game:'TOR@MTL',gid:'2',m:'total',sd:'over',pick:'Over 6.5',price:-105,color:'value'}),pk({game:'TOR@MTL',gid:'2',sd:'home',pick:'MTL ML',price:135,color:' strong'})],
    props:[{game:'TOR@MTL',name:'Auston Matthews',team:'TOR',lab:'SOG',line:4,p:0.73,proj:4.6}]}}})});`);
  /* history: the Dog has made money on NHL dogs (proven lane); the Judge has lost it on NHL totals (blocked lane) */
  const past='2026-10-20';const H=[];const g=(v,market,side,price,hit,i)=>H.push({id:`h${v}${market}${side}${i}`,sp:'nhl',date:past,game:'AAA@BBB'+i,voice:v,market,side,price,line:market==='total'?6.5:null,graded:true,hit,units:hit?(price>0?price/100:100/Math.abs(price)):-1});
  for(let i=0;i<40;i++)g('Dog','ml','away',150,i<24,i);
  for(let i=0;i<40;i++)g('Judge','total','over',-110,i<12,i);
  for(let i=0;i<40;i++)g('Judge','spread','home',-110,i<26,i);
  for(let i=0;i<10;i++)g('Scout','ml','home',-150,i<6,i);
  const call=(v,game,market,side,price,cf,o)=>Object.assign({id:`t${v}${game}${market}`,sp:'nhl',date:dd,game,gid:game==='BOS@NYR'?'1':'2',voice:v,market,side,price,line:market==='spread'?-1.5:market==='total'?6.5:null,cf},o||{});
  const today=[call('Sim','BOS@NYR','ml','away',-1400,0.95),call('Judge','BOS@NYR','ml','away',-1400,0.93),call('Sim','TOR@MTL','total','over',-105,0.72),call('Dog','TOR@MTL','ml','home',135,0.55),
    call('Judge','TOR@MTL','total','over',-105,0.66),call('Banker','TOR@MTL','ml','home',135,0.62),call('Blend','BOS@NYR','spread','away',120,0.58),call('Sim','BOS@NYR','total','under',-110,0.75)];
  E(`set(VOICES_KEY,${J(H.concat(today))});window.isOfficial=x=>(x.cf||0)>=0.7&&x.price!=null&&+x.price>=-300;`);
  E(`set(HALF_KEY,${J({[`nhl|TOR@MTL|${dd}|Sim|p1total`]:{sp:'nhl',game:'TOR@MTL',date:dd,voice:'Sim',mk:'p1total',side:'over',line:1.5,price:-120,pick:'1P Over 1.5'},[`nhl|TOR@MTL|${dd}|Judge|p1total`]:{sp:'nhl',game:'TOR@MTL',date:dd,voice:'Judge',mk:'p1total',side:'over',line:1.5,price:-120,pick:'1P Over 1.5'}})})`);
  E(`set(CPROP_KEY,${J([{id:'p1',sp:'nhl',voice:'Sim',player:'Auston Matthews',team:'TOR',k:'s',thr:4,p:0.74,d:dd},{id:'p2',sp:'nhl',voice:'Coach',player:'Auston Matthews',team:'TOR',k:'s',thr:4,p:0.7,d:dd}])})`);
  E(`set(TF_KEY,{tier:'all',ch:'all',sp:'all',view:'picks',bt:'all'});tab('today',[...document.querySelectorAll('nav button')].find(b=>/Today/.test(b.textContent)));`);await W8(400);E('renderToday(true)');await W8(100);
  const tb=w.document.getElementById('todayBody');const chips=()=>[...tb.querySelectorAll('.msg-chip')].map(x=>x.textContent.replace(/\s+/g,' ').trim());
  T('Today: the bet-type row — All bets, Moneyline, Heavy ML -1000+, Light ML, Spreads, O/U, 1st half, Props, each with its count',['All bets 4','Moneyline 2','Heavy ML -1000+ 1','Light ML 1','Spreads 1','O/U 1','1st half 2','Props 2'].every(c=>chips().includes(c)),J(chips().slice(0,9)));
  const chs=[...tb.querySelectorAll('.ch-row .msg-chip')].map(x=>x.textContent.replace(/\s+/g,' ').trim());
  T('…and every character — all 14, even the ones with nothing on the card today (Banker, Blend, Dog…)',chs.length===15&&['The Simulator','The Judge','The Coach','The Scorekeeper','The Oracle','Covers','The Historian','The Crowd','The Commissioner','The Underdog Spotter','The Scout','The Banker','The Brain','The Blend'].every(n=>chs.some(c=>c.includes(n))),J(chs));
  T('…each chip counts that character\'s calls today and wears its weight badge',chs.some(c=>/The Underdog Spotter 1$/.test(c)&&/^✅/.test(c))&&chs.some(c=>/The Oracle 0$/.test(c)&&/^⏳/.test(c)),J(chs.filter(c=>/Underdog|Oracle/.test(c))));
  E(`tfSet('bt','heavy')`);await W8(50);
  T('Heavy ML: only the -500+ moneyline, with the warning that one miss erases five wins',/BOS ML/.test(tb.textContent)&&!/MTL ML/.test(tb.textContent)&&/one miss erases five wins/.test(tb.textContent));
  E(`tfSet('bt','light')`);await W8(50);T('Light ML: every other moneyline',/MTL ML/.test(tb.textContent)&&!/BOS ML -1400/.test(tb.textContent.replace(/\s+/g,' ')));
  E(`tfSet('bt','total')`);await W8(50);T('O/U: only totals',/Over 6\.5/.test(tb.textContent)&&!/MTL ML|BOS -1\.5/.test(tb.textContent));
  E(`tfSet('bt','half')`);await W8(50);T('1st half: every character\'s half read, grouped, with who agrees',/1P Over 1\.5/.test(tb.textContent)&&/2 characters/.test(tb.textContent));
  E(`tfSet('bt','props')`);await W8(50);T('Props: the board\'s 70%+ props and the characters\' prop calls',/Auston Matthews 4\+ SOG/.test(tb.textContent)&&/Character prop calls/i.test(tb.textContent));
  /* a character: who it is, why its word carries weight or doesn't, what it would do */
  E(`tfSet('bt','all');tfSet('ch','Dog')`);await W8(50);
  const prof=()=>(tb.querySelector('.ch-prof')||{textContent:''}).textContent.replace(/\s+/g,' ');
  T('picking a character shows what its method is built for and its blind spot',/Built for knows the dogs/i.test(prof())&&/Blind spot: it never backs a favorite/.test(prof()),prof().slice(0,300));
  T('…and its weight from its graded record: ✅ carries weight, with the lane it has proven (NHL side (dog) 24-16)',/✅ Carries weight/.test(prof())&&/Proven: 🏒 NHL side \(dog\) 24-16/.test(prof()),prof());
  T('…then every call it made today, even ones that never reached the card',/MTL ML/.test(tb.textContent)&&/1 call/i.test(tb.textContent));
  E(`tfSet('ch','Judge')`);await W8(50);
  T('a losing lane reads as a weakness: the Judge, blocked on NHL totals (over) 12-28',/Blocked: 🏒 NHL total \(over\) 12-28/.test(prof())&&/Proven: 🏒 NHL spread \(fav\) 26-14/.test(prof()),prof());
  E(`tfSet('bt','total')`);await W8(50);
  T('…with its record on the bet type you\'re looking at (📌 On totals: 12-28)',/📌 On totals \(O\/U\): 12-28/.test(prof()),prof());
  E(`tfSet('bt','all');tfSet('tier','play')`);await W8(50);
  T('a character + ✅ Official shows only its official calls (the Judge\'s 93% BOS ML is -1400 — never official)',/no calls today|none that pass/i.test(tb.textContent)||!/LEARNING/.test(tb.textContent),tb.textContent.replace(/\s+/g,' ').slice(-300));
  E(`tfSet('tier','all');tfSet('ch','Scout')`);await W8(50);T('a character with too few graded calls reads ⏳ still proving itself',/⏳ Still proving itself/.test(prof())&&/Only 10 graded/.test(prof()));
  E(`tfSet('ch','Pred')`);await W8(50);T('a character with nothing to say today says why (The Oracle: no outside read on this game)',/no outside read on this game/.test(tb.textContent));
  E(`tfSet('ch','all')`);await W8(50);
  /* the ticket builder */
  E(`TICKETTAB='build';BUILD_MODE='chars';CB_V=null;CB_BT='all';CB_ALL=true;tab('tickets',[...document.querySelectorAll('nav button')].find(b=>/Tickets/.test(b.textContent)));renderTickets();`);await W8(100);
  const kb=w.document.getElementById('ticketBody');
  T('Tickets → Build → Characters: every character, the bet types (game lines), and the selected character\'s profile',kb.querySelectorAll('.ch-row .msg-chip').length===14&&/Heavy ML -1000\+/.test(kb.textContent)&&/Light ML/.test(kb.textContent)&&!!kb.querySelector('.ch-prof'));
  E(`cbSetV('Sim');cbSetBt('heavy')`);await W8(50);
  const pool=E(`cbPool('Sim').map(x=>x.pick+' '+x.price)`);
  T('Heavy ML in the builder: the -1000+ favorites (kept off every other ticket by the -300 floor), and it says the floor is lifted here only',pool.length===1&&/BOS ML -1400/.test(pool[0])&&/lifted in this view only/.test(kb.textContent),J(pool));
  E(`cbSetBt('total')`);await W8(50);const tp=E(`cbPool('Sim').map(x=>x.pick)`);
  T('…O/U builds from its totals only — and a call in a blocked lane stays off (its Over sits in the NHL total (over) lane the Judge\'s losses blocked)',tp.length===1&&/^Under 6\.5/.test(tp[0]),J(tp));
  E(`cbSetBt('all');cbSetV('Coach')`);await W8(50);T('a character with no buildable picks still shows (and you can see why)',/The Coach/.test(kb.textContent)&&/No open picks for The Coach/.test(kb.textContent));
  /* ⏰ by time */
  E(`slotModeSet(true);slotFSet('win','all');slotFSet('ch','Dog')`);await W8(80);const sb=w.document.getElementById('slotBoard');
  T('⏰ By time: every character too; the Dog → only the game it called, with "The Underdog Spotter would:"',sb.querySelectorAll('.slot-game').length===1&&/The Underdog Spotter would:/.test(sb.textContent)&&/MTL ML/.test(sb.textContent)&&!!sb.querySelector('.ch-prof'));
  E(`slotFSet('ch','all');slotFSet('bt','heavy')`);await W8(80);
  T('…and the bet types: Heavy ML → only the game with the -1000+ favorite',sb.querySelectorAll('.slot-game').length===1&&/BOS/.test(sb.querySelector('.slot-game').textContent)&&/BOS ML/.test(sb.querySelector('.slot-game').textContent));
  E(`slotFSet('bt','half')`);await W8(80);T('…1st half → the half reads on the game, with who agrees',/1P Over 1\.5/.test(sb.textContent)&&sb.querySelectorAll('.slot-game').length===1);
  E(`slotFReset();slotModeSet(false)`);
  T('the bet type and character stay in Today\'s filter (synced like the rest of it)',E(`(get(TF_KEY,{})||{}).bt`)!==undefined);
  T('no errors along the way',errs.length===e0,errs.slice(e0).join(' | '));
}catch(e){T('crashed',false,e.stack);}console.log(pass+' pass / '+fail+' fail');process.exit(0);},2500);
