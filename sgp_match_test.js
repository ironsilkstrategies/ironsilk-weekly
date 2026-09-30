const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const TICKET=`Ticket Number:
1000908135
Accepted Date:
9/29/26
Amount:
$1.00
Status:
Pending
To win:
$216.33
Type:
SGPs Combined
Description:
27 Leg Parlay (Includes 5 SGPs)
SGP 1: HOCKEY - NHL - Edmonton Oilers v Vancouver Canucks
Anytime point - Leon Draisaitl (Match)
Anytime point - Connor McDavid (Match)
Anytime point - Evan Bouchard (Match)
Player shots on goal - Connor McDavid over 1.5 (Match)
Handicap - Canucks +3.5 (Match)
Total goals - Under 8.5 (Match)
SGP 2: BASEBALL - MLB - New York Yankees v Boston Red Sox
Total runs - Under 10.5 (Match)
Player batters struck out - Cam Schlittler 5+ (Match)
Player batters struck out - Payton Tolle 5+ (Match)
Player hits - Ben Rice 1+ (Match)
Handicap - Yankees +5.5 (Match)
Player hits allowed - Payton Tolle 2+ (Match)
Handicap - Red Sox +5.5 (Match)
SGP 3: HOCKEY - NHL - Boston Bruins v New York Rangers
Player shots on goal - David Pastrnak over 1.5 (Match)
Total goals - Under 7.5 (Match)
Anytime goal scorer - David Pastrnak (Match)
Handicap - NY Rangers +3.5 (Match)
SGP 4: BASEBALL - MLB - San Diego Padres v Chicago Cubs
Player hits - Fernando Tatis Jr. 1+ (Match)
Handicap - Padres +5.5 (Match)
Total runs - Under 11.5 (Match)
Player hits allowed - Matthew Boyd 2+ (Match)
Player hits - Samad Taylor 1+ (Match)
Handicap - Cubs +5.5 (Match)
SGP 5: HOCKEY - NHL - Vegas Golden Knights v Chicago Blackhawks
Anytime point - Jack Eichel (Match)
Anytime point - Mitchell Marner (Match)
Total goals - Under 7.5 (Match)
Handicap - Blackhawks +3.5 (Match)`;
const P=(n,st)=>({athlete:{displayName:n,shortName:n},stats:st});
const nhlBox=(a,h,teams)=>({header:{competitions:[{competitors:[{homeAway:'away',team:{abbreviation:a},score:'3'},{homeAway:'home',team:{abbreviation:h},score:'4'}],status:{period:3,type:{state:'post'}}}]},boxscore:{players:teams}});
const sk=(ab,rows)=>({team:{abbreviation:ab},statistics:[{name:'forwards',labels:['G','A','PTS','S'],athletes:rows}]});
const EDMVAN=nhlBox('VAN','EDM',[sk('EDM',[P('Leon Draisaitl',['1','1','2','4']),P('Connor McDavid',['0','2','2','3']),P('Evan Bouchard',['0','0','0','2'])]),sk('VAN',[P('Elias Pettersson',['1','0','1','3'])])]);
const BOSNYR=nhlBox('NYR','BOS',[sk('BOS',[P('David Pastrnak',['1','0','1','5'])]),sk('NYR',[P('Artemi Panarin',['0','1','1','2'])])]);
const VGKCHI=nhlBox('CHI','VGK',[sk('VGK',[P('Jack Eichel',['0','1','1','3'])]),sk('CHI',[P('Mitchell Marner',['0','0','0','2'])])]);
const bat=(rows)=>({name:'batting',type:'batting',labels:['H-AB','AB','R','H','RBI','HR','BB','K'],athletes:rows});
const pit=(rows)=>({name:'pitching',type:'pitching',labels:['IP','H','R','ER','BB','K','HR'],athletes:rows});
const mlb=(a,h,teams)=>({header:{competitions:[{competitors:[{homeAway:'away',team:{abbreviation:a},score:'2'},{homeAway:'home',team:{abbreviation:h},score:'5'}],status:{period:9,type:{state:'post'}}}]},boxscore:{players:teams}});
const BOSNYY=mlb('BOS','NYY',[{team:{abbreviation:'NYY'},statistics:[bat([P('Ben Rice',['1-4','4','1','1','0','0','0','1'])]),pit([P('Cam Schlittler',['6.0','5','2','2','1','7','0'])])]},
  {team:{abbreviation:'BOS'},statistics:[bat([P('Rafael Devers',['0-3','3','0','0','0','0','1','1'])]),pit([P('Payton Tolle',['5.0','3','3','3','2','4','1'])])]}]);
const CHCSD=mlb('CHC','SD',[{team:{abbreviation:'SD'},statistics:[bat([P('Fernando Tatis Jr.',['0-4','4','0','0','0','0','0','2']),P('Samad Taylor',['2-4','4','1','2','1','0','0','0'])]),pit([P('Nick Pivetta',['7.0','4','1','1','1','6','0'])])]},
  {team:{abbreviation:'CHC'},statistics:[bat([P('Ian Happ',['1-4','4','0','1','0','0','0','1'])]),pit([P('Matthew Boyd',['6.0','6','4','4','1','5','1'])])]}]);
const BOX={'601':EDMVAN,'602':BOSNYR,'603':VGKCHI,'701':BOSNYY,'702':CHCSD};
const SB={nhl:{events:[['601','2026-09-30T02:00Z','VAN','EDM'],['602','2026-09-30T00:07Z','NYR','BOS'],['603','2026-09-30T02:37Z','CHI','VGK']].map(([id,d,a,h])=>({id,date:d,competitions:[{status:{type:{state:'post'}},competitors:[{homeAway:'away',team:{abbreviation:a},score:'3'},{homeAway:'home',team:{abbreviation:h},score:'4'}]}]}))},
  mlb:{events:[['701','2026-09-30T00:15Z','BOS','NYY'],['702','2026-09-30T02:10Z','CHC','SD']].map(([id,d,a,h])=>({id,date:d,competitions:[{status:{type:{state:'post'}},competitors:[{homeAway:'away',team:{abbreviation:a},score:'2'},{homeAway:'home',team:{abbreviation:h},score:'5'}]}]}))}};
function load(page){
  let html=fs.readFileSync(path.join(W,page),'utf8');
  html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
  const errors=[];
  const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/'+page,pretendToBeVisual:true,beforeParse(w){
    w.fetch=u=>{let j={};const m=u.match(/summary\?event=(\d+)/);
      if(m)j=BOX[m[1]]||{};else if(/hockey\/nhl\/scoreboard/.test(u))j=SB.nhl;else if(/baseball\/mlb\/scoreboard/.test(u))j=SB.mlb;
      return Promise.resolve({ok:true,status:200,json:()=>Promise.resolve(j),text:()=>Promise.resolve('{}')});};
    w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;
    w.localStorage.setItem('d4.key',JSON.stringify('K'));w.localStorage.setItem('d4.setupDone','1');
    const RD=w.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[RD.parse('2026-09-30T13:00:00Z')]))}static now(){return RD.parse('2026-09-30T13:00:00Z')}}w.Date=FD;
    w.addEventListener('error',e=>errors.push((e.error&&e.error.message)||e.message));}});
  return{w:dom.window,errors};
}
(async()=>{
  for(const page of ['nfl.html','mlb.html','nhl.html']){
    const {w,errors}=load(page);await wait(2200);
    const r=w.eval(`(()=>{set(LS.locked,[]);const r=parseSGPTicketText(${JSON.stringify(TICKET)});return{r,t:get(LS.locked,[])[0]}})()`);
    T(`[${page}] all 27 legs read, none skipped`,r.r.ok&&r.r.legCount===27&&r.r.skipped.length===0&&!r.r.propSkipped,`${r.r.legCount} legs · skipped ${r.r.skipped.length} · props skipped ${r.r.propSkipped}`);
    if(page!=='nfl.html'){T(`[${page}] no uncaught errors`,errors.length===0,errors.slice(0,2).join('|'));continue;}
    const L=r.t.legs;const by=(g)=>L.filter(l=>l.game===g).length;
    T('games oriented AWAY@HOME from the home-first listing',by('VAN@EDM')===6&&by('BOS@NYY')===7&&by('NYR@BOS')===4&&by('CHC@SD')===6&&by('CHI@VGK')===4,['VAN@EDM','BOS@NYY','NYR@BOS','CHC@SD','CHI@VGK'].map(g=>g+':'+by(g)).join(' '));
    const pk=L.map(l=>l.pick);
    T('handicaps resolve to the right team (Canucks, NY Rangers, Yankees, Red Sox, Padres, Cubs, Blackhawks)',['VAN +3.5','NYR +3.5','NYY +5.5','BOS +5.5','SD +5.5','CHC +5.5','CHI +3.5'].every(x=>pk.includes(x)),pk.filter(p=>/\+\d/.test(p)&&!/anytime|hits|struck/.test(p)).join(', '));
    T('totals: Under 8.5 / 7.5 / 10.5 / 11.5 / 7.5',['Under 8.5','Under 10.5','Under 11.5'].every(x=>pk.includes(x))&&pk.filter(p=>p==='Under 7.5').length===2);
    T('5 NHL anytime-point + 1 anytime-goal + 2 shots props tagged for grading',L.filter(l=>l.nhlProp&&l.nhlProp.stat==='points').length===5&&L.filter(l=>l.nhlProp&&l.nhlProp.stat==='goals').length===1&&L.filter(l=>l.nhlProp&&l.nhlProp.stat==='shots').length===2);
    T('7 MLB props tagged (3 hits, 2 Ks, 2 hits allowed)',L.filter(l=>l.mlbProp).length===7&&L.filter(l=>l.mlbProp&&l.mlbProp.stat==='hits').length===3&&L.filter(l=>l.mlbProp&&l.mlbProp.stat==='strikeouts').length===2&&L.filter(l=>l.mlbProp&&l.mlbProp.stat==='hitsallowed').length===2);
    T('stake $1.00 / to-win $216.33 kept as numbers; dated from the ticket',r.t.stake==='1'&&r.t.toWin==='216.33'&&r.t.date==='2026-09-29');
    const row=w.eval(`buildWagerRow(get(LS.locked,[])[0])`);
    T('card shows the book quote: +21633',/from your ticket/.test(row)&&row.includes('+21633'),(row.match(/\+2\d{4}/)||[''])[0]);
    // backtrack from the NFL page: all games are over
    const res=await w.eval('regradeAllProps()');
    T('backtrack pulls the 5 box scores and grades every prop',res&&res.left===0&&res.legs===15,JSON.stringify(res));
    const G=x=>w.eval(`(()=>{const l=get(LS.locked,[])[0].legs.find(z=>z.pick===${JSON.stringify(x)});const g=gradeLeg(l,'2026-09-29');return g.hit+'|'+(g.prog?g.prog.val:'')})()`);
    const exp={'Leon Draisaitl anytime point':'true|2','Connor McDavid anytime point':'true|2','Evan Bouchard anytime point':'false|0','Connor McDavid over 1.5 shots on goal':'true|3',
      'David Pastrnak over 1.5 shots on goal':'true|5','David Pastrnak anytime goal':'true|1','Jack Eichel anytime point':'true|1','Mitchell Marner anytime point':'false|0',
      'Cam Schlittler 5+ batters struck out':'true|7','Payton Tolle 5+ batters struck out':'false|4','Ben Rice 1+ hits':'true|1','Payton Tolle 2+ hits allowed':'true|3',
      'Fernando Tatis Jr. 1+ hits':'false|0','Matthew Boyd 2+ hits allowed':'true|6','Samad Taylor 1+ hits':'true|2'};
    const got={};Object.keys(exp).forEach(k=>got[k]=G(k));
    T('all 15 prop legs grade correctly against the box scores',JSON.stringify(got)===JSON.stringify(exp),Object.keys(exp).filter(k=>got[k]!==exp[k]).map(k=>k+' → '+got[k]).join(' ; ')||'15/15');
    // team legs: NHL VAN@EDM finished VAN 3 – EDM 4 ; BOS@NYY BOS 2 – NYY 5 ; total legs
    w.eval(`(()=>{const F=get(LS.allfinals,{});F[finalsKey('nhl','VAN@EDM')]={sport:'nhl',a:3,h:4,ts:1};F[finalsKey('mlb','BOS@NYY')]={sport:'mlb',a:2,h:5,ts:1};set(LS.allfinals,F);})()`);
    const H=x=>w.eval(`(()=>{const l=get(LS.locked,[])[0].legs.find(z=>z.pick===${JSON.stringify(x)});return gradeLeg(l,'2026-09-29').hit})()`);
    T('Canucks +3.5 (lost by 1) wins; Under 8.5 (7 goals) wins; Yankees +5.5 wins; Red Sox +5.5 wins',H('VAN +3.5')===true&&H('Under 8.5')===true&&H('NYY +5.5')===true&&H('BOS +5.5')===true);
    T('Under 10.5 (7 runs) wins',H('Under 10.5')===true);
    // live: a prop locks the moment it clears
    BOX['701']={...BOSNYY,header:{competitions:[{competitors:[{homeAway:'away',team:{abbreviation:'BOS'},score:'0'},{homeAway:'home',team:{abbreviation:'NYY'},score:'1'}],status:{period:3,type:{state:'in'}}}]}};
    w.eval("FBP_MEM={};Object.keys(FBP_FOUND).forEach(k=>delete FBP_FOUND[k]);set(FBP_BOX_KEY,{})");
    const live=w.eval(`(async()=>{const l=get(LS.locked,[])[0].legs.find(z=>z.pick==='Ben Rice 1+ hits');gradeLeg(l,'2026-09-29');await new Promise(r=>setTimeout(r,2500));gradeLeg(l,'2026-09-29');await new Promise(r=>setTimeout(r,1500));const g=gradeLeg(l,'2026-09-29');return g.hit+'|'+g.live+'|'+(g.prog?g.prog.val:'')})()`);
    T('live game: Ben Rice 1+ hits locks a win the moment he has a hit',await live==='true|true|1',await live);
    T('no uncaught errors',errors.length===0,errors.slice(0,2).join('|'));
  }
  // orientation self-heal + dialect check: an away-first ticket in the OLD dialect is left alone
  {const {w}=load('nfl.html');await wait(2000);
    w.eval(`set(LS.locked,[]);parseSGPTicketText(\`Ticket Number:\n7\nAccepted Date:\n9/29/26\nAmount:\n$1\nTo win:\n$5\nDescription:\n2 Leg Parlay (Includes 1 SGPs)\nSGP 1: FOOTBALL - NFL - Miami Dolphins v Kansas City Chiefs\nSpread - Chiefs -0.5 (Game)\nTotal points - Under 55.5 (Game)\`)`);
    T('older "(Game)" tickets keep AWAY v HOME (Miami @ Kansas City)',w.eval("get(LS.locked,[])[0].legs[0].game")==='MIA@KC');
    w.eval(`set(LS.locked,[{id:'h1',date:'2026-09-29',source:'mine',legs:[{game:'EDM@VAN',pick:'VAN +3.5',sport:'nhl',gameDate:'2026-09-29'}]}])`);
    await w.eval("mgRefresh(true)");
    T('a leg saved home/away-flipped heals itself once ESPN shows the real game (EDM@VAN → VAN@EDM)',w.eval("get(LS.locked,[])[0].legs[0].game")==='VAN@EDM');}
  console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length}/${out.length} passed`);
  process.exit(out.some(x=>x.startsWith('FAIL'))?1:0);
})().catch(e=>{console.log(out.join('\n'));console.log('CRASH',e.stack);process.exit(1)});
