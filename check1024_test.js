/* v2.63 · /check: a pasted slip in any format, each leg graded by the characters */
process.env.AUTOPILOT_KEY='k';process.env.TG_BOT_TOKEN='t';process.env.GITHUB_REPOSITORY='o/r';process.env.GITHUB_TOKEN='g';
const path=require('path');const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
(async()=>{try{const W=await import('file://'+path.join('/home/claude/work','autopilot/worker.mjs'));
  const X={games:[['nhl','WPG@DAL',['WPG','Winnipeg Jets','Winnipeg','Jets'],['DAL','Dallas Stars','Dallas','Stars']],['ncaaf','WVU@TCU',['WVU','West Virginia Mountaineers','West Virginia'],['TCU','TCU Horned Frogs','TCU']],['nhl','SJ@BOS',['SJ','San Jose Sharks','San Jose','Sharks'],['BOS','Boston Bruins','Boston','Bruins']]],
    calls:[['nhl','WPG@DAL','ml','away',null,-130,'Judge',78,1,1],['nhl','WPG@DAL','ml','away',null,-130,'Simulator',74,1,0],['nhl','WPG@DAL','ml','home',null,110,'Coach',58,0,0],
      ['ncaaf','WVU@TCU','spread','home',-11,-111,'Scorekeeper',66,0,1],['nhl','SJ@BOS','total','under',6.5,-112,'Historian',71,1,1]]};
  const r=W.checkTicket('/check Winnipeg Jets ML (-130), West Virginia +11 -109\no6.5 Sharks/Bruins, Lakers ML',X);
  T('reads every leg the way intake does (names, abbreviations, o6.5, prices)',/WPG ML · WPG@DAL/.test(r)&&/WVU \+11 · WVU@TCU/.test(r)&&/Over 6\.5 · SJ@BOS/.test(r)&&/Lakers ML<\/b> — not on today's board/.test(r),r);
  T('who is on each leg and who is fading it',/💪 on it: Judge 78%✅💪, Simulator 74%✅ · 🚫 fading: Coach 58%/.test(r)&&/nobody on it · 🚫 fading: Scorekeeper 66%💪/.test(r));
  T('the green, red and the weakest leg',/🟢 <b>WPG ML/.test(r)&&/🔴 <b>WVU \+11/.test(r)&&/🔴 <b>Over 6\.5/.test(r)&&/Weakest leg:<\/b> (West Virginia|o6\.5)/.test(r)&&/Chance it cashes/.test(r));
}catch(e){T('no crash',false,e.stack);}
const p=out.filter(x=>x.startsWith('PASS')).length;console.log(out.join('\n'));console.log(`${p} pass / ${out.length-p} fail`);process.exit(0);})();
