/* v2.44 · THE BOOK + THE IMMUNE SYSTEM — every situation has a mapped next page and an ending.
   Walks every combination of conditions; replays the Oct 17 empty-card freeze; holds, deadlines,
   held-back sports, fail-open, and a frozen day that must never move. */
const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
const D='2026-10-18',T0=Date.parse('2026-10-18T14:00:00Z');   /* 9:00 AM CT */
const NHL_ST='2026-10-18T23:00Z',CFB_ST='2026-10-18T19:30Z';
let id=0;const c=(voice,sp,game,market,side,price,cf,extra)=>({id:'k'+(++id),sp,date:D,game,gid:'g'+game,voice,market,side,line:market==='spread'?(side==='home'?-3:3):market==='total'?6:null,price,pick:'',cf,...(extra||{})});
let html=fs.readFileSync(path.join(W,'cfb.html'),'utf8');html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
function boot(store){return new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/cfb.html',pretendToBeVisual:true,beforeParse(w){
  w.__NOW=T0;const RD=w.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[w.__NOW]))}static now(){return w.__NOW}}w.Date=FD;w.__NO_GRADELOOP__=true;w.__NO_REOPEN__=true;
  w.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;
  w.localStorage.setItem('d4.setupDone','1');Object.entries(store).forEach(([k,v])=>w.localStorage.setItem(k,JSON.stringify(v)));}}).window;}
const nhlPick=(game,sd,price,extra)=>({sp:'nhl',game,m:'ml',sd,pick:(sd==='home'?game.split('@')[1]:game.split('@')[0])+' ML',price,start:NHL_ST,color:' strong',...(extra||{})});
const cfbPick=(game,price)=>({sp:'ncaaf',game,m:'spread',sd:'home',pick:game.split('@')[1]+' -3',line:-3,price,start:CFB_ST,color:' value'});
/* Oct 17, replayed: CFB on the card, NHL's picks wiped from it — but the NHL calls are official */
const V0=()=>[c('Sim','nhl','DAL@CHI','ml','away',-150,0.76),c('Judge','nhl','DAL@CHI','ml','away',-150,0.74),c('Sim','nhl','CAR@WPG','ml','away',-140,0.73),
  c('Sim','ncaaf','OSU@IU','spread','home',-110,0.58),c('Judge','ncaaf','ND@BYU','spread','home',-110,0.56)];
const TC0=()=>({d:D,by:{ncaaf:{ts:T0-3600e3,picks:[cfbPick('OSU@IU',-110),cfbPick('ND@BYU',-110)]},nhl:{ts:T0-3600e3,picks:[]}}});
const BOOK_POSTED=e=>['POST','POST_GAPS','NO_PLAY'].includes(e);const wait=ms=>new Promise(r=>setTimeout(r,ms));
/* the background read of another sport (an iframe on the phone): here it marks the sport read, with the picks it would find — or fails for the sports listed */
const stubBg=(w,picks,fail)=>w.eval(`bookBgEval=async function(sp){if(${JSON.stringify(fail||[])}.includes(sp))return null;const P=${JSON.stringify(picks||{})};const T=get(TC_KEY,{});T.d=today();T.by=T.by||{};
  T.by[sp]={ts:Date.now(),picks:P[sp]||((T.by[sp]||{}).picks)||[]};set(TC_KEY,T);set('d4.bgeval.'+sp,{ts:Date.now(),ok:true,d:today()});return{ok:true};}`);
(async()=>{try{
  /* ── 1 · on paper, and every combination ── */
  {const w=boot({});await wait(1500);
    const C=w.eval('bookCheck(BOOKS.freeze)');T('the freeze book: every turn exists, every page reaches an ending',C.ok,C.errs.join(' | '));
    const P=w.eval('bookCheck(BOOKS.publish)');T('the publish book: same',P.ok,P.errs.join(' | '));
    const X=w.eval('bookExplore(BOOKS.freeze,bookFreezeRules)');
    T(`walked every combination (${X.n} stories) — none strands the day`,X.bad.length===0,X.bad.slice(0,2).map(b=>JSON.stringify(b)).join(' || '));
    T('…and none breaks a rule (frozen day untouched, never held past the deadline, never posts a missing sport or broken inputs while there is time)',X.broke.length===0,X.broke.slice(0,3).map(b=>b.rule+' :: '+b.path).join(' || '));
    const need=['POST','POST_GAPS','NO_PLAY','NO_GAMES','ALREADY','HOLD_RETRY','HOLD_YOU'];T('every ending is reachable',need.every(e=>X.ends[e]>0),JSON.stringify(X.ends));
    const XP=w.eval('bookExplore(BOOKS.publish,null)');T('the publish book never strands either',XP.bad.length===0&&XP.ends.SEND>0&&XP.ends.NOT_FROZEN>0,JSON.stringify(XP.ends));
    /* a page that answers with a turn it never declared ends at "held for you", naming the page */
    const R=w.eval(`(()=>{const B={id:'t',start:'a',pages:{a:{q:'?',to:['POST'],ask:()=>['b','x']}}};return bookWalkSync(B,{},null);})()`);
    T('a page that turns somewhere it never declared can\'t strand the day (held for you, page named)',R.end==='HOLD_YOU'&&R.bad&&/never declared/.test(R.why),R.why);
    const R2=w.eval(`(()=>{const B={id:'t',start:'a',max:10,pages:{a:{q:'?',to:['a'],ask:()=>['a','loop']}}};return bookWalkSync(B,{},null);})()`);
    T('a loop ends at its limit, held for you',R2.end==='HOLD_YOU'&&R2.bad,R2.why);
    const R3=w.eval(`(()=>{const B={id:'t',start:'a',pages:{a:{q:'?',to:['POST'],ask:()=>{throw new Error('boom')}}}};return bookWalkSync(B,{},null);})()`);
    T('a page that breaks ends held for you, with the error',R3.end==='HOLD_YOU'&&/boom/.test(R3.why),R3.why);}
  /* ── 2 · the Oct 17 empty card, replayed: the Book re-reads NHL before freezing ── */
  {const w=boot({'d4.voices':V0(),'d4.todaycard':TC0()});await wait(1500);
    stubBg(w,{nhl:[nhlPick('DAL@CHI','away',-150),nhlPick('CAR@WPG','away',-140)]});
    const V=w.eval('deskVitals()');T('the immune system sees NHL missing from the card',V.missing.includes('nhl')&&!V.frozen,JSON.stringify({missing:V.missing,by:V.by.nhl}));
    await w.eval(`deskFreezeAll('master evaluation · CFB')`);await wait(400);
    const st=w.eval(`(()=>{const L=get(BOOK_KEY,[]).filter(x=>x.book==='freeze');const S=best5State();return{fz:deskFrozen(),end:L[0]&&L[0].end,path:L[0]&&L[0].path.map(s=>s.p).join('>'),top:(S.top3||[]).map(x=>x.pick)}})()`);
    T('the freeze re-read NHL first, then froze',st.fz&&/rereadMissing/.test(st.path)&&st.end==='POST',JSON.stringify(st));
    T('…so the Best 3 carries the NHL pick that was missing (not an empty card)',st.top.includes('DAL ML'),JSON.stringify(st.top));
    const J=w.eval(`journalAll().map(x=>x.sig+':'+(x.fixed||''))`);T('the journal logged it, and what fixed it',J.some(x=>/^sport-missing:re-read/.test(x)),J.join(', '));
    w.eval(`REC_VIEW='book';renderRecordsHub()`);const h=w.document.getElementById('recordsHub').innerHTML;
    T('Records → 📖 The Book shows today\'s story, every page, and the journal',/Today's story/.test(h)&&/0 dead ends/.test(h)&&/The journal/.test(h)&&/re-read/.test(h));}
  /* ── 3 · a re-read that keeps failing: held, retrying — then posts by itself at the deadline ── */
  {const w=boot({'d4.voices':V0(),'d4.todaycard':TC0()});await wait(1500);
    stubBg(w,{},['nhl']);
    const r=await w.eval(`deskFreezeAll('master evaluation · CFB')`);
    const st=w.eval(`(()=>{const H=bookHold();return{fz:deskFrozen(),held:!!H,end:H&&H.end,ert:evalRanToday(),locked:!!best5State().locked}})()`);
    T('still missing after 3 tries, games hours away → held, retrying by itself (not frozen)',!st.fz&&st.held&&st.end==='HOLD_RETRY',JSON.stringify(st));
    T('…and while held nothing behaves as frozen (Best 3 not locked, eval not counted)',st.ert===false&&st.locked===false,JSON.stringify(st));
    w.eval(`set(EVAL_LOCK_KEY,{date:today(),by:{ncaaf:Date.now()}})`);T('…even after a sport\'s own evaluation ran',w.eval('evalRanToday()')===false);
    const again=await w.eval(`deskFreezeAll('the Book · retry')`);const L=w.eval(`get(BOOK_KEY,[]).length`);
    T('a retry right away doesn\'t loop the re-reads (3 per 10 minutes)',!w.eval('deskFrozen()')&&w.eval(`get(BOOK_HOLD_KEY,{}).rr.length`)===3,'rr='+w.eval(`get(BOOK_HOLD_KEY,{}).rr.length`)+' stories='+L);
    w.__NOW=Date.parse(CFB_ST)-30*60e3;await w.eval(`deskFreezeAll('the Book · retry')`);await wait(400);
    const st2=w.eval(`(()=>{const F=get(FREEZE_KEY,null);return{fz:deskFrozen(),book:F&&F.book,held:!!bookHold(),tg:subTelegramText(subCard()).join('\\n')}})()`);
    T('30 minutes before the first game it goes out anyway — the card always goes out before the games',st2.fz&&st2.book&&BOOK_POSTED(st2.book.end)&&!st2.held,JSON.stringify(st2.book));
    T('…and the VIP card says out loud that NHL is missing from the Best 3 (honestly: its legs may still ride a ticket)',/NHL isn.t in today.s Best 3 — its board didn.t make the card in time/.test(st2.tg),st2.tg.slice(0,300));}
  /* ── 4 · broken inputs (the Sim on the over in every CFB total): held for you, then only CFB TOTALS held back ── */
  {const V=V0();for(let i=0;i<14;i++)V.push(c('Sim','ncaaf','A'+i+'@B'+i,'total','over',-110,i?0.6:0.75));V.push(c('Judge','ncaaf','X1@Y1','ml','home',-150,0.75));
    const TC=TC0();TC.by.nhl={ts:T0-60e3,picks:[nhlPick('DAL@CHI','away',-150)]};
    TC.by.ncaaf.picks.push({sp:'ncaaf',game:'A0@B0',m:'total',sd:'over',pick:'Over 6',line:6,price:-110,start:CFB_ST,color:' strong'},{sp:'ncaaf',game:'X1@Y1',m:'ml',sd:'home',pick:'Y1 ML',price:-150,start:CFB_ST,color:' strong'});
    const w=boot({'d4.voices':V,'d4.todaycard':TC});await wait(1500);stubBg(w);
    const vt=w.eval('deskVitals()');T('the immune system flags one-sided CFB totals as a hard failure, scoped to totals',vt.critical.some(x=>x.sig==='one-sided-totals'&&x.hard&&x.sp==='ncaaf'&&x.market==='total'),JSON.stringify(vt.critical));
    await w.eval(`deskFreezeAll('master evaluation · CFB')`);
    const st=w.eval(`(()=>{const H=bookHold();return{fz:deskFrozen(),end:H&&H.end,why:H&&H.why}})()`);
    T('still broken after the re-reads with time left → held for you, with the exact symptom',!st.fz&&st.end==='HOLD_YOU'&&/over in 14 of 14/.test(st.why),JSON.stringify(st));
    w.eval(`REC_VIEW='book';renderRecordsHub()`);T('…and the hold shows its buttons: Post without it, Freeze anyway',/Post without it/.test(w.document.getElementById('recordsHub').innerHTML)&&/Freeze anyway/.test(w.document.getElementById('recordsHub').innerHTML));
    w.__NOW=T0+35*60e3;await w.eval(`deskFreezeAll('the Book · retry')`);await wait(400);
    const st2=w.eval(`(()=>{const S=best5State();const V=get(VOICES_KEY,[]);const one=g=>V.find(x=>x.game===g);return{fz:deskFrozen(),qt:bookIsQuarantined('ncaaf',today(),'total'),qml:bookIsQuarantined('ncaaf',today(),'ml'),top:(S.top3||[]).map(x=>x.sp+':'+x.pick),
      offTot:isOfficial(one('A0@B0')),offMl:isOfficial(one('X1@Y1')),offNhl:isOfficial(one('DAL@CHI')),gaps:(get(FREEZE_KEY,{}).book||{}).gaps}})()`);
    T('held 30 minutes → only CFB totals are held back, and the rest of the card posts',st2.fz&&st2.qt&&!st2.qml&&st2.top.includes('nhl:DAL ML')&&st2.top.includes('ncaaf:Y1 ML')&&!st2.top.some(x=>/Over/.test(x)),JSON.stringify(st2));
    T('…a held-back total isn\'t official (graded quietly); CFB moneylines and NHL still are',st2.offTot===false&&st2.offMl===true&&st2.offNhl===true,JSON.stringify(st2));
    T('…and the card says so out loud',(st2.gaps||[]).some(g=>/CFB totals held back/.test(g)),JSON.stringify(st2.gaps));}
  {const V=V0();for(let i=0;i<14;i++)V.push(c('Sim','ncaaf','A'+i+'@B'+i,'total','over',-110,0.6));const TC=TC0();TC.by.nhl={ts:T0-60e3,picks:[nhlPick('DAL@CHI','away',-150)]};
    const w=boot({'d4.voices':V,'d4.todaycard':TC});await wait(1500);stubBg(w);await w.eval(`deskFreezeAll('master evaluation · CFB')`);
    await w.eval(`deskFreezeAll('you · post without the broken part',{qnow:true})`);await wait(300);
    T('"Post without it" posts right away, the broken part held back',w.eval('deskFrozen()')&&w.eval(`bookIsQuarantined('ncaaf',today(),'total')`));}
  /* ── 5 · a frozen day is never touched ── */
  {const w=boot({'d4.voices':V0(),'d4.todaycard':TC0(),'d4.freeze':{d:D,ts:T0-60e3,why:'master evaluation'}});await wait(1500);stubBg(w);
    const before=w.eval(`JSON.stringify([get(TC_KEY,{}),get(BEST5_KEY,{}),get(BOOK_KEY,[]),get(JOURNAL_KEY,[])])`);
    await w.eval(`deskFreezeAll('master evaluation · CFB')`);const after=w.eval(`JSON.stringify([get(TC_KEY,{}),get(BEST5_KEY,{}),get(BOOK_KEY,[]),get(JOURNAL_KEY,[])])`);
    T('a frozen day: the Book does nothing at all — card, Best 3, story, journal identical',before===after);}
  /* ── 6 · if the Book itself fails, the old freeze runs exactly as before ── */
  {const w=boot({'d4.voices':V0(),'d4.todaycard':TC0()});await wait(1500);stubBg(w);
    w.eval(`BOOKS.freeze.pages.frozen.ask=function(){throw new Error('simulated')}`);await w.eval(`deskFreezeAll('master evaluation · CFB')`);
    T('the Book failing fails open: the day still freezes, and the failure is in the journal',w.eval('deskFrozen()')&&w.eval(`journalAll().some(x=>x.sig==='book-crash')`));}
  /* ── 7 · nothing publishes before the freeze ── */
  {const w=boot({'d4.voices':V0(),'d4.todaycard':TC0()});await wait(1500);stubBg(w);
    const r=await w.eval(`deskPublishAll('auto')`);T('publishing an unfrozen day does nothing (the publish book stops it)',/isn't frozen/.test(r.msg),r.msg);}
  /* ── 8 · "Freeze anyway" is your call, on the record ── */
  {const w=boot({'d4.voices':V0(),'d4.todaycard':TC0()});await wait(1500);stubBg(w,{},['nhl']);
    await w.eval(`deskFreezeAll('you · freeze anyway',{override:true})`);
    T('Freeze anyway freezes immediately and records that you did',w.eval('deskFrozen()')&&w.eval(`journalAll().some(x=>x.sig==='you-override')`));}
  /* the background read, with a Today render firing while it loads (the 30-second timer on a real phone) */
  const stubBgRender=(w,picks,fail)=>w.eval(`bookBgEval=async function(sp){try{renderToday(true);}catch(e){}if(${JSON.stringify(fail||[])}.includes(sp))return null;const P=${JSON.stringify(picks||{})};const T=get(TC_KEY,{});T.d=today();T.by=T.by||{};
    T.by[sp]={ts:Date.now(),picks:P[sp]||((T.by[sp]||{}).picks)||[]};set(TC_KEY,T);set('d4.bgeval.'+sp,{ts:Date.now(),ok:true,d:today()});return{ok:true};}`);
  const hide=w=>{Object.defineProperty(w.document,'visibilityState',{configurable:true,get:()=>'hidden'});w.document.dispatchEvent(new w.Event('visibilitychange'));};
  /* ── 9 · (review probe A) an evaluation already ran and a render fires mid-walk: nothing locks before the Book decides ── */
  {const V=V0();for(let i=0;i<14;i++)V.push(c('Sim','ncaaf','A'+i+'@B'+i,'total','over',-110,i?0.6:0.75));V.push(c('Judge','ncaaf','X1@Y1','ml','home',-150,0.75));
    const TC=TC0();TC.by.nhl={ts:T0-60e3,picks:[nhlPick('DAL@CHI','away',-150)]};
    TC.by.ncaaf.picks.push({sp:'ncaaf',game:'A0@B0',m:'total',sd:'over',pick:'Over 6',line:6,price:-110,start:CFB_ST,color:' strong'},{sp:'ncaaf',game:'X1@Y1',m:'ml',sd:'home',pick:'Y1 ML',price:-150,start:CFB_ST,color:' strong'});
    const w=boot({'d4.voices':V,'d4.todaycard':TC,'d4.evallock':{date:D,by:{ncaaf:T0-5000}}});await wait(1500);stubBgRender(w);
    w.eval(`try{const v=document.getElementById('v-today');if(v)v.classList.add('on');}catch(e){}`);
    await w.eval(`deskFreezeAll('master evaluation · CFB')`);
    const st=w.eval(`(()=>{const H=bookHold();const S=best5State();const P=get('d4.deskplan',{});const B=get(BKDAY_KEY,{});return{fz:deskFrozen(),hold:H&&H.end,b3:!!S.locked,plan:!!(P&&P.locked),bk:!!(B&&B.locked)}})()`);
    T('while the Book holds broken CFB totals, nothing has locked — not the Best 3, the plan, or the Banker',st.hold==='HOLD_YOU'&&!st.b3&&!st.plan&&!st.bk,JSON.stringify(st));
    w.__NOW=T0+35*60e3;await w.eval(`deskFreezeAll('the Book · retry')`);await wait(400);
    const st2=w.eval(`(()=>{const S=best5State();const F=get(FREEZE_KEY,{});return{fz:deskFrozen(),qt:bookIsQuarantined('ncaaf',today(),'total'),top:(S.top3||[]).map(x=>x.sp+':'+x.pick),tg:subTelegramText(subCard()).join('\\n')}})()`);
    T('…after the cap the held-back CFB total is NOT in the posted Best 3',st2.fz&&st2.qt&&!st2.top.some(x=>/Over/.test(x))&&st2.top.length>0,JSON.stringify(st2.top));
    T('…and the VIP text never lists a pick it says is held back',!(/Over 6/.test(st2.tg.split('THE REST')[0])&&/held back/.test(st2.tg)),st2.tg.slice(0,400).replace(/\n/g,' ⏎ '));}
  /* ── 10 · (review probe B) a Best 3 that locked early, before NHL was re-read, is rebuilt at the freeze ── */
  {const V=V0();V.push(c('Judge','ncaaf','X1@Y1','ml','home',-150,0.71));const TC=TC0();TC.by.ncaaf.picks.push({sp:'ncaaf',game:'X1@Y1',m:'ml',sd:'home',pick:'Y1 ML',price:-150,start:CFB_ST,color:' strong'});
    const w=boot({'d4.voices':V,'d4.todaycard':TC,'d4.evallock':{date:D,by:{ncaaf:T0-5000}}});await wait(1500);
    w.eval(`best5State()`);const early=w.eval(`(()=>{const S=get(BEST5_KEY,{});return{locked:!!S.locked,top:(S.top3||[]).map(x=>x.pick)}})()`);
    stubBgRender(w,{nhl:[nhlPick('DAL@CHI','away',-150),nhlPick('CAR@WPG','away',-140)]});w.eval(`try{const v=document.getElementById('v-today');if(v)v.classList.add('on');}catch(e){}`);
    await w.eval(`deskFreezeAll('master evaluation · CFB')`);await wait(400);
    const st=w.eval(`(()=>{const S=best5State();const J=journalAll().map(x=>x.sig);const L=get('d4.best5log',{})[today()];return{fz:deskFrozen(),top:(S.top3||[]).map(x=>x.pick),j:J,log:L&&(L.picks||[]).map(x=>x.pick)}})()`);
    T('(the old build had already locked a Best 3 without NHL)',early.locked&&!early.top.includes('DAL ML'),JSON.stringify(early));
    T('…the freeze rebuilds it from the final state: the re-read NHL pick is in, and the rebuild is in the journal',st.fz&&st.top.includes('DAL ML')&&st.j.includes('early-lock'),JSON.stringify(st));}
  /* ── 11 · leaving the app while held: the Book stops waiting and posts what's solid ── */
  {const w=boot({'d4.voices':V0(),'d4.todaycard':TC0()});await wait(1500);stubBg(w,{},['nhl']);
    await w.eval(`deskFreezeAll('master evaluation · CFB')`);const held=w.eval(`(()=>{const H=bookHold();return H&&H.end})()`);
    hide(w);await wait(600);
    const st=w.eval(`(()=>{const F=get(FREEZE_KEY,{});return{fz:deskFrozen(),end:(F.book||{}).end,gaps:(F.book||{}).gaps,held:!!bookHold()}})()`);
    T('held, and you lock the phone → it posts right away instead of sleeping through the games',held==='HOLD_RETRY'&&st.fz&&!st.held&&BOOK_POSTED(st.end),JSON.stringify({held,...st}));
    T('…with the gap stated',(st.gaps||[]).some(g=>/NHL isn't in today's Best 3/.test(g)),JSON.stringify(st.gaps));}
  {const V=V0();for(let i=0;i<14;i++)V.push(c('Sim','ncaaf','A'+i+'@B'+i,'total','over',-110,0.6));const TC=TC0();TC.by.nhl={ts:T0-60e3,picks:[nhlPick('DAL@CHI','away',-150)]};
    const store={'d4.voices':V,'d4.todaycard':TC};const w=boot(store);await wait(1500);stubBg(w);await w.eval(`deskFreezeAll('master evaluation · CFB')`);
    /* moving to another sport page: pagehide, then the page hides as it unloads (its timers never run) */
    w.dispatchEvent(new w.Event('pagehide'));hide(w);await wait(600);
    T('moving to another sport page while held is NOT leaving the app: still held, nothing frozen',!w.eval('deskFrozen()')&&w.eval('!!bookHold()'));
    const kept={};for(let i=0;i<w.localStorage.length;i++){const k=w.localStorage.key(i);kept[k]=w.localStorage.getItem(k);}
    const w2=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/cfb.html',pretendToBeVisual:true,beforeParse(x){x.__NOW=T0+60e3;const RD=x.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[x.__NOW]))}static now(){return x.__NOW}}x.Date=FD;x.__NO_GRADELOOP__=true;x.__NO_REOPEN__=true;
      x.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});x.scrollTo=()=>{};x.alert=()=>{};x.confirm=()=>true;Object.entries(kept).forEach(([k,v])=>x.localStorage.setItem(k,v));}}).window;await wait(1500);
    T('…the next page picks the hold right up (same symptom, same buttons)',w2.eval(`(()=>{const H=bookHold();return!!H&&H.end==='HOLD_YOU'&&!deskFrozen();})()`));}
  /* ── 11b · frozen while the app was in the background (a phone): the VIP card goes out when it's open again ── */
  {const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/cfb.html',pretendToBeVisual:true,beforeParse(x){x.__NOW=T0;const RD=x.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[x.__NOW]))}static now(){return x.__NOW}}x.Date=FD;x.__NO_GRADELOOP__=true;x.__NO_REOPEN__=true;
      Object.defineProperty(x.navigator,'userAgent',{configurable:true,get:()=>'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)'});
      x.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});x.scrollTo=()=>{};x.alert=()=>{};x.confirm=()=>true;x.localStorage.setItem('d4.setupDone','1');
      Object.entries({'d4.voices':V0(),'d4.todaycard':TC0(),'d4.tgbot':'x','d4.tgchat':'-100'}).forEach(([k,v])=>x.localStorage.setItem(k,JSON.stringify(v)));}}).window;await wait(1500);
    stubBg(w,{},['nhl']);w.eval(`PUBLISHED=[];const PA0=deskPublishAll;deskTgPostCard=async function(){PUBLISHED.push(Date.now());set('d4.tgposted',{d:today(),ts:Date.now(),n:1});return{ok:true,n:1,card:subCard()};};`);
    await w.eval(`deskFreezeAll('master evaluation · CFB')`);hide(w);await wait(1200);
    const a=w.eval(`(()=>({fz:deskFrozen(),posted:PUBLISHED.length,def:journalAll().some(x=>x.sig==='publish-deferred')}))()`);
    T('on a phone, leaving freezes the day but never posts from the hidden page (the post could be lost)',a.fz&&a.posted===0&&a.def,JSON.stringify(a));
    Object.defineProperty(w.document,'visibilityState',{configurable:true,get:()=>'visible'});w.document.dispatchEvent(new w.Event('visibilitychange'));await wait(2500);
    const b=w.eval(`(()=>({posted:PUBLISHED.length,cu:journalAll().some(x=>x.sig==='publish-catch-up'),again:bookCatchUp()}))()`);
    T('…open the app again and the VIP card goes out — once',b.posted===1&&b.cu&&b.again===false,JSON.stringify(b));}
  /* ── 11c · a walk still in flight when the day froze (you left meanwhile) changes nothing after the fact ── */
  {const w=boot({'d4.voices':V0(),'d4.todaycard':TC0(),'d4.freeze':{d:D,ts:T0,why:'master evaluation'}});await wait(1200);
    const r=await w.eval(`(async()=>{const ctx={d:today(),critical:[{sp:'ncaaf',market:'total',sig:'one-sided-totals',hard:true,what:'x'}],gaps:[],retries:0};const q=bookQuarantineAct(ctx);
      const R=await bookWalk(BOOKS.freeze,{...deskVitals(today()),frozen:false},{reread:async(c)=>({ctx:c,why:'x'}),quarantine:async(c)=>({ctx:c,why:'q'})});
      return{qWhy:q.why,qd:bookIsQuarantined('ncaaf',today(),'total'),end:R.end};})()`);
    T('after the day froze, a late "hold back" writes nothing (its records never change)',/already frozen/.test(r.qWhy)&&!r.qd,JSON.stringify(r));
    T('…and a story still being read ends the moment it sees the day frozen',r.end==='ALREADY',JSON.stringify(r));}
  /* ── 12 · a hold is this phone's own: it never syncs to another device ── */
  {const w=boot({});await wait(1200);T('the hold never syncs (another phone never starts retrying because this one waits)',w.eval(`syncSkip(BOOK_HOLD_KEY)===true&&syncSkip(JOURNAL_KEY)===false`));}
  /* ── 13 · the gaps ride on the posted card, so later edits of the post replay them exactly ── */
  {const w=boot({'d4.voices':V0(),'d4.todaycard':TC0()});await wait(1500);stubBg(w,{},['nhl']);
    w.__NOW=Date.parse(CFB_ST)-30*60e3;await w.eval(`deskFreezeAll('master evaluation · CFB')`);await wait(300);
    const r=w.eval(`(()=>{const C=JSON.parse(JSON.stringify(subCard()));const a=subTelegramText(C).join('\\n');set(FREEZE_KEY,{d:'2026-10-19',ts:Date.now(),why:'next day'});const b=subTelegramText(C).join('\\n');return{a,b,g:C.bookGaps};})()`);
    T('the next day\'s freeze doesn\'t erase yesterday\'s gap line from its ✅/❌ edits',/isn't in today's Best 3/.test(r.a)&&r.a===r.b,JSON.stringify(r.g));}
  /* ── 14 · the added lines never push a VIP message past Telegram's 4,096 characters ── */
  {const w=boot({});await wait(1200);
    const r=w.eval(`(()=>{const long='Y'.repeat(1150);const best=[1,2,3].map(i=>({sp:'nhl',game:'A'+i+'@B'+i,pick:long+i,price:-150,p:0.75}));
      const C={d:'2026-10-18',best,top10:[],banker:null,chars:[],props:[],record:null,locked:true,
        bookGaps:['NHL is not in the Best 3 today because its board did not make the card in time','CFB totals held back today, the model looked broken there'],
        vxTakes:Object.fromEntries(best.map(x=>[x.pick,{take:'A take that is long enough to matter in the count of characters here.',name:'The Simulator'}]))};
      const P=subTelegramText(C);return{lens:P.map(p=>p.length),gap:/is not in the Best 3/.test(P[0])};})()`);
    T('a VIP message near the limit takes only the lines that fit — never past 4,096 (gap lines first)',r.lens.every(n=>n<=4000)&&r.gap,JSON.stringify(r));}
}catch(e){T('suite crashed',false,String(e&&e.stack||e).slice(0,400));}
  console.log(out.join('\n'));const f=out.filter(x=>x.startsWith('FAIL')).length;console.log(`${out.length-f} pass / ${f} fail`);process.exit(0);})();
