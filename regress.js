const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
async function page(file,extra){
  let html=fs.readFileSync(path.join(W,file),'utf8');
  html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
  const errors=[];
  const nflSB={events:[{id:'9001',date:'2026-10-11T17:00Z',status:{type:{state:'pre'}},competitions:[{competitors:[
    {homeAway:'away',team:{abbreviation:'LAC',displayName:'Los Angeles Chargers',id:'24'},score:''},{homeAway:'home',team:{abbreviation:'BUF',displayName:'Buffalo Bills',id:'2'},score:''}]}]}]};
  const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/'+file,pretendToBeVisual:true,beforeParse(w){
    w.fetch=u=>Promise.resolve({ok:true,status:200,json:()=>Promise.resolve(/football\/nfl\/scoreboard/.test(u)?nflSB:{}),text:()=>Promise.resolve('{}')});
    w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.localStorage.setItem('d4.key',JSON.stringify('K'));w.localStorage.setItem('d4.setupDone','1');
    w.addEventListener('error',e=>errors.push((e.error&&e.error.message)||e.message));}});
  await new Promise(r=>setTimeout(r,3000));return{w:dom.window,errors};
}
(async()=>{const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
  for(const f of ['mlb.html','nfl.html','cfb.html']){const {w,errors}=await page(f);
    T(f+' boots, no uncaught errors',errors.length===0,errors.slice(0,2).join(' | '));
    T(f+' has NHL button',!!w.document.getElementById('sportBtn-nhl'));
    if(f==='nfl.html'){
      const before=w.document.getElementById('slate').innerHTML;
      w.eval('render()');const after=w.document.getElementById('slate').innerHTML;
      T('nfl: render() no longer wipes the football board',!/No games today\./.test(after)&&after.length>0,after.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').slice(0,70));
      const gid=w.eval('NFL_GAMES.length?NFL_GAMES[0].id:null');
      if(gid){w.eval(`nflSlipToggle('${gid}','LAC +7',-108)`);const n1=w.eval('SLIP.length'),id=w.eval('SLIP[0]&&SLIP[0].id');
        w.eval(`nflSlipToggle('${gid}','LAC +7',-108)`);const n2=w.eval('SLIP.length');
        T('nfl: tile tap adds with id, second tap removes (was: throw + duplicate)',n1===1&&!!id&&n2===0,`after1=${n1} id=${id} after2=${n2}`);}
      else T('nfl: slate loaded for toggle test',false,'no NFL_GAMES');
      const tix=[
        [`Ticket Number:\n999278333\nAccepted Date:\n9/24/26\nAmount:\n$1.00\nStatus:\nPending\nTo win:\n$2,476.14\nType:\nParlay\nDescription:\nFootball - NFL - Los Angeles Chargers vs Buffalo Bills - Parlay | 477 Los Angeles Chargers +274 for GAME | 09/27/2026 01:00:00 PM (EST) | Pending\nFootball - NFL - Carolina Panthers vs Cleveland Browns - Parlay | 475 Carolina Panthers/Cleveland Browns over 42 -115 for GAME | 09/27/2026 01:00:00 PM (EST) | Pending\nFootball - NFL - Kansas City Chiefs vs Miami Dolphins - Parlay | 472 Miami Dolphins +11 -110 for GAME | 09/27/2026 01:00:00 PM (EST) | Pending\nFootball - NFL - New England Patriots vs Jacksonville Jaguars - Parlay | 469 New England Patriots +2½ -110 for 1ST HALF | 09/27/2026 01:00:00 PM (EST) | Pending\nFootball - NFL - Tennessee Titans vs New York Giants - Parlay | 467 Tennessee Titans/New York Giants over 35½ -150 buying 2 for GAME | 09/27/2026 01:00:00 PM (EST) | Pending`,/5 legs/],
        [`Ticket Number:\n1000054317\nAccepted Date:\n9/27/26\nAmount:\n$1.00\nStatus:\nPending\nTo win:\n$2,277.00\nType:\nSGPs Combined\nDescription:\n5 Leg Parlay (Includes 1 SGPs)\nSGP 1: FOOTBALL - NFL - Miami Dolphins v Kansas City Chiefs\nPlayer stats - T. Kelce 40+ Receiving yds (Game)\nPlayer stats - Malik Willis 150+ Passing yds (Game)\nSpread - Chiefs -0.5 (Game)\nTotal points - Under 55.5 (Game)\nPlayer stats - D. Schultz 5+ Receptions (Game)`,/5 legs/]];
      for(const [t,re] of tix){const r=await w.eval('intakeText('+JSON.stringify(t)+',null,"auto","")');T('nfl: earlier ticket still parses clean',re.test(r.how)&&!/unrecognized|not recognized/.test(r.how),r.how);}
      const cb=w.eval("(()=>{const g=NFL_GAMES[0];if(!g)return'';g.home.abbr='MIA';try{return coachBriefing(g,{aw:.5,hw:.5,awayProj:20,homeProj:21,med:41,over:()=>.5},'nfl')}catch(e){return'ERR '+e.message}})()");
      T('nfl: Coach no longer shows MLB park factors',!/Park factor|park indexes/i.test(cb),cb.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').slice(0,80));
    }
  }
  console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length}/${out.length} passed`);process.exit(0);
})();
