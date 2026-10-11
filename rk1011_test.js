const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
let html=fs.readFileSync(path.join(W,'nfl.html'),'utf8');
html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nfl.html',pretendToBeVisual:true,beforeParse(w){w.__NO_GRADELOOP__=true;w.__NO_BACKFILL__=true;
  w.HTMLMediaElement.prototype.play=function(){this.__playing=true;return Promise.resolve();};w.HTMLMediaElement.prototype.pause=function(){this.__playing=false;};
  w.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('{}')});w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.localStorage.setItem('d4.setupDone','1');}}).window;
setTimeout(()=>{try{
  w.eval(`window.pwrRank=sp=>{const t=sp==='nfl'?[{abbr:'KC',rank:2},{abbr:'LV',rank:30}]:sp==='ncaaf'?[{abbr:'OSU',rank:3},{abbr:'TOL',rank:41}]:[];return{teams:t,by:Object.fromEntries(t.map(x=>[x.abbr,x]))};};
    window.cfbRankOf=t=>t.abbr==='OSU'?{r:5}:null;`);
  T('pro league: power rank next to the name',w.eval(`gameLabel('nfl','KC@LV')`)==='#2 KC@#30 LV');
  T('CFB: poll rank when ranked, power rank when not',w.eval(`gameLabel('ncaaf','TOL@OSU')`)==='#41 TOL@#5 OSU');
  const h=w.eval(`teamNameHtml('ncaaf','OSU')`);T('CFB html shows the power rank too when it differs from the poll',/#5<sup>P3<\/sup>/.test(h),h.replace(/<span[^>]*>/,'').slice(0,60));
  T('unknown team shows no tag',w.eval(`gameLabel('nhl','BOS@TOR')`)==='BOS@TOR');
  const row=w.eval(`legLiveCard({id:'t1',date:today(),legs:[]},{sport:'nfl',game:'KC@LV',pick:'KC -6.5',price:-110,gameDate:today()},{})`);
  T('ticket live leg card carries ranks',/#2/.test(row)&&/#30/.test(row));
  const src=fs.readFileSync(path.join(W,'shared.js'),'utf8');
  T('ticket lists, Banker legs, My Games, gamecast and MLB cards use the ranked names',(src.match(/gameLabelHtml\(x\.sport\|\|'mlb',x\.game\)/g)||[]).length===5&&/gameLabelHtml\(l\.sp,l\.game\)/.test(src)&&/const rk=t=>teamTag\(b\.sp,t\)/.test(src)&&/teamNameHtml\(GC\.sp/.test(src)&&/teamNameHtml\('mlb',g\.away\.abbr\)/.test(src));
  const fe=fs.readFileSync(path.join(W,'football-engine.js'),'utf8'),ne=fs.readFileSync(path.join(W,'nhl-engine.js'),'utf8');
  T('NFL, CFB and NHL card headers use the ranked names',/teamNameHtml\('nfl',g\.away\.abbr\)/.test(fe)&&/teamNameHtml\('ncaaf',g\.away\.abbr\)/.test(fe)&&/teamNameHtml\('nhl',A\)/.test(ne));
  T('public picks page shows ranked matchups',/x\.gl\|\|x\.game/.test(fs.readFileSync(path.join(W,'picks.html'),'utf8')));
  /* radio */
  const strip=w.eval(`pwrStrip('nfl',{away:{abbr:'KC'},home:{abbr:'LV'}})`);T('every game strip has a 📻 button',/radioOpen\('nfl','KC@LV'\)/.test(strip));
  w.eval(`radioOpen('nfl','KC@LV')`);const sh=w.document.getElementById('radioSheet');
  T('📻 opens the broadcast finder for both teams + official audio',sh&&/tunein\.com\/search/.test(sh.innerHTML)&&/NFL\+/.test(sh.innerHTML)&&sh.querySelectorAll('input').length===2);
  w.document.getElementById('rad_nfl_KC').value='https://stream.example.com/kcradio.mp3';w.eval(`radioSave('nfl','KC','rad_nfl_KC')`);
  const a=w.document.getElementById('radioAud');
  T('saving a stream link plays it in the docked mini-player',a&&a.src==='https://stream.example.com/kcradio.mp3'&&a.__playing&&/KC radio/.test(w.document.getElementById('radioLab').textContent));
  T('the link is remembered for that team',w.eval(`radioSaved('nfl','KC')`)==='https://stream.example.com/kcradio.mp3');
  w.eval(`tab('tickets')`);T('switching tabs keeps it playing',!!w.document.getElementById('radioBar')&&a.__playing);
  w.eval(`document.getElementById('radioBar').remove();radioResumeOffer()`);T('next page offers one-tap resume',/tap ▶ to keep listening/.test(w.document.getElementById('radioSt').textContent));
  w.eval('radioStop()');T('✕ stops and forgets it',!w.document.getElementById('radioBar')&&!w.localStorage.getItem('td.radionow'));
}catch(e){out.push('CRASH '+e.stack);}
console.log(out.join('\n'));process.exit(0);},1500);
