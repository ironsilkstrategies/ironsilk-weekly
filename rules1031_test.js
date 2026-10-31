/* v2.81 · 📏 the rule audit — each Best 3 blocking rule is scored on the graded picks it alone kept off,
   and loosens only where those picks made money (band by band, with hard limits) */
const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
function page(file){let html=fs.readFileSync(path.join(W,file),'utf8');
  html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
  return new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/'+file,pretendToBeVisual:true,beforeParse(w){
    const RD=w.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[RD.parse('2026-10-31T15:00:00Z')]))}static now(){return RD.parse('2026-10-31T15:00:00Z')}}w.Date=FD;
    w.__NO_GRADELOOP__=true;w.__NO_BACKFILL__=true;w.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});
    w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.localStorage.setItem('d4.setupDone','1');}}).window;}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{try{
  const w=page('nfl.html');await sleep(2500);
  T('history dates used are regular season',w.eval("seasonPre('nfl','2026-09-20')")===false);
  /* the ledger: a Judge call (graded) + the Sim's call on the same game/market (its chance and the market's) */
  w.eval(`(()=>{const V=[];let id=0;const days=[];for(let d=new Date(Date.UTC(2026,8,13));d<=new Date(Date.UTC(2026,9,15));d.setUTCDate(d.getUTCDate()+1))days.push(d.toISOString().slice(0,10));
    const grp=(tag,n,wins,cf,price,mp,mkt)=>{for(let i=0;i<n;i++){const d=days[(id+i)%days.length],g=tag+i+'@H'+tag,hit=i<wins;
      V.push({id:'j'+(++id),sp:'nfl',date:d,game:g,voice:'Judge',market:'ml',side:'home',price,cf,graded:true,hit});
      V.push({id:'s'+(++id),sp:'nfl',date:d,game:g,voice:'Sim',market:'ml',side:'home',price,simP:mp,mktP:mkt,graded:true,hit});}};
    grp('A',20,12,0.75,-110,0.60,0.57);     /* clears every rule */
    grp('B',40,26,0.75,100,0.60,0.51);      /* 9 pts off the market — blocked by the 8-pt rule alone, made money */
    grp('C',20,7,0.75,100,0.62,0.51);       /* 11 pts off — lost */
    grp('D',40,27,0.80,-240,0.72,0.69);     /* priced -240 — won 67.5%, but needed 70.6% + 2 */
    grp('E',35,22,0.67,100,0.55,0.52);      /* 67% sure, not official — made money */
    set(VOICES_KEY,V);localStorage.removeItem(RULE_KEY);RULE_NOW_C=null;})()`);
  const R=w.eval('ruleTuneCompute()');
  T('every graded pick is rebuilt once per game · market · side',R.n===155,String(R.n));
  T('picks that clear every rule are scored',R.base&&R.base.n===20&&R.base.w===12,JSON.stringify(R.base));
  const ev=R.ev.disagree||[];
  T('the 8–10 pt band is scored on exactly the picks the gap rule alone blocked',ev[0]&&ev[0].band.n===40&&ev[0].band.w===26&&ev[0].ok===true,JSON.stringify(ev[0]));
  T('…the 10–12 band lost, so the loosening stops there',ev[1]&&ev[1].band.n===20&&ev[1].ok===false&&R.v.disagree===0.10,JSON.stringify({v:R.v.disagree,b:ev[1]&&ev[1].band}));
  T('the -200 price limit holds: the -240s won, but not by enough over their break-even',R.v.b3lo===-200&&R.ev.b3lo[0].band.n===40&&R.ev.b3lo[0].ok===false,JSON.stringify(R.ev.b3lo[0]));
  T('the confidence floor loosens to 65% (the 65–70% picks paid), and stops at the empty 60–65 band',R.v.floor===0.65&&R.ev.floor[0].ok&&!R.ev.floor[1].ok,JSON.stringify({v:R.v.floor,e:R.ev.floor}));
  T('the rules in force are today\'s judgment',w.eval("ruleNow('disagree')")===0.10&&w.eval("ruleNow('b3lo')")===-200&&w.eval("ruleNow('floor')")===0.65);
  T('the model-vs-market check uses the tuned gap',w.eval("pickDisagrees({mp:0.60,mkt:0.51,sp:'nfl',m:'ml',sd:'home',price:100},'nfl')")===false&&w.eval("pickDisagrees({mp:0.62,mkt:0.51,sp:'nfl',m:'ml',sd:'home',price:100},'nfl')")===true);
  /* hard limits are the bands themselves: never past 20 pts, -300, 60% */
  T('hard limits: bands never go past 20 pts, -300 or 60%',Math.max(...w.eval('RULE_BANDS.disagree'))===0.20&&Math.min(...w.eval('RULE_BANDS.b3lo'))===-300&&Math.min(...w.eval('RULE_BANDS.floor'))===0.60);
  /* today: a 67% call that isn't official makes the Best 3 through the loosened floor, marked 📏 */
  w.eval(`(()=>{const V=get(VOICES_KEY,[]);const td=today();
    V.push({id:'t1',sp:'nfl',date:td,game:'KC@BUF',voice:'Judge',market:'ml',side:'home',price:-110,cf:0.72});
    V.push({id:'t2',sp:'nfl',date:td,game:'NYJ@MIA',voice:'Judge',market:'ml',side:'home',price:-140,cf:0.67});set(VOICES_KEY,V);PCI_C=null;CONF_FB_C=null;
    const st=new Date(Date.now()+4*36e5).toISOString();
    set(TC_KEY,{d:td,by:{nfl:{picks:[{sp:'nfl',game:'KC@BUF',m:'ml',sd:'home',pick:'BUF ML',price:-110,start:st,mp:0.6,mkt:0.57},
      {sp:'nfl',game:'NYJ@MIA',m:'ml',sd:'home',pick:'MIA ML',price:-140,start:st,mp:0.6,mkt:0.57}]}}});})()`);
  const P=w.eval(`best3Pool(get(TC_KEY,{}).by,null)`);
  const mia=P.find(x=>x.game==='NYJ@MIA'),buf=P.find(x=>x.game==='KC@BUF');
  T('the official 72% call is on the card as usual',buf&&!buf.tuned,JSON.stringify(P.map(x=>[x.game,x.tuned,x.p])));
  T('the 67% call gets in through the tuned floor, marked 📏',mia&&mia.tuned===true&&Math.abs(mia.p-0.67)<1e-9,JSON.stringify(P.why));
  w.eval(`localStorage.setItem('d4.ruleoff','true');RULE_NOW_C=null;`);
  const P2=w.eval(`best3Pool(get(TC_KEY,{}).by,null)`);
  T('switching the audit off puts every rule back at its default',w.eval("ruleNow('floor')")===0.70&&w.eval("ruleNow('disagree')")===0.08&&!P2.some(x=>x.game==='NYJ@MIA'),JSON.stringify(P2.map(x=>x.game)));
  w.eval(`localStorage.removeItem('d4.ruleoff');RULE_NOW_C=null;`);
  /* Records → 📏 Rules */
  const H=w.eval('ruleAuditHtml()').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
  T('Records → Rules shows each rule, its current value and each band\'s record',/Model vs market gap: 10 pts/.test(H)&&/was 8 pts/.test(H)&&/Best 3 price limit: -200/.test(H)&&/Confidence floor: 65%/.test(H)&&/26-14/.test(H),H.slice(0,400));
  T('the view is in the Records bar',/📏 Rules/.test(w.eval('recViewBar()')));
  /* the card carries the rules it was built under; the derived audit never syncs */
  const S=w.eval('best5State()');T('the Best card remembers the rules it was built under',S.rules&&S.rules.floor===0.65&&S.rules.disagree===0.10,JSON.stringify(S.rules));
  T('the derived audit stays on the device (not synced)',w.eval("syncSkip('d4.ruletune')")===true&&w.eval("syncSkip('d4.ruleoff')")===false);
  T('the autopilot re-judges it daily',w.eval("AP_STEPS.some(s=>s[0]==='rules')"));
  /* a today game never counts toward the judgment */
  const R2=w.eval('ruleTuneCompute()');T('today\'s games never count',R2.n===155,String(R2.n));
  w.close();
}catch(e){T('harness',false,e.stack);}
console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length} pass / ${out.filter(x=>x.startsWith('FAIL')).length} fail`);process.exit(0);})();
