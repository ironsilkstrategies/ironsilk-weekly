/* v2.89.0 · Nov 8: "The banker is more of a secretary… it doesn't want me to triple dip on teams… listing 5–10 8–10 team parlays
   for the day… spread the games out so I could watch each ticket individually — one game at 12, one at 2:30, one at 5, one at 7:30
   — if that was over/under and spread on the game that would be an 8 teamer… if not, do tickets in shifts… it should also make its
   own single picks… built on every character's bank ledger history." + "Limit to 10 teamer." Invented games, no network. */
const fs=require('fs');const path=require('path');const W='/home/claude/work';const {JSDOM,VirtualConsole}=require('jsdom');
let pass=0,fail=0;const T=(n,c,x)=>{c?pass++:fail++;console.log((c?'PASS ':'FAIL ')+n+(c?'':'  — '+(x||'')));};
let html=fs.readFileSync(path.join(W,'nfl.html'),'utf8');html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const errs=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errs.push(String(e&&e.message||e)));
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nfl.html',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){w.__NO_GRADELOOP__=true;w.__NO_BACKFILL__=true;w.__NO_SYNC_LOOP__=true;
  const RD=w.Date;const OFF=RD.parse('2026-11-08T09:00:00-06:00')-RD.now();class FD extends RD{constructor(...a){if(a.length)super(...a);else super(RD.now()+OFF);}static now(){return RD.now()+OFF;}}FD.parse=RD.parse;FD.UTC=RD.UTC;w.Date=FD;
  w.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('{}')});w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.prompt=()=>null;w.localStorage.setItem('d4.setupDone','1');}}).window;
setTimeout(()=>{try{const E=s=>w.eval(s);const e0=errs.length;const J=JSON.stringify;const D='2026-11-08';
  T('every call has a role in its account: favorite / dog / over / under',J(E(`[bkRole('ml','home',null,-150),bkRole('ml','away',null,130),bkRole('spread','home',-3.5,-110),bkRole('spread','away',3.5,-110),bkRole('total','over',45,-110),bkRole('total','under',45,-110)]`))===J(['fav','dog','fav','dog','over','under']));
  /* the books: Sim's NFL favorites keep winning more than the market says; Coach's NFL favorites keep losing */
  const V=[];for(let i=0;i<60;i++){const d=E(`dayShift('${D}',-${1+(i%25)})`);V.push({id:'s'+i,sp:'nfl',date:d,game:'A'+i+'@H'+i,voice:'Sim',market:'ml',side:'home',price:-150,graded:true,hit:i%10!==0});
    V.push({id:'c'+i,sp:'nfl',date:d,game:'A'+i+'@H'+i,voice:'Coach',market:'ml',side:'home',price:-150,graded:true,hit:i%3===0});}
  E(`set(VOICES_KEY,${J(V)});Object.keys(RO_CACHE).forEach(k=>delete RO_CACHE[k]);BKA_C=null;`);
  const sim=E(`bkAcct('Sim','nfl','ml','fav')`),co=E(`bkAcct('Coach','nfl','ml','fav')`);
  T('the books: an account\'s record, units and edge over the market (Sim NFL favorites 54-6, beating -150\'s ~58%)',sim&&sim.w===54&&sim.l===6&&sim.edge>0.1&&sim.u>0,J(sim));
  T('…a bleeding account shows it (Coach NFL favorites 20-40)',co&&co.edge<-0.1&&co.u<0,J(co));
  T('…what a call is worth to the Banker follows the account (never zero, never more than 2.5×)',E(`bkWorth('Sim','nfl','ml','fav')`)>1.5&&E(`bkWorth('Coach','nfl','ml','fav')`)<0.5&&E(`bkWorth('Coach','nfl','ml','fav')`)>=0.25&&E(`bkWorth('Judge','nfl','ml','fav')`)===1);
  /* his own picks: strong accounts outweigh a crowd of weak ones; a split room or a -400 price, he passes */
  const side=(sd,price,blend,line)=>({sd,price,blend,mk:null,line:line==null?null:line});
  const pk=(voters,a,h)=>E(`bkBankerPick('nfl','ml',${J([side('home',a,0.6),side('away',h,0.4)])},${J(voters.map(([v,s])=>({voice:v,side:s,market:'ml'})))})`);
  const p1=pk([['Sim','home'],['Judge','home']],-150,130);
  T('he backs the side two characters with sound books are on',p1&&p1.sd==='home'&&p1.ex.by.join()==='Sim,Judge',J(p1));
  T('…stays out of a split room',pk([['Sim','home'],['Judge','away']],-150,130)===null);
  T('…and never against the calibrated chance, never shorter than -300',pk([['Sim','away'],['Judge','away']],-150,130)===null&&pk([['Sim','home'],['Judge','home']],-400,300)===null);
  const p2=E(`bkBankerPick('nfl','ml',${J([side('home',-150,0.6),side('away',-150,0.6)])},${J([['Sim','home'],['Judge','home'],['Coach','away'],['Power','away'],['Scout','away']].map(([v,s])=>({voice:v,side:s})))})`);
  T('…two strong accounts can outweigh three (Sim + Judge over Coach, Power, Scout on a favorite)',p2&&p2.sd==='home',J(p2));
  /* the sheet: Sunday-style slate — 4 windows (noon, 2:30, 5, 7:30) × 4 games, each with an official spread and total */
  const wins=['17:00','19:30','22:00','00:30'];let C=[];let n=0;
  wins.forEach((hm,wi)=>{for(let g=0;g<4;g++){const gm=`W${wi}A${g}@W${wi}H${g}`;const st=(wi===3?'2026-11-09':D)+'T'+hm+':00Z';
    C.push({v:'Sim',sp:'nfl',game:gm,m:'spread',sd:'home',line:-3.5,pick:`W${wi}H${g} -3.5`,price:-110,p:0.72,cf:0.72,start:st},{v:'Judge',sp:'nfl',game:gm,m:'spread',sd:'home',line:-3.5,pick:`W${wi}H${g} -3.5`,price:-110,p:0.71,cf:0.71,start:st},
      {v:'Sim',sp:'nfl',game:gm,m:'total',sd:'over',line:44.5,pick:'Over 44.5',price:-110,p:0.70+g*0.01,cf:0.70+g*0.01,start:st},
      {v:'Judge',sp:'nfl',game:gm,m:'ml',sd:'home',line:null,pick:`W${wi}H${g} ML`,price:-170,p:0.70,cf:0.70,start:st});n++;}});
  C.push({v:'Sim',sp:'nfl',game:'X@Y',m:'total',sd:'over',line:40,pick:'Over 40',price:-110,p:0.72,cf:0.72,start:D+'T17:00:00Z'},{v:'Coach',sp:'nfl',game:'X@Y',m:'total',sd:'under',line:40,pick:'Under 40',price:-110,p:0.72,cf:0.72,start:D+'T17:00:00Z'});
  E(`window.deskCands=()=>${J(C)};BKSH_C=null;localStorage.setItem(BKS_F_K,JSON.stringify({mode:'auto'}));`);
  const S=E(`(()=>{const S=bkSheet();return{mode:S.mode,N:S.N,games:S.games,t:S.tix.map(t=>({n:t.legs.length,g:t.games,w:t.watch.length,legs:t.legs.map(o=>o.game+'|'+o.m)}))};})()`);
  T('16 games × (spread + total) = 32 legs → 4 tickets of 8 — your 8-teamer',S.N===32&&S.t.length===4&&S.t.every(t=>t.n===8),J(S.t.map(t=>t.n)));
  T('…spread by time: every ticket has exactly one game in each window — one game on at a time per ticket',S.mode==='spread'&&S.t.every(t=>t.g===4&&t.w===4),J(S.t.map(t=>[t.g,t.w])));
  const all=S.t.flatMap(t=>[...new Set(t.legs.map(l=>l.split('|')[0]))]);
  T('…each game is on exactly ONE ticket (no paperwork twice)',all.length===new Set(all).size&&all.length===16);
  T('…a spread and its moneyline never ride together (the Banker keeps the stronger one)',S.t.every(t=>!t.legs.some(l=>/\|ml$/.test(l))));
  T('…and a pick with official characters on both sides (X@Y over vs under) stays off',!all.includes('X@Y'));
  E(`bkSheetSet('mode','shift')`);
  const Sh=E(`bkSheet().tix.map(t=>({first:t.first,last:t.last,n:t.legs.length}))`);
  T('shifts: the noon ticket, then the next stretch — each ticket settles before the next gets going',Sh.length===4&&Sh.every((t,i)=>i===0||t.first>=Sh[i-1].last),J(Sh));
  /* a huge day: 70 games × 2 → capped at 10 tickets × 10 legs, weakest games left off */
  const B=[];for(let g=0;g<70;g++){const st=D+'T'+String(17+Math.floor(g/10)).padStart(2,'0')+':00:00Z';B.push({v:'Sim',sp:'ncaab',game:`B${g}@C${g}`,m:'spread',sd:'home',line:-2.5,pick:`C${g} -2.5`,price:-110,p:0.7,cf:0.70+(g%7)*0.01,start:st},{v:'Sim',sp:'ncaab',game:`B${g}@C${g}`,m:'total',sd:'under',line:140,pick:'Under 140',price:-110,p:0.7,cf:0.70+(g%5)*0.01,start:st});}
  E(`window.deskCands=()=>${J(B)};bkSheetSet('mode','auto');`);
  const Big=E(`(()=>{const S=bkSheet();return{tix:S.tix.length,max:Math.max(...S.tix.map(t=>t.legs.length)),N:S.N,dropped:S.dropped.length};})()`);
  T('limit 10: never more than 10 legs a ticket or 10 tickets — the weakest games are left off, and said so',Big.tix===10&&Big.max<=10&&Big.N===100&&Big.dropped===20,J(Big));
  E(`window.deskCands=()=>${J(C)};BKSH_C=null;renderBankerTab();`);
  const bb=(w.document.getElementById('bankerBody')||{}).textContent||'';
  T('the Banker tab opens on the Master Parlay Sheet, copy buttons on every ticket',/The Master Parlay Sheet/.test(bb)&&/Ticket A · 8 legs/.test(bb)&&/Copy the whole sheet/i.test(bb),bb.slice(0,200));
  T('…with his description rewritten: the secretary who reads the books',/the secretary/.test(E(`CHARS.Banker.school`)));
  T('no errors along the way',errs.length===e0,errs.slice(e0).join(' | '));
}catch(e){T('crashed',false,e.stack);}console.log(pass+' pass / '+fail+' fail');process.exit(0);},2500);
