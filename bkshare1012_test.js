const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
let html=fs.readFileSync(path.join(W,'nhl.html'),'utf8');
html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nhl.html',pretendToBeVisual:true,beforeParse(w){w.__NO_GRADELOOP__=true;w.__NO_BACKFILL__=true;w.__NO_SYNC_LOOP__=true;
  w.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('{}')});w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.localStorage.setItem('d4.setupDone','1');}}).window;
setTimeout(()=>{try{
  const L=(pick,price,hit,sp,game,extra)=>({sp:sp||'nhl',game:game||'A@B',pick,price,p:.5,hit,...(extra||{})});
  w.eval(`set(BKDAYS_KEY,{'2026-10-09':{d:'2026-10-09',locked:true,own:{dec:5,legs:[${JSON.stringify(L('X ML',-200,true))},${JSON.stringify(L('Y ML',-200,false))}]}},
    '2026-10-11':{d:'2026-10-11',locked:true,own:{dec:3,legs:[${JSON.stringify(L('LAR ML',-180,undefined,'nfl','BUF@LAR'))}]}}});
    set(LS.allfinals,{[finalsKey('nfl','BUF@LAR')]:{sport:'nfl',a:37,h:34,d:'2026-10-12',ts:Date.now()}});`);
  w.eval('bkDayGrade()');
  T('a desk leg on a later game (Sunday desk, Monday night) still grades',w.eval(`get(BKDAYS_KEY,{})['2026-10-11'].own.legs[0].hit`)===false);
  const t={dec:10.04,legs:[L('CLE +1.5',-152,true,'mlb','CLE@TB'),L('MIL +1.5',-153,true,'mlb','LAD@MIL'),L('MIN ML',-112,true),L('BUF ML',-107,true)]};
  w.eval(`set(BKDAY_KEY,{d:'2026-10-12',locked:true,own:${JSON.stringify(t)}});`);
  const h=w.eval(`bkShareHtml(${JSON.stringify(t)},'2026-10-12')`).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
  T('cashed Banker parlay gets a share card: +904, 4 for 4, in units',/CASHED · 4 FOR 4/.test(h)&&/\+904/.test(h)&&/\+9\.04 units on a 1-unit play/.test(h),h.slice(0,200));
  T('never dollars on the card',!/\$\d/.test(h));
  T('the honest record rides along (1-2 · +7.0u since the first desk)',/Banker's parlays: 1-2 · \+7\.0u since/.test(h));
  const cap=w.eval(`bkShareText(${JSON.stringify(t)},'2026-10-12')`);T('caption in units, legs listed',/\+9\.04u on a 1-unit play/.test(cap)&&/✅ ⚾ CLE \+1\.5/.test(cap)&&!/\$/.test(cap));
  T('a losing parlay gets no share card',w.eval(`bkShareHtml({dec:3,legs:[${JSON.stringify(L('Q ML',-110,false))}]},'2026-10-12')`)==='');
}catch(e){out.push('CRASH '+e.stack);}
console.log(out.join('\n'));process.exit(0);},1500);
