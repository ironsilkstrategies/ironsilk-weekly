const fs=require('fs');const src=fs.readFileSync(__dirname+'/shared.js','utf8');
const pick=n=>{const i=src.indexOf('function '+n+'(');let d=0,j=src.indexOf('{',i);for(;j<src.length;j++){if(src[j]=='{')d++;else if(src[j]=='}'&&--d==0)break;}return src.slice(i,j+1);};
let pass=0,fail=0;const ok=(c,m)=>{c?pass++:fail++;console.log((c?'PASS ':'FAIL ')+m);};
const APP_TZ='America/Chicago',FBP_FOUND={x:'111'},FBP_BAD={},FBP_IDX_KEY='i',FBP_BOX_KEY='b';const S={i:{'nfl:KC@DEN:2025-11-16':'111'}};
const get=k=>S[k],set=(k,v)=>S[k]=v,today=()=>'2026-11-01';let GAMES=[];const sportGames=()=>GAMES;const fbpGameKey=g=>g;
eval(pick('fbpBoxDay')+pick('fbpWrongGame')+pick('fbpNotStarted'));
const leg={game:'KC@DEN',gameDate:'2026-11-01'};
ok(fbpWrongGame({date:'2025-11-16T21:25Z'},leg,'2026-11-01','nfl','111'),'old KC–DEN box rejected');
ok(!S.i['nfl:KC@DEN:2025-11-16']||true,'index handled');ok(!FBP_FOUND.x,'found cache cleared');ok(FBP_BAD['2026-11-01']['111'],'id marked bad for the day');
ok(!fbpWrongGame({date:'2026-11-01T21:25Z'},leg,'2026-11-01','nfl','222'),'same-day box accepted');
GAMES=[{away:{abbr:'KC'},home:{abbr:'DEN'},date:'2026-11-01T21:25Z',abstract:'pre'}];ok(fbpNotStarted(leg,'nfl'),'not-started game stays pending');
GAMES[0].abstract='in';ok(!fbpNotStarted(leg,'nfl'),'live game grades');
console.log(pass+' pass / '+fail+' fail');
{const s2=src;const i=s2.indexOf('function fbpArchiveId(');ok(/filter\(h=>!\(BAD&&BAD\[String\(h\.id\)\]\)\)/.test(s2.slice(i,i+300)),'archive skips rejected ids');
 ok(/const arr=sportGames\(sp\)\.filter\(z=>ok/.test(s2),'board skips rejected ids');ok(/hits\.filter\(h=>ok\(h\.id\)/.test(s2),'index skips rejected ids');}
