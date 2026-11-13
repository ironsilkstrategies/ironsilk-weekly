/* v2.99 · the Megaphone: a post every 30 minutes in posting hours — game questions (a flashcard of the question, the time,
   TheDesk Power Rank beside each team, the line, the key note) with a Telegram poll, streak watch, line movers, yesterday's
   receipts, and the once-a-morning "100 reactions drops the free card" goal that the worker counts and pays off.
   Invented feeds and cards, fake Telegram/Facebook, no network. */
let pass=0,fail=0;const T=(n,c,x)=>{c?pass++:fail++;console.log((c?'PASS ':'FAIL ')+n+(c?'':'  — '+(x||'')));};
process.env.AUTOPILOT_KEY='k';process.env.TG_BOT_TOKEN='t';for(const k of ['FB_PAGE_ID','FB_PAGE_TOKEN','IG_USER_ID','THREADS_TOKEN','MEGAPHONE','MEGA_HOURS','MEGA_EVERY','MEGA_GOAL'])delete process.env[k];
const Wk=await import('/home/claude/work/autopilot/worker.mjs');const Mg=await import('/home/claude/work/autopilot/megaphone.mjs');
/* ── a small league: season results, today's Oracle games, Coach notes ── */
const season={g:{}};let id=0;const add=(sp,d,a,h,as,hs)=>{season.g[++id]=[sp,d,a,h,as,hs,0,0,0,0,0,0];};
/* NBA: LAL wins 6 straight, ATL middling, everyone else filler */
const T6=['DAL','PHX','DEN','MIL','BOS','NYK'];T6.forEach((o,i)=>add('nba','2026-10-2'+i,o,'LAL',100,115));add('nba','2026-10-19','LAL','GSW',120,100);
['DAL','PHX','DEN','MIL','BOS'].forEach((o,i)=>add('nba','2026-10-2'+i,'ATL',o,i%2?110:100,i%2?100:110));
for(let i=0;i<6;i++)add('nba','2026-10-1'+i,T6[i%6],T6[(i+1)%6],105,108);
['KC','BUF','NE','MIA'].forEach((o,i)=>{add('nfl','2026-10-0'+(i+1),o,'MIN',17,24);add('nfl','2026-10-0'+(i+1),'BUF','NYJ',28,10);});
const day='2026-11-09',Z=t=>t+'Z';
const oracle={g:{
 'nba|LAL@ATL|2026-11-09':{sp:'nba',st:Z('2026-11-10T00:00'),a:'LAL',h:'ATL',ln:{spH:1.5,mlA:-120,mlH:102,tot:237.5},op:{spH:2.5,tot:236.5},s:{kalshi:{wp:0.48},poly:{wp:0.475},os:{pa:120.3,ph:117.2,tot:237.5}}},
 'nfl|BUF@MIN|2026-11-09':{sp:'nfl',st:Z('2026-11-10T01:15'),a:'BUF',h:'MIN',ln:{spH:3,mlA:-180,mlH:150,tot:44.5},op:{spH:3,tot:48.5},s:{kalshi:{wp:0.385},os:{pa:25.8,ph:21.7,tot:47.5}}},
 'ncaab|UNF@MIA|2026-11-09':{sp:'ncaab',st:Z('2026-11-10T00:00'),a:'UNF',h:'MIA',ln:{spH:-30.5,tot:150},op:{spH:-26.5,tot:150},s:{}},
 'nba|DEN@HOU|2026-11-09':{sp:'nba',st:Z('2026-11-10T01:30'),a:'DEN',h:'HOU',ln:{spH:-8.5,mlA:300,mlH:-380,tot:228},op:{spH:-4.5,tot:229},s:{}},
 'nba|BOS@NYK|2026-11-10':{sp:'nba',st:Z('2026-11-11T00:30'),a:'BOS',h:'NYK',ln:{spH:-2,tot:220},s:{}}}};
const coach={g:{'nba|LAL@ATL':{venue:'State Farm Arena',a:{name:'Los Angeles Lakers',heads:[{h:'Inside the 2019 Lakers title run'},{h:'Luka Doncic questionable vs. Hawks with back tightness'}]},h:{name:'Atlanta Hawks',heads:[{h:'Hawks beat Nets 124-121 behind Johnson'}]}},
 'nfl|BUF@MIN':{venue:'U.S. Bank Stadium',a:{name:'Buffalo Bills',heads:[]},h:{name:'Minnesota Vikings',heads:[{h:'Vikings to start QB Carson Wentz against Bills'}]}}}};
const F={oracle,season,coach};
/* ── rankings ── */
const P=Mg.powerRanks(season);
T('TheDesk Power Rankings: margins adjusted for who they played; LAL (7-0, all big wins) ranks #1 of the ranked NBA teams',P['nba|LAL'].rk===1&&P['nba|LAL'].w===7&&P['nba|LAL'].l===0&&P['nba|LAL'].of>=6,JSON.stringify(P['nba|LAL']));
T('…a streak is read off the end of the schedule (LAL: 7 straight W)',P['nba|LAL'].streak.t==='W'&&P['nba|LAL'].streak.n===7&&P['nba|LAL'].l5.join('')==='WWWWW');
T('…too few games → no rank, never a made-up one',P['nba|GSW']&&P['nba|GSW'].rk===0);
/* ── today's games and the question ── */
const games=Mg.gamesToday(oracle,day);T('today\'s games come from the Oracle feed by the local day (tomorrow\'s stay out)',games.length===4&&!games.some(g=>g.k==='nba|BOS@NYK'));
const now=Date.parse('2026-11-09T15:00:00Z');const g0=Mg.pickGame(games,P,{q:{}},now);T('the most interesting game goes first (the NFL game)',g0&&g0.k==='nfl|BUF@MIN',g0&&g0.k);
const FF={...F,P};const lal=Mg.questionPost(games.find(g=>g.k==='nba|LAL@ATL'),FF,{});
T('a close game asks who wins, with the two teams as the poll',/Who|Coin flip/.test(lal.card.title)&&lal.poll.options.join()==='Lakers,Hawks',lal.card.title+' '+lal.poll.options);
T('the flashcard: the question big, the time, the Power Rank beside each team, the line, TheDesk\'s read, the key note',lal.card.wrap&&/NBA · Tonight 6:00 PM CT/.test(lal.card.kicker)&&lal.card.rows[0].label==='#1 Lakers'&&/^#\d+ Hawks$/.test(lal.card.rows[1].label)&&lal.card.rows.some(r=>r.label==='LAL -1.5 · O/U 237.5')&&lal.card.rows.some(r=>r.label==='TheDesk read'&&/Lakers 120, Hawks 117/.test(r.meta))&&lal.card.rows.some(r=>r.label==='Key note'&&/questionable/.test(r.meta)),JSON.stringify(lal.card.rows.map(r=>r.label)));
T('…the words carry the stat lines, the line move, the markets, the read and the lounge',/Los Angeles Lakers \(7-0\) · last 5: W W W W W/.test(lal.text)&&/spread opened ATL \+2\.5, now \+1\.5/.test(lal.text)&&/Prediction markets: 52% Lakers/.test(lal.text)&&/TheDesk's read/.test(lal.text)&&/t\.me\/TheDeskLounge/.test(lal.text)&&lal.text.length<1000,lal.text);
T('…the key note skips old-game stories and recaps (no "2019", no "beat")',!/2019|beat Nets/.test(lal.text));
const nfl=Mg.questionPost(games.find(g=>g.k==='nfl|BUF@MIN'),FF,{});T('a total that moved 4 points (or models far off it) asks over/under',nfl.card.title==='Over or under 44.5?'&&nfl.poll.options.join()==='Over 44.5,Under 44.5'&&/start QB Carson Wentz/.test(nfl.text));
const den=Mg.questionPost(games.find(g=>g.k==='nba|DEN@HOU'),FF,{});T('a big spread asks upset or chalk',/Upset alert|hang\?/.test(den.card.title)&&/handle it/.test(den.poll.options[0]),den.card.title);
T('no paid pick anywhere: only public data words (no "lock", "VIP pick", "our pick")',![lal.text,nfl.text,den.text].some(t=>/our pick|VIP pick|best bet|\block\b/i.test(t)));
/* ── streaks and movers ── */
const st=Mg.streakPost(games,FF,{st:{}},now,{});T('streak watch: LAL on 7 straight plays today → "7 straight. Make it 8?" with its last five',st&&st.card.title==='7 straight. Make it 8?'&&st.card.rows.length===5&&st.card.rows.every(r=>r.res==='W')&&st.poll.options[0]==='Streak lives',st&&st.card.title);
const mv=Mg.moversPost(games,FF,now,{});T('line movers: the day\'s biggest moves since open, a college blowout spread left out',mv&&mv.card.rows.length>=2&&mv.text.includes('DEN @ HOU')&&mv.text.includes('total 48.5 → 44.5')&&!mv.text.includes('UNF'),mv&&mv.text);
/* ── the schedule ── */
T('due: inside posting hours, 30 minutes apart (a few minutes of slack for the 10-minute runs)',Mg.due({},Date.parse('2026-11-09T15:00:00Z'))&&!Mg.due({last:now-20*60e3},now)&&Mg.due({last:now-27*60e3},now)&&!Mg.due({},Date.parse('2026-11-09T13:30:00Z'))&&!Mg.due({},Date.parse('2026-11-10T05:10:00Z')));
T('MEGA_HOURS / MEGA_EVERY change it',Mg.due({},Date.parse('2026-11-09T13:30:00Z'),{hours:'7-22'})&&!Mg.due({last:now-50*60e3},now,{every:60}));
/* ── the worker posting ── */
const PH=[],WT=[];const tgPhoto=async(chat,im,cap)=>{PH.push({chat,cap,card:im.card});return true;};const tg=async(m,q)=>{WT.push({m,...q});return{ok:true};};
const FBC=[];let REACT=12;const fetchFB=async(u,o={})=>{u=String(u);const b=o.body instanceof FormData?Object.fromEntries([...o.body.entries()].map(([k,v])=>[k,typeof v==='string'?v:'[file]'])):Object.fromEntries(new URLSearchParams(o.body||''));FBC.push({u,b});
  if(/\/photos$/.test(u))return{ok:true,status:200,json:async()=>({id:'PH'+FBC.length,post_id:'123_'+FBC.length})};if(/fields=images/.test(u))return{ok:true,status:200,json:async()=>({images:[{source:'https://x.fbcdn.net/a.jpg'}]})};
  if(/reactions\.summary/.test(u))return{ok:true,status:200,json:async()=>({id:'x',reactions:{data:[],summary:{total_count:REACT}}})};return{ok:false,status:404,json:async()=>({})};};
const render=async c=>({png:Buffer.from('p'),jpg:Buffer.from('j'),card:c});
const fb={page:'123',tok:'PAGE-TOK',v:'v24.0'};
const pubLegs=[{k:'a',kind:'Best 3',label:'NO -3 (-110)',sp:'nfl',game:'CLE@NO',price:-110,start:'2026-11-09T18:00:00Z',unlockAt:Date.parse('2026-11-09T17:30:00Z')},{k:'b',kind:'Best 3',label:'SF ML (-140)',sp:'nfl',game:'SF@LAR',price:-140,start:'2026-11-09T21:25:00Z',unlockAt:Date.parse('2026-11-09T20:55:00Z')},{k:'c',kind:'Prop',label:'Mahomes O 1.5 TD',sp:'nfl',game:'KC@DEN',price:-150,start:'2026-11-10T01:20:00Z',unlockAt:Date.parse('2026-11-10T00:50:00Z')}];
const mkState=()=>({posts:{'2026-11-08':{d:'2026-11-08',legs:[],st:{x1:'W',x2:'L',x3:'W'},sent:{},pub:{day:'Sun, Nov 8',legs:[{k:'x1',kind:'Best 3',label:'BUF -3',price:-110},{k:'x2',kind:'Best 3',label:'SF ML',price:-140},{k:'x3',kind:'Prop',label:'Allen O 1.5 TD',price:-130}]},bc:{pub:'@TheDeskApp',pubLounge:'-100888'}},
  [day]:{d:day,legs:[],st:{},sent:{},pub:{day:'Mon, Nov 9',legs:pubLegs},bc:{pub:'@TheDeskApp',pubLounge:'-100888'}}}});
const D={tg,tgPhoto,render,feeds:F,fetch:fetchFB,fb,th:{tok:''},ig:{user:''}};
let state=mkState(),M={};const at=t=>Date.parse('2026-11-09T'+t+':00Z');
/* 9:00 AM CT: the goal (Facebook only) */
let a=await Wk.runMegaphone(state,M,day,{...D,now:at('15:00')});
const gp=FBC.find(c=>/\/photos$/.test(c.u));
T('9 AM: the goal post goes to Facebook — "100 reactions = today\'s full free card", with its picture — and to the free channel and lounge, pointing at the Facebook post (v3.1.2)',a===1&&PH.length===2&&PH.every(x=>/100 REACTIONS/.test(x.cap)&&/reactions count on our Facebook post → https:\/\/www\.facebook\.com\//.test(x.cap))&&gp&&/100 REACTIONS = TODAY'S FULL FREE CARD/.test(gp.b.message)&&/all 3 of today's free picks/.test(gp.b.message)&&M.goal&&M.goal.id&&M.goal.n===100,gp&&gp.b.message);
T('…its words hold no pick',!/NO -3|SF ML|Mahomes/.test(gp.b.message));
a=await Wk.runMegaphone(state,M,day,{...D,now:at('15:10')});T('…nothing again 10 minutes later (30-minute rhythm), the reactions counted (12)',a===0&&M.goal.seen===12,JSON.stringify(M.goal));
/* 9:30: a question (even slot after the goal is odd? n=1 → odd slot: receipts first) */
a=await Wk.runMegaphone(state,M,day,{...D,now:at('15:31')});const rp=PH.filter(x=>/RECEIPTS/.test(x.cap));
T('9:30: yesterday\'s receipts to the public channel and lounge (2-1, every pick graded)',a===1&&rp.length===2&&/went 2-1/.test(rp[0].cap)&&rp[0].card.title==='Yesterday: 2-1',PH.map(x=>x.cap.split('\n')[0]).join(' | '));
a=await Wk.runMegaphone(state,M,day,{...D,now:at('16:01')});const q1=PH.filter(x=>/🗳️/.test(x.cap));
T('10:00: a game question — picture to the channel and lounge, each with a native poll under it',a===1&&q1.length===2&&/Bills @ Vikings/.test(q1[0].cap)&&WT.filter(w=>w.m==='sendPoll').length===2&&JSON.parse(WT.find(w=>w.m==='sendPoll').options).map(o=>o.text).join()==='Over 44.5,Under 44.5',JSON.stringify(WT.slice(-1)));
T('…and mirrored to Facebook as a photo post',FBC.filter(c=>/\/photos$/.test(c.u)&&/Bills @ Vikings/.test(c.b.message)).length===1);
for(const t of ['16:31','17:01','17:31','18:01'])await Wk.runMegaphone(state,M,day,{...D,now:at(t)});
const heads=PH.filter(x=>x.chat==='@TheDeskApp').map(x=>x.cap.split('\n')[0]);const qs=heads.filter(h=>/🗳️/.test(h));
T('through the day: a different game every hour, never the same one twice',new Set(qs).size===qs.length&&qs.length>=2&&heads.some(h=>/STREAK WATCH/.test(h)),heads.join(' | '));
/* the goal hits */
REACT=104;const before=PH.length;a=await Wk.runMegaphone(state,M,day,{...D,now:at('18:12')});const drop=PH.slice(before).filter(x=>/GOAL HIT/.test(x.cap));
T('the goal hits (104 reactions): every free pick still locked drops right then — channel, lounge and Facebook',drop.length===2&&/SF ML/.test(drop[0].cap)&&/Mahomes/.test(drop[0].cap)&&!/NO -3/.test(drop[0].cap)&&FBC.some(c=>/\/photos$/.test(c.u)&&/GOAL HIT/.test(c.b.message)),drop[0]&&drop[0].cap);
T('…marked unlocked, so the 30-minute unlock posts don\'t repeat them, and the goal is closed',['b','c'].every(k=>state.posts[day].sent['unlock|'+k])&&M.goal.done==='hit');
/* off switch, hours, a missing goal */
const s2=mkState(),M2={};a=await Wk.runMegaphone(s2,M2,day,{...D,mega:'off',now:at('15:00')});T('MEGAPHONE=off: silent',a===0&&!M2.n);
const s3=mkState(),M3={};const p0=PH.length;await Wk.runMegaphone(s3,M3,day,{...D,goal:'off',now:at('15:00')});T('MEGA_GOAL=off: no goal post — the slot goes to a regular post',!M3.goal&&PH.length>p0);
const s4=mkState(),M4={};await Wk.runMegaphone(s4,M4,day,{...D,now:at('05:00')});T('outside posting hours (11 PM CT): nothing',!M4.n);
/* a new day resets what was posted */
const M5={d:'2026-11-08',last:at('04:00'),n:20,q:{'nfl|BUF@MIN':1},st:{},mv:2,rec:1};await Wk.runMegaphone(mkState(),M5,day,{...D,goal:'off',now:at('16:00')});T('a new day starts fresh (yesterday\'s posted games forgotten)',M5.d===day&&M5.n===1&&!M5.mv);
/* no feeds → still the non-game posts */
const M6={};const p6=PH.length;await Wk.runMegaphone(mkState(),M6,day,{...D,feeds:null,goal:'off',now:at('15:00')});T('feeds unreachable: receipts still go; no made-up game posts',PH.length>p6&&/RECEIPTS/.test(PH[PH.length-1].cap));
/* wiring */
const fs=await import('fs');const wf=fs.readFileSync('/home/claude/work/.github/workflows/tg-autopilot.yml','utf8'),wk=fs.readFileSync('/home/claude/work/autopilot/worker.mjs','utf8');
T('the switches are repo variables (MEGAPHONE, MEGA_HOURS, MEGA_EVERY, MEGA_GOAL)',['MEGAPHONE','MEGA_HOURS','MEGA_EVERY','MEGA_GOAL'].every(v=>wf.includes(`${v}: \${{ vars.${v} }}`)));
T('the worker runs it every pass and remembers it in its own encrypted file',/runMegaphone\(state, SOCMEM\.S\.mega, today\)/.test(wk)&&/await socialSave\(\)/.test(wk));
console.log(pass+' pass / '+fail+' fail');
