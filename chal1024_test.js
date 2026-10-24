/* v2.55 · THE CHALLENGE BOARD — from 4 challenges back to well over 100: every source the desk plays
   from × every bankroll shape it suits, each with the record behind it and what the plan did with the
   last 14 days of real plays. The four originals keep their ids (running challenges keep working). */
const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const NOW=Date.parse('2026-10-24T15:00:00Z'),D='2026-10-24';
const pk=(sp,game,pick,price,h,m)=>({sp,game,pick,price,m:m||'ml',sd:'away',p:0.72,cf:0.72,start:`2026-10-24T${h}:00:00Z`,main:true,color:' strong'});
const top3=[pk('nhl','WPG@DAL','WPG ML',-140,'23'),pk('nfl','KC@DEN','KC -3',-110,'20','spread'),pk('nba','NY@BOS','NY ML',120,'23')];
/* three graded days of the Best 3 for the record and the replay */
const LOG={[D]:{v:2,picks:top3}};
[['2026-10-20',[1,1,0]],['2026-10-21',[1,0,1]],['2026-10-22',[1,1,1]]].forEach(([d,r])=>{LOG[d]={v:2,picks:r.map((h,i)=>({sp:'nhl',game:'G'+i+'@H',pick:'P'+i,price:-110,main:true,hit:!!h}))};});
let id=0;const V=[];['2026-10-20','2026-10-21','2026-10-22'].forEach(d=>{for(let i=0;i<4;i++)V.push({id:'v'+(++id),sp:i<2?'nhl':'nfl',date:d,game:'X'+id+'@Y',voice:'Judge',market:i%2?'spread':'ml',side:'away',price:i===3?150:-120,cf:0.74,graded:true,hit:i!==1,units:0});});
V.push({id:'dog1',sp:'nhl',date:D,game:'SJ@VGK',voice:'Dog',market:'ml',side:'away',price:180,pick:'SJ ML',dP:0.42,dEdge:0.063,cf:0.41});
let html=fs.readFileSync(path.join(W,'nhl.html'),'utf8');html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
(async()=>{try{
  const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nhl.html',pretendToBeVisual:true,beforeParse(x){const RD=x.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[NOW]))}static now(){return NOW}}x.Date=FD;
    x.__NO_GRADELOOP__=true;x.__NO_REOPEN__=true;x.__NO_FLIP_RELOAD__=true;x.__NO_SYNC_LOOP__=true;x.__NO_BACKFILL__=true;
    x.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});x.scrollTo=()=>{};x.alert=()=>{};x.confirm=()=>true;
    x.localStorage.setItem('d4.setupDone','1');x.localStorage.setItem('d4.voices',JSON.stringify(V));x.localStorage.setItem('d4.best5log',JSON.stringify(LOG));
    x.localStorage.setItem('d4.best5',JSON.stringify({d:D,locked:true,lockedAt:NOW-3600e3,top3,bySport:{},picks:[],props:[]}));
    x.localStorage.setItem('d4.bankroll',JSON.stringify({balance:500,history:[],start:500}));}}).window;
  await wait(2500);
  const L=w.eval('ch2Lib().map(t=>t.id)');
  T('the board is back to well over 100 challenges',L.length>=100,String(L.length));
  T('the four originals keep their ids, so running challenges keep working',['climb','table','leader','grind'].every(i=>L.includes(i)));
  T('every source × shape: the lock, the parlays, each sport, each market, each price lane, the characters, the dogs',['g:b3lock:warm','g:b3par3:moon','g:sp:nfl:marathon','g:mk:total:grind','g:price:plus:triple','g:char:Judge:double','g:dog:warm'].every(i=>L.includes(i)),L.filter(i=>/b3lock|b3par3:moon|sp:nfl|mk:total|price:plus|Judge|dog/.test(i)).slice(0,12).join(','));
  const plays=src=>w.eval(`ch2Plays({id:1,src:'${src}',frac:0.1,pot:20,steps:[]}).map(o=>o.label+' '+o.legs.length+' '+o.dec.toFixed(3))`);
  T("The Lock plays only the Best 3's #1 pick",JSON.stringify(plays('b3lock'))===JSON.stringify(['WPG ML 1 1.714']),JSON.stringify(plays('b3lock')));
  T('the Best 3 three-teamer is one 3-leg ticket at the parlay price',(p=>p.length===1&&/^The Best 3 parlay 3 /.test(p[0])&&Math.abs(+p[0].split(' ').pop()-(1+100/140)*(1+100/110)*2.2)<0.01)(plays('b3par3')),JSON.stringify(plays('b3par3')));
  T('a sport-only challenge plays only that sport; Plus Money plays only plus prices',JSON.stringify(plays('sp:nfl'))===JSON.stringify(['KC -3 1 1.909'])&&JSON.stringify(plays('price:plus'))===JSON.stringify(['NY ML 1 2.200']));
  T("The Dog Pound plays the Underdog Spotter's dogs",JSON.stringify(plays('dog'))===JSON.stringify(['SJ ML 1 2.800']),JSON.stringify(plays('dog')));
  const R=w.eval(`ch2Record('best3')`);T('each card carries the record behind its source (Best 3: 7-2 over those days)',R&&R.w===7&&R.l===2,JSON.stringify(R));
  const P=w.eval(`ch2Replay(ch2Tpl('g:best3:warm'))`);
  T('…and what the plan did with the real plays: the $10 warm-up through 7-2 at -110 (every bet sized to win at least $1) reaches its $15 goal on day 3',P&&P.days===3&&P.end>=15&&P.end<16&&P.hit===3,JSON.stringify(P));
  w.eval(`ch2Start('g:b3lock:warm')`);const A=w.eval("ch2All().map(c=>c.preset+':'+c.src+':'+c.status)");
  T('starting one from the board earmarks its pot like the originals',A.includes('g:b3lock:warm:b3lock:active'),JSON.stringify(A));
  w.eval(`ch2Start('g:b3lock:warm')`);T('one copy of each at a time',w.eval('ch2All().length')===1);
  const h=w.eval('CH2_CAT="best3";ch2Html()');
  T('the board renders by category, each card with its record and the replay',/Challenge board · \d{3}/.test(h)&&/Record behind it \(30 days\): 7-2/.test(h)&&/Last 3 play-days: \$10\.00 → \$1\d\.\d\d/.test(h),(h.match(/Record behind it[^<]*/)||[''])[0]+' | '+(h.match(/Last \d+ play-days?[^<]*/)||[''])[0]);
  T('a running challenge shows as running on the board',/✓ running/.test(h));
  const hot=w.eval('CH2_CAT="hot";ch2Html()');T('"Hot right now" ranks the plans that grew the most',/Hot right now/.test(hot)&&/Last 3 play-days/.test(hot));
}catch(e){T('no crash',false,String(e&&e.stack||e).slice(0,600));}
  const p=out.filter(x=>x.startsWith('PASS')).length;console.log(out.join('\n'));console.log(`${p} pass / ${out.length-p} fail`);process.exit(0);})();
