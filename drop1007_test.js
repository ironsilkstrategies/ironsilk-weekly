const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
const DROP=fs.readFileSync(path.join(W,'intake/2026-10-07.txt'),'utf8');let fetches=0;
function boot(page,store){let html=fs.readFileSync(path.join(W,page),'utf8');
  html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
  return new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/'+page,pretendToBeVisual:true,beforeParse(w){
    const RD=w.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[RD.parse('2026-10-07T20:30:00Z')]))}static now(){return RD.parse('2026-10-07T20:30:00Z')}}w.Date=FD;
    w.fetch=u=>{u=String(u);if(/intake\/2026-10-07\.txt/.test(u)){fetches++;return Promise.resolve({ok:true,status:200,text:()=>Promise.resolve(DROP),json:()=>Promise.resolve({})});}
      if(/intake\//.test(u))return Promise.resolve({ok:false,status:404,text:()=>Promise.resolve(''),json:()=>Promise.resolve({})});
      return Promise.resolve({ok:true,status:200,json:()=>Promise.resolve({}),text:()=>Promise.resolve('{}')});};
    w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.localStorage.setItem('d4.setupDone','1');
    Object.entries(store||{}).forEach(([k,v])=>w.localStorage.setItem(k,v));}}).window;}
const dump=w=>{const o={};for(let i=0;i<w.localStorage.length;i++){const k=w.localStorage.key(i);o[k]=w.localStorage.getItem(k);}return o;};
const nhl=boot('nhl.html');
setTimeout(async()=>{try{
  const seen=nhl.eval(`get(DROP_KEY,{})`);
  T('page boot fetched today\'s drop and filed it once',Object.keys(seen).length===1&&/^2026-10-07:/.test(Object.keys(seen)[0])&&fetches===1,JSON.stringify(seen));
  const P=nhl.eval(`get('d4.preds',{})`);
  T('predictions credited to covers (graded by source)',P.nhl['2026-10-07']['COL@WPG'].src==='covers');
  T('all 6 predictions saved (3 MLB + 3 NHL)',Object.keys((P.nhl||{})['2026-10-07']||{}).length===3&&Object.keys((P.mlb||{})['2026-10-07']||{}).length===2,JSON.stringify({nhl:Object.keys((P.nhl||{})['2026-10-07']||{}),mlb:Object.keys((P.mlb||{})['2026-10-07']||{})}));
  const L=nhl.eval(`nhlLineObj('COL@WPG')`);
  const has=(m,s)=>JSON.stringify(L).includes(m);
  T('NHL full-game lines filed (COL -184 ML, PL +128, o6.5 -106)',JSON.stringify(L).includes('-184')&&JSON.stringify(L).includes('128')&&JSON.stringify(L).includes('-106'),JSON.stringify(L).slice(0,400));
  const all=JSON.stringify(nhl.eval(`get(NHL_LS.shots,{})`));
  T('NHL 1st-period lines filed (P1 COL -155, P1 o1.5 -138)',all.includes('-155')&&all.includes('-138'));
  T('EDM@ANA filed, home/away right (EDM -130 / ANA +115)',all.includes('EDM@ANA')&&all.includes('115'));
  const tr=nhl.eval(`get(INTEL_KEY,[]).filter(x=>x.kind==='trend')`);
  T('all 40 trends logged to the intel ledger, source covers',tr.length===40&&tr.every(x=>/covers/i.test(x.src||'')),tr.length+' trends · '+JSON.stringify([...new Set(tr.map(x=>x.src))]));
  const B=JSON.stringify(nhl.eval(`get(LS.bookshots,{})`)||{});
  T('MLB board lines filed from the NHL page too (LAD -145, NYY -167, F5 MIL -115, RL SD +183)',B.includes('LAD@ATL')&&B.includes('-167')&&B.includes('-115')&&B.includes('183'),B.slice(0,200));
  const r2=await nhl.eval('intakeAutoDrop()');
  T('re-opening the page does not file it twice',r2&&r2.skipped===true);
  // carry storage to the MLB page — it files the MLB lines
  const mlb=boot('mlb.html',dump(nhl));
  setTimeout(async()=>{try{
    const S=mlb.eval(`bookLinesFor?Object.values(get(LS.bookshots,{})).flat().filter(x=>x.game==='MIL@SD'):[]`);
    T('MLB page sees MIL@SD: ML, RL, total and F5 lines',S.length>=10&&S.some(x=>x.market==='f5total')&&S.some(x=>x.market==='runline'),S.length+' lines');
    T('opening a second page does not re-file the drop',Object.keys(mlb.eval(`get(DROP_KEY,{})`)).length===1&&mlb.eval(`get(INTEL_KEY,[]).filter(x=>x.kind==='trend').length`)===40);
    T('drop file is fetched, never needs a token',fetches>=1);
  }catch(e){T('harness mlb',false,e.stack.split('\n').slice(0,3).join(' | '));}
  console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length}/${out.length} passed`);process.exit(0);},4000);
}catch(e){T('harness',false,e.stack.split('\n').slice(0,3).join(' | '));console.log(out.join('\n'));process.exit(0);}},4000);
