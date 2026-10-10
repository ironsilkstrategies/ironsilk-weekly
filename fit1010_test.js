const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
let html=fs.readFileSync(path.join(W,'nhl.html'),'utf8');html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nhl.html',pretendToBeVisual:true,beforeParse(w){
  const RD=w.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[RD.parse('2026-10-10T19:30:00Z')]))}static now(){return RD.parse('2026-10-10T19:30:00Z')}}w.Date=FD;w.__NO_GRADELOOP__=true;
  w.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});
  w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.localStorage.setItem('d4.setupDone','1');}}).window;
setTimeout(()=>{try{
  const td=w.eval('today()');
  w.eval(`set(MS_KEY,[]);msStart('first_win')`);
  const lane=w.eval(`(()=>{const m=msAll()[0];return msPotOrders(m,msPotsOf(m)[0],msActiveRoute(m))[0];})()`);const k=lane.k,st=lane.stake;
  w.eval(`(()=>{const A=msAll();A[0].name="🏦 The Banker's Table";msSave(A);})()`);
  const mk=(n,price)=>Array.from({length:n},(_,i)=>({game:'G'+i+'@H'+i,pick:'H'+i+' ML',sport:'nhl',price,gameDate:td}));
  const pay=n=>String((Math.pow(2.6,n)-1)*st);
  const L=[{id:'ready',date:td,source:'mine',imported:true,stake:String(st),toWin:pay(k),legs:mk(k,160)},
    {id:'close',date:td,source:'mine',imported:true,stake:String(st*3),toWin:String(+pay(k)*3),legs:mk(k,160)},
    {id:'off',date:td,source:'mine',imported:true,stake:String(st*10),toWin:'1',legs:mk(k+3,-300)},
    {id:'ext77',name:'Ticket #77',date:td,source:'mine',imported:true,stake:String(st),toWin:pay(k),legs:mk(k,160).map(l=>({...l,gameDate:'2027-03-01'}))}];
  w.eval(`set(LS.locked,${JSON.stringify(L)})`);
  const tier=id=>w.eval(`msTicketFit(msAll()[0],0,get(LS.locked,[]).find(t=>t.id==='${id}')).tier`);
  T('tiers: clean fit = ready, one thing off = close, 2+ off = off-plan, outside dates = can\'t count',tier('ready')==='ready'&&tier('close')==='close'&&tier('off')==='off'&&tier('ext77')==='no',['ready','close','off','ext77'].map(tier).join('/'));
  const H=w.eval('msMatcherHtml()');
  T('no JS-escape backslashes leak into visible names',!/\\'/.test(H)&&/Banker's Table/.test(H));
  T('summary counts each tier',/1 ready/.test(H)&&/1 close/.test(H)&&/1 off-plan/.test(H)&&/1 can't count/.test(H));
  T('ready card sorts first and gets the primary Attach',H.indexOf('fit-card fit-ready')>-1&&H.indexOf('fit-card fit-ready')<H.indexOf('fit-card fit-close')&&/fit-at go[^>]*'ready'/.test(H));
  T('misses are short chips, not paragraphs',/plan \$[\d.]+ · yours \$[\d.]+/.test(H)&&!/ticket stakes/.test(H.replace(/title="[^"]*"/g,'')));
  T('off-plan and can\'t-count tickets are folded away',/off-plan ticket — they count/.test(H)&&/1 ticket can't count toward any running challenge/.test(H));
  T('a ticket that can\'t count has no Attach button',!/msAttachId\([^)]*'ext77'/.test(H));
  T('duplicate "Ticket #id" name and ext prefix collapse to #77',/#77</.test(H)&&!/#ext77/.test(H));
  const card=w.eval('msFitHtml(msAll()[0])');
  T('challenge card lists only tickets that can count',/'ready'/.test(card)&&!/'ext77'/.test(card));
  T('ticket chip only for ready/close',/fits/.test(w.eval(`msFitChip(get(LS.locked,[])[0])`))&&w.eval(`msFitChip(get(LS.locked,[])[2])`)==='');
}catch(e){T('harness',false,e.stack);}
console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length} pass / ${out.filter(x=>x.startsWith('FAIL')).length} fail`);process.exit(0);},2500);
