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
  if(!C.length)return head+'\n\nNo calls yet today — check back after the morning evaluation.';
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
