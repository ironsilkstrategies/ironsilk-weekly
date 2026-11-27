const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
let html=fs.readFileSync(path.join(W,'nhl.html'),'utf8');
html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nhl.html',pretendToBeVisual:true,beforeParse(w){
  w.fetch=()=>Promise.resolve({ok:true,status:200,json:()=>Promise.resolve({}),text:()=>Promise.resolve('{}')});
  w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.localStorage.setItem('d4.setupDone','1');}}).window;
setTimeout(()=>{try{
  // a 3-leg same-game stack: legs alone say ~+596, the book actually paid +450
  const legs=[{game:'OTT@BOS',pick:'BOS ML',sport:'nhl',price:-105},{game:'OTT@BOS',pick:'Over 5.5',sport:'nhl',price:102},{game:'OTT@BOS',pick:'BOS -1.5',sport:'nhl',price:180}];
  w.eval(`set(LS.locked,[{id:'ext77',date:today(),source:'mine',imported:true,stake:'2',toWin:'9',legs:${JSON.stringify(legs)}}]);
    const F=get(LS.allfinals,{});F[finalsKey('nhl','OTT@BOS')]={sport:'nhl',a:1,h:5,d:today(),ts:Date.now()};set(LS.allfinals,F);
    saveWager('ext77',2);`);
  T('realQuoteProfit uses the uploaded to-win',w.eval("realQuoteProfit(get(LS.locked,[])[0],2)")===9);
  T('bubble/payout magnitude uses the uploaded numbers, not the leg math',JSON.stringify(w.eval("ticketPayoutMagnitude(get(LS.locked,[])[0])"))==='{"stake":2,"toWin":9,"payout":11}');
  try{w.eval('settleLockedTickets()');}catch(e){}
  const h=w.eval("getBankroll().history.find(x=>x.id==='ext77')");
  T('settled win books exactly the uploaded $9 profit',h&&h.profit===9,h?`profit ${h.profit}`:'not settled');
  // upload parsing: Payout label + same-line values
  const txt=`Ticket Number: 555123\nAccepted Date: 10/05/2026\nAmount: $5.00\nPayout: $32.50\nStatus: Pending\nType: Parlay\n`;
  const kv=w.eval(`ticketKV(${JSON.stringify(txt.split('\n').filter(Boolean))},{})`);
  T('"Payout: $32.50" with "Amount: $5.00" → to-win 27.5 (same-line labels read)',kv.towin==='27.5'&&kv.amount==='$5.00'&&kv.ticketnumber==='555123',JSON.stringify(kv));
  const kv2=w.eval(`ticketKV(["Amount","$4.00","To win","$21.30"],{})`);
  T('next-line labels still work, To win taken as-is',kv2.towin==='$21.30'&&kv2.amount==='$4.00');
  // re-upload without money keeps the first upload's money
  T('re-upload never wipes a real stake/to-win',JSON.stringify(w.eval(`keepRealMoney({stake:null,toWin:null},{stake:'2',toWin:'9'})`))==='{"stake":"2","toWin":"9"}');
}catch(e){T('harness',false,e.stack.split('\n').slice(0,3).join(' | '));}
console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length}/${out.length} passed`);process.exit(0);},3000);
