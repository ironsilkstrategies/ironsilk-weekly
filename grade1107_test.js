/* v2.87.7 · Nov 7, 4:33 PM: "Why are some games popping up without times or not getting graded … isn't there another source other
   than just ESPN to double check scores … seems to be it's always later games." Three causes, all fixed:
   1. The live score feed asked ESPN's college-football board for 900 games a day; ESPN ignores a page size over its cap and hands
      back its default 25 (probed live: 25 of 47 FBS games on Oct 31; default/100/300 all return 47). The later games simply weren't
      in the feed — no time, no live score, no grade off it. Every CFB ask is 300 now, plus the whole week from the CFB board's week.
   2. A leg only knew its time from that feed. Now: feed → the time printed on the ticket → any sport's stored board, any page.
   3. Late games: a 12:30 AM Eastern tip carries the next day's date on the ticket but the night before on the board; a phone put to
      sleep mid-request held the refresh "busy" forever. Same game either side of midnight by start time; every request times out.
   And a second source: the feeds robot (hourly) carries every final, checked against NHL.com / NBA.com / NCAA.com — a fallback for a
   game the phone never saw finish, and a hold on a grade the two sources disagree about. */
const fs=require('fs');const path=require('path');const W='/home/claude/work';const {JSDOM,VirtualConsole}=require('jsdom');
let pass=0,fail=0;const T=(n,c,x)=>{c?pass++:fail++;console.log((c?'PASS ':'FAIL ')+n+(c?'':'  — '+(x||'')));};
let html=fs.readFileSync(path.join(W,'nba.html'),'utf8');html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const errs=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errs.push(String(e&&e.message||e)));
const URLS=[];let FEED={cfb:{events:[]},nba:{events:[]},nhl:{events:[]}};
const ev=(id,a,h,iso,state,sa,sh,det)=>({id,date:iso,status:{type:{state,shortDetail:det||''}},competitions:[{competitors:[{homeAway:'away',team:{abbreviation:a,displayName:a},score:sa},{homeAway:'home',team:{abbreviation:h,displayName:h},score:sh}]}]});
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nba.html',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){w.__NO_GRADELOOP__=true;w.__NO_BACKFILL__=true;w.__NO_SYNC_LOOP__=true;
  const RD=w.Date;const OFF=RD.parse('2026-11-07T16:34:00-06:00')-RD.now();class FD extends RD{constructor(...a){if(a.length)super(...a);else super(RD.now()+OFF);}static now(){return RD.now()+OFF;}}FD.parse=RD.parse;FD.UTC=RD.UTC;w.Date=FD;
  w.fetch=(u)=>{u=String(u);URLS.push(u);const j=/college-football/.test(u)?FEED.cfb:/basketball\/nba/.test(u)?FEED.nba:/hockey\/nhl/.test(u)?FEED.nhl:{events:[]};
    return Promise.resolve({ok:true,status:200,json:()=>Promise.resolve(j),text:()=>Promise.resolve(JSON.stringify(j))});};
  w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.prompt=()=>null;w.localStorage.setItem('d4.setupDone','1');}}).window;
setTimeout(async()=>{try{const E=s=>w.eval(s);const e0=errs.length;const J=JSON.stringify;const D='2026-11-07';const SRC=fs.readFileSync(path.join(W,'shared.js'),'utf8');
  const leg=(id,o)=>({id,p:0.5,price:-110,book:'external',gameDate:D,...o});
  const lock=T0=>E(`set(LS.locked,${J(T0)});LRS_MEMO.clear();BSTART_C=null;MG_LIVE={};MG_TS=0;MG_BUSY=false;`);

  /* 1 · the CFB page size */
  T('every college-football ask is 300 games, never the 900 ESPN quietly cuts to 25',E(`espnQ('ncaaf')`)==='&groups=80&limit=300'&&E(`espnQ('ncaaf',900)`)==='&groups=80&limit=300'&&!/groups=80&limit=900/.test(SRC));
  E(`set('d4.ncaafgames',{'2026w10':{ts:Date.now(),week:10,season:2026,v:[{id:'401856741',away:{abbr:'UGA'},home:{abbr:'MISS'},date:'2026-11-08T00:30Z'},{id:'401856745',away:{abbr:'UK'},home:{abbr:'TENN'},date:'2026-11-07T23:15Z'},{id:'401856740',away:{abbr:'ALA'},home:{abbr:'LSU'},date:'2026-11-07T20:30Z'}]}})`);
  lock([{id:'extT1',date:D,name:'Ticket #T1',source:'mine',imported:true,legs:[leg('a',{sport:'ncaaf',game:'UGA@MISS',pick:'UGA +4.5'}),leg('b',{sport:'ncaaf',game:'UK@TENN',pick:'TENN +2.5'}),leg('c',{sport:'ncaaf',game:'ALA@LSU',pick:'LSU +2.5'})]}]);
  /* the feed hands back only the first game — what the capped board looked like on the phone */
  FEED.cfb={events:[ev('401856740','ALA','LSU','2026-11-07T20:30Z','in','10','3','Halftime')]};
  URLS.length=0;await E('mgRefresh(true)');
  const cfbU=URLS.filter(u=>/college-football/.test(u));
  T('…and the live feed also asks for the whole week (from the CFB board\'s stored week, on any page)',cfbU.some(u=>/dates=20261107&groups=80&limit=300/.test(u))&&cfbU.some(u=>/dates=2026&seasontype=2&week=10&groups=80&limit=100/.test(u))&&!cfbU.some(u=>/limit=900/.test(u)),J(cfbU));

  /* 2 · times on every leg, even games the live feed doesn't have */
  E(`TICKETTAB='mine';renderTickets()`);await new Promise(r=>setTimeout(r,300));
  const rows=[...w.document.querySelectorAll('#tickets li')].map(li=>li.textContent.replace(/\s+/g,' '));
  T('a leg the live feed doesn\'t carry still shows its start (from the CFB board) with a countdown',/UGA@MISS ⏰ 6:30 PM · in 1h 56m/.test(rows[0]||'')&&/UK@TENN ⏰ 5:15 PM · in 41m/.test(rows[1]||''),J(rows.slice(0,2)));
  T('…the live leg shows the score and clock once (it said it twice)',/🕐 ALA 10–3 LSU · Halftime/.test(rows[2]||'')&&!/⏱/.test(rows[2]||''),rows[2]);
  const head=(w.document.querySelector('#tickets .tkt .sub')||{}).textContent||'';
  T('the ticket says what it\'s doing: 1 live · 2 to go · next kickoff (was "3 live")',/● 1 live · 2 to go · next 5:15 PM/.test(head),head);
  /* the start, written onto the leg once it's known, so every page has it */
  T('…and the start is written onto the open legs once known',E(`get(LS.locked,[])[0].legs.map(l=>l.start).join(',')`)==='2026-11-08T00:30Z,2026-11-07T23:15Z,2026-11-07T20:30Z');

  /* 3 · the time printed on the ticket */
  const TK=n=>`Ticket Number:\n${n}\nAccepted Date:\n11/7/26\nAmount:\n$1.00\nStatus:\nPending\nTo win:\n$5.00\nType:\nParlay\nDescription:\n`+
    `Basketball - NBA - Brooklyn Nets vs Atlanta Hawks - Parlay | 554 Atlanta Hawks -4½ -169 for GAME | 11/07/2026 07:40:00 PM (EST) | Pending\n`+
    `Basketball - NBA - Miami Heat vs Golden State Warriors - Parlay | 560 Golden State Warriors -3 -110 for GAME | 11/08/2026 12:30:00 AM (EST) | Pending\n`;
  lock([]);E(`parseMyTicketText(${J(TK('900111'))})`);
  const pl=E(`get(LS.locked,[]).find(t=>t.id==='ext900111').legs.map(l=>({g:l.game,s:l.start,d:l.gameDate}))`);
  T('the start printed on the ticket is kept (7:40 PM Eastern → 6:40 PM here)',pl[0]&&pl[0].s==='2026-11-08T00:40:00Z'&&pl[0].d===D,J(pl[0]));
  T('…and a 12:30 AM Eastern tip is dated the night before (11:30 PM Central) — the day the scoreboard files it under',pl[1]&&pl[1].s==='2026-11-08T05:30:00Z'&&pl[1].d===D,J(pl[1]));
  T('…the ticket\'s zone label is read as that city\'s clock (CST, PST)',E(`bolWhen('11/07/2026 07:30:00 PM (CST)').start`)==='2026-11-08T01:30:00Z'&&E(`bolWhen('11/07/2026 07:30:00 PM (PST)').start`)==='2026-11-08T03:30:00Z'&&E(`bolWhen('07/04/2026 07:05:00 PM (EST)').start`)==='2026-07-04T23:05:00Z');

  /* 4 · late games, either side of midnight */
  FEED.nba={events:[ev('9001','MIA','GS','2026-11-08T05:30Z','post','101','112','Final')]};
  lock([{id:'extL1',date:'2026-11-08',legs:[leg('l1',{sport:'nba',game:'MIA@GS',pick:'GS -3',gameDate:'2026-11-08'})]}]);await E('mgRefresh(true)');
  T('an old ticket that dated a late game by its Eastern day still grades off the board\'s Central day',E(`gradeLeg(get(LS.locked,[])[0].legs[0],'2026-11-08').hit`)===true,J(E(`gradeLeg(get(LS.locked,[])[0].legs[0],'2026-11-08')`)));
  E(`MG_LIVE={};set(LS.allfinals,{'nba:MIA@GS':{sport:'nba',d:'2026-11-07',a:101,h:112,ts:Date.now(),src:'espn',st:'2026-11-08T05:30Z'}});`);
  T('…from the stored final too (finals keep their start time now)',E(`gradeLeg({id:'z',sport:'nba',game:'MIA@GS',pick:'GS -3',gameDate:'2026-11-08'},'2026-11-08').hit`)===true);
  E(`set(LS.allfinals,{'nhl:TOR@MTL':{sport:'nhl',d:'2026-11-07',a:2,h:3,ts:Date.now(),src:'espn',st:'2026-11-08T00:00Z'}});MG_LIVE={};`);
  T('…but a 7 PM game the night before is never the same game as one the next night (back-to-back sets)',E(`gradeLeg({id:'y',sport:'nhl',game:'TOR@MTL',pick:'MTL ML',gameDate:'2026-11-08',start:'2026-11-09T00:00Z'},'2026-11-08').hit`)==null);
  /* a refresh stuck "busy" by a request that never came back */
  E(`MG_BUSY=true;MG_BUSY_AT=Date.now()-60e3;MG_TS=0;`);URLS.length=0;lock([{id:'extB',date:D,legs:[leg('b1',{sport:'nba',game:'DEN@IND',pick:'IND ML'})]}]);E(`MG_BUSY=true;MG_BUSY_AT=Date.now()-60e3;`);
  await E('mgRefresh(true)');
  T('a refresh stuck busy past 45 seconds is let go (a sleeping phone used to stop all grading until a reload)',URLS.some(u=>/basketball\/nba/.test(u))&&E('MG_BUSY')===false);
  T('…and every live-feed request gives up at 15 seconds',/function mgFetchJSON[^\n]+15000/.test(SRC));

  /* 5 · the second source */
  E(`set(LS.allfinals,{});MG_LIVE={};`);
  E(`set(FEED_FIN_K,{ts:'x',L:[{k:'nhl|NJ@TB',st:'2026-11-07T00:00Z',as:2,hs:4,x:{s:'nhl',as:2,hs:4,ok:true}},{k:'nba|GS@NY',st:'2026-11-07T18:00Z',as:110,hs:104,x:{s:'nba',as:110,hs:106,ok:false}}]});FEED_FIN=null;`);
  const fb=E(`gradeLeg({id:'f',sport:'nhl',game:'NJ@TB',pick:'TB ML',gameDate:'2026-11-06'},'2026-11-06')`);
  T('a game the phone never saw finish grades off the feeds robot\'s final',fb.hit===true&&fb.verified==='nhl',J(fb));
  const cf=E(`gradeLeg({id:'g',sport:'nba',game:'GS@NY',pick:'NY +5',gameDate:'2026-11-07'},'2026-11-07')`);
  T('ESPN says NY lost by 6, NBA.com says by 4 — on NY +5 that flips the leg, so the grade waits and says why',cf.hit==null&&/⚠ ESPN 110–104 vs NBA\.com 110–106 — holding/.test(cf.detail||''),J(cf));
  const ok2=E(`gradeLeg({id:'h',sport:'nba',game:'GS@NY',pick:'GS ML',gameDate:'2026-11-07'},'2026-11-07')`);
  T('…a disagreement that doesn\'t change the leg grades normally, noted',ok2.hit===true&&ok2.conflict&&ok2.conflict.a===110,J(ok2));
  T('…and after 18 hours with no fix, ESPN\'s score stands (a leg never waits forever)',E(`(()=>{const c=get(FEED_FIN_K);c.L[1].st='2026-11-06T18:00Z';set(FEED_FIN_K,c);FEED_FIN=null;return gradeLeg({id:'g2',sport:'nba',game:'GS@NY',pick:'NY +5',gameDate:'2026-11-06'},'2026-11-06').hit;})()`)===false);
  const card=E(`legLiveCard({id:'t',date:'2026-11-06'},{id:'f',sport:'nhl',game:'NJ@TB',pick:'TB ML',gameDate:'2026-11-06'},{})`).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
  T('…and the leg card says when the score was double-checked',/✓✓ Score checked — ESPN and NHL\.com agree/.test(card),card.slice(0,200));
  T('the feeds robot checks every final against the leagues\' own feeds, hourly',/api-web\.nhle\.com/.test(fs.readFileSync(path.join(W,'feeds/build.mjs'),'utf8'))&&/cdn\.nba\.com/.test(fs.readFileSync(path.join(W,'feeds/build.mjs'),'utf8'))&&/ncaa-api\.henrygd\.me/.test(fs.readFileSync(path.join(W,'feeds/build.mjs'),'utf8'))&&/cron: '17 \* \* \* \*'/.test(fs.readFileSync(path.join(W,'.github/workflows/feeds.yml'),'utf8')));
  T('no errors along the way',errs.length===e0,errs.slice(e0).join(' | '));
}catch(e){T('crashed',false,e.stack);}console.log(pass+' pass / '+fail+' fail');process.exit(0);},2500);
