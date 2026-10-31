/* v2.80.8 · MLB hidden for the off-season (and any sport can be), sportsbook CFB names resolve, an empty card keeps its why */
const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
function page(file,pre){let html=fs.readFileSync(path.join(W,file),'utf8');
  html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
  return new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/'+file,pretendToBeVisual:true,beforeParse(w){
    const RD=w.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[RD.parse('2026-10-31T15:00:00Z')]))}static now(){return RD.parse('2026-10-31T15:00:00Z')}}w.Date=FD;
    w.__NO_GRADELOOP__=true;w.__NO_BACKFILL__=true;w.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});
    w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.localStorage.setItem('d4.setupDone','1');if(pre)pre(w);}}).window;}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{try{
  const w=page('nba.html');await sleep(2500);
  T('MLB starts hidden (off-season)',w.eval('sportOn("mlb")')===false&&w.eval('sportOn("nba")')===true);
  T('the master evaluation and "Load all sports" skip it',!w.eval('liveSports()').includes('mlb'),JSON.stringify(w.eval('liveSports()')));
  T('its button leaves the sport bar',w.document.getElementById('sportBtn-mlb').style.display==='none'&&w.document.getElementById('sportBtn-nba').style.display!=='none');
  w.eval(`(()=>{const T={d:today(),by:{mlb:{ts:Date.now(),picks:[{sp:'mlb',game:'NYY@LAD',pick:'LAD ML',m:'ml',sd:'home',price:-120,start:new Date(Date.now()+3*36e5).toISOString()}]}}};set(TC_KEY,T);})()`);
  const b=w.eval('best5Build()');T('a hidden sport stays off the Best card even if its picks are on file',!JSON.stringify(b.picks||[]).includes('NYY@LAD')&&!(b.sports||[]).includes('mlb'),JSON.stringify(b.sports));
  T('…and off the Top 10',!JSON.stringify(w.eval('subTop10()')).includes('NYY@LAD'));
  w.eval("tab('settings')");const box=w.document.getElementById('sportsOffBox');
  T('Settings → Sports shown lists every sport with its state',box&&/Sports shown/.test(box.innerHTML)&&/MLB: <b>hidden<\/b>/.test(box.innerHTML)&&/NBA: <b>shown<\/b>/.test(box.innerHTML),box&&box.textContent.slice(0,160));
  w.eval("sportToggle('mlb')");T('one tap brings MLB back (button too)',w.eval('sportOn("mlb")')===true&&w.document.getElementById('sportBtn-mlb').style.display!=='none'&&w.eval('liveSports()').includes('mlb')===w.eval('spInSeason("mlb")'));
  w.eval("sportToggle('mlb')");T('and hides it again',w.eval('sportOn("mlb")')===false);
  /* an empty card keeps why */
  w.eval(`set(BEST5_KEY,{d:today(),locked:true,lockedAt:Date.now(),top3:[],picks:[],why3:{total:21,price:6,day:0,started:0,flag:5,ev:0,tier:0,prob:0,conf:4,lane:6}});localStorage.removeItem('d4.best5log');best5Lock=best5Lock;`);
  w.eval('best5Grade()');const E=w.eval(`(get('d4.best5log',{})||{})[today()]`);
  T('an empty locked card is logged with the rule each candidate missed',E&&E.why&&E.why.price===6&&E.why.lane===6,JSON.stringify(E&&E.why));
  const H=w.eval(`b3EmptyWhyHtml((get('d4.best5log',{})||{})[today()])`);
  T('the Recap explains it',/Why no Best 3 that day/.test(H)&&/<b>6<\/b> priced outside/.test(H)&&/<b>4<\/b> no character officially 70%/.test(H),H.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').slice(0,240));
  w.close();
  /* CFB: sportsbook names → ESPN teams */
  const c=page('cfb.html');await sleep(3000);
  c.eval(`NCAAF_GAMES=[{away:{abbr:'MIA',name:'Miami Hurricanes',location:'Miami',shortName:'Miami'},home:{abbr:'UNC',name:'North Carolina Tar Heels',location:'North Carolina',shortName:'North Carolina'}},
    {away:{abbr:'CONN',name:'UConn Huskies',location:'UConn',shortName:'UConn'},home:{abbr:'AFA',name:'Air Force Falcons',location:'Air Force',shortName:'Air Force'}},
    {away:{abbr:'APP',name:'App State Mountaineers',location:'App State',shortName:'App State'},home:{abbr:'GASO',name:'Georgia Southern Eagles',location:'Georgia Southern',shortName:'GA Southern'}},
    {away:{abbr:'ILL',name:'Illinois Fighting Illini',location:'Illinois',shortName:'Illinois'},home:{abbr:'MD',name:'Maryland Terrapins',location:'Maryland',shortName:'Maryland'}},
    {away:{abbr:'ILST',name:'Illinois State Redbirds',location:'Illinois State',shortName:'Illinois St'},home:{abbr:'NCAT',name:'North Carolina A&T Aggies',location:'North Carolina A&T',shortName:'NC A&T'}}];`);
  const R=['Miami Florida','Connecticut','Appalachian State','Illinois','North Carolina','Miami','UConn','App State'].map(n=>c.eval(`ncaafAbbrFor(${JSON.stringify(n)})`));
  T('sportsbook CFB names land on the right ESPN team',JSON.stringify(R)==='["MIA","CONN","APP","ILL","UNC","MIA","CONN","APP"]',JSON.stringify(R));
  c.close();
}catch(e){T('harness',false,e.stack);}
console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length} pass / ${out.filter(x=>x.startsWith('FAIL')).length} fail`);process.exit(0);})();
