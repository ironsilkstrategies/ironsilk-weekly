/* v2.59 · the VIP card lists every character's parlay (70%+, strong-suit, props), each leg flagged with the
   proven characters on it (💪) and against it (🚫); the league counts every parlay */
const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);const NOW=Date.parse('2026-10-24T15:00:00Z'),D='2026-10-24';
let html=fs.readFileSync(path.join(W,'nhl.html'),'utf8');html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const V=[];let id=0;for(let i=0;i<40;i++)V.push({id:'h'+(++id),voice:'Judge',sp:'nhl',game:'X'+i+'@Y',market:'ml',side:'away',price:-130,date:'2026-10-1'+(i%9),graded:true,hit:i%4!==0,units:i%4!==0?0.77:-1});
for(let i=0;i<40;i++)V.push({id:'h'+(++id),voice:'Coach',sp:'nhl',game:'X'+i+'@Y',market:'ml',side:'home',price:-130,date:'2026-10-1'+(i%9),graded:true,hit:i%4!==0,units:i%4!==0?0.77:-1});
V.push({id:'t1',voice:'Judge',sp:'nhl',game:'WPG@DAL',market:'ml',side:'away',price:-130,date:D,cf:0.74});V.push({id:'t2',voice:'Coach',sp:'nhl',game:'WPG@DAL',market:'ml',side:'home',price:-110,date:D,cf:0.5});
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nhl.html',pretendToBeVisual:true,beforeParse(x){const RD=x.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[NOW]))}static now(){return NOW}}x.Date=FD;
  x.__NO_GRADELOOP__=true;x.__NO_REOPEN__=true;x.__NO_BACKFILL__=true;x.__NO_SYNC_LOOP__=true;x.__NO_FLIP_RELOAD__=true;
  x.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});x.scrollTo=()=>{};x.alert=()=>{};x.confirm=()=>true;x.localStorage.setItem('d4.setupDone','1');x.localStorage.setItem('d4.voices',JSON.stringify(V));}}).window;
setTimeout(()=>{try{
  const leg={sp:'nhl',game:'WPG@DAL',pick:'WPG ML',price:-130,m:'ml',sd:'away',p:0.74};
  const S=w.eval(`legStrength(${JSON.stringify(leg)})`);T('a leg names the proven characters on it and fading it',S.on.join()==='Judge'&&S.fade.join()==='Coach',JSON.stringify(S));
  const C={d:D,best:[],top10:[],chars:[{v:'Judge',legs:[leg,{...leg,game:'A@B',pick:'A ML'}],dec:3,p:0.5},{v:'Sim',skill:true,legs:[leg],dec:2.5,p:0.4}],px:[{v:'Judge',px:true,legs:[{sp:'nhl',player:'Kyle Connor',team:'WPG',game:'WPG@DAL',k:'s',thr:3,price:-150}],dec:2,p:0.5}],props:[]};
  const t=w.eval(`subTelegramText(${JSON.stringify(C)},()=>'').join('\\n')`);
  T("every character's parlay is on the card, the strong-suit and prop ones too",/EVERY CHARACTER'S PARLAY/.test(t)&&/🎭 The Judge/.test(t)&&/STRONG-SUIT PARLAYS/.test(t)&&/💪 The Simulator/.test(t)&&/🎯 The Judge/.test(t)&&/Kyle Connor 3\+ SOG \(WPG/.test(t),t.slice(0,300));
  T('each leg carries its 💪 / 🚫 line',/💪 Judge · 🚫 Coach/.test(t));
  const P=w.eval(`tgwPayload({d:'${D}',chat:1,ids:[1],ts:1,card:${JSON.stringify(C)}})`);
  T('the worker tracks and recaps the prop parlays too',P.recapPlan.chars.some(x=>/props/.test(x.name))&&P.legs.some(l=>l.player==='Kyle Connor'));
  /* league: a won prop parlay moves the roll */
  const R=w.eval(`bkRunWeek(bkWeekStart(),[],{},null,{'${D}':{locked:true,by:{Judge:{done:true,won:true,legs:[{price:100},{price:100}]}}}}).Judge`);
  T('the weekly league counts the prop parlay',R.par.w===1&&R.br>100,JSON.stringify({br:R.br,par:R.par}));
}catch(e){T('no crash',false,e.stack.slice(0,500));}
const p=out.filter(x=>x.startsWith('PASS')).length;console.log(out.join('\n'));console.log(`${p} pass / ${out.length-p} fail`);process.exit(0);},3500);
