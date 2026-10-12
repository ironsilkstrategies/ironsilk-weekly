const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
let html=fs.readFileSync(path.join(W,'nfl.html'),'utf8');
html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nfl.html',pretendToBeVisual:true,beforeParse(w){w.__NO_GRADELOOP__=true;w.__NO_BACKFILL__=true;w.__NO_SYNC_LOOP__=true;
  w.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('{}')});w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.prompt=()=>'';w.localStorage.setItem('d4.setupDone','1');}}).window;
setTimeout(()=>{try{
  const css=w.eval('SKIN_CSS');
  T('the slip docks above the bottom nav and the review sheet covers it',/body\.bnav \.slip\{bottom:var\(--bnh/.test(css)&&/\.slip-sheet\{z-index:86/.test(css)&&/\.slip\.expanded\{display:none/.test(css));
  w.eval(`set(LS.slip,[{id:'x|JAX spread',pick:'JAX spread',game:'PHI@JAX',sport:'nfl',date:dayShift(today(),-1)},{id:'y|LAR ML',pick:'LAR ML',game:'BUF@LAR',sport:'nfl',date:today()}]);loadSlip();`);
  T('yesterday\'s legs fall off the slip on load',w.eval('SLIP.length')===1&&w.eval('SLIP[0].pick')==='LAR ML');
  const g={id:'g1',away:{abbr:'BUF'},home:{abbr:'LAR'},date:w.eval('today()')+'T23:15Z'};
  w.eval(`sportGames=()=>[${JSON.stringify(g)}];sportLinesFor=()=>[{market:'spread',side:'away',line:3,price:-103},{market:'spread',side:'home',line:-3,price:-117},{market:'h1spread',side:'away',line:2.5,price:-105}];SLIP=[];window.__r=0;renderActiveBoard=()=>{window.__r++};`);
  w.eval(`sportSlipToggle('nfl','g1','BUF spread',-103)`);
  T('a "BUF spread" square goes on the ticket with its number (BUF +3) so it can grade',w.eval('SLIP[0].pick')==='BUF +3'&&w.eval('SLIP[0].line')===3&&w.eval('SLIP[0].sq')==='g1|BUF spread');
  w.eval(`sportSlipToggle('nfl','g1','BUF 1H spread',-105)`);T('1st-half too: "BUF 1H +2.5"',w.eval('SLIP[1].pick')==='BUF 1H +2.5');
  w.eval(`sportSlipToggle('nfl','g1','BUF spread',-103)`);T('tapping the same square again takes it off',w.eval('SLIP.length')===1&&w.eval('SLIP[0].pick')==='BUF 1H +2.5');
  T('the board repaints its own sport (never the MLB board over football)',w.eval('window.__r')>=3);
  /* v2.21: the review sheet is the ticket builder */
  w.eval(`sportSlipToggle('nfl','g1','LAR ML',-165);openSlipSheet();`);
  const sh=w.document.getElementById('slipSheetBody').innerHTML;
  T('review sheet: every leg with its price and a remove button, ticket price, cash chance, stake and name',/BUF 1H \+2\.5/.test(sh)&&/-165/.test(sh)&&(sh.match(/slip-leg-rm/g)||[]).length===2&&/Ticket price/.test(sh)&&/Cash chance/.test(sh)&&/slipStakeIn/.test(sh)&&/slipNameIn/.test(sh));
  T('same-game legs are flagged as correlated',/same game as another leg/.test(sh));
  T('the bar has a real Review button',!!w.document.getElementById('slipRevBtn'));
  w.eval(`document.getElementById('slipStakeIn').value='4';slipStakeInput(document.getElementById('slipStakeIn'));document.getElementById('slipNameIn').value='MNF';`);
  T('stake shows to-win live',/to win \$/.test(w.document.getElementById('slipToWin').textContent));
  w.eval(`renderSlipSheetBody()`);T('the typed name survives a repaint',w.document.getElementById('slipNameIn').value==='MNF');
  w.eval(`lockSlip();`);const t=w.eval('get(LS.locked,[])[0]');
  T('Lock in: My Tickets gets the name, the stake and to-win',t&&t.name==='MNF'&&t.stake==='4'&&+t.toWin>0,JSON.stringify(t&&{n:t.name,s:t.stake,w:t.toWin}));
  T('Lock in: My Tickets gets the legs with their sport and game day',t&&t.legs.length===2&&t.legs.every(l=>l.sport==='nfl'&&l.gameDate===w.eval('today()'))&&w.eval('SLIP.length')===0,JSON.stringify(t&&t.legs.map(l=>l.pick+' '+l.gameDate)));
  w.eval(`set(LS.allfinals,{[finalsKey('nfl','BUF@LAR')]:{sport:'nfl',a:24,h:25,d:today(),ts:Date.now()}})`);
  T('…and the spread leg grades (BUF +3 covers a 1-pt loss)',w.eval(`gradeLeg({pick:'BUF +3',game:'BUF@LAR',sport:'nfl',gameDate:today()},today()).hit`)===true);
}catch(e){out.push('CRASH '+e.stack);}
console.log(out.join('\n'));process.exit(0);},1500);
