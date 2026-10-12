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
  w.eval(`sportSlipToggle('nfl','g1','LAR ML',-165);lockSlip();`);const t=w.eval('get(LS.locked,[])[0]');
  T('Lock in: My Tickets gets the legs with their sport and game day',t&&t.legs.length===2&&t.legs.every(l=>l.sport==='nfl'&&l.gameDate===w.eval('today()'))&&w.eval('SLIP.length')===0,JSON.stringify(t&&t.legs.map(l=>l.pick+' '+l.gameDate)));
  w.eval(`set(LS.allfinals,{[finalsKey('nfl','BUF@LAR')]:{sport:'nfl',a:24,h:25,d:today(),ts:Date.now()}})`);
  T('…and the spread leg grades (BUF +3 covers a 1-pt loss)',w.eval(`gradeLeg({pick:'BUF +3',game:'BUF@LAR',sport:'nfl',gameDate:today()},today()).hit`)===true);
}catch(e){out.push('CRASH '+e.stack);}
console.log(out.join('\n'));process.exit(0);},1500);
