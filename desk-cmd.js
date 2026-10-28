/* ══ v2.60 · TELEGRAM COMMANDS ═══════════════════════════════════════════════════
   Type / in the lounge and pick a command: /judge shows The Judge's top 10 today, /unanimous every pick the
   whole room agrees on, /record, /league, /nhl … The app writes every answer when it hands the card to the
   24/7 robot; the robot answers whoever asks on its next pass (the ✅/❌ fill in as games grade).
   One tap, one answer — no arguments to type. */
const CMD_CHARS=()=>CHAR_ORDER.filter(v=>!META_VOICES.has(v));
const cmdSlug=v=>String(charName(v)).replace(/^The /,'').toLowerCase().replace(/[^a-z0-9]+/g,'').slice(0,28);
const cmdE=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const cmdSg=p=>p==null?'':(+p>0?'+':'')+p;
const cmdT=t=>{try{const d=new Date(t);return isFinite(d)?d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',timeZone:'America/Chicago'})+' CT':'';}catch(e){return'';}};
const cmdSp=sp=>({nhl:'🏒',nfl:'🏈',ncaaf:'🏟',nba:'🏀',ncaab:'🏀',mlb:'⚾'})[sp]||'';
const cmdMk=x=>`⟦m:${tgLegKey(x)}⟧`;
function cmdCallPick(c){try{return charPickText(c);}catch(e){return`${c.side} ${c.market}`;}}
function cmdRec(V,v,days){const lo=dayShift(today(),-(days||30));let w=0,l=0,u=0;V.forEach(x=>{if(x.voice!==v||!x.graded||x.push||x.hit==null||String(x.date).slice(0,10)<lo||!isOfficial(x))return;if(x.hit)w++;else l++;u+=+x.units||0;});return{w,l,u};}
const cmdRecTxt=r=>r.w+r.l?`${r.w}-${r.l} · ${r.u>=0?'+':''}${r.u.toFixed(1)}u (30 days, official)`:'no official record yet';
function cmdCharTop(V,v){const d=today();const seen=new Set();
  const C=V.filter(c=>c.voice===v&&String(c.date).slice(0,10)===d&&c.price!=null&&!c.graded&&confOf(c)!=null).sort((a,b)=>confOf(b)-confOf(a))
    .filter(c=>{const k=c.sp+c.game+c.market+c.side;if(seen.has(k))return false;seen.add(k);return true;}).slice(0,10);
  const C0=CHARS[v]||{};const head=`<b>${cmdE(C0.chip||'')} ${cmdE(charName(v))} — top ${C.length||10} today</b>\nRecord: <b>${cmdRec(V,v)&&cmdRecTxt(cmdRec(V,v))}</b>${PROBATION.has(v)&&!(PROB_OK||{})[v]?'\n<i>On probation — its calls are tracked, not official yet.</i>':''}`;
  if(!C.length)return head+`\n\nNo calls today${C0.quiet?' — '+cmdE(C0.quiet):''}.${C0.school?`\n<i>${cmdE(charName(v))} reads: ${cmdE(C0.school)}.</i>`:''}`;
  return head+'\n\n'+C.map((c,i)=>`${i+1}. ${isOfficial(c)?'✅':'▫️'} <b>${cmdE(cmdCallPick(c))}</b> ${cmdE(cmdSg(c.price))} · ${cmdSp(c.sp)} ${cmdE(c.game)} · ${Math.round(confOf(c)*100)}%`).join('\n')+'\n\n<i>✅ = official (70%+ and priced to pay). ▫️ = a lean, tracked only.</i>';}
function cmdUnanimous(){const T=get(TC_KEY,{})||{};const L=[];if(T.d===today())Object.entries(T.by||{}).forEach(([sp,B])=>(B.picks||[]).forEach(x=>{if(x.unan)L.push({...x,sp:x.sp||sp});}));
  if(!L.length)return'<b>🤝 Unanimous — today</b>\nNo game has every character on the same side yet.';
  return`<b>🤝 Unanimous — every character on the same side (${L.length})</b>\n`+L.map(x=>`${cmdMk(x)}<b>${cmdE(x.pick)}</b> ${cmdE(cmdSg(x.price))} · ${cmdSp(x.sp)} ${cmdE(x.game)}${x.start?' · '+cmdT(x.start):''}`).join('\n')+'\n<i>Agreement isn\'t value: check the price — /record shows what laying chalk costs.</i>';}
function cmdList(title,L,fmt,empty){return`<b>${title}</b>\n`+(L.length?L.map(fmt).join('\n'):empty||'Nothing yet today.');}
function cmdBuild(){const V=roGet(VOICES_KEY,[],30e3)||[];const R={};const d=today();
  const day=new Date(d+'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
  let best=[];try{best=best5State().top3||[];}catch(e){}
  R.best=cmdList(`⭐ Today's Best ${best.length||3} — ${day}`,best,(x,i)=>`${i+1}. ${cmdMk(x)}<b>${cmdE(x.pick)}</b> ${cmdE(cmdSg(x.price))} · ${cmdSp(x.sp)} ${cmdE(x.game)}${x.start?' · '+cmdT(x.start):''} · ${Math.round((x.p||0)*100)}%`,'No play cleared the bar today — we don\'t force picks.');
  let t10=[];try{t10=subTop10();}catch(e){}
  R.top10=cmdList('🔟 The rest of the Top 10',t10,(x,i)=>`${i+1+best.length}. ${cmdMk(x)}<b>${cmdE(x.pick)}</b> ${cmdE(cmdSg(x.price))} · ${cmdSp(x.sp)} ${cmdE(x.game)} · ${Math.round((x.p||0)*100)}%`);
  R.unanimous=cmdUnanimous();
  let C=null;try{C=subCard();}catch(e){}
  R.props=cmdList('🎯 Props of the day',(C&&C.props)||[],c=>`${cmdMk(c)}${cmdE(charName(c.v))}: <b>${cmdE(cpropLine(c))}</b>${cmdE(propWhere(c))} · ${subPct(c.cal)}`);
  const parl=P=>`<b>${P.px?'🎯':P.skill?'💪':'🎭'} ${cmdE(charName(P.v))}</b> ${cmdE(decimalToAmerican(P.dec))} · ${subPct(P.p)} to cash\n`+P.legs.map(l=>'  '+cmdMk(l)+cmdE(l.player?cpropLine(l)+propWhere(l):subLeg(l))+cmdE(subStrength(l)).replace(/\n\s*/,' ')).join('\n');
  R.parlays=C?cmdList('🎭 Every character parlay',[...(C.chars||[]),...(C.px||[])],parl):'No parlays yet today.';
  R.banker=C&&C.banker?`<b>🏦 The Banker's parlay</b> ${cmdE(decimalToAmerican(C.banker.dec))} · ${subPct(C.banker.p)} to cash\n`+C.banker.legs.map(l=>cmdMk(l)+cmdE(subLeg(l))).join('\n'):'<b>🏦 The Banker</b>\nNo ticket today — nothing beat its price test.';
  const dogs=V.filter(c=>c.voice==='Dog'&&String(c.date).slice(0,10)===d&&!c.graded);
  R.dogs=cmdList('🐕 The Underdog Spotter — today\'s dogs',dogs,c=>`${cmdMk(c)}<b>${cmdE(cmdCallPick(c))}</b> ${cmdE(cmdSg(c.price))} · ${cmdSp(c.sp)} ${cmdE(c.game)}${c.dP!=null?` · its chance ${Math.round(c.dP*100)}% vs the price's ${Math.round(imp(+c.price)*100)}%`:''}`,'No dog is priced wrong enough today.')+`\n<i>${(PROB_OK||{}).Dog?'Graduated — its dogs are official.':'On probation — graded on units, not official yet.'}</i>`;
  try{const B=best3Record();R.record=`<b>📈 The Best 3 record</b>\n<b>${B.w}-${B.l}${B.pu?'-'+B.pu:''}</b> · ${B.u>=0?'+':''}${B.u.toFixed(2)}u since ${cmdE(B.first||'')}\n💲 Average price ${B.ap>0?'+':''}${B.ap} — needs ${Math.round(B.be*100)}% to profit · hitting ${B.w+B.l?Math.round(100*B.w/(B.w+B.l)):0}%`;}catch(e){R.record='Record unavailable right now.';}
  try{const L=bkLedger(true);const W=L.weeks[0];const rows=Object.values(W.R).filter(x=>x.n).sort((a,b)=>b.br-a.br);
    R.league=cmdList(`🏁 Character League — ${cmdE(lgLabel(W.ws))}`,rows,(x,i)=>`${['🥇','🥈','🥉'][i]||(i+1)+'.'} <b>${cmdE(charName(x.v).replace(/^The /,''))}</b> $${x.br.toFixed(2)} (${x.u>=0?'+':''}${x.u.toFixed(2)}u) · ${x.w}-${x.l}${x.par&&(x.par.w+x.par.l)?` · parlays ${x.par.w}-${x.par.l}`:''}`,'No graded official calls yet this week.')+'\n<i>$100 each, Tuesday to Tuesday. Official calls + every parlay.</i>';}catch(e){R.league='League unavailable right now.';}
  const ld=CMD_CHARS().map(v=>({v,...cmdRec(V,v)})).filter(x=>x.w+x.l>=5).sort((a,b)=>b.u-a.u);
  R.leaders=cmdList('🏆 Who\'s hot — last 30 days (official calls)',ld,(x,i)=>`${i+1}. <b>${cmdE(charName(x.v).replace(/^The /,''))}</b> ${x.w}-${x.l} · ${x.u>=0?'+':''}${x.u.toFixed(1)}u · /${cmdSlug(x.v)}`);
  const Tc=get(TC_KEY,{})||{};[['nhl','nhl'],['nfl','nfl'],['ncaaf','cfb'],['nba','nba'],['ncaab','cbb'],['mlb','mlb']].forEach(([sp,cmd])=>{
    const P=(Tc.d===d&&((Tc.by||{})[sp]||{}).picks)||[];const O=P.map(x=>({x,o:pickConf(x,sp)})).filter(z=>z.o).sort((a,b)=>b.o.cf-a.o.cf).slice(0,10);
    R[cmd]=cmdList(`${cmdSp(sp)} ${cmdE((SP_LAB[sp]||sp).replace(/^\S+\s/,''))} — official picks today`,O,({x,o})=>`${cmdMk({...x,sp})}<b>${cmdE(x.pick)}</b> ${cmdE(cmdSg(x.price))} · ${cmdE(x.game)} · ${Math.round(o.cf*100)}% · ${cmdE(o.who.map(v=>charName(v).replace(/^The /,'')).join(', '))}`,'No official picks in this sport today.');});
  try{const y=dayShift(d,-1);const E=(get('d4.best5log',{})||{})[y];const L=(E&&E.picks||[]).filter(x=>x.main);
    R.results=cmdList(`📣 Yesterday's Best 3 — ${cmdE(y)}`,L,x=>`${x.push?'➖':x.hit?'✅':x.hit===false?'❌':'⏳'} <b>${cmdE(x.pick)}</b> ${cmdE(cmdSg(x.price))} · ${cmdE(x.game)}`);}catch(e){}
  try{const H=ch2Lib().map(t=>({t,r:ch2Replay(t)})).filter(z=>z.r&&z.r.days).sort((a,b)=>(b.r.end/b.t.start)-(a.r.end/a.t.start)).slice(0,5);
    R.challenges=cmdList('🔥 Hot challenges — last 14 play-days',H,({t,r})=>`<b>${cmdE(t.ico||'')} ${cmdE(t.name)}</b>: $${t.start} → $${r.end.toFixed(2)}${r.hit?` · goal hit day ${r.hit}`:''}`)+'\n<i>Start any of them in the app\'s Bankroll tab.</i>';}catch(e){}
  CMD_CHARS().forEach(v=>{R[cmdSlug(v)]=cmdCharTop(V,v);});
  const menu=[['best','Today\'s Best 3'],['top10','The rest of the Top 10'],['unanimous','Picks every character agrees on'],['parlays','Every character parlay'],['banker','The Banker\'s parlay'],['props','Props of the day'],['dogs','Underdog Spotter'],
    ['nhl','NHL official picks'],['nfl','NFL official picks'],['cfb','College football picks'],['nba','NBA official picks'],['cbb','College hoops picks'],
    ['record','Best 3 record + price check'],['results','Yesterday\'s results'],['leaders','Hottest characters'],['league','Character league'],['challenges','Hot bankroll challenges'],
    ...CMD_CHARS().map(v=>[cmdSlug(v),charName(v)+'\'s top 10'])].filter(([k])=>R[k]);
  R.help=`<b>🤖 TheDesk commands</b> — tap one:\n`+menu.map(([k,t])=>`/${k} — ${cmdE(t)}`).join('\n')+'\n<i>Answers come from the robot on its next run (usually a few minutes on game days).</i>';R.start=R.help;R.menu=R.help;
  return{d,ts:Date.now(),r:R,menu:menu.slice(0,100).map(([k,t])=>({command:k,description:String(t).slice(0,60)}))};}
/* the robot gets the answers with every hand-off */
if(typeof tgwPayload==='function'&&!window.__CMDW__){window.__CMDW__=1;const TGW_P1=tgwPayload;tgwPayload=function(p){const o=TGW_P1(p);try{o.cmd=cmdBuild();o.feedTs=o.feedTs||Date.now();}catch(e){console.warn('commands',e);}return o;};}
/* ══ v2.63 · /check — a subscriber pastes their ticket, any format, and the characters grade every leg ══
   The app hands the robot today's calls (who's on which side, how sure, official or not, proven or not)
   and every team's names; the robot reads the slip the way intake does — "WPG ML", "Jets -1.5 (-110)",
   "o6.5 SJ/BOS", "West Virginia +11", one per line or separated by commas. */
const CMD_NAMES_KEY='d4.teamnames';
function cmdNames(){const S=get(CMD_NAMES_KEY,{})||{};let ch=false;['nfl','ncaaf','nhl','nba','ncaab','mlb'].forEach(sp=>{let G=[];try{G=sportGames(sp)||[];}catch(e){}
    G.forEach(g=>[g.away,g.home].forEach(t=>{if(!t||!t.abbr)return;const N=[t.name,t.displayName,t.location,t.shortDisplayName,t.nickname,t.shortName].filter(Boolean).map(String);const M=S[sp]||(S[sp]={});
      const cur=M[t.abbr]||[];const nu=[...new Set([...cur,...N])].slice(0,6);if(nu.length!==cur.length){M[t.abbr]=nu;ch=true;}}));});
  if(ch)set(CMD_NAMES_KEY,S);return S;}
function cmdIdx(){const V=roGet(VOICES_KEY,[],30e3)||[];const d=today();const N=cmdNames();const calls=[],games={};
  V.forEach(c=>{if(!c||String(c.date).slice(0,10)!==d||c.graded||!CHARS[c.voice]||META_VOICES.has(c.voice)||c.price==null)return;const cf=confOf(c);if(cf==null)return;
    let pv=0;try{const lk=laneKey(c.sp,c.market,c.side,c.price,c.line);pv=lk&&laneStatus(lk,c.voice)==='proven'?1:0;}catch(e){}
    calls.push([c.sp,c.game,c.market,c.side,c.line!=null?+c.line:null,+c.price,charName(c.voice).replace(/^The /,''),Math.round(cf*100),isOfficial(c)?1:0,pv]);
    if(!games[c.sp+'|'+c.game]){const[a,h]=String(c.game).split('@');games[c.sp+'|'+c.game]=[c.sp,c.game,[a,...((N[c.sp]||{})[a]||[])],[h,...((N[c.sp]||{})[h]||[])]];}});
  return{d,calls,games:Object.values(games)};}
if(!window.__CMDCHK__){window.__CMDCHK__=1;const B0=cmdBuild;cmdBuild=function(){const o=B0();try{o.idx=cmdIdx();o.r.check='<b>🧾 Check your ticket</b>\nType <b>/check</b> and your legs — one per line, or separated by commas. Any format:\n<code>/check WPG ML, Oregon -10, o6.5 SJ/BOS</code>\nEvery leg gets graded by the characters: who\'s on it, who\'s fading it, and your weakest leg.';
    o.menu=[{command:'check',description:'Grade your ticket: /check then your legs'},...o.menu];}catch(e){console.warn('check idx',e);}return o;};}
/* keep the team-name book fresh on every page load */
if(typeof window!=='undefined')setTimeout(()=>{try{cmdNames();}catch(e){}},8000);
/* ══ v2.75 · more lounge commands: /last5, each character's last 5 under its own command, /bloodlines, /deadon, /halves, /counterpunch ══ */
function cmdLast(V,v,n){return V.filter(c=>c&&c.voice===v&&c.graded&&c.price!=null&&(c.hit!=null||c.push)&&!confPre(c))
  .sort((a,b)=>String(b.date).localeCompare(String(a.date))||((b.lk||0)-(a.lk||0))).slice(0,n||5);}
const cmdRes=c=>c.push?'➖':c.hit?'✅':'❌';
function cmdLast5All(V){const rows=CMD_CHARS().map(v=>{const L=cmdLast(V,v,5);if(!L.length)return null;const w=L.filter(c=>c.hit).length,l=L.filter(c=>c.hit===false).length,u=L.reduce((s,c)=>s+(+c.units||0),0);
    return{v,L,w,l,u};}).filter(Boolean).sort((a,b)=>b.u-a.u);
  return cmdList('🔁 Last 5 calls — every character',rows,(x,i)=>`${['🥇','🥈','🥉'][i]||'▪️'} <b>${cmdE(charName(x.v).replace(/^The /,''))}</b> ${x.L.map(cmdRes).join('')} ${x.w}-${x.l} · ${x.u>=0?'+':''}${x.u.toFixed(1)}u · /${cmdSlug(x.v)}`,'No graded calls yet.')+'\n<i>Newest first is on the left. Tap a name for its last 5 picks and today\'s top 10.</i>';}
function cmdLast5One(V,v){const L=cmdLast(V,v,5);if(!L.length)return'';
  return`\n\n<b>🔁 Last 5 calls</b>\n`+L.map(c=>`${cmdRes(c)} ${cmdE(cmdCallPick(c))} ${cmdE(cmdSg(c.price))} · ${cmdSp(c.sp)} ${cmdE(c.game)} · ${cmdE(String(c.date).slice(5,10))}${isOfficial(c)?' ⭐':''}`).join('\n');}
function cmdBloodlines(){try{const R=heirsRun();const H=heirsAll();const race=[];Object.entries(R.cells||{}).forEach(([k,c])=>{const C=H.cells[k];if(!C)return;const bar=(c.ctx||{}).bar||HEIR_BAR;
      (c.heirs||[]).filter(h=>h.st==='shadow').forEach(h=>race.push({C,h,bar,s:(Math.min(1,h.n/HEIR_MIN_N)+Math.min(1,h.days/HEIR_MIN_DAYS)+2*Math.max(0,Math.min(1,h.z/bar)))/4}));});
    race.sort((a,b)=>b.s-a.s);const cells=Object.values(H.cells);const crowned=cells.filter(C=>C.gen>1);const live=cells.reduce((n,C)=>n+(C.heirs||[]).filter(h=>h.st==='shadow').length,0);
    const mk={ml:'ML',spread:'Spreads',total:'Totals'};
    return`<b>🧬 Bloodlines</b>\n${cells.length} bloodlines · ${live} heirs in the shadows · ${crowned.length} crowned\n\n<b>👑 Closest to the crown</b>\n`+
      (race.slice(0,6).map((x,i)=>`${i+1}. <b>${cmdE(charName(x.C.v).replace(/^The /,''))}</b> ${mk[x.C.m]} — ${Math.min(x.h.n,HEIR_MIN_N)}/${HEIR_MIN_N} games · ${Math.min(x.h.days,HEIR_MIN_DAYS)}/${HEIR_MIN_DAYS} days · ${x.h.z>=0?'+':''}${x.h.z.toFixed(1)}σ of ${x.bar.toFixed(1)}σ`).join('\n')||'No heirs reading yet.')+
      (crowned.length?`\n\n<b>Reigning heirs</b>\n`+crowned.map(C=>`👑 ${cmdE(charName(C.v).replace(/^The /,''))} ${mk[C.m]} — Gen ${C.gen} since ${cmdE(C.champ.since||'')}`).join('\n'):'')+
      '\n<i>An heir takes the chair after 150+ unseen games, 14+ days, beating its parent past the bar without making less money. Full family trees in the app.</i>';}catch(e){return'<b>🧬 Bloodlines</b>\nNot ready yet.';}}
function cmdDeadOn(){try{const S=scoreCallStats('all');const rows=Object.entries(S).filter(([,r])=>r.n).sort((a,b)=>b[1].exact-a[1].exact||a[1].err/a[1].n-b[1].err/b[1].n);
    return cmdList('🎯 Score callers — who\'s dead on',rows.slice(0,10),([v,r],i)=>`${i+1}. <b>${cmdE(charName(v).replace(/^The /,''))}</b> 🎯 ${r.exact} exact of ${r.n} · winner ${r.wn?Math.round(r.win/r.wn*100):0}% · misses by ${(r.err/r.n).toFixed(1)}${r.last?` · last: ${cmdE(r.last.game)} ${r.last.a}-${r.last.h}`:''}`,'Score calls started Oct 27 — the board fills as games go final.');}catch(e){return'<b>🎯 Score callers</b>\nNot ready yet.';}}
function cmdHalves(){try{const T=halfToday();const by={};T.forEach(x=>{const k=x.sp+'|'+x.pick+'|'+x.game;(by[k]=by[k]||{x,n:0,off:false}).n++;if(x.official)by[k].off=true;});
    const L=Object.values(by).sort((a,b)=>b.off-a.off||b.n-a.n).slice(0,10);
    return cmdList('🕐 1st halves & 1st periods — today',L,o=>`${o.off?'✅':'▫️'} <b>${cmdE(o.x.pick)}</b> ${cmdE(cmdSg(o.x.price))} · ${cmdSp(o.x.sp)} ${cmdE(o.x.game)} · ${o.n} character${o.n===1?'':'s'}`,'No half lines on today\'s card.')+'\n<i>✅ = a character that has proven itself in that half market (20+ calls, 57%+, in profit).</i>';}catch(e){return'<b>🕐 Halves</b>\nNot ready yet.';}}
function cmdCounter(){try{const M=get(CP_KEY,{})||{};const d=today();const L=Object.values(M).filter(x=>x.d===d);
    return cmdList('🥊 Counter-punches — today',L,x=>`🥊 <b>${cmdE(x.pick)}</b> ${cmdE(cmdSg(x.price))} · ${cmdSp(x.sp)} ${cmdE(x.game)} · ${Math.round(x.cf*100)}% · ${x.on.length} proven characters on it`,'None today — they only fire when everything lines up.')+'\n<i>Under the 70% bar, but 3+ proven characters agree, the price pays and sharp money isn\'t against it.</i>';}catch(e){return'<b>🥊 Counter-punches</b>\nNot ready yet.';}}
if(!window.__CMDL5__){window.__CMDL5__=1;const B1=cmdBuild;cmdBuild=function(){const o=B1();try{const V=roGet(VOICES_KEY,[],30e3)||[];const R=o.r;
    R.last5=cmdLast5All(V);CMD_CHARS().forEach(v=>{const k=cmdSlug(v);if(R[k])R[k]=R[k]+cmdLast5One(V,v);});
    R.bloodlines=cmdBloodlines();R.deadon=cmdDeadOn();R.halves=cmdHalves();R.counterpunch=cmdCounter();
    const add=[['last5','Every character\'s last 5 calls'],['bloodlines','Generations: who\'s closest to the crown'],['deadon','Score callers: who\'s dead on'],['halves','1st half / 1st period calls'],['counterpunch','Today\'s counter-punches']];
    const i=o.menu.findIndex(x=>x.command==='leaders');o.menu.splice(i<0?o.menu.length:i+1,0,...add.map(([command,description])=>({command,description})));o.menu=o.menu.slice(0,100);
    R.help=R.help.replace('/leaders — ',add.map(([k,t])=>`/${k} — ${cmdE(t)}`).join('\n')+'\n/leaders — ');R.start=R.help;R.menu=R.help;}catch(e){console.warn('last5 cmds',e);}return o;};}
/* v2.75.1 · /props never answers "nothing" when characters have prop calls: the frozen card's Props of the day first
   (70%+ calibrated, locked at the master evaluation); if that's empty, today's live character prop calls (65%+, games
   not started), labeled as such; if THAT's empty, say why (the phone that sent the card had no player logs loaded). */
if(!window.__CMDPROPS__){window.__CMDPROPS__=1;const B2=cmdBuild;cmdBuild=function(){const o=B2();try{let C=null;try{C=subCard();}catch(e){}
    if(!((C&&C.props)||[]).length){let L=[];try{L=cpropToday();}catch(e){}const seen=new Set();
      L=L.filter(c=>c.cal>=0.65&&c.fav!=='fade').sort((a,b)=>b.cal-a.cal).filter(c=>{const k=c.player+'|'+c.k;if(seen.has(k))return false;seen.add(k);return true;})
        .filter(c=>{try{return!deskStarted({...c,game:cpxPropGame(c.sp,c.team)});}catch(e){return true;}}).slice(0,10);
      const dbN=['nba','nhl','nfl','ncaaf','ncaab'].reduce((n,sp)=>{try{return n+Object.keys(pstDb(sp).p||{}).length;}catch(e){return n;}},0);
      o.r.props=L.length?cmdList('🎯 Character prop calls — today',L,c=>`${cmdSp(c.sp)} <b>${cmdE(cpropLine(c))}</b>${cmdE(propWhere(c))} · ${cmdE(charName(c.voice).replace(/^The /,''))} · ${subPct(c.cal)}${c.rec?' · '+cmdE(c.rec):''}`)+'\n<i>None cleared 70% for the official Props of the day, so these are the strongest calls still on the board.</i>'
        :`<b>🎯 Props of the day</b>\nNo character prop call today${dbN?' cleared 65%':''}.${dbN?'':'\n<i>The phone that sent today\'s card had no player game logs loaded — open the NBA / NHL / NFL pages once, then tap 🛰️ Re-send.</i>'}`;}}catch(e){console.warn('props cmd',e);}return o;};}
