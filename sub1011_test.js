const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';const {webcrypto}=require('crypto');
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
const load=(page)=>{let h=fs.readFileSync(path.join(W,page),'utf8');return h.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);};
const tg=[];let tgMode='ok';
const NOW=Date.parse('2026-10-11T19:00:00Z');   // 2:00 PM CT
const w=new JSDOM(load('nfl.html'),{runScripts:'dangerously',url:'https://ironsilkweekly.com/nfl.html',pretendToBeVisual:true,beforeParse(w){
  const RD=w.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[NOW]))}static now(){return NOW}}w.Date=FD;w.__NO_GRADELOOP__=true;w.__NO_SYNC_LOOP__=true;
  Object.defineProperty(w,'crypto',{value:webcrypto});w.TextEncoder=TextEncoder;
  w.fetch=(u,o)=>{u=String(u);if(/api\.telegram\.org/.test(u)){const b=Object.fromEntries(new URLSearchParams(String(o.body)));tg.push({u,b});
      if(tgMode==='cors')return Promise.reject(new TypeError('Failed to fetch'));if(tgMode==='bad')return Promise.resolve({ok:false,status:400,json:()=>Promise.resolve({ok:false,description:'Bad Request: chat not found'})});
      return Promise.resolve({ok:true,status:200,json:()=>Promise.resolve({ok:true})});}
    return Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});};
  w.scrollTo=()=>{};w.alert=m=>{w.__al=(w.__al||[]).concat(m)};w.confirm=()=>true;w.localStorage.setItem('d4.setupDone','1');}}).window;
setTimeout(async()=>{try{
  const td=w.eval('today()');
  /* ── specialties: the Judge wins road dog spreads, loses road fav spreads, in CFB ── */
  const V=[];let i=0;const g=(voice,sp,market,side,line,price,n,wins)=>{for(let k=0;k<n;k++)V.push({id:'g'+(i++),voice,sp,market,side,line,price,date:'2026-10-0'+(1+k%8),game:'X'+i+'@Y'+i,graded:true,hit:k<wins,units:k<wins?(price>0?price/100:100/-price):-1});};
  g('Judge','ncaaf','spread','away',7.5,-110,23,18);   // road dog spreads 18-5
  g('Judge','ncaaf','spread','away',-7.5,-110,23,7);   // road fav spreads 7-16
  w.eval(`set(VOICES_KEY,${JSON.stringify(V)})`);
  const sp=(side,line)=>w.eval(`charSpecialty('Judge','ncaaf','spread','${side}',-110,${line})`);
  const dog=sp('away',7.5),fav=sp('away',-7.5);
  T('specialty: road dog spreads are a strength (boosted)',dog.strong&&!dog.weak&&dog.adj>0,dog.why.join(' '));
  T('specialty: road fav spreads are a weak spot (kept off)',fav.weak&&fav.adj<0,fav.why.join(' '));
  T('weak-spot label reads like a scout report',/CFB road fav spread 7-16/.test(fav.why[0])&&/CFB road dog spread 18-5/.test(dog.why[0]),fav.why[0]+' | '+dog.why[0]);
  /* today's calls: 2 road-fav spreads (weak) + 6 road-dog / other spots */
  const games=['A1@B1','A2@B2','A3@B3','A4@B4','A5@B5','A6@B6','A7@B7','A8@B8'];
  const calls=games.map((gm,k)=>({id:'t'+k,voice:'Judge',sp:'ncaaf',market:'spread',side:'away',line:k<2?-6.5:6.5,price:-110,date:td,game:gm,pick:gm.split('@')[0]+(k<2?' -6.5':' +6.5')}));
  w.eval(`set(VOICES_KEY,get(VOICES_KEY,[]).concat(${JSON.stringify(calls)}))`);
  const sc=w.eval(`(()=>{const V=roGet(VOICES_KEY,[]);return get(VOICES_KEY,[]).filter(x=>x.date===today()).map(c=>({g:c.game,weak:cparLegScore(V,c).weak}));})()`);
  T('the shared leg scorer flags weak-spot calls for every builder',sc.filter(x=>x.weak).map(x=>x.g).join()==='A1@B1,A2@B2',JSON.stringify(sc));
  const C=w.eval(`bkDayCands(roGet(VOICES_KEY,[]),today()).Judge.map(x=>x.game)`);
  T('Banker / Roll Call candidates leave the weak spots out',!C.includes('A1@B1')&&!C.includes('A2@B2')&&C.length===6,C.join());
  const P=w.eval(`subCharParlay('Judge',5)`);
  T('subscriber 5-leg: five legs, one per game, no weak spots, strengths labelled',P&&P.legs.length===5&&new Set(P.legs.map(l=>l.game)).size===5&&!P.legs.some(l=>/A1@B1|A2@B2/.test(l.game))&&P.legs.every(l=>/road dog spread/.test(l.spec))&&P.dropped===2,JSON.stringify(P&&P.legs.map(l=>l.game)));
  T('its cash chance is the product of the leg chances',Math.abs(P.p-P.legs.reduce((a,l)=>a*l.p,1))<1e-9&&P.p<0.25);
  /* ── top 10 ── */
  const pk=(gm,extra)=>({game:gm,m:'ml',sd:'home',pick:gm.split('@')[1]+' ML',price:110,color:' strong',blend:.52,mp:.52,mkt:.48,start:'2026-10-11T23:00:00Z',...(extra||{})});
  const TC=[pk('C1@D1'),pk('C2@D2',{blend:.58,mp:.58}),pk('C3@D3',{price:-400,blend:.85,mp:.85,mkt:.8}),pk('C4@D4',{start:'2026-10-11T17:00:00Z'}),pk('C5@D5',{blend:.40,mp:.40})];
  w.eval(`set(TC_KEY,{d:'${td}',by:{ncaaf:{picks:${JSON.stringify(TC)}}}})`);
  const top=w.eval('subTop10().map(x=>x.game)');
  T('top 10: best value first; no -400 chalk, no started games, no -EV',top[0]==='C2@D2'&&!top.includes('C3@D3')&&!top.includes('C4@D4')&&!top.includes('C5@D5'),top.join());
  /* ── Telegram ── */
  const parts=w.eval('subTelegramText(subCard())');
  T('Telegram card: Top plays + each character parlay + 21+ line, every part under the limit',parts.every(p=>p.length<=3800)&&/TOP \d+ PLAYS/.test(parts.join())&&/The Judge — 5-leg/.test(parts.join())&&/1-800-GAMBLER/.test(parts.join()));
  T('HTML-safe (team names escaped)',!/<(?!\/?(b|i)>)/.test(parts.join('').replace(/<b>|<\/b>|<i>|<\/i>/g,'')));
  w.eval(`set('d4.tgbot','123:ABC');set('d4.tgchat','@TheDeskVIP')`);
  let r=await w.eval('subPostTelegram()');
  T('posts to the channel through the bot (HTML, previews off)',r.ok&&tg.length===parts.length&&tg[0].b.chat_id==='@TheDeskVIP'&&tg[0].b.parse_mode==='HTML'&&/bot123:ABC\/sendMessage/.test(tg[0].u));
  tgMode='bad';w.__al=[];r=await w.eval('subPostTelegram()');
  T('a Telegram refusal is reported with the fix',r.ok===false&&/chat not found/.test(w.__al[0])&&/admin/.test(w.__al[0]));
  tgMode='cors';w.__al=[];r=await w.eval('subPostTelegram()');
  T('browser blocks the reply → still sent once, told to check the channel',r.ok&&r.unconfirmed&&/check the channel/.test(w.__al[0]));
  T('channel id without its minus is fixed (1003937155725 → -1003937155725); names get their @',w.eval(`tgChatNorm('1003937155725')`)==='-1003937155725'&&w.eval(`tgChatNorm('-1003937155725')`)==='-1003937155725'&&w.eval(`tgChatNorm('TheDeskVIP')`)==='@TheDeskVIP'&&w.eval(`tgChatNorm('https://t.me/TheDeskApp')`)==='@TheDeskApp');
  w.eval(`set('d4.tgchat','1003937155725')`);tgMode='ok';tg.length=0;await w.eval('subPostTelegram()');
  T('posting with a minus-less id sends to the right channel',tg[0]&&tg[0].b.chat_id==='-1003937155725');
  T('bot token never syncs and never backs up',!('d4.tgbot' in w.eval('syncSnapshot().keys'))&&!('d4.tgbot' in w.eval('backupData()')));
  /* ── public page: hidden until kickoff, fingerprint ── */
  const top3=[{sp:'nfl',game:'DEN@LAC',pick:'Over 41.5',price:-115,blend:.55,start:'2026-10-11T20:05:00Z'},{sp:'nfl',game:'NYG@WSH',pick:'WSH ML',price:-190,blend:.66,start:'2026-10-11T17:00:00Z'}];
  w.eval(`set(BEST5_KEY,{d:'${td}',locked:true,lockedAt:Date.now()-3600e3,top3:${JSON.stringify(top3)},bySport:{},picks:[]})`);
  const F=w.eval('publicFeed()');
  T('public feed: unstarted play hidden (no pick, no price), started play shown',F.today.picks[0].hidden&&!F.today.picks[0].pick&&F.today.picks[1].pick==='WSH ML'&&F.today.allStarted===false);
  T('public feed carries the price line',F.price==='$19.99/mo · $9.99/wk');
  const c1=await w.eval(`pickCommit(get(BEST5_KEY,{}),false)`);const c2=await w.eval(`pickCommit(get(BEST5_KEY,{}),true)`);
  T('fingerprint: same hash before and after reveal; key only at reveal',c1.hash===c2.hash&&c1.salt===null&&/^[0-9a-f]{32}$/.test(c2.salt)&&/^[0-9a-f]{64}$/.test(c1.hash));
  /* the picks page verifies it */
  const feed={v:3,price:'$19.99/mo · $9.99/wk',subscribe:'https://whop.com/thedesk',record:{w:7,l:0,u:6.3},today:{d:td,lockedAt:Date.now(),picks:top3.map(x=>({sp:x.sp,game:x.game,pick:x.pick,price:x.price,p:.55})),commit:c2},history:[]};
  const feedHidden={...feed,today:{...feed.today,picks:[{hidden:true,sp:'nfl',start:'2026-10-11T20:05:00Z'},feed.today.picks[1]],commit:c1}};
  const page=f=>new JSDOM(load('picks.html'),{runScripts:'dangerously',url:'https://ironsilkweekly.com/picks.html',pretendToBeVisual:true,beforeParse(pw){Object.defineProperty(pw,'crypto',{value:webcrypto});pw.TextEncoder=TextEncoder;
    pw.fetch=u=>Promise.resolve(/picks\.json/.test(String(u))?{ok:true,json:()=>Promise.resolve(f)}:{ok:false,json:()=>Promise.resolve({})});}}).window;
  const p1=page(feedHidden),p2=page(feed);await new Promise(z=>setTimeout(z,900));
  const h1=p1.document.body.innerHTML,h2=p2.document.body.innerHTML;
  T('picks page: locked tile for the hidden play, subscribe button with the price',/LOCKED PLAY/.test(h1)&&!/Over 41\.5/.test(h1)&&/\$19\.99\/mo/.test(h1)&&/whop\.com\/thedesk/.test(h1));
  T('picks page: fingerprint shown before reveal',/Fingerprint of today's locked plays/.test(h1));
  T('picks page: after reveal it verifies the plays match the lock',/✓ Verified/.test(h2),(p2.document.getElementById('fp')||{}).textContent);
  /* the public page reads its own copy AND the site repo — the newest card wins (while the domain moves) */
  const old={...feed,generated:1,today:{...feed.today,d:'2026-10-12'}},neu={...feed,generated:2};
  const p3=new JSDOM(load('picks.html'),{runScripts:'dangerously',url:'https://ironsilkweekly.com/picks.html',pretendToBeVisual:true,beforeParse(pw){Object.defineProperty(pw,'crypto',{value:webcrypto});pw.TextEncoder=TextEncoder;
    pw.fetch=u=>Promise.resolve(/raw\.githubusercontent\.com\/ironsilkstrategies\/ironsilk-weekly-site/.test(String(u))?{ok:true,json:()=>Promise.resolve(neu)}:/picks\.json/.test(String(u))?{ok:true,json:()=>Promise.resolve(old)}:{ok:false,json:()=>Promise.resolve({})});}}).window;
  await new Promise(z=>setTimeout(z,900));T('picks page shows the newest card of the two copies',p3.eval('FEED&&FEED.generated')===2);
}catch(e){T('harness',false,e.stack);}
console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length} pass / ${out.filter(x=>x.startsWith('FAIL')).length} fail`);process.exit(0);},3000);
