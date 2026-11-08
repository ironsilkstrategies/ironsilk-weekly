/* v2.93.0 · Nov 8: "The coach is a bridge between the calibration feature and the characters… he sees the flaws and makes sure
   they're corrected… he knows what the other characters are doing, he's not influenced by it… nobody ever has too much dip on
   their chip via strategic calibrations… a predicted final score for all calls, independent… reads all news articles about the
   games he's calling." Invented calls, teams, news and weather; no network. */
const fs=require('fs');const path=require('path');const W='/home/claude/work';const {JSDOM,VirtualConsole}=require('jsdom');
let pass=0,fail=0;const T=(n,c,x)=>{c?pass++:fail++;console.log((c?'PASS ':'FAIL ')+n+(c?'':'  — '+(x||'')));};
let html=fs.readFileSync(path.join(W,'nfl.html'),'utf8');html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const errs=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errs.push(String(e&&e.message||e)));
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nfl.html',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){w.__NO_GRADELOOP__=true;w.__NO_BACKFILL__=true;w.__NO_SYNC_LOOP__=true;
  const RD=w.Date;const OFF=RD.parse('2026-11-08T09:00:00-06:00')-RD.now();class FD extends RD{constructor(...a){if(a.length)super(...a);else super(RD.now()+OFF);}static now(){return RD.now()+OFF;}}FD.parse=RD.parse;FD.UTC=RD.UTC;w.Date=FD;
  w.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('{}')});w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.prompt=()=>null;w.localStorage.setItem('d4.setupDone','1');}}).window;
setTimeout(()=>{try{const E=s=>w.eval(s);const e0=errs.length;const J=JSON.stringify;const D='2026-11-08';
  /* the ledger: Sim says 72% on NBA spread favorites and hits 50% (60 calls); Power says 66% on NFL ML favorites and hits 85% (60);
     the old Dog (value calls) lost — its new gut has no record yet */
  const V=[];for(let i=0;i<60;i++){const d=E(`dayShift('${D}',-${1+(i%20)})`);
    V.push({id:'s'+i,sp:'nba',date:d,game:'A'+i+'@H'+i,voice:'Sim',market:'spread',side:'home',line:-4.5,price:-110,cf:0.72,graded:true,hit:i%2===0});
    V.push({id:'p'+i,sp:'nfl',date:d,game:'B'+i+'@C'+i,voice:'Power',market:'ml',side:'home',price:-150,cf:0.66,graded:true,hit:i%20<17});
    V.push({id:'d'+i,sp:'nba',date:d,game:'E'+i+'@F'+i,voice:'Dog',market:'spread',side:'away',line:6.5,price:-110,cf:0.68,graded:true,hit:i%3===0});}
  E(`set(VOICES_KEY,${J(V)});Object.keys(RO_CACHE).forEach(k=>delete RO_CACHE[k]);COACH_B=null;`);
  const sim={voice:'Sim',sp:'nba',market:'spread',side:'home',line:-3.5,price:-110,cf:0.72,date:D},pw={voice:'Power',sp:'nfl',market:'ml',side:'home',price:-150,cf:0.66,date:D};
  T('a lane that says 72% and hits 50% is reined in — its 72% call carries ~59%, no longer official',E(`coachConf(${J(sim)})`)<0.62&&E(`isOfficial(${J(sim)})`)===false,String(E(`coachConf(${J(sim)})`)));
  T('a lane that says 66% and hits 85% gets room (capped ×1.25)',E(`coachConf(${J(pw)})`)>0.69,String(E(`coachConf(${J(pw)})`)));
  T('a lane within 10% of its word is left alone (no shaving everybody)',E(`coachBand(0.95)`)===1&&E(`coachBand(1.08)`)===1&&E(`coachBand(0.8)`)===0.8);
  T('a rebuilt gut is judged only on its own graded calls — the old Dog\'s losses don\'t touch the new Dog\'s 74',Math.abs(E(`coachConf({voice:'Dog',sp:'nba',market:'spread',side:'away',line:6.5,price:-110,dG:74,date:'${D}'})`)-0.74)<1e-9);
  T('he never rewrites history: a Nov 1 call keeps the 72% it was posted with, and stays official',E(`coachConf(${J({...sim,date:'2026-11-01'})})`)===0.72&&E(`isOfficial(${J({...sim,date:'2026-11-01'})})`)===true);
  T('…and a day is judged only by what was graded before it (today\'s early results don\'t move today\'s calls)',(()=>{const b=E(`coachConf(${J(sim)})`);E(`set(VOICES_KEY,get(VOICES_KEY,[]).concat(Array.from({length:30},(_, i)=>({id:'t'+i,sp:'nba',date:'${D}',game:'T'+i+'@U'+i,voice:'Sim',market:'spread',side:'home',line:-4.5,price:-110,cf:0.72,graded:true,hit:true}))));Object.keys(RO_CACHE).forEach(k=>delete RO_CACHE[k]);`);const a=E(`coachConf(${J(sim)})`);E(`set(VOICES_KEY,${J(V)});Object.keys(RO_CACHE).forEach(k=>delete RO_CACHE[k]);`);return a===b;})());
  T('…never above 92%',E(`coachConf({voice:'Power',sp:'nfl',market:'ml',side:'home',price:-900,cf:0.95,date:'${D}'})`)<=0.92);
  /* groupthink: 5+ agreeing earns no more than 1–2 */
  const R={};for(let i=0;i<120;i++){const n=i<60?5:2;R['s|nba|'+i]={t:'s',sp:'nba',d:E(`dayShift('${D}',-${1+(i%20)})`),mk:'spread',q:0.5,n,no:0,e:0,v:'Sim',y:i%2};}
  E(`set(MCAL_ROWS,{v:MCAL_V,ts:Date.now(),rows:${J(R)}});COACH_GT=null;`);
  T('groupthink check: when a crowd isn\'t more right, the Banker stops paying extra for agreement',E(`coachAgreeW('nba')`)===0&&E(`coachAgreeW('nhl')`)===0.5);
  /* his own game: teams, the robot's file (news, weather, spots) */
  E(`dogStoreTeams({v:1,lg:{nfl:{ppg:22,dogSU:0.3,dogATS:0.48}},t:{'nfl|CLE':{n:8,pf:17,pa:25,dog:[6,2,3,0],fav:[2,1,1,0],form:'L L',last:'2026-11-01',pw:-5},'nfl|NO':{n:8,pf:27,pa:18,dog:[2,1,1,0],fav:[6,5,4,0],form:'W W',last:'2026-10-26',pw:6},'nfl|PIT':{n:8,pf:26,pa:17,pw:8,dog:[0,0,0,0],fav:[0,0,0,0],form:'',last:'2026-11-01'}},
    up:{nfl:[{a:'CLE',h:'NO',st:'2026-11-08T18:00Z',conf:0,neutral:0,restA:7,restH:14}]},ret:{}})`);
  E(`coachStore({v:1,g:{'nfl|CLE@NO':{st:'2026-11-08T18:00Z',indoor:false,wx:{temp:40,wind:22,gust:30,pop:70,cond:'Rain'},
    a:{ab:'CLE',fl:{qb:1,out:1},heads:[{h:'Browns to start backup quarterback',f:['qb']}],last:{d:'2026-11-01',opp:'PIT',m:-24,opw:8},next:{d:'2026-11-15T18:00Z',opp:'PIT',opw:8}},
    h:{ab:'NO',fl:{},heads:[],last:{d:'2026-10-26',opp:'TB',m:3,opw:0},next:null}}}})`);
  const G=E(`coachGame({sp:'nfl',a:'CLE',h:'NO'})`);const L=G.why.map(x=>x.v+' '+x.lab).join(' | ');
  T('his score starts from nobody\'s numbers but the season (each offense vs the other\'s defense)',G&&G.ps.h>G.ps.a,J(G&&G.ps));
  T('…then what a coach sees: the news (a QB change, a player out), the bounce-back, the look-ahead, the bye',/-2\.5 CLE news: a quarterback change/.test(L)&&/CLE news: 1 report of a player out/.test(L)&&/CLE bounce-back after losing by 24/.test(L)&&/NO off a bye/.test(L),L);
  T('…and the weather at kickoff (22 mph wind, 70% rain) pulls the total down',G.twhy.some(x=>/wind 22 mph/.test(x.lab))&&G.twhy.some(x=>/70% chance of rain/.test(x.lab))&&(G.ps.a+G.ps.h)<40,J({t:G.ps.a+G.ps.h,tw:G.twhy}));
  const got=[];w.__got=got;
  E(`coachCallsV2('nfl',{away:{abbr:'CLE'},home:{abbr:'NO'}},{mlA:{price:240},mlH:{price:-290},spH:{line:-3,price:-110},spA:{line:3,price:-110}},-3,false,46.5,false,(v,m,s,ex)=>window.__got.push({v,m,s,ex}))`);
  const sc=got.find(x=>x.m==='spread'),tc=got.find(x=>x.m==='total');
  T('his side comes from his score against the line (NO by ~10 vs -3 → NO, 70+)',sc&&sc.s==='home'&&sc.ex.cG>=70&&sc.ex.pa!=null,J(sc));
  T('…and his total from his score against the number (under 46.5 in the wind and rain)',tc&&tc.s==='under'&&tc.ex.cG>=70,J(tc));
  T('official at 70+ through his own clipboard',E(`isOfficial({voice:'Coach',sp:'nfl',market:'spread',side:'home',line:-3,price:-110,cG:74,date:'${D}'})`)===true&&E(`isOfficial({voice:'Coach',sp:'nfl',market:'spread',side:'home',line:-3,price:-110,cG:64,date:'${D}'})`)===false);
  T('a predicted score on every game',E(`scoreCallsFor('nfl',{away:{abbr:'CLE'},home:{abbr:'NO'}},{awayProj:17,homeProj:27},[])`).some(x=>x.voice==='Coach'));
  const card=E('coachCardHtml()').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
  T('the clipboard: who he reined in, who he gave room, the groupthink check',/Reined in/.test(card)&&/SIM NBA spread favorites: says 72%, hits 50% on 60/.test(card)&&/Given room/.test(card)&&/Groupthink check/.test(card),card.slice(0,400));
  T('his description: keeps everyone honest',/keeps everyone honest/.test(E('CHARS.Coach.school')));
  T('no errors along the way',errs.length===e0,errs.slice(e0).join(' | '));
}catch(e){T('crashed',false,e.stack);}console.log(pass+' pass / '+fail+' fail');process.exit(0);},2500);
