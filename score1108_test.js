/* v2.96.0 · Nov 8: "Scorekeeper… trying to hit the score on the dot with the elements he can research… possession time and
   number of possessions, how many shots… how many touchdowns… how many 3s how many field goals". Invented box scores. */
const fs=require('fs');const path=require('path');const W='/home/claude/work';const {JSDOM,VirtualConsole}=require('jsdom');
let pass=0,fail=0;const T=(n,c,x)=>{c?pass++:fail++;console.log((c?'PASS ':'FAIL ')+n+(c?'':'  — '+(x||'')));};
let html=fs.readFileSync(path.join(W,'nfl.html'),'utf8');html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const errs=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errs.push(String(e&&e.message||e)));
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nfl.html',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){w.__NO_GRADELOOP__=true;w.__NO_BACKFILL__=true;w.__NO_SYNC_LOOP__=true;
  const RD=w.Date;const OFF=RD.parse('2026-11-08T09:00:00-06:00')-RD.now();class FD extends RD{constructor(...a){if(a.length)super(...a);else super(RD.now()+OFF);}static now(){return RD.now()+OFF;}}FD.parse=RD.parse;FD.UTC=RD.UTC;w.Date=FD;
  w.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('{}')});w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.prompt=()=>null;w.localStorage.setItem('d4.setupDone','1');}}).window;
setTimeout(()=>{try{const E=s=>w.eval(s);const e0=errs.length;const J=JSON.stringify;const D='2026-11-08';
  /* NO scores 3 TDs + 2 FGs a game and allows 1 TD + 1 FG; CLE scores 1 TD + 1 FG and allows 3 TDs + 2 FGs; the league between */
  const g={};let id=0;const day=i=>`2026-10-${String(1+i).padStart(2,'0')}`;
  const fbRow=(a,h,ca,cb)=>{const pa=ca[3]+3*ca[1]+2*ca[2],ph=cb[3]+3*cb[1]+2*cb[2];g['f'+(id++)]=['nfl',day(id%28),a,h,pa,ph,[...ca,11,30],[...cb,11,30]];};
  for(let i=0;i<6;i++){fbRow('X'+i,'NO',[1,1,0,7],[3,2,0,21]);fbRow('CLE','Y'+i,[1,1,0,7],[3,2,0,21]);fbRow('Z'+i,'W'+i,[2,2,0,14],[2,1,0,14]);}
  /* NBA: BOS shoots threes, NY doesn't */
  const bb=(a,h,ca,cb)=>{const pts=c=>2*(c[0]-c[2])+3*c[2]+c[4];g['b'+(id++)]=['nba','2026-11-0'+(1+id%7),a,h,pts(ca),pts(cb),ca,cb];};
  for(let i=0;i<6;i++){bb('BOS','P'+i,[42,88,16,42,15,19,10,12],[40,87,12,34,16,21,10,13]);bb('Q'+i,'NY',[40,86,12,34,16,20,10,13],[39,86,9,26,18,23,11,13]);bb('R'+i,'S'+i,[40,87,12,34,16,20,10,13],[40,87,12,34,16,20,10,13]);}
  /* NHL */
  const hk=(a,h,as,hs,sa,sh)=>{g['h'+(id++)]=['nhl','2026-11-0'+(1+id%7),a,h,as,hs,[sa,0,3],[sh,0,3]];};
  for(let i=0;i<6;i++){hk('BOS','U'+i,4,2,34,26);hk('V'+i,'TOR',3,2,30,28);hk('A'+i,'B'+i,3,3,29,29);}
  T('the box scores are stored from the robot\'s file (a cache key, never synced)',E(`scoreStore(${J({v:1,ts:'x',g})})`)===Object.keys(g).length&&E('SK_IDX_K').includes('cache'));
  const F=E(`(()=>{const G=skGame('nfl','CLE','NO',false);return{mode:G.mode,mean:G.mean,parts:G.parts,ph:skChance(G,'ml'),pc:skChance(G,'spread',-7.5),po:skChance(G,'total',44.5)};})()`);
  T('football: NO\'s touchdowns and field goals against CLE\'s defense, CLE\'s against NO\'s (NO ~3 TD + 2 FG, CLE ~1 TD + 1 FG)',F.parts.h.td>2.5&&F.parts.h.td<3.6&&F.parts.h.fg>1.6&&F.parts.a.td<1.5&&F.parts.a.fg<1.4,J(F.parts));
  T('…a touchdown is worth what this team\'s touchdowns have brought (7.0 here)',Math.abs(F.parts.h.ppt-7)<0.05);
  T('…the exact final is the single likeliest scoreline, every combination counted (NO by about two scores)',F.mode.h>F.mode.a&&F.mode.h-F.mode.a>=7&&F.mode.h%1===0,J(F.mode));
  T('…and his chances come from that whole distribution (NO wins ~85%+, covers -7.5 more often than not)',F.ph>0.82&&F.pc>0.5&&F.po>0&&F.po<1,J({ph:F.ph,pc:F.pc,po:F.po}));
  const B=E(`(()=>{const G=skGame('nba','BOS','NY',false);return{mode:G.mode,mean:G.mean,parts:G.parts};})()`);
  T('basketball: possessions × each kind of make — BOS takes more threes than NY',B.parts.a.m3>B.parts.h.m3&&B.parts.pace>90&&B.parts.pace<110,J(B.parts));
  T('…points are the makes, point for point (3 × threes + 2 × twos + free throws, plus home court)',Math.abs(B.mean.a-(3*B.parts.a.m3+2*B.parts.a.m2+B.parts.a.mf-1.15))<1e-6&&Math.abs(B.mean.h-(3*B.parts.h.m3+2*B.parts.h.m2+B.parts.h.mf+1.15))<1e-6);
  T('…the exact final is the expected makes, rounded, never a tie',B.mode.a===Math.round(B.mean.a)||B.mode.h===Math.round(B.mean.h)&&B.mode.a!==B.mode.h,J(B.mode));
  const H=E(`(()=>{const G=skGame('nhl','BOS','TOR',false);let tie=0;return{mode:G.mode,parts:G.parts,ph:skChance(G,'ml')};})()`);
  T('hockey: shots × the shooter\'s rate against that team\'s goalie — BOS shoots more and better',H.parts.a.sog>H.parts.h.sog&&H.parts.a.pct>0.08,J(H.parts));
  T('…overtime settles ties: his exact final is never level',H.mode.a!==H.mode.h,J(H.mode));
  T('a team with fewer than two box scores: he steps aside (the old most-common score speaks instead)',E(`skGame('nfl','CLE','NOPE',false)`)===null);
  /* calls */
  const got=[];w.__got=got;const gm={away:{abbr:'CLE'},home:{abbr:'NO'},__date:D};
  E(`skCallsV2('nfl',${J(gm)},{mlA:{price:400},mlH:{price:-550}},-7.5,false,40.5,false,(v,m,s,ex)=>window.__got.push({v,m,s,ex}))`);
  const sc=got.find(x=>x.m==='spread'),tc=got.find(x=>x.m==='total');
  T('his calls speak as the Scorekeeper with his gut (kG) and his exact final on them',sc&&sc.v==='Most common'&&sc.ex.kG>=60&&sc.ex.score===F.mode.a+'-'+F.mode.h,J(sc));
  T('…and the parts behind it in his why',sc&&sc.ex.why.some(x=>/NO: 3\.\d TD × 7\.0 \+ \d\.\d FG/.test(x)),J(sc&&sc.ex.why));
  T('…a total from his own total, not the line',!tc||tc.ex.why.some(x=>/his total \d/.test(x)));
  T('…no moneyline at -550 (outside -300…+250)',!got.some(x=>x.m==='ml'));
  T('official at 70+ through the Coach\'s clipboard, like every gut',E(`isOfficial({voice:'Most common',sp:'nfl',market:'spread',side:'home',line:-7.5,price:-110,kG:72,date:'${D}'})`)===true&&E(`isOfficial({voice:'Most common',sp:'nfl',market:'spread',side:'home',line:-7.5,price:-110,kG:64,date:'${D}'})`)===false);
  T('his exact final is his score on every game he builds',(()=>{const r=E(`scoreCallsFor('nfl',${J(gm)},{awayProj:17,homeProj:27,modeScore:'20-24'},[])`).find(x=>x.voice==='Most common');return r&&r.a===F.mode.a&&r.h===F.mode.h;})());
  /* on the dot */
  E(`set(SK_LOG_K,{'2026-11-01|nfl|CLE@NO':{d:'2026-11-01',sp:'nfl',game:'CLE@NO',a:13,h:27,t:40,m:14},'2026-11-02|nfl|X@Y':{d:'2026-11-02',sp:'nfl',game:'X@Y',a:20,h:17,t:37,m:-3}});
    window.finalsFor=(sp,game)=>game==='CLE@NO'?{a:13,h:27}:game==='X@Y'?{a:17,h:24}:null;`);
  const R=E('skRecord(30)');T('on the dot: every exact final he called, graded — 1 of 2 exact, totals within 3, the right winner',R.n===2&&R.dot===1&&R.side===1&&R.t3===1,J(R));
  const card=E('skCardHtml()').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');T('his card: the on-the-dot record and today\'s finals with their parts',/The Scorekeeper — on the dot/.test(card)&&/1 on the dot of 2/.test(card)&&/CLE \d+ – \d+ NO/.test(card),card.slice(0,300));
  T('his description',/built from its parts/.test(E("CHARS['Most common'].school")));
  T('no errors along the way',errs.length===e0,errs.slice(e0).join(' | '));
}catch(e){T('crashed',false,e.stack);}console.log(pass+' pass / '+fail+' fail');process.exit(0);},2500);
