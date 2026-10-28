const {JSDOM}=require('jsdom');const fs=require('fs');const W='/home/claude/work';const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
let html=fs.readFileSync(W+'/nhl.html','utf8').replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(W+'/'+f,'utf8')}</script>`);
const NOW=Date.parse('2026-10-28T18:00:00Z');
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nhl.html',pretendToBeVisual:true,beforeParse(x){const RD=x.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[NOW]))}static now(){return NOW}}x.Date=FD;
 x.__NO_GRADELOOP__=true;x.__NO_REOPEN__=true;x.__NO_BACKFILL__=true;x.__NO_SYNC_LOOP__=true;x.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});x.scrollTo=()=>{};x.alert=()=>{};x.confirm=()=>true;x.localStorage.setItem('d4.setupDone','1');}}).window;
setTimeout(()=>{try{
 /* 3 weeks of calls: every character, 3 games a day; "Judge" and "Covers" hit 80%, "Coach" 30%, everyone else 55% */
 w.eval(`(()=>{const V=[];const ch=CHAR_ORDER.filter(v=>CHARS[v]);let r=1;const rnd=()=>{r=(r*16807)%2147483647;return r/2147483647;};
  for(let i=1;i<=21;i++){const d=dayShift('2026-10-27',-22+i);ch.forEach((v,ci)=>{for(let g=0;g<3;g++){const hr=v==='Judge'||v==='Covers'?0.8:v==='Coach'?0.3:0.55;
    V.push({id:[v,d,g].join('|'),voice:v,sp:'nhl',game:'G'+((g+ci)%9)+'@H'+i,date:d,market:'ml',side:'home',price:-110,cf:0.72-0.01*g,graded:true,hit:rnd()<hr,units:0});}});}
  V.forEach(x=>x.units=x.hit?0.91:-1);
  ch.forEach((v,ci)=>{for(let g=0;g<3;g++)V.push({id:[v,'2026-10-28',g].join('|'),voice:v,sp:'nhl',game:'T'+((g+ci)%9)+'@X',date:'2026-10-28',market:'ml',side:'home',price:-110,cf:0.73});});
  set(VOICES_KEY,V);BK_C=null;TM_TOP=null;})()`);
 const L=w.eval('bkLedger(true)');const W1=L.weeks[1];
 T('the race stakes aggressively: a 72% official call bets ~5.6% of the roll, not 2%',(()=>{const f=w.eval(`lgChaseFrac({cf:0.72},true)`);return f>0.05&&f<0.06;})());
 T('the race leader differs from the flat ledger only in sizing — both exist',!!(W1.RF&&W1.R&&W1.leader));
 T('the Banker weight still reads the flat ledger',Object.keys(L.mult).length>5);
 const tw=w.eval('JSON.stringify(tmWeek())');const TW=JSON.parse(tw);
 T('captains are last week\'s winner and runner-up',TW&&TW.C.A===W1.leader.v,TW&&JSON.stringify(TW.C));
 T('the draft fills two teams of 4, winner picking first',TW.D.A.length===4&&TW.D.B.length===4&&TW.D.log[0].cap===TW.C.A,JSON.stringify(TW.D));
 T('the captains know the stats: the 80% hitters go in the first round',['Judge','Covers'].filter(v=>v!==TW.C.A&&v!==TW.C.B).every(v=>TW.D.log.slice(0,2).some(x=>x.v===v)),TW.D.log.map(x=>x.v).join(','));
 T('Coach (30%) goes late or not at all',!TW.D.log.slice(0,2).some(x=>x.v==='Coach'));
 T('today: each team has an 8-leg parlay from its 4 members × 2',TW.A.days.find(x=>x.d==='2026-10-28').legs.length===8);
 const lab=JSON.parse(w.eval('JSON.stringify(tmLab(true))'));
 T('the lab replays every 4-character team',lab.tried>=300,'teams '+lab.tried+' over '+lab.days+' days');
 T('…and the best teams include the 80% hitters',lab.top[0].tm.includes('Judge')||lab.top[0].tm.includes('Covers'),lab.top[0].tm.join(','));
 T('…anchors and wash-outs: Judge lifts, Coach sinks',lab.imp.Judge.lift>0&&lab.imp.Coach.lift<0);
 const h=w.eval('teamHtml()');T('the card renders both teams, the draft and the lab',/Team Parlay Challenge/.test(h)&&/The draft/.test(h)&&/Parlay Lab/.test(h)&&/Anchors/.test(h));
 const C=w.eval('cmdBuild()');T('/teams answers in the lounge',/Team Parlay Challenge/.test(C.r.teams)&&C.menu.some(x=>x.command==='teams'));
}catch(e){out.push('CRASH '+e.stack.split('\n').slice(0,4).join(' | '));}console.log(out.join('\n'));console.log(`${out.filter(x=>x.startsWith('PASS')).length} pass / ${out.filter(x=>!x.startsWith('PASS')).length} fail`);process.exit(0);},3000);
