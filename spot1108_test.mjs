/* v2.98 · character spotlights: "player of the week daily parlay, underdog spotter 'terrible 3' picks". Two tickets a day
   go public 30 minutes before their first game — the hottest character's parlay and the Underdog Spotter's dogs-only
   parlay — as a teaser (each leg shows at its own T-30; VIP already has the ticket), picture and all. Invented cards,
   fake Telegram / start times, no network. */
let pass=0,fail=0;const T=(n,c,x)=>{c?pass++:fail++;console.log((c?'PASS ':'FAIL ')+n+(c?'':'  — '+(x||'')));};
process.env.AUTOPILOT_KEY='k';process.env.TG_BOT_TOKEN='t';for(const k of ['FB_PAGE_ID','FB_PAGE_TOKEN','IG_USER_ID','THREADS_TOKEN','SPOTLIGHT'])delete process.env[k];
const Wk=await import('/home/claude/work/autopilot/worker.mjs');
const leg=(k,label,price,game,sp='nfl')=>({k,label,price,game,sp,kind:'Best 3'});
/* two graded days: the Coach cashed both (+), the Brain cashed one, lost one; the Dog lost both */
const past=(d,coach,brain,dog)=>({d,chat:'-100',recap:true,legs:[leg('c1'+d,'A',-110,'A@B'),leg('c2'+d,'C',-110,'C@D'),leg('b1'+d,'E',-110,'E@F'),leg('g1'+d,'G',+150,'G@H')],
  st:{['c1'+d]:coach,['c2'+d]:coach,['b1'+d]:brain,['g1'+d]:dog},sent:{},recapPlan:{day:d,chars:[{name:'The Coach',keys:['c1'+d,'c2'+d],price:'+264'},{name:'The Brain',keys:['b1'+d],price:'-110'},{name:'The Underdog Spotter',keys:['g1'+d],price:'+150'},{name:'The Coach (props)',keys:['b1'+d],price:'-110'}]}});
const today='2026-11-08';
const S=t=>Date.parse(t);
const starts={'CLE@NO':S('2026-11-08T18:00:00Z'),'SF@LAR':S('2026-11-08T21:25:00Z'),'KC@DEN':S('2026-11-09T01:20:00Z'),'NYJ@MIA':S('2026-11-08T18:00:00Z'),'TEN@HOU':S('2026-11-08T18:00:00Z'),'ARI@SEA':S('2026-11-08T21:05:00Z')};
const startOf=async l=>starts[l.game]??NaN;
const card=()=>({d:today,chat:'-100555',legs:[leg('n1','NO -3 (-110)',-110,'CLE@NO'),leg('n2','SF ML (-140)',-140,'SF@LAR'),leg('n3','KC -2.5 (-110)',-110,'KC@DEN'),leg('d1','NYJ +6.5 (+105)',105,'NYJ@MIA'),leg('d2','TEN +3 (+120)',120,'TEN@HOU'),leg('d3','ARI ML (+165)',165,'ARI@SEA')],
  st:{},sent:{},bc:{pub:'@TheDeskApp',pubLounge:'-100888'},recapPlan:{day:'Sun, Nov 8',chars:[{name:'The Coach',keys:['n1','n2','n3'],price:'+596'},{name:'The Underdog Spotter',keys:['d1','d2','d3'],price:'+1290'},{name:'The Brain',keys:['n1'],price:'-110'}]}});
const mkState=()=>({posts:{'2026-11-06':past('2026-11-06','W','L','L'),'2026-11-07':past('2026-11-07','W','W','L'),[today]:card()}});
/* who's hot */
const st0=mkState();const L=Wk.weekLeader(st0,today);
T('Player of the Week: the hottest hand over the days held (2+ graded parlays, most units) — props/strong-suit tickets don\'t count',L&&L.name==='The Coach'&&L.n===2&&L.days===2&&Math.abs(L.u-2*((1+100/110)**2-1))<1e-9,JSON.stringify(L));
T('a character on a cold run never leads (the Dog lost both)',!Wk.weekLeader({posts:{a:past('2026-11-07','L','L','L')}},today));
const sp=Wk.spotlights(st0,st0.posts[today],today);T('today\'s spotlights: the Coach\'s parlay (Player of the Week) and the Underdog Spotter\'s (the Terrible 3)',sp.length===2&&sp[0].tag==='potw'&&sp[0].c.name==='The Coach'&&sp[1].tag==='dog');
/* posting */
const PH=[],WT=[];const tgPhoto=async(chat,im,cap)=>{PH.push({chat,cap,im});return true;};const tg=async(m,q)=>{WT.push(q);return{ok:true};};
const D={tg,tgPhoto,render:async c=>({png:Buffer.from('p'),jpg:Buffer.from('j'),card:c}),startOf};
let st=mkState();let p=st.posts[today];
await Wk.runSpotlights(st,p,today,{...D,now:S('2026-11-08T17:00:00Z')});T('nothing before the first game is 30 minutes out',PH.length===0);
await Wk.runSpotlights(st,p,today,{...D,now:S('2026-11-08T17:31:00Z')});
const potw=PH.filter(x=>/PLAYER OF THE WEEK/.test(x.cap)),dog=PH.filter(x=>/THE TERRIBLE 3/.test(x.cap));
T('at T-30 the Player of the Week goes to the public channel (not the lounge since v3.1.1), picture and words',potw.length===1&&potw.map(x=>x.chat).join()==='@TheDeskApp'&&/The Coach/.test(potw[0].cap)&&/\+5\.29u over the last 2 card days/.test(potw[0].cap),potw[0]&&potw[0].cap);
T('…a teaser: the 12:00 leg shows, the later legs are locked with their unlock times (VIP has them)',/NO -3 \(-110\)/.test(potw[0].cap)&&!/SF ML|KC -2\.5/.test(potw[0].cap)&&/🔒 Leg 2 · unlocks 2:55 PM CT/.test(potw[0].cap)&&/🔒 Leg 3 · unlocks 6:50 PM CT/.test(potw[0].cap)&&/VIP got the whole ticket this morning/.test(potw[0].cap),potw[0]&&potw[0].cap);
const pc=potw[0].im.card;T('…and the picture card says the same (locked rows carry no pick)',pc.title==='The Coach'&&pc.big.value==='+596'&&pc.rows[0].label==='NO -3 (-110)'&&/^Locked · leg 2$/.test(pc.rows[1].label)&&!JSON.stringify(pc).match(/SF ML|KC -2\.5/),JSON.stringify(pc.rows));
T('the Terrible 3: the Underdog Spotter\'s dogs, two at 12:00 shown, the 3:05 dog locked',dog.length===1&&/Three dogs, one ticket/.test(dog[0].cap)&&/NYJ \+6\.5/.test(dog[0].cap)&&/TEN \+3/.test(dog[0].cap)&&!/ARI ML/.test(dog[0].cap)&&/🔒 Leg 3 · unlocks 2:35 PM CT/.test(dog[0].cap)&&/\+1290/.test(dog[0].cap),dog[0]&&dog[0].cap);
const n=PH.length;await Wk.runSpotlights(st,p,today,{...D,now:S('2026-11-08T17:45:00Z')});T('…each once',PH.length===n);
/* full mode */
st=mkState();p=st.posts[today];PH.length=0;await Wk.runSpotlights(st,p,today,{...D,spot:'full',now:S('2026-11-08T17:31:00Z')});
T('SPOTLIGHT=full: every leg shows at the first unlock',/SF ML/.test(PH[0].cap)&&/KC -2\.5/.test(PH[0].cap)&&!/🔒/.test(PH[0].cap));
st=mkState();p=st.posts[today];PH.length=0;await Wk.runSpotlights(st,p,today,{...D,spot:'off',now:S('2026-11-08T17:31:00Z')});T('SPOTLIGHT=off: none',PH.length===0);
/* late, missing, wrong day */
st=mkState();p=st.posts[today];PH.length=0;await Wk.runSpotlights(st,p,today,{...D,now:S('2026-11-08T19:30:00Z')});
T('first game started over an hour ago → skipped for good, never posted late',PH.length===0&&Object.values(p.sent).every(v=>v==='late')&&Object.keys(p.sent).length===2);
st=mkState();p=st.posts[today];PH.length=0;await Wk.runSpotlights(st,p,'2026-11-09',{...D,now:S('2026-11-08T17:31:00Z')});T('only on the card\'s own day',PH.length===0);
st=mkState();p=st.posts[today];PH.length=0;await Wk.runSpotlights(st,p,today,{...D,startOf:async()=>NaN,now:S('2026-11-08T17:31:00Z')});T('no start time found → waits (no guessing)',PH.length===0&&!Object.keys(p.sent).length);
/* the Dog is also the Player of the Week → one post */
const hotDog={posts:{'2026-11-06':past('2026-11-06','L','L','W'),'2026-11-07':past('2026-11-07','L','L','W'),[today]:card()}};PH.length=0;
await Wk.runSpotlights(hotDog,hotDog.posts[today],today,{...D,now:S('2026-11-08T17:31:00Z')});
T('when the Underdog Spotter is the Player of the Week, it\'s one post that says both',PH.length===1&&PH.every(x=>/PLAYER OF THE WEEK — The Underdog Spotter/.test(x.cap)&&/today it's his Terrible 3/.test(x.cap)),PH.map(x=>x.cap.split('\n')[0]).join(' | '));
/* Telegram misses → retried */
st=mkState();p=st.posts[today];await Wk.runSpotlights(st,p,today,{...D,tgPhoto:async()=>false,tg:async()=>null,now:S('2026-11-08T17:31:00Z')});T('a Telegram miss leaves it to retry next pass',!Object.keys(p.sent).some(k=>/^spot\|/.test(k)));
/* it runs from the worker's pass */
st=mkState();PH.length=0;await Wk.runOnce(st,today,{...D,now:S('2026-11-08T17:31:00Z'),gradePick:async()=>null,gradeProp:async()=>null});
T('the worker\'s pass runs the spotlights',PH.filter(x=>/PLAYER OF THE WEEK|THE TERRIBLE 3/.test(x.cap)).length===2&&Object.keys(st.posts[today].sent).filter(k=>/^spot\|/.test(k)).length===2,PH.length);
const wf=(await import('fs')).readFileSync('/home/claude/work/.github/workflows/tg-autopilot.yml','utf8');T('the switch is a repo variable',/SPOTLIGHT: \$\{\{ vars\.SPOTLIGHT \}\}/.test(wf));
console.log(pass+' pass / '+fail+' fail');
