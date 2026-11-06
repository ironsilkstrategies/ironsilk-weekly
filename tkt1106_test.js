/* v2.86.0 · the Nov 4 ticket: "Basketball - NCAA" legs were read as college football and dropped */
const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');const path=require('path');const WD='/home/claude/work';let pass=0,fail=0;const T=(n,c,x)=>{c?pass++:fail++;console.log((c?'PASS ':'FAIL ')+n+(c?'':'  — '+(x||'')));};
const TXT=`Ticket Number:
1012164294
Accepted Date:
11/4/26
Amount:
$1.00
Status:
Pending
To win:
$136.77
Type:
Parlay
Description:
Basketball - NCAA - Northern Kentucky vs South Dakota - Parlay | 637 Northern Kentucky/South Dakota over 160½ -145 buying 2 for GAME | 11/04/2026 08:00:00 PM (EST) | Pending
Football - NCAA - Ball State vs Massachusetts - Parlay | 308 Massachusetts -½ -150 buying -2 for GAME | 11/04/2026 07:00:00 PM (EST) | Pending
Football - NCAA - Central Michigan vs Eastern Michigan - Parlay | 306 Eastern Michigan -111 for GAME | 11/04/2026 07:30:00 PM (EST) | Pending
@ Ford Field - Detroit, MI
Football - NCAA - Central Michigan vs Eastern Michigan - Parlay | 306 Central Michigan/Eastern Michigan under 46½ -150 buying -2 for GAME | 11/04/2026 07:30:00 PM (EST) | Pending
@ Ford Field - Detroit, MI
Football - NCAA - Toledo vs Sacramento St - Parlay | 309 Toledo -2900 for GAME | 11/04/2026 07:00:00 PM (EST) | Pending
Hockey - NHL - Calgary Flames vs Seattle Kraken - Parlay | 35 Calgary Flames +1½ -222 for GAME | 11/04/2026 10:07:00 PM (EST) | Pending
Hockey - NHL - Chicago Blackhawks vs Florida Panthers - Parlay | 33 Chicago Blackhawks +1½ -121 for GAME | 11/04/2026 07:37:00 PM (EST) | Pending
Hockey - NHL - Ottawa Senators vs Buffalo Sabres - Parlay | 32 Buffalo Sabres -125 for GAME | 11/04/2026 07:37:00 PM (EST) | Pending
Hockey - NHL - Ottawa Senators vs Buffalo Sabres - Parlay | 31 Ottawa Senators/Buffalo Sabres over 6½ -121 for GAME | 11/04/2026 07:37:00 PM (EST) | Pending
Basketball - NCAA - CS Northridge vs Wichita State - Parlay | 636 CS Northridge/Wichita State under 162½ -140 buying -2 for GAME | 11/04/2026 07:30:00 PM (EST) | Pending
Basketball - NCAA - Fla Gulf Coast vs Southern Indiana - Parlay | 640 Fla Gulf Coast -3½ -110 for GAME | 11/04/2026 07:00:00 PM (EST) | Pending
Basketball - NCAA - Tenn-Martin vs UMKC - Parlay | 641 UMKC +2 -110 for GAME | 11/04/2026 08:00:00 PM (EST) | Pending`;
const run=page=>new Promise(res=>{let html=fs.readFileSync(path.join(WD,page),'utf8');html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(WD,f),'utf8')}</script>`);
  const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/'+page,pretendToBeVisual:true,virtualConsole:new VirtualConsole(),beforeParse(w){w.__NO_GRADELOOP__=true;w.__NO_BACKFILL__=true;w.__NO_SYNC_LOOP__=true;
    w.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('{}')});w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.localStorage.setItem('d4.setupDone','1');}}).window;setTimeout(()=>res(w),2000);});
(async()=>{try{
  for(const page of ['cfb.html','ncaab.html','nhl.html']){const w=await run(page);w.__T=TXT;const r=w.eval('parseMyTicketText(window.__T)');
    const L=JSON.parse(w.eval('JSON.stringify((get(LS.locked,[])||[]).slice(-1)[0]||{})')).legs||[];
    T(page+': all 12 legs read, none skipped',r.ok&&L.length===12&&r.legCount===12&&!(r.skipped||[]).length,r.ok+' '+L.length+' legs; skipped: '+JSON.stringify(r.skipped));
    const bb=L.filter(l=>l.sport==='ncaab').map(l=>l.game);T(page+': the four basketball legs are basketball, right teams',bb.length===4&&['NKU@SDAK','CSUN@WICH','FGCU@USI','UTM@KC'].every(g=>bb.includes(g)),bb.join(','));
    T(page+': no football leg lands on a basketball school',L.filter(l=>l.sport==='ncaaf').length===4);}
  const w=await run('nhl.html');
  T('a name the matcher can\'t place is left unread, never guessed onto another school',w.eval(`ncaabAbbrFor('Totally Made Up U')`)===null&&w.eval(`ncaabAbbrFor('Fla Gulf Coast')`)==='FGCU'&&w.eval(`ncaabAbbrFor('Southern Indiana')`)==='USI'&&w.eval(`ncaabAbbrFor('Tenn-Martin')`)==='UTM');
  T('team + mascot still reads (Duke Blue Devils, Michigan St Spartans)',w.eval(`ncaabAbbrFor('Duke Blue Devils')`)==='DUKE'&&w.eval(`ncaabAbbrFor('Michigan St Spartans')`)==='MSU');
}catch(e){T('crashed',false,e.stack)}console.log(pass+' pass / '+fail+' fail');process.exit(0);})();
