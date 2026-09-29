const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const TICKET=`Ticket Number:
1000899083
Accepted Date:
9/29/26
Amount:
$1.85
Status:
Pending
To win:
$159.51
Type:
Parlay
Description:
Hockey - NHL - Montreal Canadiens vs Toronto Maple Leafs - Parlay | 3 Montreal Canadiens -101 for GAME | 09/29/2026 07:20:00 PM (EST) | Pending
Hockey - NHL - Montreal Canadiens vs Toronto Maple Leafs - Parlay | 3 Montreal Canadiens/Toronto Maple Leafs over 6½ -105 for GAME | 09/29/2026 07:20:00 PM (EST) | Pending
Hockey - NHL - Chicago Blackhawks vs Vegas Golden Knights - Parlay | 10 Vegas Golden Knights -270 for GAME | 09/29/2026 10:37:00 PM (EST) | Pending
Hockey - NHL - Chicago Blackhawks vs Vegas Golden Knights - Parlay | 9 Chicago Blackhawks/Vegas Golden Knights over 5½ -132 for GAME | 09/29/2026 10:37:00 PM (EST) | Pending
Hockey - NHL - New York Rangers vs Boston Bruins - Parlay | 5 New York Rangers/Boston Bruins over 5½ -130 for GAME | 09/29/2026 08:07:00 PM (EST) | Pending
Baseball - MLB - Boston Red Sox vs New York Yankees - Parlay | 942 New York Yankees -125 for GAME | 09/29/2026 08:15:00 PM (EST) | Pending | P. Tolle -L - Must Start / C. Schlittler -R - Must Start
Wild Card Round
Baseball - MLB - Boston Red Sox vs New York Yankees - Parlay | 942 Boston Red Sox/New York Yankees under 6 -109 for GAME | 09/29/2026 08:15:00 PM (EST) | Pending | P. Tolle -L - Must Start / C. Schlittler -R - Must Start
Wild Card Round
Baseball - MLB - Chicago Cubs vs San Diego Padres - Parlay | 943 Chicago Cubs +1½ -190 for GAME | 09/29/2026 10:10:00 PM (EST) | Pending | M. Boyd -L - Must Start / M. King -R - Must Start`;
function load(page){
  let html=fs.readFileSync(path.join(W,page),'utf8');
  html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
  const errors=[];
  const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/'+page,pretendToBeVisual:true,beforeParse(w){
    w.fetch=()=>Promise.resolve({ok:true,status:200,json:()=>Promise.resolve({}),text:()=>Promise.resolve('{}')});
    w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;
    w.localStorage.setItem('d4.key',JSON.stringify('K'));w.localStorage.setItem('d4.setupDone','1');
    const RD=w.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[RD.parse('2026-09-29T20:00:00Z')]))}static now(){return RD.parse('2026-09-29T20:00:00Z')}}w.Date=FD;
    w.addEventListener('error',e=>errors.push((e.error&&e.error.message)||e.message));}});
  return{w:dom.window,errors};
}
(async()=>{
  const WANT=['MTL@TOR|MTL ML|-101','MTL@TOR|Over 6.5|-105','CHI@VGK|VGK ML|-270','CHI@VGK|Over 5.5|-132','NYR@BOS|Over 5.5|-130','BOS@NYY|NYY ML|-125','BOS@NYY|Under 6|-109','CHC@SD|CHC +1.5|-190'];
  for(const page of ['mlb.html','nfl.html','nhl.html']){
    const {w,errors}=load(page);await wait(2200);
    const r=w.eval(`(()=>{set(LS.locked,[]);const r=parseMyTicketText(${JSON.stringify(TICKET)});const t=get(LS.locked,[])[0];return{r,t}})()`);
    T(`[${page}] all 8 legs read, none skipped`,r.r.ok&&r.r.legCount===8&&r.r.skipped.length===0,`${r.r.legCount} legs · skipped ${r.r.skipped.length}`);
    const got=(r.t?r.t.legs:[]).map(l=>`${l.game}|${l.pick}|${l.price}`);
    T(`[${page}] every leg's game, pick and price exact`,JSON.stringify(got)===JSON.stringify(WANT),WANT.filter(x=>!got.includes(x)).join(' ; ')||'8/8');
    T(`[${page}] legs carry the right sport`,r.t.legs.filter(l=>l.sport==='nhl').length===5&&r.t.legs.filter(l=>l.sport==='mlb').length===3);
    T(`[${page}] stake and to-win stored as plain numbers`,r.t.stake==='1.85'&&r.t.toWin==='159.51',r.t.stake+' / '+r.t.toWin);
    if(page==='nfl.html'){
      const row=w.eval(`buildWagerRow(get(LS.locked,[])[0])`);
      T('ticket card says "from your ticket" with the real $1.85 stake',/from your ticket/.test(row)&&/\$1\.85/.test(row));
      const dec=(1.85+159.51)/1.85;const am='+'+Math.round((dec-1)*100);
      T('parlay odds come from the book quote ('+am+'), not model math',row.includes(am),am);
      T('to-win shows $159.51 profit',/159\.51/.test(row)||/\$161\.36/.test(row),(row.match(/\$1[56]\d\.\d\d/g)||[]).join(' '));
      const M=w.eval(`ticketMoney(get(LS.locked,[])[0])`);
      T('ticketMoney (hedges, missions) reads the real quote',M&&M.real&&M.stake===1.85&&Math.abs(M.payout-161.36)<0.005,JSON.stringify(M));
    }
    T(`[${page}] no uncaught errors`,errors.length===0,errors.slice(0,2).join('|'));
  }
  // an old ticket saved before this fix still has the "$" strings — readers must cope
  {const {w}=load('nfl.html');await wait(2000);
    w.eval(`set(LS.locked,[{id:'old1',date:'2026-09-29',source:'mine',imported:true,stake:'$1.85',toWin:'$159.51',legs:[{game:'MTL@TOR',pick:'MTL ML',sport:'nhl',price:-101},{game:'BOS@NYY',pick:'NYY ML',sport:'mlb',price:-125}]}])`);
    const M=w.eval(`ticketMoney(get(LS.locked,[])[0])`);
    T('tickets saved BEFORE the fix ("$1.85" text) also read correctly',M&&M.real&&M.stake===1.85,JSON.stringify(M));}
  // college football names still only resolve where CFB names are loaded — and it says so
  {const {w}=load('mlb.html');await wait(2000);
    const r=w.eval(`(()=>{set(LS.locked,[]);return parseMyTicketText(\`Ticket Number:\n5\nAmount:\n$1\nTo win:\n$9\nDescription:\nFootball - NCAAF - Ohio State vs Michigan - Parlay | 1 Ohio State -3 -110 for GAME | 09/29/2026 07:00:00 PM (EST) | Pending\`)})()`);
    T('CFB leg pasted on the MLB page: clear message pointing to the CFB page',!r.ok&&/no legs parsed/.test(r.note)&&/CFB page/.test(r.note),r.note);}
  console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length}/${out.length} passed`);
  process.exit(out.some(x=>x.startsWith('FAIL'))?1:0);
})().catch(e=>{console.log(out.join('\n'));console.log('CRASH',e.stack);process.exit(1)});
