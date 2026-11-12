/* v3.0 · the Sheet: slate.json, the day's slate the feeds robot publishes for the public app's Slate tab. Public sports data
   only (schedule, lines and moves, market odds, projected score, TheDesk Power Rankings, the question) — never a pick.
   Invented league, no network. */
let pass=0,fail=0;const T=(n,c,x)=>{c?pass++:fail++;console.log((c?'PASS ':'FAIL ')+n+(c?'':'  — '+(x||'')));};
const Mg=await import('/home/claude/work/autopilot/megaphone.mjs');const fs=await import('fs');
const season={g:{}};let id=0;const add=(sp,d,a,h,as,hs)=>{season.g[++id]=[sp,d,a,h,as,hs,0,0,0,0,0,0];};
const NBA=['LAL','ATL','DAL','PHX','DEN','MIL','BOS','NY'];for(let r=0;r<6;r++)for(let i=0;i<4;i++){const a=NBA[(i+r)%8],h=NBA[(i+r+4)%8];add('nba','2026-10-'+(20+r),a,h,100+((i*7+r*3)%15),104+((i*5+r)%11));}
for(let i=0;i<40;i++)for(let r=0;r<4;r++)add('ncaab','2026-11-0'+(r+1),'C'+i,'C'+((i+r+1)%40),60+(i%9),62+((i+r)%13));
const day='2026-11-12',Z=t=>t+'Z';const g=(sp,st,a,h,x)=>({sp,st:Z(st),a,h,...x});
const oracle={g:{
 ['nba|LAL@ATL|'+day]:g('nba','2026-11-13T00:00','LAL','ATL',{ln:{spH:1.5,mlA:-120,mlH:102,tot:237.5},op:{spH:2.5,tot:236.5},s:{kalshi:{wp:0.48},poly:{wp:0.47},dr:{pa:120.4,ph:117.0},os:{pa:119.6,ph:118.0}}}),
 ['nba|DAL@PHX|'+day]:g('nba','2026-11-13T02:00','DAL','PHX',{ln:{spH:-6,tot:221},s:{espn:{wp:0.66}}}),
 ['nba|DEN@MIL|2026-11-13']:g('nba','2026-11-14T01:00','DEN','MIL',{ln:{spH:-2,tot:226},s:{}}),
 ['nba|BOS@NY|2026-11-14']:g('nba','2026-11-15T01:00','BOS','NY',{ln:{spH:-2,tot:226},s:{}})}};
for(let i=0;i<30;i++)oracle.g[`ncaab|C${i}@C${i+5}|${day}`]=g('ncaab','2026-11-13T0'+(i%3)+':00','C'+i,'C'+(i+5),{ln:{spH:-(i%12)-1,tot:140+i},s:{}});
const coach={g:{'nba|LAL@ATL':{venue:'State Farm Arena',a:{name:'Los Angeles Lakers',heads:[{h:'Luka Doncic questionable vs. Hawks with back tightness'}]},h:{name:'Atlanta Hawks',heads:[]}}}};
const now=Date.parse('2026-11-12T16:00:00Z');const S=Mg.slateOf({oracle,season,coach},now,2);const J=JSON.stringify(S);
T('the sheet covers today and tomorrow, Central (a game two days out stays off)',S.v===1&&S.days.length===2&&S.days[0].d===day&&S.days[1].d==='2026-11-13'&&!J.includes('BOS@NY'),S.days.map(d=>d.d).join());
const L=S.days[0].games.find(x=>x.k==='nba|LAL@ATL');
T('a game carries its time, both teams by name with Power Rank, record, last five and streak',L&&L.t===Date.parse('2026-11-13T00:00Z')&&L.a.name==='Los Angeles Lakers'&&L.a.nick==='Lakers'&&L.h.nick==='Hawks'&&L.a.rk>0&&L.a.of===8&&/^[WL]{5}$/.test(L.a.l5)&&L.a.w+L.a.l===6,JSON.stringify(L&&L.a));
T('…the line and how it moved, the markets, the projected score (every source averaged), the note, the question',L.ln.fav==='LAL'&&L.ln.line===1.5&&L.ln.tot===237.5&&L.ln.mlA===-120&&/spread opened ATL \+2\.5, now \+1\.5/.test(L.mv[0])&&L.mkt.ab==='LAL'&&L.mkt.pct===53&&L.mkt.src==='markets'&&L.read.a===120&&L.read.h===118&&/questionable/.test(L.note)&&L.q.title&&L.q.opts.length===2&&L.venue==='State Farm Arena',JSON.stringify([L.ln,L.mv,L.mkt,L.read]));
const D2=S.days[0].games.find(x=>x.k==='nba|DAL@PHX');T('no markets → the model\'s number, labelled as a model; a pro team without a preview still gets its name',D2.mkt.src==='model'&&D2.mkt.ab==='PHX'&&D2.mkt.pct===66&&D2.a.name==='Dallas Mavericks'&&D2.read===null);
const cb=S.days[0].games.filter(x=>x.sp==='ncaab');T('the college slate is cut to the games worth a look, and says how many more there are',cb.length===14&&S.days[0].more===16,cb.length+' +'+S.days[0].more);
T('games run in time order',S.days[0].games.every((x,i,a)=>!i||a[i-1].t<=x.t));
T('TheDesk Power Rankings ride along: every ranked pro team by name, college top 25',S.ranks.nba.length===8&&S.ranks.nba[0].rk===1&&S.ranks.nba.every((x,i)=>x.rk===i+1&&x.name.length>3)&&S.ranks.ncaab.length===25,JSON.stringify(S.ranks.nba[0]));
T('public data only: no pick words anywhere on the sheet',!/best 3|our pick|vip|lock of|banker|parlay|unit/i.test(J));
T('small enough for a phone (under 40 KB here)',J.length<40000,J.length);
const b=fs.readFileSync('/home/claude/work/feeds/build.mjs','utf8'),w=fs.readFileSync('/home/claude/work/.github/workflows/feeds.yml','utf8');
T('the feeds robot builds it each run from the feeds it just made, and a failure never stops the other feeds',/async function buildSlate\(diag\)/.test(b)&&/try\{await buildSlate\(diag\);\}catch\(e\)\{diag\.slate=\{fail:/.test(b)&&/slate\.json/.test(b));
T('the workflow checks out the worker\'s megaphone beside the feeds code',/sparse-checkout: \|\n\s+feeds\n\s+autopilot/.test(w)&&/autopilot\/megaphone\.mjs/.test(w));
console.log(pass+' pass / '+fail+' fail');
