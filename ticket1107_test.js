/* v2.87.3 · Nov 7, 2:58 PM: BetOnline ticket #1013139688 (10 legs) came in with 8 — "2 lines skipped, team name not recognized".
   Both were the Denver vs Cal Riverside legs: the book writes the UC schools as "Cal Riverside", "Cal Irvine"… Every leg now reads,
   bought points included ("-4½ -169 buying -2½": the number shown is already the bought line). */
const fs=require('fs');const path=require('path');const W='/home/claude/work';const {JSDOM,VirtualConsole}=require('jsdom');
let pass=0,fail=0;const T=(n,c,x)=>{c?pass++:fail++;console.log((c?'PASS ':'FAIL ')+n+(c?'':'  — '+(x||'')));};
let html=fs.readFileSync(path.join(W,'ncaab.html'),'utf8');html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const errs=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errs.push(String(e&&e.message||e)));
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/ncaab.html',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){w.__NO_GRADELOOP__=true;w.__NO_BACKFILL__=true;w.__NO_SYNC_LOOP__=true;
  w.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('{}')});w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.prompt=()=>null;w.localStorage.setItem('d4.setupDone','1');}}).window;
const TICKET=`Ticket Number:
1013139688
Accepted Date:
11/7/26
Amount:
$1.00
Status:
Pending
To win:
$136.74
Type:
Parlay
Description:
Hockey - NHL - Utah Mammoth vs Ottawa Senators - Parlay | 8 Ottawa Senators +1½ -245 for GAME | 11/07/2026 07:07:00 PM (EST) | Pending
Basketball - NBA - Brooklyn Nets vs Atlanta Hawks - Parlay | 554 Atlanta Hawks -4½ -169 buying -2½ for GAME | 11/07/2026 07:40:00 PM (EST) | Pending
Basketball - NBA - Brooklyn Nets vs Atlanta Hawks - Parlay | 553 Brooklyn Nets/Atlanta Hawks over 224 -134 buying 2½ for GAME | 11/07/2026 07:40:00 PM (EST) | Pending
Basketball - NCAA - Denver vs Cal Riverside - Parlay | 646 Cal Riverside -140 for GAME | 11/07/2026 07:30:00 PM (EST) | Pending
Basketball - NCAA - Denver vs Cal Riverside - Parlay | 645 Denver/Cal Riverside over 154 -145 buying 2 for GAME | 11/07/2026 07:30:00 PM (EST) | Pending
Basketball - NCAA - Maryland vs Georgetown - Parlay | 648 Georgetown +5 -154 buying -2 for GAME | 11/07/2026 07:30:00 PM (EST) | Pending
Basketball - NCAA - Maryland vs Georgetown - Parlay | 648 Maryland/Georgetown under 148 -135 buying -2 for GAME | 11/07/2026 07:30:00 PM (EST) | Pending
Football - NCAA - Air Force vs Army - Parlay | 418 Army -180 for GAME | 11/07/2026 07:30:00 PM (EST) | Pending
Football - NCAA - Air Force vs Army - Parlay | 417 Air Force/Army over 41 -153 buying 2 for GAME | 11/07/2026 07:30:00 PM (EST) | Pending
Football - NCAA - Colorado vs Arizona State - Parlay | 366 Arizona State -155 for GAME | 11/07/2026 07:30:00 PM (EST) | Pending`;
setTimeout(()=>{try{const E=s=>w.eval(s);const e0=errs.length;const J=JSON.stringify;
  const ab=n=>E(`intakeAbbr('ncaab',${J(n)})`);
  T('BetOnline\'s UC names resolve: Cal Riverside, Cal Irvine, Cal Davis, Cal Santa Barbara, Cal San Diego',ab('Cal Riverside')==='UCR'&&ab('Cal Irvine')==='UCI'&&ab('Cal Davis')==='UCD'&&ab('Cal Santa Barbara')==='UCSB'&&ab('Cal San Diego')==='UCSD',J(['Cal Riverside','Cal Irvine','Cal Davis','Cal Santa Barbara','Cal San Diego'].map(ab)));
  T('…and the Cal schools that aren\'t UC keep theirs (Cal Poly, Cal Baptist, California, CS Fullerton, Long Beach)',ab('Cal Poly')==='CP'&&ab('Cal Baptist')==='CBU'&&ab('California')==='CAL'&&ab('CS Fullerton')==='CSUF'&&ab('Long Beach')==='LBSU',J(['Cal Poly','Cal Baptist','California','CS Fullerton','Long Beach'].map(ab)));
  const r=E(`parseMyTicketText(${J(TICKET)})`);
  T('the pasted ticket reads all 10 legs, none skipped',r.ok&&r.legCount===10&&r.skipped.length===0,J({legs:r.legCount,skipped:r.skipped}));
  const L=E(`get(LS.locked,[]).find(t=>t.id==='ext1013139688').legs.map(l=>l.sport+' '+l.game+' | '+l.pick+' | '+l.price)`);
  const want=['nhl UTAH@OTT | OTT +1.5 | -245','nba BKN@ATL | ATL -4.5 | -169','nba BKN@ATL | Over 224 | -134','ncaab DEN@UCR | UCR ML | -140','ncaab DEN@UCR | Over 154 | -145',
    'ncaab MD@GTWN | GTWN +5 | -154','ncaab MD@GTWN | Under 148 | -135','ncaaf AF@ARMY | ARMY ML | -180','ncaaf AF@ARMY | Over 41 | -153','ncaaf COLO@ASU | ASU ML | -155'];
  T('…each one right: team, line (the bought line as shown), price',J(L)===J(want),J(L));
  T('…stake $1.00, to win $136.74, kept from the ticket',E(`(t=>t.stake==='1'&&t.toWin==='136.74')(get(LS.locked,[]).find(t=>t.id==='ext1013139688'))`));
  const r2=E(`parseMyTicketText(${J(TICKET)})`);T('pasting it again updates the same ticket (no duplicate)',r2.replaced===true&&E(`get(LS.locked,[]).filter(t=>t.id==='ext1013139688').length`)===1);
  /* 3:07 PM: ticket #1013132577 — "Nebraska Omaha" (ESPN: Omaha) dropped a leg; the book's long-form names, all of them */
  const T2=`Ticket Number:
1013132577
Amount:
$1.00
To win:
$132.30
Description:
Basketball - NCAA - Monmouth vs Rhode Island - Parlay | 618 Rhode Island -275 for GAME | 11/07/2026 04:00:00 PM (EST) | Pending
Basketball - NCAA - Monmouth vs Rhode Island - Parlay | 618 Monmouth/Rhode Island under 146½ -140 buying -2 for GAME | 11/07/2026 04:00:00 PM (EST) | Pending
Basketball - NCAA - Oakland vs Cal Santa Barbara - Parlay | 624 Cal Santa Barbara -11½ -161 buying -2 for GAME | 11/07/2026 04:00:00 PM (EST) | Pending
Basketball - NCAA - Oakland vs Cal Santa Barbara - Parlay | 623 Oakland/Cal Santa Barbara over 147 -140 buying 2 for GAME | 11/07/2026 04:00:00 PM (EST) | Pending
Basketball - NCAA - Nebraska Omaha vs Utah State - Parlay | 619 Nebraska Omaha +31 -141 buying -2 for GAME | 11/07/2026 04:00:00 PM (EST) | Pending
Basketball - NCAA - Samford vs UNLV - Parlay | 621 Samford +13 -146 buying -2 for GAME | 11/07/2026 04:00:00 PM (EST) | Pending
Basketball - NCAA - Samford vs UNLV - Parlay | 621 Samford/UNLV over 156 -140 buying 2 for GAME | 11/07/2026 04:00:00 PM (EST) | Pending
Football - NCAA - Louisiana Tech vs Troy - Parlay | 408 Louisiana Tech/Troy under 50 -150 buying -2 for GAME | 11/07/2026 04:00:00 PM (EST) | Pending
Football - NCAA - Missouri St vs Florida International - Parlay | 406 Florida International -200 for GAME | 11/07/2026 04:00:00 PM (EST) | Pending
Football - NCAA - Missouri St vs Florida International - Parlay | 406 Missouri St/Florida International under 51½ -150 buying -2 for GAME | 11/07/2026 04:00:00 PM (EST) | Pending`;
  const r3=E(`parseMyTicketText(${J(T2)})`);const L3=E(`get(LS.locked,[]).find(t=>t.id==='ext1013132577').legs.map(l=>l.game+' | '+l.pick)`);
  T('ticket #1013132577 reads all 10 legs too — Nebraska Omaha +31 included',r3.ok&&r3.legCount===10&&r3.skipped.length===0&&L3.includes('OMA@USU | OMA +31')&&L3.includes('OAK@UCSB | UCSB -11.5'),J({legs:r3.legCount,skipped:r3.skipped,L3}));
  const longForm={'Nebraska Omaha':'OMA','Southern Mississippi':'USM','Arkansas Little Rock':'LR','Wisconsin Milwaukee':'MILW','Wisconsin Green Bay':'GB','Central Florida':'UCF','Southern California':'USC','Detroit':'DETM',
    'Massachusetts Lowell':'UML','North Carolina Wilmington':'UNCW','NC Greensboro':'UNCG','NC Asheville':'UNCA','Tennessee Chattanooga':'UTC','Illinois Chicago':'UIC','Alabama Birmingham':'UAB','Virginia Commonwealth':'VCU',
    'Texas A&M Commerce':'ETAM','Southeastern Louisiana':'SELA','USC Upstate':'UPST','Citadel':'CIT','Tarleton':'TAR','Mississippi':'MISS','Mississippi St':'MSST','Connecticut':'CONN','Kennesaw':'KENN','New Orleans':'UNO'};
  const bad=Object.entries(longForm).filter(([n,a])=>ab(n)!==a).map(([n,a])=>n+'→'+ab(n)+' (want '+a+')');
  T('…and the book\'s long-form school names resolve (Southern Mississippi, Wisconsin Milwaukee, Central Florida, Mississippi = Ole Miss…)',bad.length===0||(bad.length===1&&/New Orleans/.test(bad[0])),bad.join(', '));
  T('no errors along the way',errs.length===e0,errs.slice(e0).join(' | '));
}catch(e){T('crashed',false,e.stack);}console.log(pass+' pass / '+fail+' fail');process.exit(0);},2500);
