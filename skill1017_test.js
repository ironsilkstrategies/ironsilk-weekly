/* v2.43 · SKILL TICKETS — a character with no official (70%) ticket still fields one from its most
   confident priced calls in lanes not blocked for it; labeled, own record, never on the VIP card. */
const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
const NOW=Date.parse('2026-10-18T15:00:00Z'),D='2026-10-18',ST='2026-10-18T23:00Z';
let id=0;const c=(voice,sp,game,market,side,price,cf,extra)=>({id:'k'+(++id),sp,date:D,game,gid:'g'+game,voice,market,side,line:market==='spread'?(side==='home'?-3:3):null,price,pick:'',cf,...(extra||{})});
const V=[
  /* the Sim has official (70%+) NHL calls → an official ticket, as today */
  c('Sim','nhl','DAL@CHI','ml','away',-191,0.75),c('Sim','nhl','CAR@WPG','ml','away',-179,0.74),
  /* the Judge has nothing at 70% — its best CFB calls make its skill ticket */
  c('Judge','ncaaf','OSU@IU','spread','home',-115,0.59),c('Judge','ncaaf','ND@BYU','spread','home',-110,0.585),c('Judge','ncaaf','TOL@EMU','spread','home',-110,0.57),
  c('Judge','ncaaf','A1@B1','spread','home',-110,0.50),            /* under 55% → never */
  c('Judge','ncaaf','A2@B2','ml','home',-350,0.80),               /* priced shorter than -300 → never */
  c('Judge','ncaaf','A3@B3','ml','away',150,0.39),                /* negative value at the price → never */
  c('Judge','ncaaf','A4@B4','spread','away',-110,0.62,{kof:1}),    /* switched off in its ideology → never */
  /* the Coach has a single qualifying call → no ticket (needs 2) */
  c('Coach','ncaaf','X1@Y1','total','over',-110,0.58),
];
const games=['OSU@IU','ND@BYU','TOL@EMU','A1@B1','A2@B2','A3@B3','A4@B4','X1@Y1','DAL@CHI','CAR@WPG'];
let html=fs.readFileSync(path.join(W,'cfb.html'),'utf8');html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
function boot(store){return new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/cfb.html',pretendToBeVisual:true,beforeParse(w){
  const RD=w.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[NOW]))}static now(){return NOW}}w.Date=FD;w.__NO_GRADELOOP__=true;w.__NO_REOPEN__=true;
  w.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;
  w.localStorage.setItem('d4.setupDone','1');Object.entries(store).forEach(([k,v])=>w.localStorage.setItem(k,JSON.stringify(v)));}}).window;}
const TCcard={d:D,by:{ncaaf:{ts:1,picks:games.filter(g=>!/DAL|CAR/.test(g)).map(g=>({sp:'ncaaf',game:g,m:'spread',sd:'home',pick:'x',price:-110,start:ST}))},nhl:{ts:1,picks:[]}}};
const w=boot({'d4.voices':V,'d4.todaycard':TCcard});
setTimeout(()=>{try{
  w.eval(`deskGameStart=function(){return '${ST}'};`);
  const P=w.eval(`deskAllocate(null,'${D}')`);
  const J=P.chars.Judge,S=P.chars.Sim;
  T('the Sim keeps its OFFICIAL ticket (70%+ legs)',S&&!S.skill&&S.legs.length===2&&S.legs.every(l=>l.p>=0.70),S&&JSON.stringify(S.legs.map(l=>l.game+' '+l.p)));
  T('the Judge (no 70% call) now fields a SKILL ticket instead of sitting out',J&&J.skill===true&&J.legs.length>=2,J&&JSON.stringify(J.legs.map(l=>l.game+' '+l.p)));
  T('…from its most confident calls first (59%, 58.5%)',J&&J.legs[0].game==='OSU@IU'&&J.legs[1].game==='ND@BYU');
  const bad=['A1@B1','A2@B2','A3@B3','A4@B4'];T('…never a sub-55% leg, a -350 leg, a negative-value leg or a switched-off call',J&&!J.legs.some(l=>bad.includes(l.game)));
  T('…every leg labeled as a skill pick',J&&J.legs.every(l=>l.skill&&/skill pick/.test((l.why||[]).join(' '))));
  T('…sized like any ticket: 30%+ to cash',J&&J.p>=0.30,J&&J.p.toFixed(3));
  T('the Coach with one qualifying call still sits out (a parlay needs 2)',!P.chars.Coach);
  /* v2.59 · every character's parlay goes on the VIP card now: the 70%+ tickets first, the strong-suit (skill) tickets after, labelled */
  T('the VIP card lists the official tickets first, then the strong-suit tickets, marked as such',w.eval(`(()=>{const C=subCard();return C.chars.length>1&&C.chars[0].v==='Sim'&&!C.chars[0].skill&&C.chars.slice(1).every(x=>x.skill)})()`));
  /* frozen day from before skill tickets: added once, official untouched */
  const off={d:D,locked:true,lockedAt:NOW-3600e3,own:null,chars:{Sim:S},use:{},where:{}};
  const w2=boot({'d4.voices':V,'d4.todaycard':TCcard,'d4.deskplan':off,'d4.charparlays':{[D]:{locked:true,by:{Sim:{voice:'Sim',d:D,legs:S.legs,dec:S.dec,p:S.p}}}}});
  setTimeout(()=>{try{
    w2.eval(`deskGameStart=function(){return '${ST}'};`);
    const A=w2.eval('deskPlan()');
    T('a day frozen before v2.43: the skill ticket is ADDED, the official ticket is unchanged',A.chars.Judge&&A.chars.Judge.skill&&JSON.stringify(A.chars.Sim.legs.map(l=>l.game))===JSON.stringify(S.legs.map(l=>l.game))&&A.skillDone>0);
    const C=w2.eval('cparState()');T('…and it shows up in the character parlays',C.by.Judge&&C.by.Judge.skill&&C.by.Sim&&!C.by.Sim.skill);
    const n1=JSON.stringify(w2.eval('get(DESK_KEY,{}).chars'));w2.eval(`set('d4.voices',get('d4.voices',[]).concat([{id:'late',sp:'ncaaf',date:'${D}',game:'Z@Q',voice:'Coach',market:'total',side:'under',line:50,price:-110,cf:0.6}]));RO_CACHE['d4.voices']=null;`);
    const n2=JSON.stringify(w2.eval('deskPlan().chars'));T('…added once: a frozen plan never changes again',n1===n2);
    /* records: skill tickets keep their own record */
    w2.eval(`(()=>{const S=get(CPAR_KEY,{});S['${D}'].by.Judge.done=true;S['${D}'].by.Judge.won=true;S['${D}'].by.Sim.done=true;S['${D}'].by.Sim.won=false;set(CPAR_KEY,S);})()`);
    const ro=w2.eval(`cparRecord('Judge')`),rs=w2.eval(`cparRecord('Judge',true)`),so=w2.eval(`cparRecord('Sim')`);
    T('the official record ignores skill tickets; the skill record counts them',ro.w+ro.l===0&&rs.w===1&&so.l===1,JSON.stringify({ro,rs,so}));
    const cl=w2.eval(`cashedList(30).filter(x=>x.who.some(n=>/Judge/.test(n))).length`);T('a cashed skill ticket is not showcased publicly (it never went to VIP)',cl===0);
  }catch(e){T('no crash (frozen)',false,e.stack.slice(0,400));}
  const p=out.filter(x=>x.startsWith('PASS')).length;console.log(out.join('\n'));console.log(`${p} pass / ${out.length-p} fail`);process.exit(0);},3000);
}catch(e){T('no crash',false,e.stack.slice(0,400));const p=out.filter(x=>x.startsWith('PASS')).length;console.log(out.join('\n'));console.log(`${p} pass / ${out.length-p} fail`);process.exit(0);}},3000);
