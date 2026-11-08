/* ═══ THE UNDERDOG SPOTTER, REBUILT (v2.90.0) ═════════════════════════════════════════════════════════════════════════
   Loaded on every sport page after desk-bank.js.

   Nov 8: "The underdog spotter knows who the underdog teams are… who every time they are an underdog they win or cover…
   looks at team power rankings and history over the season… Value is not his thing… a team matched against another team
   could potentially beat them because of rivalries, skill set, team defense vs offense… teams who lose to underdogs while
   playing a team who beats favorites… penalizes back-to-back games and players returning from injury… predicts every score
   for every game… makes an official 70% confidence call… confidence comes from an internal gut we manufacture."

   THE GUT (0–100, 50 = nothing either way). Every reason is a number you can read on his card:
     · the dog's season as a dog — wins outright, covers (shrunk until it has games behind it)
     · the favorite's season as a favorite — losses, failed covers
     · the triangle — a favorite that drops games to dogs, against a dog that beats favorites
     · power — the season's margins, opponent-adjusted (the feeds robot): a dog getting more than power says it should
     · matchup — the dog's offense against the favorite's defense
     · the conference game (they know each other), the home dog
     · rest — a dog on a back-to-back is docked, a favorite on one helps; byes in football
     · back from injury — a player just off the report is rust: docked on the dog, a small help against a favorite
     · form — the dog's last three covers
   70+ → an official call on the dog's spread; 78+ → the moneyline too (nothing past +300). Every game with a dog gets his
   predicted score, from the market's own number bent by the gut. The data — every final since opening day with its closing
   line — is built off the phone by the feeds robot (teams.json); public results only. */

const DOG_TEAMS_K='d4.feedcache.teamidx';
const DOG_SIG2={nfl:13.5,ncaaf:16,nba:12,ncaab:10.5,nhl:2.2},DOG_HFA={nfl:1.8,ncaaf:2.6,nba:2.2,ncaab:3.0,nhl:0.25};
const DOG_CALL=70,DOG_ML_CALL=78,DOG_ML_MAX=300;
/* a season this young lies: a team's power and scoring are pulled toward average until it has games behind it, and he makes
   no official call until both teams have played enough (NFL 4, CFB 4, NBA 6, NHL 8, CBB 4) */
const DOG_MINN={nfl:4,ncaaf:4,nba:6,nhl:8,ncaab:4},DOG_SHK={nfl:4,ncaaf:5,nba:10,nhl:12,ncaab:8};
let DOG_T=null;
function dogStoreTeams(data){if(!data||!data.t)return 0;const up={};Object.entries(data.up||{}).forEach(([sp,L])=>(L||[]).forEach(u=>{up[sp+'|'+u.a+'@'+u.h]={conf:u.conf,neutral:u.neutral,restA:u.restA,restH:u.restH,st:u.st};}));
  set(DOG_TEAMS_K,{ts:data.ts,lg:data.lg||{},t:data.t,up,ret:data.ret||{}});DOG_T=null;return Object.keys(data.t).length;}
function dogTeams(){if(DOG_T&&Date.now()-DOG_T._t<60e3)return DOG_T.v;const v=roGet(DOG_TEAMS_K,null,60e3);DOG_T={v,_t:Date.now()};return v;}
function dogTeam(sp,ab){const D=dogTeams();if(!D)return null;const t=D.t;return t[sp+'|'+ab]||(typeof mgAb==='function'?t[sp+'|'+mgAb(sp,ab)]:null)||null;}
/* the inverse of the bell curve (Acklam) — turns a moneyline's chance into the margin it implies */
function dogProbit(p){p=Math.min(0.999,Math.max(0.001,p));const a=[-39.69683028665376,220.9460984245205,-275.9285104469687,138.357751867269,-30.66479806614716,2.506628277459239],
  b=[-54.47609879822406,161.5858368580409,-155.6989798598866,66.80131188771972,-13.28068155288572],c=[-0.007784894002430293,-0.3223964580411365,-2.400758277161838,-2.549732539343734,4.374664141464968,2.938163982698783],
  d=[0.007784695709041462,0.3224671290700398,2.445134137142996,3.754408661907416];const q=p<0.02425?Math.sqrt(-2*Math.log(p)):p>1-0.02425?Math.sqrt(-2*Math.log(1-p)):null;
  if(q!=null){const x=(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);return p<0.5?x:-x;}
  const r=(p-0.5),s=r*r;return(((((a[0]*s+a[1])*s+a[2])*s+a[3])*s+a[4])*s+a[5])*r/(((((b[0]*s+b[1])*s+b[2])*s+b[3])*s+b[4])*s+1);}
const dogShr=(k,n,base,m)=>(k+base*(m||6))/(n+(m||6));
const dogImp=a=>a>0?100/(a+100):(-a)/((-a)+100);
/* the gut on one game: o = {sp, a, h, mlA, mlH, hl (home spread), tl (total)} → who the dog is, the score, the reasons */
function dogGut(o){const sp=o.sp,sig=DOG_SIG2[sp];if(!sig)return null;
  let dog=null;if(o.mlA!=null&&o.mlH!=null&&+o.mlA!==+o.mlH)dog=+o.mlA>+o.mlH?'away':'home';else if(o.hl!=null&&+o.hl!==0)dog=+o.hl<0?'away':'home';if(!dog)return null;
  const fav=dog==='away'?'home':'away';const ab=s=>s==='away'?o.a:o.h;
  /* the favorite's expected margin, from the market: the moneyline's no-vig chance through the bell curve, else the spread */
  let mF=null;if(o.mlA!=null&&o.mlH!=null){const qa=dogImp(+o.mlA),qh=dogImp(+o.mlH);const qf=(fav==='away'?qa:qh)/(qa+qh);mF=sig*dogProbit(qf)*(sp==='nhl'?0.55:1);}
  if(mF==null&&o.hl!=null)mF=Math.abs(+o.hl);if(mF==null)return null;
  const S=o.hl!=null&&sp!=='nhl'?Math.abs(+o.hl):mF;
  let G=50;const why=[];const pt=(v,lab)=>{v=Math.max(-15,Math.min(15,v));if(Math.abs(v)>=0.5){G+=v;why.push({v:+v.toFixed(1),lab});}};
  const k=DOG_SHK[sp]||6,sh=n=>n/(n+k);
  const D=dogTeams();const L=(D&&D.lg&&D.lg[sp])||{};const dogSU=L.dogSU||0.33,dogATS=L.dogATS||0.5,ppg=L.ppg||null;
  const Td=dogTeam(sp,ab(dog)),Tf=dogTeam(sp,ab(fav));
  if(Td&&Td.dog&&Td.dog[0]){const [n,w,c,p]=Td.dog;const su=dogShr(w,n,dogSU)-dogSU,ats=dogShr(c,n-p,dogATS)-dogATS;
    pt(60*su,`${ab(dog)} as a dog: ${w}-${n-w} outright`);pt(45*ats,`${ab(dog)} as a dog: ${c}-${n-c-p}${p?'-'+p:''} against the spread`);}
  if(Tf&&Tf.fav&&Tf.fav[0]){const [n,w,c,p]=Tf.fav;const lose=dogShr(n-w,n,dogSU)-dogSU,fail=dogShr(n-c-p,n-p,dogATS)-dogATS;
    pt(50*lose,`${ab(fav)} as a favorite: ${w}-${n-w}`);pt(40*fail,`${ab(fav)} covers as a favorite: ${c}-${n-c-p}`);
    if(Td&&Td.dog&&Td.dog[0]){const dW=dogShr(Td.dog[1],Td.dog[0],dogSU)-dogSU;if(dW>0.05&&lose>0.05)pt(6,`the triangle: ${ab(fav)} drops games to dogs, ${ab(dog)} beats favorites`);}}
  const U=(D&&D.up&&(D.up[sp+'|'+o.a+'@'+o.h]||(typeof mgAb==='function'?D.up[sp+'|'+mgAb(sp,o.a)+'@'+mgAb(sp,o.h)]:null)))||{};
  if(Td&&Tf&&Td.pw!=null&&Tf.pw!=null){const hfa=U.neutral?0:(DOG_HFA[sp]||0)*(fav==='home'?1:-1);const pm=Tf.pw-Td.pw+hfa;const gap=(S-pm)*sh(Math.min(Td.n,Tf.n));   /* the gap is what's shrunk, not the ratings — a young season's power can't overrule the line */
    pt(30*gap/sig,`power says ${ab(fav)} by ${pm.toFixed(1)}, the line says ${S.toFixed(1)}`);}
  if(Td&&Tf&&ppg){const pfD=(Td.pf*Td.n+ppg*k)/(Td.n+k),paF=(Tf.pa*Tf.n+ppg*k)/(Tf.n+k);const mm=(pfD-ppg)+(paF-ppg);
    pt(12*mm/sig,`${ab(dog)}'s offense (${Td.pf.toFixed(1)} a game) vs ${ab(fav)}'s defense (allows ${Tf.pa.toFixed(1)})`);}
  if(U.conf)pt(3,'conference game — they know each other');
  if(dog==='home'&&!U.neutral)pt(4,'home dog');
  const rd=dog==='away'?U.restA:U.restH,rf=dog==='away'?U.restH:U.restA;
  if(sp==='nba'||sp==='nhl'||sp==='ncaab'){if(rd!=null&&rd<=1)pt(-8,`${ab(dog)} on a back-to-back`);if(rf!=null&&rf<=1&&(rd==null||rd>=2))pt(6,`${ab(fav)} on a back-to-back`);}
  else{if(rd!=null&&rd>=13)pt(3,`${ab(dog)} off a bye`);if(rf!=null&&rf>=13)pt(-3,`${ab(fav)} off a bye`);if(rd!=null&&rd<=5&&rf!=null&&rf>=7)pt(-4,`${ab(dog)} on a short week`);}
  const ret=(D&&D.ret)||{};const rr=t=>ret[sp+'|'+t]||(typeof mgAb==='function'?ret[sp+'|'+mgAb(sp,t)]:null)||[];
  const rD=rr(ab(dog)),rF=rr(ab(fav));if(rD.length)pt(-4*Math.min(2,rD.length),`back from injury on ${ab(dog)}: ${rD.slice(0,2).map(x=>x.n).join(', ')}`);if(rF.length)pt(2*Math.min(2,rF.length),`rust on ${ab(fav)}: ${rF.slice(0,2).map(x=>x.n).join(', ')}`);
  if(Td&&Td.form){const last=Td.form.split(' ').slice(-3);const c=last.filter(x=>/c$/.test(x)).length,x=last.filter(x=>/x$/.test(x)).length;if(c||x)pt(2*(c-x),`${ab(dog)} last 3: ${last.join(' ')}`);}
  G=Math.max(0,Math.min(100,Math.round(G)));
  /* his score: the market's margin, bent by the gut — at 50 it's the line, at 100 the dog wins by a third of a typical miss */
  const T0=o.tl!=null?+o.tl:(Td&&Tf?(Td.pf+Tf.pf+Td.pa+Tf.pa)/2:null);let ps=null;
  if(T0!=null){const m=mF-((G-50)/50)*(mF+0.3*sig);const f=(T0+m)/2,d=(T0-m)/2;const a=dog==='away'?d:f,h=dog==='away'?f:d;ps={a:+a.toFixed(1),h:+h.toFixed(1)};}
  why.sort((x,y)=>Math.abs(y.v)-Math.abs(x.v));
  const mn=DOG_MINN[sp]||4;return{dog,fav,G,why,ps,mF:+mF.toFixed(2),known:!!(Td&&Tf&&Td.n>=mn&&Tf.n>=mn)};}
/* his calls on one board game — replaces the old "plus-money value" Spotter */
const DOG_PS={};
function dogCallsV2(sp,g,s,Ln,hl,hlSim,add,tl){const o={sp,a:g.away.abbr,h:g.home.abbr,mlA:Ln.mlA&&amerOk(Ln.mlA.price),mlH:Ln.mlH&&amerOk(Ln.mlH.price),hl:hlSim?null:hl,tl};
  const R=dogGut(o);if(!R)return null;if(R.ps)DOG_PS[sp+'|'+o.a+'@'+o.h]={...R.ps,G:R.G};if(!R.known)return R;
  const ex={dG:R.G,dP:+(R.G/100).toFixed(2),why:R.why.slice(0,5).map(x=>`${x.v>0?'+':''}${x.v} ${x.lab}`),...(R.ps?{pa:R.ps.a,ph:R.ps.h}:{})};
  if(R.G>=DOG_CALL&&hl!=null&&!hlSim)add('Dog','spread',R.dog,ex);
  const pr=R.dog==='away'?o.mlA:o.mlH;if(R.G>=DOG_ML_CALL&&pr!=null&&+pr>0&&+pr<=DOG_ML_MAX)add('Dog','ml',R.dog,ex);
  return R;}
function dogPredFor(sp,g){return DOG_PS[sp+'|'+g.away.abbr+'@'+g.home.abbr]||null;}

/* his card ────────────────────────────────────────────────────────────────────────────────────────────────────────── */
function dogCardV2(){try{const V=roGet(VOICES_KEY,[],30e3)||[];const d=today();const D=dogTeams();
  const L=V.filter(x=>x&&x.voice==='Dog'&&String(x.date).slice(0,10)===d&&!x.graded&&x.dG!=null).sort((a,b)=>(+b.dG||0)-(+a.dG||0));
  const seen=new Set();const rows=L.filter(x=>{const k=x.sp+'|'+x.game;if(seen.has(k))return false;seen.add(k);return true;}).slice(0,8).map(x=>{const both=L.filter(y=>y.sp===x.sp&&y.game===x.game);
    return`<div class="mono" style="font-size:10.5px;padding:5px 0;border-bottom:1px solid var(--rule)">${(SP_LAB[x.sp]||'').split(' ')[0]} <b style="color:var(--chalk)">${both.map(y=>txtEsc(y.pick)+(y.price!=null?` <span style="color:var(--gold)">${y.price>0?'+':''}${y.price}</span>`:'')).join(' · ')}</b> · gut <b style="color:${x.dG>=78?'var(--win)':'var(--gold)'}">${x.dG}</b>
      ${x.pa!=null?`<br><span style="color:var(--mute)">his score: ${txtEsc(x.game.split('@')[0])} ${Math.round(x.pa)} – ${Math.round(x.ph)} ${txtEsc(x.game.split('@')[1])}</span>`:''}
      <br><span style="color:var(--mute);font-size:9.5px">${(x.why||[]).slice(0,4).map(txtEsc).join(' · ')}</span></div>`;}).join('');
  let w=0,n=0,u=0;V.forEach(x=>{if(x.voice!=='Dog'||!x.graded||x.push||x.hit==null||x.dG==null)return;n++;if(x.hit)w++;u+=+x.units||0;});
  const age=D&&D.ts?Math.round((Date.now()-Date.parse(D.ts))/36e5):null;
  return`<div class="tkt" style="margin-top:8px;border-left:3px solid #2dd4bf"><h3 style="margin:0 0 2px">🐕 The Underdog Spotter</h3>
    <div class="sub" style="font-size:10px">Knows the dogs: who wins and covers every time they're getting points, which favorites drop games to dogs, power from the season's margins, offense against defense, rest, and who's back from injury. Official at a gut of ${DOG_CALL}+ (the spread), ${DOG_ML_CALL}+ for the moneyline.</div>
    <div class="mono" style="font-size:10px;color:var(--mute)">${n?`Since the rebuild: ${w}-${n-w} · ${u>=0?'+':''}${u.toFixed(1)}u`:'No graded calls since the rebuild yet'}${D?` · season data ${Object.keys(D.t||{}).length} teams${age!=null?`, ${age}h old`:''}`:' · season data not loaded yet'}</div>
    ${rows||'<div class="sub" style="font-size:10.5px">No dog clears his gut today yet.</div>'}</div>`;}catch(e){return'';}}
if(typeof window!=='undefined'&&!window.__DOG_V2__){window.__DOG_V2__=1;
  if(typeof dogCardHtml==='function')dogCardHtml=dogCardV2;}
