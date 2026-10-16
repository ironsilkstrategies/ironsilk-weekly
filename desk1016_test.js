/* v2.31 · The Desk core: the confidence meter + the 70% rule, records by league × bet with the new colors,
   the Banker's allocation (no pick on more than 3 tickets, no copied tickets), the VIP card, one bankroll,
   the Tuesday league, the rebuilt challenges, the master evaluation freeze, the 5 AM slate day, the public
   page's 30-minute unlock, the worker's public side, ideology dials, strengths. */
const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const {webcrypto}=require('crypto');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
const load=page=>{let h=fs.readFileSync(path.join(W,page),'utf8');return h.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);};
const errors=[];const vc=new (require('jsdom').VirtualConsole)();vc.on('jsdomError',e=>errors.push(String(e.message||e)));
let NOW=Date.parse('2026-10-16T17:00:00Z');   // noon CT, Friday
const TG=[],PUT=[];
const boot=(page)=>new JSDOM(load(page),{runScripts:'dangerously',url:'https://ironsilkweekly.com/'+page,pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  const RD=w.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[NOW]))}static now(){return NOW}}w.Date=FD;
  w.__NO_GRADELOOP__=true;w.__NO_BACKFILL__=true;w.__NO_SYNC_LOOP__=true;Object.defineProperty(w,'crypto',{value:webcrypto,configurable:true});w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;
  w.fetch=(u,o)=>{u=String(u);o=o||{};const J=(s,b)=>Promise.resolve({ok:s<300,status:s,json:()=>Promise.resolve(b),text:()=>Promise.resolve(JSON.stringify(b))});
    if(/api\.telegram\.org/.test(u)){TG.push({m:u.split('/').pop(),p:Object.fromEntries(new URLSearchParams(o.body))});return J(200,{ok:true,result:{message_id:700+TG.length}});}
    if(/api\.github\.com/.test(u)){if(o.method==='PUT'){PUT.push({u,b:JSON.parse(o.body)});return J(201,{});}return /contents/.test(u)?J(404,{}):J(200,{});}
    return J(404,{});};
  w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.localStorage.setItem('d4.setupDone','1');}}).window;
const w=boot('nhl.html');const E=s=>w.eval(s);
setTimeout(async()=>{try{
  /* ── the slate day turns over at 5 AM Central ── */
  T('noon Friday is Friday',E('today()')==='2026-10-16');
  NOW=Date.parse('2026-10-17T05:30:00Z');E('TODAY_T=0');   // 12:30 AM CT Saturday
  T('12:30 AM is still Friday\'s slate (a late game doesn\'t flip the app into tomorrow)',E('today()')==='2026-10-16',E('today()'));
  NOW=Date.parse('2026-10-17T10:05:00Z');E('TODAY_T=0');   // 5:05 AM CT
  T('5:05 AM is Saturday',E('today()')==='2026-10-17');
  NOW=Date.parse('2026-10-16T17:00:00Z');E('TODAY_T=0');
  /* ── a graded history the confidence meter learns from ── */
  const V=[];let id=0;const days=[];for(let i=40;i>=1;i--)days.push(E(`dayShift(today(),-${i})`));
  const teams=['BOS@TOR','NYR@WSH','SEA@DET','ANA@WPG','PIT@CBJ','CHI@STL'];
  days.forEach((d,di)=>teams.forEach((g,gi)=>{const fav=-160-gi*10,pm=E(`imp(${fav})`);
    const home=di%5!==gi%5;   /* the favorite wins 4 of 5 */
    V.push({id:'s'+(id++),voice:'Sim',sp:'nhl',game:g,date:d,market:'ml',side:'home',price:fav,simP:0.70,pUsed:0.70,graded:true,hit:home});
    V.push({id:'j'+(id++),voice:'Judge',sp:'nhl',game:g,date:d,market:'ml',side:'home',price:fav,graded:true,hit:home});
    V.push({id:'m'+(id++),voice:'Most common',sp:'nhl',game:g,date:d,market:'ml',side:'home',price:fav,graded:true,hit:home});
    V.push({id:'t'+(id++),voice:'Trends',sp:'nhl',game:g,date:d,market:'total',side:'over',line:6.5,price:-110,graded:true,hit:(di+gi)%2===0});}));
  E(`set(VOICES_KEY,${JSON.stringify(V)})`);
  const M=E('confRebuild(true)');
  T('the meter learns from every graded call, in time order',M.n===V.length&&M.cal.ml.length>0,`${M.n} calls · ${M.cal.ml.length} ML bins`);
  const early=E(`get(VOICES_KEY,[]).find(x=>x.date==='${days[0]}'&&x.voice==='Judge').cfr`),late=E(`get(VOICES_KEY,[]).filter(x=>x.date==='${days[39]}'&&x.voice==='Judge')[0].cfr`);
  T('older calls get a retro confidence from what was known before their day',early!=null&&late!=null&&late>early,`day 1 ${early} → day 40 ${late}`);
  const offG=E('get(VOICES_KEY,[]).filter(isOfficial)');
  T('a character that wins 80% of -160 favorites earns 70%+ calls; a coin-flip totals caller doesn\'t',offG.length>0&&offG.every(x=>x.market==='ml')&&offG.some(x=>x.voice==='Judge'),offG.length+' official');
  /* today's calls */
  const td=E('today()');const st=h=>td+'T'+String(h).padStart(2,'0')+':00:00-05:00';
  const calls=[];teams.forEach((g,gi)=>{const fav=-160-gi*10;
    ['Sim','Judge','Most common'].forEach(v=>calls.push({id:['nhl',g,td,v,'ml'].join('|'),voice:v,sp:'nhl',game:g,date:td,market:'ml',side:'home',price:fav,simP:0.70,pUsed:0.70}));
    calls.push({id:['nhl',g,td,'Trends','total'].join('|'),voice:'Trends',sp:'nhl',game:g,date:td,market:'total',side:'over',line:6.5,price:-110});});
  E(`(()=>{const C=${JSON.stringify(calls)};const sim={};C.forEach(c=>{if(c.voice==='Sim')sim[c.game]=c;});
    const by={};C.forEach(c=>{(by[c.game]=by[c.game]||[]).push(c);});Object.values(by).forEach(a=>confStamp(a));set(VOICES_KEY,get(VOICES_KEY,[]).concat(C));})()`);
  const today=E(`get(VOICES_KEY,[]).filter(x=>x.date===today())`);
  T('every call made today is stamped with its confidence (and why)',today.every(c=>c.cf!=null)&&today.some(c=>(c.cfw||[]).length),today.slice(0,3).map(c=>c.voice+' '+c.cf).join(', '));
  T('the 70% rule: favorites official, the totals not',today.filter(c=>c.market==='ml').every(c=>E(`isOfficial(${JSON.stringify(c)})`))&&today.filter(c=>c.market==='total').every(c=>!E(`isOfficial(${JSON.stringify(c)})`)));
  T('a switched-off character is never official',!E(`isOfficial({...${JSON.stringify(today[0])},kof:1})`));
  E(`set(CONF_FLOOR_KEY,{ml:0.9})`);T('the floor is a dial (90% → nothing official today)',!E(`isOfficial(${JSON.stringify(today[0])})`));E(`localStorage.removeItem(CONF_FLOOR_KEY)`);
  /* ── records: colors and the league × bet split ── */
  T('colors: under 50 red · 50s white · 60s green · 70+ gold',E(`[recColor(.49,10),recColor(.5,10),recColor(.59,10),recColor(.6,10),recColor(.7,10)].join()`)==='var(--rust),var(--chalk),var(--chalk),var(--win),var(--gold)');
  const vr=E(`(REC_SP='all',REC_SCOPE='off',voicesReportCore())`);
  T('Who to listen to: ML / ATS / O/U columns, official only, every character listed',/<td>ML<\/td><td>ATS<\/td><td>O\/U<\/td>/.test(vr)&&/Official/.test(vr)&&/Scorekeeper/.test(vr)&&/Commissioner/.test(vr));
  const g=E(`charGridHtml('Judge','off')`);T('each character: league × market grid',/NHL/.test(g)&&/var\(--gold\)|var\(--win\)/.test(g));
  /* ── today's card + the Banker's allocation ── */
  const TC=teams.map((gm,gi)=>({game:gm,m:'ml',sd:'home',pick:gm.split('@')[1]+' ML',price:-160-gi*10,color:gi<3?' supreme':' strong',chars:['Sim','Judge','Most common'],blend:.66,mp:.66,mkt:.62,start:st(19+gi%3)}));
  E(`set(TC_KEY,{d:today(),by:{nhl:{ts:Date.now(),picks:${JSON.stringify(TC)},props:[]}}});localStorage.removeItem(BEST5_KEY);localStorage.removeItem(DESK_KEY);localStorage.removeItem(CPAR_KEY);localStorage.removeItem(BKDAY_KEY);`);
  const B=E('best5State()');
  T('Best 3: official picks only, each % is the confidence that made it official',B.top3.length===3&&B.top3.every(x=>x.p>=0.7&&(x.confBy||[]).length),B.top3.map(x=>x.pick+' '+Math.round(x.p*100)+'%').join(', '));
  T('not frozen before the master evaluation',!B.locked&&!E('deskFrozen()'));
  const P=E('deskAllocate(null,today())');const use=Object.values(P.use);
  T('no pick on more than 3 tickets',Math.max(...use)<=3,JSON.stringify(P.use));
  const tix=[P.own,...Object.values(P.chars)].filter(Boolean);const sigs=tix.map(t=>t.legs.map(l=>l.game).sort().join());
  T('no ticket copies another (or sits inside one)',tix.every((t,i)=>tix.every((u,j)=>i===j||!t.legs.every(l=>u.legs.some(y=>y.game===l.game&&y.pick===l.pick)))),sigs.join(' | '));
  T('every ticket is 2–4 legs with a 30%+ chance to cash',tix.every(t=>t.legs.length>=2&&t.legs.length<=4&&t.p>=0.3),tix.map(t=>t.legs.length+'@'+(t.p*100).toFixed(0)+'%').join(', '));
  T('the Best 3 count as one placement each',B.top3.every(x=>(P.where[E(`deskKey(${JSON.stringify({...x,m:'ml'})})`)]||[]).includes('Best 3')));
  /* ── the VIP card ── */
  const parts=E('subTelegramText(subCard())').join('\n');
  T('VIP card: the placed tickets (no 5-leg dumps), the 70% promise, the 21+ line',!/5-leg/.test(parts)&&/70%\+ sure/.test(parts)&&/1-800-GAMBLER/.test(parts)&&/BANKER'S PARLAY|— [234]-leg/.test(parts));
  /* ── one bankroll ── */
  E(`set('d4.bankroll',{month:currentMonth(),profit:-1,limitMult:1,history:[{id:'old',date:'2026-10-01',stake:1,profit:-1,won:false,ts:1}],debited:{}});set('d4.brAmount','50');localStorage.removeItem(BANK_KEY);`);
  const S0=E('(()=>{const S=bankState();delete S.hist;return S;})()');
  T('one bankroll: starts from the old Money balance ($99), not the Banker\'s $50',S0.avail===99&&E('brAmount()')===99,JSON.stringify({avail:S0.avail,br:E('brAmount()')}));
  T('the $5-a-day cap is gone: a $40 stake is allowed, more than the bankroll isn\'t',E('checkStakeAllowed(1,40).ok')===true&&E('checkStakeAllowed(1,500).ok')===false);
  E(`set(LS.locked,[{id:'t1',date:today(),source:'mine',legs:[{sport:'nhl',game:'BOS@TOR',pick:'TOR ML',price:-160}]}]);saveWager('t1',8);`);
  T('a staked ticket shows as in play',E('bankState().open')===8&&E('bankState().avail')===91);
  E(`settleTicket('t1',8,5,true)`);T('it settles → the one balance moves (+$5)',E('bankState().avail')===104&&E('bankState().open')===0);
  E(`bankSetBalance(250)`);T('Set balance: to what the book says (an adjustment, history kept)',E('bankState().avail')===250&&E('bankCfg().adj.length')===1);
  E(`bankMove(-50,'out')`);T('take money out',E('bankState().avail')===200);
  const MT=E('renderMoneyTab()');
  T('the Bankroll tab: one number, today\'s plan, the league, the challenges — no mission board',/Your bankroll/.test(MT)&&/\$200\.00/.test(MT)&&/Today's plan/.test(MT)&&/Character League/.test(MT)&&/Challenges/.test(MT)&&!/Mission board/.test(MT));
  /* ── the league ── */
  T('league weeks run Tuesday to Tuesday',E('bkWeekStart("2026-10-16")')==='2026-10-13'&&E('bkWeekStart("2026-10-19")')==='2026-10-13'&&E('bkWeekStart("2026-10-20")')==='2026-10-20');
  T('every league bet pays at least $1 (a -130 favorite: $2 at 2% of $100, $1.30 at $40)',E('lgStake(100,americanToDecimal(-130))')===2&&E('lgStake(40,americanToDecimal(-130))')===1.3&&E('lgStake(100,americanToDecimal(-300))')===3);
  /* ── the master evaluation freezes everything ── */
  E(`set('d4.tgbot','1:a');set('d4.tgchat','-100555');set(LS.ghtoken,'ghp_x');set(BCAST_KEY,{pub:'@TheDeskApp',vipLounge:'-100777',pubLounge:'',autoPost:true,siteByWorker:false});liveSports=()=>['nhl'];`);
  E(`runNHLMasterEval=function(){evalLockMark('nhl');return[];}`);
  const R=await E('masterEvalAll()');await new Promise(z=>setTimeout(z,1500));
  T('one tap evaluates every live sport, then freezes the day',E('deskFrozen()')&&R&&R.done.includes('nhl'),JSON.stringify(R));
  const B2=E('best5State()'),P2=E('deskPlan()'),C2=E('cparState()'),K2=E('bkDayState()');
  T('frozen: Best 3, the Banker\'s plan, the character tickets and his desk',B2.locked&&P2.locked&&C2.locked&&K2.locked);
  T('the Today card\'s official flags are frozen too',E('get(TC_KEY,{}).by.nhl.picks.every(x=>x.fz&&x.fz.cf!=null)'));
  /* nothing moves after the freeze */
  E(`(()=>{const V=get(VOICES_KEY,[]);V.forEach(x=>{if(x.date===today()&&x.market==='ml'){x.cf=0.5;}});set(VOICES_KEY,V);PCI_C=null;DESK_MEM=null;})()`);
  T('after the freeze nothing changes when the inputs move',JSON.stringify(E('best5State()').top3.map(x=>x.pick))===JSON.stringify(B2.top3.map(x=>x.pick))&&JSON.stringify(E('deskPlan()').use)===JSON.stringify(P2.use)&&E('get(TC_KEY,{}).by.nhl.picks.filter(x=>tfPlayable(x,"nhl")).length')===E('get(TC_KEY,{}).by.nhl.picks.filter(x=>x.fz.play).length'));
  const vip=TG.filter(x=>x.p.chat_id==='-100555'),lounge=TG.filter(x=>x.p.chat_id==='-100777'),pub=TG.filter(x=>x.p.chat_id==='@TheDeskApp');
  T('…and it posts by itself: the VIP card, a note in the VIP lounge, "locked" on the public channel (no picks)',vip.length>=1&&lounge.length===1&&pub.length===1&&!/ML \(/.test(pub[0].p.text)&&/30 minutes before/.test(pub[0].p.text),`vip ${vip.length} · lounge ${lounge.length} · public ${pub.length}`);
  T('…and publishes the public page',PUT.some(p=>/public\/picks\.json/.test(p.u)));
  /* ── the public page: 30-minute unlock ── */
  const F=E('publicFeed()');
  T('public: every Best 3 pick is locked more than 30 min before its game',F.today.picks.every(x=>x.hidden&&!x.pick&&x.unlockAt));
  NOW=E(`Date.parse(best5State().top3[0].start)`)-25*60e3;
  const F2=E('publicFeed()');T('…and opens 30 min before',!F2.today.picks[0].hidden&&F2.today.picks[0].pick===B2.top3[0].pick);
  const full=E('publicFeedCore(true)');T('the worker gets the full card (with unlock times) to publish on its own',full.today.picks.every(x=>x.pick&&x.unlockAt));
  NOW=Date.parse('2026-10-16T17:00:00Z');
  /* ── the worker's public side ── */
  process.env.AUTOPILOT_KEY='k';process.env.TG_BOT_TOKEN='t';const Wk=await import(path.join(W,'autopilot/worker.mjs'));
  const legs=full.today.picks.map((x,i)=>({k:[x.sp,x.game,x.pick].join('|'),kind:'Best 3',n:i+1,label:x.pick,sp:x.sp,game:x.game,pick:x.pick,price:x.price,start:x.start,unlockAt:x.unlockAt}));
  const p={d:td,chat:'-100555',legs:legs.map(l=>({k:l.k,label:l.label,price:l.price})),st:{},sent:{},bc:{pub:'@TheDeskApp',pubLounge:'-100888',vipLounge:'-100777'},pub:{legs,day:'Fri, Oct 16'},feed:full,site:{repo:'ironsilkstrategies/ironsilk-weekly-site',tok:'x'}};
  const WT=[];const tg=async(m,q)=>{WT.push(q);return{ok:true};};
  const u0=Math.min(...legs.map(l=>l.unlockAt)),first=legs.filter(l=>l.unlockAt===u0),later=legs.filter(l=>l.unlockAt>u0);
  await Wk.runPublic(p,{tg,now:u0-60e3});T('worker: nothing goes public before the unlock',!WT.length,WT.map(q=>q.text.slice(0,60)).join(' | '));
  await Wk.runPublic(p,{tg,now:u0+60e3});const un=WT.filter(q=>/UNLOCKED/.test(q.text));
  T('worker: at the unlock it posts that pick to the public channel and lounge — not the later ones',un.length===2&&un.every(q=>first.every(l=>q.text.includes(l.label)))&&!later.some(l=>un[0].text.includes(l.label)),un[0]&&un[0].text.replace(/<[^>]+>/g,'').slice(0,160));
  WT.length=0;await Wk.runPublic(p,{tg,now:u0+120e3});T('…once',!WT.some(q=>/UNLOCKED/.test(q.text)));
  p.st[first[0].k]='W';WT.length=0;await Wk.runPublic(p,{tg,now:u0+3*36e5});T('worker: a graded public pick goes out as a result',WT.some(q=>/Results/.test(q.text)&&q.text.includes('✅')));
  const view=Wk.publicView(full,p.st,u0+60e3);
  T('worker page view: the opened pick shows (graded ✓), the later ones stay locked',view.today.picks.filter(x=>!x.hidden).length===first.length&&view.today.picks.some(x=>x.hit===true)&&view.today.picks.filter(x=>x.hidden).length===later.length,JSON.stringify(view.today.picks.map(x=>x.hidden?'🔒':x.pick+(x.hit?'✓':''))));
  T('worker slate day: 12:30 AM CT is still yesterday',Wk.chicagoDay(Date.parse('2026-10-17T05:30:00Z'))==='2026-10-16');
  /* ── ideology dials actually change the calls ── */
  E(`ideoSaveKnob('Consensus','p.fade',80)`);T('a saved dial is what the character reads (Consensus fades the public at 80% now)',E(`IDEO_P('Consensus','fade',65)`)===80);
  E(`ideoReset('Consensus')`);T('reset goes back to the built-in value',E(`IDEO_P('Consensus','fade',65)`)===65);
  T('the ideology page lists every character with its school, record, best/worst and dials',(()=>{const h=E('ideologyHtml()');return/The 70% rule/.test(h)&&(h.match(/class="ideo-card"/g)||[]).length===E('CHAR_ORDER.length')&&/Dials/.test(h);})());
  /* ── records hub views ── */
  E(`if(!document.getElementById('recordsHub')){const d=document.createElement('div');d.id='recordsHub';document.body.appendChild(d);}`);
  const views={};for(const v of ['overview','strengths','ideology']){E(`REC_VIEW='${v}';renderRecordsHub()`);views[v]=w.document.getElementById('recordsHub').innerHTML;}
  T('Records: tiles + the desk by league × bet + Who to listen to',/Official calls/.test(views.overview)&&/league × bet/.test(views.overview)&&/Who to listen to/.test(views.overview));
  T('Strengths: today\'s plays inside proven lanes, filterable, with the parlay builder',/strength plays/.test(views.strengths)&&/＋ slip|on slip|No strength plays/.test(views.strengths));
  T('Ideology view renders',/why each character picks/.test(views.ideology));
  /* ── Today: the process bar and the confidence chips ── */
  E(`if(!document.getElementById('todayBody')){const d=document.createElement('div');d.id='todayBody';document.body.appendChild(d);}renderToday(true);`);
  const th=w.document.getElementById('todayBody').innerHTML;
  T('Today opens with the daily process (grade → intake → master evaluation → published)',/Grade &amp; calibrate|Grade & calibrate/.test(th)&&/Master evaluation/.test(th)&&/frozen/.test(th));
  T('every pick on Today shows its confidence; official ones are marked',/class="cf-chip on"/.test(th));
  T('no uncaught errors',errors.length===0,errors.slice(0,3).join(' || '));
}catch(e){T('harness',false,e.stack.split('\n').slice(0,4).join(' | '));}
console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length} pass / ${out.filter(x=>x.startsWith('FAIL')).length} fail`);process.exit(0);},3000);
