/* ═══ THE VOICES (v2.44) — every character explains its pick like a person ═════════════
   Loaded on every sport page after desk-mind.js.

   A read has five beats, in the character's own voice and in plain English:
     the take  — one line, in character
     the story — the people and the situation: players, injuries, rest, form, history
     the proof — two or three numbers that back the story, said plainly
     the worry — what beats us tonight (an honest read always has one)
     the price — why this number is still worth it
   The rules: every fact comes from a data row the app holds (no row, no sentence); a small
   sample is called small; the machine's words stay in "show the math" underneath. The brain
   picks the side, the heart explains it — a story never changes a pick. */

const VX_CACHE=new Map();let VX_SIG='';const VX_FROM='2026-10-18';
const vxSp=sp=>(typeof CONF_SP_LAB!=='undefined'&&CONF_SP_LAB[sp])||String(sp||'').toUpperCase();
const vxPct=p=>Math.round(p*100)+'%';
const vxPrice=p=>p==null?'':(+p>0?'+':'')+(+p);
const vxN=(v,d)=>{v=+v;return Math.abs(v)<10?v.toFixed(d==null?1:d).replace(/\.0$/,''):Math.round(v).toString();};
const vxR=v=>{v=+v;return Math.abs(v)<10?v.toFixed(1):Math.round(v).toString();};
/* a team as people say it — "Dallas", "Ohio State", "Tampa Bay": its display name minus the nickname,
   read from the games the app holds; the abbreviation when it has nothing better */
const VX_NAMES={},VX_REC={};let VX_NAMES_TS=0;
const VX_MASCOT2=/\s+(Crimson Tide|Fighting Irish|Blue Devils|Yellow Jackets|Tar Heels|Sun Devils|Horned Frogs|Red Raiders|Nittany Lions|Golden Gophers|Golden Eagles|Mean Green|Demon Deacons|Scarlet Knights|Golden Bears|Black Knights|Golden Flashes|Green Wave|Ragin' Cajuns|Rainbow Warriors|Golden Hurricane|Red Wolves|Thundering Herd|Blue Raiders|Fighting Illini|Black Bears|Blue Hens|Mountain Hawks|Red Storm|Golden Griffins|Fighting Hawks|Golden Lions|Delta Devils|Big Red|Big Green|Wolf Pack|Maple Leafs|Blue Jackets|Golden Knights|Red Wings|Trail Blazers|Red Sox|White Sox|Blue Jays|Golden Hurricanes|Golden Panthers|Mountain Lions|Red Hawks|Blue Demons|Golden Grizzlies|Purple Eagles|River Hawks|Sea Wolves)$/;
function vxNameIdx(){if(Date.now()-VX_NAMES_TS<60e3)return VX_NAMES;VX_NAMES_TS=Date.now();
  const put=(sp,t)=>{if(!t||!t.abbr)return;const dn=t.displayName||'',nm=t.name||t.shortDisplayName||'';let loc=t.location||'';
    if(!loc&&dn&&nm&&dn.endsWith(' '+nm))loc=dn.slice(0,-nm.length-1);if(!loc&&dn&&!nm)loc=dn;
    if(!loc&&nm&&!dn){const full=nm.trim();loc=VX_MASCOT2.test(full)?full.replace(VX_MASCOT2,''):(full.split(' ').length>1?full.split(' ').slice(0,-1).join(' '):full);}   /* college boards carry the full name only */
    if(loc)VX_NAMES[sp+'|'+t.abbr]=loc;if(t.record&&/^\d+-\d+/.test(String(t.record)))VX_REC[sp+'|'+t.abbr]=String(t.record).match(/^\d+-\d+/)[0];};
  try{['nfl','ncaaf','nhl','nba','ncaab','mlb'].forEach(sp=>{(sportGames(sp)||[]).forEach(g=>{put(sp,g.away);put(sp,g.home);});});}catch(e){}
  [['nhl','d4.nhlgames'],['nba','d4.nbasched'],['ncaab','d4.ncaabsched'],['nfl','d4.nflgames'],['ncaaf','d4.ncaafgames']].forEach(([sp,k])=>{try{const S=roGet(k,{},120e3)||{};const L=[...(S.games||[]),...(S.up||[])];
      Object.values(S).forEach(w=>{if(w&&Array.isArray(w.games))L.push(...w.games);});L.forEach(g=>{put(sp,g.away);put(sp,g.home);});}catch(e){}});
  return VX_NAMES;}
function vxName(sp,ab){try{const n=vxNameIdx()[sp+'|'+ab];if(n)return n;const S=pwrStandings(sp);const d=S&&S.meta&&S.meta[ab]&&S.meta[ab].n;if(d){const full=String(d).trim();if(VX_MASCOT2.test(full))return full.replace(VX_MASCOT2,'');const w=full.split(' ');return w.length>1?w.slice(0,-1).join(' '):full;}}catch(e){}return ab;}
const vxLane=k=>{const[sp,m,t]=String(k||'').split('|');const L={fav:'favorites',dog:'underdogs',over:'overs',under:'unders',side:'sides'}[t]||t;return`${vxSp(sp)} ${L}${m==='spread'?' against the spread':m==='ml'?' on the moneyline':''}`;};
function vxTeams(x){const[A,H]=String(x.game||'').split('@');const m=mkNorm(x.m||x.market),sd=x.sd||x.side;const T=m==='total'?null:(sd==='home'?H:A),O=m==='total'?null:(sd==='home'?A:H);return{A,H,T,O,m,sd};}
function vxGame(sp,game){try{return(sportGames(sp)||[]).find(z=>z.away.abbr+'@'+z.home.abbr===game)||null;}catch(e){return null;}}
/* the players behind a team's numbers: season average, recent form (from the box scores the app has read) */
function vxPlayers(sp,team,n){const K={nfl:[['py','passing yards'],['ry','rushing yards'],['wy','receiving yards']],ncaaf:[['py','passing yards'],['ry','rushing yards'],['wy','receiving yards']],
    nhl:[['pts','points'],['g','goals'],['s','shots']],nba:[['pts','points'],['reb','rebounds'],['ast','assists']],ncaab:[['pts','points']],mlb:[['tb','total bases'],['h','hits']]}[sp]||[];
  const out=[];try{const D=pstDb(sp);K.forEach(([k,lab])=>{const P=Object.values(D.p).filter(p=>p.team===team&&p.s&&p.s[k]&&p.s[k].gp>=3).sort((a,b)=>(b.s[k].sum/b.s[k].gp)-(a.s[k].sum/a.s[k].gp))[0];
      if(!P||out.some(o=>o.name===P.name))return;const S=P.s[k];const mean=S.sum/S.gp,ema=S.ema;if(!(mean>0))return;
      out.push({name:P.name,k,lab,mean,ema:isFinite(ema)?ema:null,gp:S.gp,hot:isFinite(ema)&&ema>=mean*1.2&&ema-mean>=(sp==='nhl'?0.25:sp==='nfl'||sp==='ncaaf'?12:1.5),cold:isFinite(ema)&&ema<=mean*0.8&&mean-ema>=(sp==='nhl'?0.25:sp==='nfl'||sp==='ncaaf'?12:1.5)});});}catch(e){}
  return out.slice(0,n||3);}
const VX_SIT={oppb2b:(T,O)=>`${O} played last night — tonight is the second night of a back-to-back`,restedge:(T,O)=>`${T} is rested and ${O} isn't`,b2b:(T,O)=>`${T} played last night`,
  '3in4':(T,O)=>`${T} is playing its third game in four nights`,opp3in4:(T,O)=>`${O} is playing its third game in four nights`,road3:(T,O)=>`${T} is on its third straight road game`,
  shortweek:(T,O)=>`${T} is on a short week`,oppshort:(T,O)=>`${O} is on a short week`,offbye:(T,O)=>`${T} is coming off a bye`,oppoffbye:(T,O)=>`${O} is coming off a bye`,restplus:(T,O)=>`${T} has three or more extra days of rest`,
  hot5:(T,O)=>`${T} has won four of its last five`,cold5:(T,O)=>`${T} has won one or fewer of its last five`,divgame:()=>`it's a division game — they know each other`,
  homedog:(T)=>`${T} is a home underdog`,roadfav:(T)=>`${T} is favored on the road`,westearly:(T)=>`${T} is a West Coast team in an early kickoff — its body clock says 10 a.m.`,westnight:(T)=>`${T} is a West Coast team in a night game against an Eastern team`,
  'talent+':(T)=>`${T} has the clear talent edge`,'talent-':(T,O)=>`${O} has the clear talent edge`,'mismatch+':(T)=>`${T} owns a top-vs-bottom mismatch somewhere on the field`,'mismatch-':(T,O)=>`${O} owns a top-vs-bottom mismatch`,
  qbstar:(T)=>`${T}'s quarterback is in the top 5% in passer rating`,qbbust:(T)=>`${T}'s quarterback is in the bottom 5%`,oppqbstar:(T,O)=>`${O}'s quarterback is in the top 5%`,oppqbbust:(T,O)=>`${O}'s quarterback is in the bottom 5%`,qbfading:(T)=>`${T}'s quarterback has faded over his last three games`,
  goaliestar:(T)=>`${T}'s goalie is in the top 20% in save percentage`,goaliebust:(T)=>`${T}'s goalie is in the bottom 20%`,oppgoaliestar:(T,O)=>`${O}'s goalie is in the top 20% in save percentage`,oppgoaliebust:(T,O)=>`${O}'s goalie is in the bottom 20%`,
  pythlucky:(T)=>`${T} has won more than its scoring says it should`,pythunlucky:(T)=>`${T} has won fewer than its scoring has earned`,
  h2hedge:(T)=>`${T} leads the head-to-head series`,h2hfade:(T)=>`${T} trails the head-to-head series`,wind15:()=>`the wind is blowing 15+ mph`,cold32:()=>`it's freezing — 32° or colder`,dome:()=>`it's indoors, so no weather`};
/* the spots people actually talk about come first: rest and travel, then talent, then the price's role */
const VX_SIT_ORDER=['restedge','oppb2b','opp3in4','oppshort','offbye','restplus','westearly','westnight','qbstar','oppqbbust','goaliestar','oppgoaliebust','talent+','mismatch+','hot5','pythunlucky','h2hedge','divgame','homedog','roadfav','wind15','cold32','dome'];
const vxSitRank=k=>{const i=VX_SIT_ORDER.indexOf(k);return i<0?99:i;};
const VX_BAD=new Set(['b2b','3in4','road3','shortweek','oppoffbye','cold5','talent-','mismatch-','qbbust','oppqbstar','qbfading','goaliebust','oppgoaliestar','pythlucky','h2hfade']);
/* every fact the app holds about this pick — each one a sentence it can stand behind */
function vxFacts(x){const sp=x.sp,d=String(x.date||x.d||today()).slice(0,10);const{A,H,T,O,m,sd}=vxTeams(x);const F={x,sp,d,A,H,T,O,m,sd,Tn:T?vxName(sp,T):null,On:O?vxName(sp,O):null,An:vxName(sp,A),Hn:vxName(sp,H)};
  const V=roGet(VOICES_KEY,[],30e3)||[];const calls=V.filter(c=>c.sp===sp&&c.game===x.game&&c.market===m&&String(c.date).slice(0,10)===d&&CHARS[c.voice]);F.calls=calls;
  F.on=calls.filter(c=>c.side===sd);F.off=calls.filter(c=>c.side!==sd);
  /* the Sim's read and the projected final */
  try{const s=calls.find(c=>c.voice==='Sim'&&(c.simP!=null||c.pUsed!=null));if(s){const p=s.pUsed!=null?s.pUsed:s.simP;F.sim=s.side===sd?p:1-p;}}catch(e){}
  try{const L=simLockFor(sp,x.game,d);if(L&&L.a!=null&&L.h!=null)F.proj={a:+L.a,h:+L.h};else{const g=vxGame(sp,x.game);const S=g?sportSims(sp)[g.id]:null;if(S&&S.awayProj!=null)F.proj={a:+S.awayProj,h:+S.homeProj};}}catch(e){}
  /* power, standing, form, luck */
  try{const R=pwrRank(sp);if(R&&R.by[A]&&R.by[H]){const a=R.by[A],h=R.by[H];F.pw={a,h,hfa:R.h||0,unit:(PWR_CFG[sp]||{}).unit||'pts',n:R.teams.length};
    const mH=h.r-a.r+(R.h||0);F.pw.marginH=mH;
    if(T){const me=T===H?h:a,op=T===H?a:h;F.pw.me=me;F.pw.op=op;F.pw.mT=T===H?mH:-mH;
      const odr=[...R.teams].sort((p,q)=>q.def-p.def).findIndex(t=>t.abbr===op.abbr)+1,tor=[...R.teams].sort((p,q)=>q.off-p.off).findIndex(t=>t.abbr===me.abbr)+1;F.pw.tor=tor;F.pw.odr=odr;}}}catch(e){}
  /* players and injuries */
  try{if(T){F.pl=vxPlayers(sp,T,3);F.plO=vxPlayers(sp,O,2);}else{F.pl=[...vxPlayers(sp,A,2),...vxPlayers(sp,H,2)];}}catch(e){}
  try{const g={id:x.gid,espnId:x.gid};const I=x.gid?injFor(sp,g):null;if(I){const take=ab=>(I[ab]||[]).filter(i=>INJ_W(i.st)>=0.5).slice(0,2);F.injO=O?take(O):[];F.injT=T?take(T):[];if(!T){F.injA=take(A);F.injH=take(H);}}}catch(e){}
  try{const G=scoutGame(sp,A,H);if(G){F.flags=(G.flags||[]).map(f=>({...f,mine:T?f.team===T:null}));}}catch(e){}
  /* the situation tags on this call, and which of them have proven real */
  try{const c=F.on.find(c=>Array.isArray(c.f))||calls.find(c=>Array.isArray(c.f));const fs=(c&&c.f)||[];const FT=factorTable(sp);
    F.sit=fs.filter(k=>VX_SIT[k]).map(k=>({k,bad:VX_BAD.has(k),proven:!!(FT[k]&&FT[k].adj),adj:FT[k]&&FT[k].adj||0,n:FT[k]&&FT[k].n||0}));}catch(e){F.sit=[];}
  /* this season's meetings */
  try{F.met=pwrGames(sp).filter(q=>(q[1]===A&&q[2]===H)||(q[1]===H&&q[2]===A)).slice(-3);}catch(e){}
  /* outside reads: predicted scores, trends, the public */
  try{const p=predFor(sp,x.game);if(p&&p.a!=null)F.pred={a:+p.a,h:+p.h,src:/covers|oddsshark/i.test(p.src||'')?'the Covers computer':'the outside projection'};}catch(e){}
  try{const I=roGet(INTEL_KEY,[],30e3)||[];const Tr=I.filter(t=>t.sp===sp&&t.kind==='trend'&&t.game===x.game&&String(t.date||'').slice(0,10)===d);F.trPro=Tr.filter(t=>trendBacks(t.text,{m,sd})>0).map(t=>t.text);F.trCon=Tr.filter(t=>trendBacks(t.text,{m,sd})<0).map(t=>t.text);
    const R=I.filter(t=>t.sp===sp&&t.kind==='cons'&&t.game===x.game);const mk=m==='ml'?'moneyline':m;const r=R.filter(t=>t.market===mk).pop()||R.filter(t=>t.market==='moneyline').pop();
    if(r){const k=m==='total'?'overPct':'homePct';const v=r[k]!=null?+r[k]:null;if(v!=null)F.pub={pct:m==='total'?(sd==='over'?v:100-v):(sd==='home'?v:100-v),metric:r.metric==='money'?'the money':'the tickets'};}}catch(e){}
  /* the price */
  try{const pr=x.price!=null?amerOk(x.price):null;if(pr!=null)F.imp=imp(pr);F.price=pr;}catch(e){}
  try{const sq=squadOn(sp,x.game,d,m,sd);if(sq&&sq.best)F.squad={name:squadName(sq.best),w:sq.best.w,l:sq.best.n-sq.best.w};}catch(e){}
  return F;}
/* one character's record where this pick lives */
function vxRecord(v,F,c){const out={};try{const lk=laneKey(F.sp,F.m,F.sd,F.x.price,F.x.line);const L=lk&&(laneTable().BYV[v]||{})[lk];if(L&&L.n>=6)out.lane={w:L.w,l:L.n-L.w,lab:vxLane(lk),u:L.u};}catch(e){}
  try{if(c){const H=charHist(roGet(VOICES_KEY,[],30e3)||[],c);const t=H&&H.H&&H.H.team;if(t&&t.n>=4)out.team={w:t.w,l:t.l};const h=H&&H.H&&H.H.h2h;if(h&&h.n>=3)out.h2h={w:h.w,l:h.l};}}catch(e){}
  try{const s=statusOf(v,F.sp,F.d);if(s)out.status=s;const o=((statusSnap(F.d)||{}).by||{})[v+'|'+F.sp];if(o)out.st=o;}catch(e){}
  return out;}
const vxSmall=n=>n<10?` — only ${n} game${n===1?'':'s'}, so it's a footnote, not the reason`:'';
/* the beats, as sentences, from the facts (each returns null when the data isn't there) */
const VXS={
  proj:F=>F.proj?`My projected final is ${F.An} ${vxN(F.proj.a)}, ${F.Hn} ${vxN(F.proj.h)}${F.m==='total'&&F.x.line!=null?` — ${vxN(F.proj.a+F.proj.h)} total against a line of ${F.x.line}`:''}.`:null,
  sim:F=>F.sim!=null&&F.T?`Played 10,000 times, ${F.Tn} ${F.m==='ml'?'wins':'covers'} ${vxPct(F.sim)} of them.`:F.sim!=null?`Played 10,000 times, the ${F.sd} hits ${vxPct(F.sim)} of them.`:null,
  power:F=>{if(!F.pw||!F.T)return null;const rec=ab=>{try{vxNameIdx();const r=VX_REC[F.sp+'|'+ab];if(r)return` (${r})`;if(F.sp==='ncaaf'||F.sp==='ncaab')return'';const t=seasonTeam(F.sp,ab);return t&&t.gp>=3?` (${t.w}-${t.l})`:'';}catch(e){return'';}};   /* the board's own record first; college standings can be conference-only, so no guess there */
    return`${F.Tn} is No. ${F.pw.me.rank} in our power index${rec(F.T)}; ${F.On} is No. ${F.pw.op.rank}${rec(F.O)}.`;},
  powerLine:F=>{if(!F.pw||!F.T)return null;const dp=F.sp==='nhl'||F.sp==='mlb'?1:1;const mT=F.pw.mT;
    if(F.m==='spread'&&F.x.line!=null){const cov=mT+(+F.x.line);return`On ratings alone ${F.Tn} ${mT>=0?'wins by '+vxN(mT,dp):'loses by '+vxN(-mT,dp)}, and the line gives ${vxPrice(F.x.line)} — ${cov>0?`a ${vxN(cov,dp)}-${F.pw.unit==='pts'?'point':F.pw.unit.replace(/s$/,'')} cushion`:`short by ${vxN(-cov,dp)}`}.`;}
    if(F.m==='ml')return mT>0?`On ratings ${F.Tn} is the better team by ${vxN(mT,dp)} ${F.pw.unit}.`:null;return null;},
  matchup:F=>F.pw&&F.T&&F.pw.tor&&F.pw.odr&&(F.pw.tor<=8||F.pw.odr>=F.pw.n-7)?`${F.Tn}'s offense ranks No. ${F.pw.tor} and runs into a defense ranked No. ${F.pw.odr}.`:null,
  form:F=>{if(!F.pw||!F.T)return null;const f=s=>{const t=String(s||'');const w=(t.match(/W/g)||[]).length,l=(t.match(/L/g)||[]).length;return w+l?`${w}-${l}`:null;};const a=f(F.pw.me.last5),b=f(F.pw.op.last5);return a&&b?`Over the last five, ${F.Tn} is ${a} and ${F.On} is ${b}.`:null;},
  luck:F=>{if(!F.pw||!F.T)return null;if(F.pw.op.luck>=1.5)return`${F.On} has won about ${vxN(F.pw.op.luck)} more games than its scoring says it should — that tends to even out.`;if(F.pw.me.luck<=-1.5)return`${F.Tn} has about ${vxN(-F.pw.me.luck)} fewer wins than its scoring has earned — it's better than its record.`;return null;},
  players:F=>{const P=(F.pl||[]).filter(p=>p.gp>=3);if(!P.length)return null;const p=P.find(q=>q.hot)||P[0];
    return`${p.name} averages ${vxR(p.mean)} ${p.lab} a game${p.hot&&p.ema!=null?`, and ${vxR(p.ema)} over his recent games — he's hot`:''}${vxSmall(p.gp)}.`;},
  injO:F=>F.injO&&F.injO.length?`${F.On} is without ${F.injO.map(i=>`${i.n} (${i.pos}, ${String(i.st).toLowerCase()})`).join(' and ')}.`:null,
  flags:F=>{const f=(F.flags||[]).find(z=>z.mine===true)||(F.T?null:(F.flags||[])[0]);return f?`The matchup to watch: ${f.txt.replace(/^\S+\s/,F.T&&f.team===F.T?F.Tn+' ':'')}.`:null;},
  sit:F=>{const S=(F.sit||[]).filter(s=>!s.bad).sort((a,b)=>(b.proven?1:0)-(a.proven?1:0)||vxSitRank(a.k)-vxSitRank(b.k));if(!S.length||!F.T)return null;const s=S[0];
    return`${VX_SIT[s.k](F.Tn,F.On).replace(/^./,c=>c.toUpperCase())}${s.proven?` — and that spot has proven real on our graded games (${s.adj>0?'+':''}${(s.adj*100).toFixed(1)} points)`:s.n?` — a spot we're still testing (${s.n} graded games)`:''}.`;},
  met:F=>F.met&&F.met.length?`They already met this season: ${F.met.map(q=>`${q[1]} ${q[3]}–${q[4]} ${q[2]}`).join(', ')}${vxSmall(F.met.length)}.`:null,
  pred:F=>F.pred?`${F.pred.src.replace(/^./,c=>c.toUpperCase())} has it ${F.An} ${vxN(F.pred.a)}, ${F.Hn} ${vxN(F.pred.h)}.`:null,
  trend:F=>F.trPro&&F.trPro.length?`${String(F.trPro[0]).replace(/\.$/,'')}.`:null,
  pub:F=>F.pub?(F.pub.pct<=35?`Only ${Math.round(F.pub.pct)}% of ${F.pub.metric} is on this side — we're fading the crowd.`:F.pub.pct>=65?`${Math.round(F.pub.pct)}% of ${F.pub.metric} is on this side too — popular, so the price already knows.`:`The public is split (${Math.round(F.pub.pct)}% on this side).`):null,
  others:F=>{const v=F.on.filter(c=>isVoter(c.voice)&&c.voice!=='Sim');const all=F.calls.filter(c=>isVoter(c.voice)&&c.voice!=='Sim');if(all.length<3||v.length*2<all.length)return null;
    return v.length===all.length?`All ${all.length} characters reading this game agree.`:`${v.length} of the ${all.length} characters reading this game are on the same side${v.length===all.length-1?' — one holdout':''}.`;},
  squad:F=>F.squad?`${F.squad.name} are all on it — they're ${F.squad.w}-${F.squad.l} when they agree.`:null};
/* what beats us — the honest part */
function vxWorry(F,v,rec){const W=[];
  if(F.injT&&F.injT.length)W.push(`${F.Tn} is missing ${F.injT.map(i=>`${i.n} (${i.pos})`).join(' and ')} — that's the hole.`);
  const hotO=(F.plO||[]).find(p=>p.hot);if(hotO)W.push(`${hotO.name} is hot for ${F.On} — ${vxR(hotO.ema)} ${hotO.lab} a game lately. He can beat this on his own.`);
  const badS=(F.sit||[]).find(s=>s.bad);if(badS&&F.T)W.push(`${VX_SIT[badS.k](F.Tn,F.On).replace(/^./,c=>c.toUpperCase())}.`);
  const fl=(F.flags||[]).find(z=>z.mine===false);if(fl)W.push(`${fl.txt.replace(/^\S+\s/,F.On+' ')} — the matchup working against us.`);
  const off=F.off.filter(c=>isVoter(c.voice));if(off.length>=2){const nm=off.slice(0,3).map(c=>charName(c.voice).replace(/^The /,'the '));const list=nm.length>1?nm.slice(0,-1).join(', ')+' and '+nm[nm.length-1]:nm[0];
    W.push(`${list.replace(/^./,c=>c.toUpperCase())}${off.length>3?', and others,':''} see it the other way.`);}
  if(F.trCon&&F.trCon.length)W.push(`One trend fights it: ${String(F.trCon[0]).replace(/\.$/,'')}.`);
  if(rec.status==='YELLOW'||rec.status==='ORANGE')W.push(`Full disclosure: I've been cold in ${vxSp(F.sp)} lately (${rec.st?rec.st.w+'-'+(rec.st.n-rec.st.w):''} over four weeks).`);
  if(F.sim!=null&&F.imp!=null&&Math.abs(F.sim-F.imp)>0.12)W.push(`My number is ${Math.round(Math.abs(F.sim-F.imp)*100)} points away from the market's. When the model and the market disagree that much, the model is usually the one that's wrong.`);
  if(W[0])return W[0];const sp=F.sp;
  return F.m==='total'?`${sp==='nhl'?'One empty-net goal':sp==='mlb'?'One big inning':sp==='nba'||sp==='ncaab'?'A late foul-fest':'One garbage-time score'} can swing a total like this — nothing here is a lock.`
    :F.m==='spread'?`${sp==='nhl'?'An empty-net goal':sp==='mlb'?'One run':sp==='nba'||sp==='ncaab'?'Late free throws':'A late field goal or a backdoor cover'} can decide a number like this — nothing here is a lock.`
    :`${sp==='nhl'?'A hot goalie':sp==='mlb'?'One swing':sp==='nba'||sp==='ncaab'?'One cold shooting night':'A turnover or two'} can flip a game like this — nothing here is a lock.`;}
function vxPriceLine(F,cf,rec){if(F.imp==null)return null;const ev=cf!=null&&F.price!=null?cf*americanToDecimal(F.price)-1:null;
  const gap=cf!=null&&F.sim!=null&&Math.abs(cf-F.sim)>=0.05;const L=rec&&rec.lane;
  const why=!gap?'':L&&((cf>F.sim&&L.w>L.l)||(cf<F.sim&&L.w<L.l))?` The simulation alone says ${vxPct(F.sim)}; my ${L.w}-${L.l} record on ${L.lab} is why my confidence ${cf>F.sim?'runs higher':'runs lower'}.`
    :` The simulation alone says ${vxPct(F.sim)}; my confidence also weighs the market's price and my record in spots like this.`;
  return`At ${vxPrice(F.price)} the book needs this to hit ${vxPct(F.imp)} of the time. ${cf!=null?`I have it at ${vxPct(cf)}${ev!=null?(ev>0.005?` — the price pays more than the risk.`:ev<-0.005?` — I like the side more than the price.`:` — about fair.`):'.'}`:''}${why}`;}
/* each character's voice: what it leads with, how it opens, and how it talks */
const VOICES={
  Sim:{story:['proj','injO','players','flags'],proof:['sim','powerLine'],take:F=>F.sim!=null?`I ran this game 10,000 times. ${F.T?F.Tn+' wins':'The '+F.sd+' hits'} ${vxPct(F.sim)} of them.`:null},
  Judge:{story:['pred','trend','players','injO'],proof:['others','sim','powerLine'],take:F=>{const v=F.on.filter(c=>isVoter(c.voice)&&c.voice!=='Sim').length,n=F.calls.filter(c=>isVoter(c.voice)&&c.voice!=='Sim').length;
    return n>=3?`I weigh every witness by how often they've been right — and ${v>=n-1?'nearly all of them':'the ones I trust most'} point to ${F.T?F.Tn:'the '+F.sd}.`:`The evidence points to ${F.T?F.Tn:'the '+F.sd}.`;}},
  Coach:{story:['sit','form','injO','players'],proof:['sit','powerLine'],take:F=>{const s=(F.sit||[]).find(z=>!z.bad);return s&&F.T?`This is a spot game, and the spot belongs to ${F.Tn}.`:F.T?`I like ${F.Tn}'s matchup and form tonight.`:`The situation says ${F.sd}.`;}},
  'Most common':{story:['players','injO','sit'],proof:['sim'],take:(F,c)=>{const m=String((c&&c.score)||'').match(/(\d+)\D+(\d+)/);return m?`My single most likely final: ${F.An} ${m[1]}, ${F.Hn} ${m[2]}.`:null;}},
  Pred:{story:['players','injO'],proof:['sim','powerLine'],take:F=>F.pred?`The outside projection has it ${F.An} ${vxN(F.pred.a)}, ${F.Hn} ${vxN(F.pred.h)} — and I go where it points.`:null},
  Covers:{story:['players','injO'],proof:['sim'],take:F=>F.pred?`The Covers computer has it ${F.An} ${vxN(F.pred.a)}, ${F.Hn} ${vxN(F.pred.h)}.`:null},
  Trends:{story:['trend','met','sit'],proof:['others'],take:F=>F.trPro&&F.trPro.length?`History is on ${F.T?F.Tn+"'s":'the '+F.sd+"'s"} side tonight.`:`The trends lean ${F.T?F.Tn:'the '+F.sd}.`},
  Consensus:{story:['pub'],proof:['others'],take:F=>F.pub?(F.pub.pct<=35?`The crowd is on the other side. I'm not.`:`Follow the money — it's on ${F.T?F.Tn:'the '+F.sd}.`):`I read the crowd, and the crowd tells me ${F.T?F.Tn:'the '+F.sd}.`},
  Power:{story:['power','matchup','met','form','luck'],proof:['powerLine'],take:F=>F.pw&&F.T?(F.pw.mT>0?`On paper, ${F.Tn} is the better team — No. ${F.pw.me.rank} against No. ${F.pw.op.rank}.`:`${F.Tn} is the lower-rated team, but the number gives it enough room.`):null},
  Scout:{story:['players','flags','injO'],proof:['sim'],take:F=>{const p=(F.pl||[]).find(q=>q.hot);return p?`This one comes down to players, and ${p.name} is hot.`:F.T?`I watch the talent, and the talent edge is ${F.Tn}'s.`:`I watch the talent — and the talent says ${F.sd}.`;}},
  Banker:{story:['sim'],proof:['others'],take:F=>`I don't care who wins. I care about the price — and this price is wrong.`},
  Dog:{story:['sim','pub','sit'],proof:['others'],take:(F,c)=>c&&c.dP!=null&&F.T?`Everybody wants the favorite. At this price ${F.Tn} only has to win ${vxPct(+c.dP-(+c.dEdge||0))} — I have it at ${vxPct(+c.dP)}.`:F.T?`The dog is the value here, and the dog is ${F.Tn}.`:null},
  Brain:{story:['others','squad','players'],proof:['sim','powerLine'],take:F=>`Everyone has had their say. When I weigh them by who's been right, it comes out ${F.T?F.Tn:'the '+F.sd}.`},
  Blend:{story:['sim','pub'],proof:['others'],take:F=>F.sim!=null&&F.imp!=null?`The Sim says ${vxPct(F.sim)}, the market says ${vxPct(F.imp)}. I blend them by who's been sharper lately, and it still comes out ${F.T?F.Tn:'the '+F.sd}.`:null}};
/* one character's read on one pick */
function charRead(v,x,c){try{const k=v+'|'+x.sp+'|'+x.game+'|'+mkNorm(x.m||x.market)+'|'+(x.sd||x.side)+'|'+(x.price||'')+'|'+String(x.date||x.d||today()).slice(0,10);
    const V=roGet(VOICES_KEY,[],30e3)||[];const sig=V.length+'|'+(V.length?V[V.length-1].id:'');if(sig!==VX_SIG){VX_CACHE.clear();VX_SIG=sig;}if(VX_CACHE.has(k))return VX_CACHE.get(k);
    const F=vxFacts(x);c=c||F.on.find(z=>z.voice===v)||null;const P=VOICES[v]||VOICES.Judge;const rec=vxRecord(v,F,c);const cf=c?confOf(c):x.cf!=null?x.cf:x.p!=null?x.p:null;
    const used=new Set();const pick=keys=>{for(const key of keys){if(used.has(key))continue;const s=VXS[key]&&VXS[key](F);if(s){used.add(key);return s;}}return null;};
    const take=(P.take&&P.take(F,c))||(F.T?`I'm on ${F.Tn}.`:`I'm on the ${F.sd}.`);
    const story=[pick(P.story),pick(['players','injO','sit','form','met','flags','luck'])].filter(Boolean).slice(0,2);
    const proof=[pick(P.proof)].filter(Boolean);
    if(rec.lane)proof.push(`I'm ${rec.lane.w}-${rec.lane.l} on ${rec.lane.lab}${vxSmall(rec.lane.w+rec.lane.l)}.`);else if(rec.team&&F.T)proof.push(`I'm ${rec.team.w}-${rec.team.l} picking ${F.Tn} games${vxSmall(rec.team.w+rec.team.l)}.`);
    const R={v,name:charName(v),pick:x.pick||charPickText(c||{...x,market:mkNorm(x.m||x.market),side:x.sd||x.side}),price:F.price,cf,take,story,proof:proof.slice(0,2),worry:vxWorry(F,v,rec),priceLine:vxPriceLine(F,cf),status:rec.status||null,skill:!!x.skill,
      under:cf!=null&&!(c&&isOfficial(c))};R.priceLine=vxPriceLine(F,cf,rec);
    VX_CACHE.set(k,R);return R;}catch(e){return null;}}
/* who speaks for a pick: the ticket's own character, else the most confident official one, then up to two more */
function pickReads(x,max){try{const sp=x.sp,m=mkNorm(x.m||x.market),sd=x.sd||x.side,d=String(x.date||x.d||today()).slice(0,10);
    const V=roGet(VOICES_KEY,[],30e3)||[];const on=V.filter(c=>c.sp===sp&&c.game===x.game&&c.market===m&&c.side===sd&&String(c.date).slice(0,10)===d&&CHARS[c.voice]);
    const rank=c=>(isOfficial(c)?1:0)*10+(confOf(c)||0);on.sort((a,b)=>rank(b)-rank(a));
    const lead=x.v&&on.find(c=>c.voice===x.v)?on.find(c=>c.voice===x.v):on[0];if(!lead&&!x.v)return[];
    const who=[lead?lead.voice:x.v,...on.filter(c=>!lead||c.voice!==lead.voice).map(c=>c.voice)].filter((v,i,a)=>v&&a.indexOf(v)===i).slice(0,max||3);
    return who.map(v=>charRead(v,{...x,sp,m,sd,date:d},on.find(c=>c.voice===v))).filter(Boolean);}catch(e){return[];}}
/* as text (the public page, Telegram, the reel) and as a card (the app) */
function readText(R,short){if(!R)return'';if(short)return R.take;return[R.take,...R.story,...R.proof,'The worry: '+R.worry,R.priceLine].filter(Boolean).join(' ');}
function readHtml(R,lead){if(!R)return'';const C=CHARS[R.v]||{};const st=R.status&&BOOK_ENDS[R.status]?`<span title="${txtEsc(BOOK_ENDS[R.status].lab)}">${BOOK_ENDS[R.status].ico}</span>`:'';
  if(!lead)return`<div class="vx-one"><b style="color:${C.color||'var(--chalk)'}">${txtEsc(R.name)}</b>${st} <span>“${txtEsc(R.take)}”</span></div>`;
  return`<div class="vx-read" style="border-left:3px solid ${C.color||'var(--gold)'}"><div class="vx-who"><b style="color:${C.color||'var(--gold)'}">${txtEsc(R.name)}</b>${st}${R.cf!=null?` <span class="mono" style="font-size:10px;color:var(--mute)">${vxPct(R.cf)}${R.under?' · under the 70% bar':''}</span>`:''}</div>
    <div class="vx-take">“${txtEsc(R.take)}”</div>${R.story.length?`<div class="vx-b">${R.story.map(txtEsc).join(' ')}</div>`:''}${R.proof.length?`<div class="vx-b">${R.proof.map(txtEsc).join(' ')}</div>`:''}
    <div class="vx-b vx-w"><b>The worry:</b> ${txtEsc(R.worry)}</div>${R.priceLine?`<div class="vx-b vx-p">${txtEsc(R.priceLine)}</div>`:''}</div>`;}
/* "Why we like it": the characters speak first; the numbers sit under "Show the math" */
/* the panel is written when you open it (a board with 40 picks shouldn't compute 40 reads it never shows) */
const VX_LAZY=new Map();
function vxWhyInner(x,WHY0){let Rs=[];try{Rs=pickReads(x,3);}catch(e){}if(!Rs.length)return null;
  let W=null;try{W=pickWhy(x);}catch(e){}const id='w'+Math.abs(simHash(x.sp+x.game+x.pick)).toString(36);const script=readText(Rs[0]);
  return`<div style="font-size:11.5px;line-height:1.45;padding:4px 2px">${readHtml(Rs[0],true)}${Rs.slice(1).map(R=>readHtml(R,false)).join('')}
      ${W&&W.bullets.length?`<details class="vx-math"><summary class="mono" style="font-size:9.5px;color:var(--mute);cursor:pointer">🔢 Show the math</summary>${W.bullets.map(b=>`<div style="padding:1px 0">• ${txtEsc(b)}</div>`).join('')}</details>`:''}
      <div style="margin-top:6px;padding:7px 9px;border-radius:8px;background:var(--panel2)"><div class="mono" style="font-size:9px;color:var(--mute)">🎬 REEL SCRIPT — in ${txtEsc(Rs[0].name)}'s voice</div><div id="${id}">${txtEsc(script)}</div>
      <button style="font-size:10px;margin-top:4px" onclick="copyText(document.getElementById('${id}').textContent,'Script copied.')">Copy script</button></div></div>`;}
let VX_WHY0=null;
function vxWhyFill(el,key){try{if(!el||!el.open||el.__vx)return;el.__vx=1;const x=VX_LAZY.get(key);if(!x)return;const box=el.querySelector('.vx-lazy');if(!box)return;
  const inner=vxWhyInner(x);if(inner){box.outerHTML=inner;return;}const tmp=document.createElement('div');tmp.innerHTML=VX_WHY0(x,true);const d=tmp.querySelector('details');box.outerHTML=d?d.innerHTML.replace(/^[\s\S]*?<\/summary>/,''):'';}catch(e){}}
if(typeof whyHtml==='function'&&typeof window!=='undefined'&&!window.__VX_WHY__){window.__VX_WHY__=1;const WHY0=whyHtml;VX_WHY0=WHY0;
  whyHtml=function(x,open){if(open){const inner=vxWhyInner(x);if(!inner)return WHY0(x,open);
      return`<details class="why" open style="margin:4px 0 2px"><summary class="mono" style="font-size:10px;color:var(--gold);cursor:pointer">📝 Why we like it</summary>${inner}</details>`;}
    const key=[x.sp,x.game,x.pick||'',mkNorm(x.m||x.market||''),x.sd||x.side||'',x.price||'',String(x.date||x.d||'').slice(0,10),x.v||''].join('|');if(VX_LAZY.size>800)VX_LAZY.clear();VX_LAZY.set(key,{...x});
    return`<details class="why" style="margin:4px 0 2px" ontoggle="vxWhyFill(this,${txtEsc(JSON.stringify(key))})"><summary class="mono" style="font-size:10px;color:var(--gold);cursor:pointer">📝 Why we like it</summary><div class="vx-lazy sub mono" style="font-size:10px">…</div></details>`;};}
/* the reads ride along wherever the app hands out "why" (the public page, the worker's copy) */
if(typeof pickWhy==='function'&&typeof window!=='undefined'&&!window.__VX_PW__){window.__VX_PW__=1;const PW0=pickWhy;
  pickWhy=function(x0){const W=PW0(x0);try{if(String(x0.date||x0.d||today()).slice(0,10)<VX_FROM)return W;const Rs=pickReads({...x0,m:mkNorm(x0.m||x0.market),sd:x0.sd||x0.side},2);if(Rs.length){W.read={who:Rs[0].name,v:Rs[0].v,take:Rs[0].take,text:readText(Rs[0]),also:Rs.slice(1).map(R=>({who:R.name,take:R.take}))};}}catch(e){}return W;};}
if(typeof publicFeedCore==='function'&&typeof window!=='undefined'&&!window.__VX_PF__){window.__VX_PF__=1;const PF0=publicFeedCore;
  publicFeedCore=function(full){const F=PF0(full);try{const S=best5State();const add=x=>{if(!x||x.hidden||!x.why)return;const src=(S.top3||[]).find(y=>y.game===x.game&&y.pick===x.pick)||x;const W=pickWhy({...src,date:S.d});if(W&&W.read)x.why.read=W.read;};
      ((F.today||{}).picks||[]).forEach(add);((F.parlay||{}).legs||[]).forEach(l=>{if(!l||l.hidden||!l.why)return;try{const W=pickWhy({...l,date:(F.parlay||{}).d});if(W&&W.read)l.why.read=W.read;}catch(e){}});}catch(e){}return F;};}
/* Today's Best 3: each pick's lead character, in one line */
if(typeof todayBestHero==='function'&&typeof window!=='undefined'&&!window.__VX_TB__){window.__VX_TB__=1;const TBH0=todayBestHero;
  todayBestHero=function(){const h=TBH0();if(!h)return h;try{const S=best5State();const top=(S.top3||[]);const L=top.map((x,i)=>{const R=pickReads({...x,date:S.d},1)[0];return R?`<div class="vx-tb"><span class="mono" style="color:var(--gold)">${i+1}</span> ${readHtml(R,false)}</div>`:'';}).filter(Boolean);
      if(!L.length)return h;const j=h.lastIndexOf('</div>');return h.slice(0,j)+`<div class="vx-tbs"><div class="mono" style="font-size:9px;color:var(--mute);margin:6px 0 2px">🗣 WHY, IN THEIR WORDS — tap a pick's "Why we like it" for the full read</div>${L.join('')}</div>`+h.slice(j);}catch(e){return h;}};}
/* the VIP card: each Best 3 pick carries its lead character's one line — written once, when the card is built for
   posting (it rides on the card), so every later edit of the post (✅/❌ results) replays the same words */
if(typeof subCard==='function'&&typeof window!=='undefined'&&!window.__VX_SC__){window.__VX_SC__=1;const SC1=subCard;
  subCard=function(){const C=SC1.apply(this,arguments);try{if(C&&C.d&&String(C.d)>=VX_FROM&&!C.vxTakes){const T={};(C.best||[]).forEach(x=>{const R=pickReads({...x,date:C.d},1)[0];if(R)T[vxPickKey(x)]={take:R.take,name:R.name};});C.vxTakes=T;}}catch(e){}return C;};}
function vxPickKey(x){return[x.sp,x.game,mkNorm(x.m||x.market||''),x.sd||x.side||'',x.pick||''].join('|');}
if(typeof subTelegramText==='function'&&typeof window!=='undefined'&&!window.__VX_TG__){window.__VX_TG__=1;const STT1=subTelegramText;
  subTelegramText=function(C,mk){const parts=STT1(C,mk);try{if(!C||String(C.d||'')<VX_FROM)return parts;
      /* by position in the TODAY'S BEST block ("1. …", "2. …"), never by searching the pick's text */
      const j=parts.findIndex(p=>p.indexOf("<b>⭐ TODAY'S BEST")>=0);if(j<0)return parts;
      (C.best||[]).forEach((x,n)=>{const R=C.vxTakes?C.vxTakes[vxPickKey(x)]:pickReads({...x,date:C.d},1)[0];if(!R||!R.take)return;
        const s0=parts[j].indexOf("<b>⭐ TODAY'S BEST");const a=parts[j].indexOf('\n'+(n+1)+'. ',s0);if(a<0)return;const e=parts[j].indexOf('\n',a+1);
        const line=`\n   <i>“${txtEsc(R.take)}” — ${txtEsc(R.name)}</i>`;if(parts[j].length+line.length>4000)return;   /* never past Telegram's 4,096 */
        parts[j]=e<0?parts[j]+line:parts[j].slice(0,e)+line+parts[j].slice(e);});}catch(e){}return parts;};}
const VX_CSS=`.vx-read{padding:6px 8px;margin:2px 0 6px;border-radius:8px;background:rgba(255,255,255,.025)}.vx-who{font-size:11.5px}.vx-take{font-size:13px;font-weight:700;margin:2px 0 3px;line-height:1.35}
.vx-b{font-size:11.5px;line-height:1.5;margin:2px 0}.vx-w{color:var(--chalk)}.vx-p{color:var(--gold)}.vx-one{font-size:11px;line-height:1.4;padding:2px 0}.vx-math{margin-top:4px}.vx-tbs{border-top:1px solid var(--rule);margin-top:6px;padding-top:2px}.vx-tb{display:flex;gap:6px;align-items:baseline}`;
if(typeof window!=='undefined'&&!window.__VX_BOOT__){window.__VX_BOOT__=1;window.addEventListener('load',()=>{try{if(!document.getElementById('vxCss')){const st=document.createElement('style');st.id='vxCss';st.textContent=VX_CSS;document.head.appendChild(st);}}catch(e){}});}
