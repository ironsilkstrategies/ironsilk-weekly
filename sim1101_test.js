const src=require('fs').readFileSync(__dirname+'/bball-engine.js','utf8');eval(src.match(/function bbSimLine[^\n]*/)[0]);
const s={margin:80.0-76.6};let f=0;const ok=(c,m)=>{if(!c)f++;console.log((c?'PASS ':'FAIL ')+m);};
ok(bbSimLine(s.margin)==='+3.4','away dog (MIA) shows +3.4');ok(bbSimLine(-s.margin)==='-3.4','home fav (FLA) shows -3.4');
ok(/s\.cover\('away',\+spA\.line\),bbSimLine\(s\.margin\)/.test(src),'away tile uses +margin');console.log((3-f)+' pass / '+f+' fail');
