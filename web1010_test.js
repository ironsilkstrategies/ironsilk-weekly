const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
let html=fs.readFileSync(path.join(W,'nhl.html'),'utf8');html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nhl.html',pretendToBeVisual:true,beforeParse(w){
  const RD=w.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[RD.parse('2026-10-10T19:30:00Z')]))}static now(){return RD.parse('2026-10-10T19:30:00Z')}}w.Date=FD;w.__NO_GRADELOOP__=true;
  w.matchMedia=q=>({matches:/max-width/.test(q),media:q,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}});
  w.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});
  w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.localStorage.setItem('d4.setupDone','1');}}).window;
setTimeout(()=>{try{
  const D=w.document;
  /* ---------- The Web ---------- */
  w.eval(`set(LS.locked,[
    {id:'A',date:'2026-10-10',source:'mine',stake:10,legs:[{sport:'nhl',game:'PIT@CBJ',pick:'CBJ ML',price:-115,gameDate:'2026-10-10'},{sport:'nhl',game:'NYR@WSH',pick:'WSH ML',price:-142,gameDate:'2026-10-10'}]},
    {id:'B',date:'2026-10-10',source:'mine',stake:5,legs:[{sport:'nhl',game:'PIT@CBJ',pick:'Over 6.5',price:-110,gameDate:'2026-10-10'},{sport:'nhl',game:'SEA@DET',pick:'DET ML',price:-140,gameDate:'2026-10-10'}]},
    {id:'C',date:'2026-10-10',source:'mine',stake:5,legs:[{sport:'nhl',game:'ANA@WPG',pick:'WPG ML',price:-121,gameDate:'2026-10-10'}]}]);
    window.__realGrade=gradeLeg;
    gradeLeg=function(l){if(l.pick==='WPG ML')return{hit:false,live:false};if(l.pick==='CBJ ML')return{hit:true,live:false};return null;};`);
  const Dt=w.eval('bmapData()');
  T('map data: every open ticket becomes a bubble',Dt.tickets.length===3);
  T('map data: shared game is one hub carrying both tickets',(()=>{const g=Dt.games.find(g=>/PIT/.test(g.game));return g&&g.tix.size===2;})());
  const st=id=>Dt.tickets.find(t=>t.id===id).status;
  T('ticket status: dead leg kills it, a cashed leg keeps it alive',st('C')==='dead'&&st('A')==='alive'&&st('B')==='sched',`${st('A')}/${st('B')}/${st('C')}`);
  T('legs-left counts only unsettled legs',Dt.tickets.find(t=>t.id==='A').away===1);
  w.eval(`BMAP.f='alive'`);T('filter "alive" drops the dead ticket',w.eval('bmapData().tickets.filter(bmPass).length')===2);
  w.eval(`BMAP.f='one'`);T('filter "one leg away" finds ticket A only',w.eval('bmapData().tickets.filter(bmPass).map(t=>t.id).join()')==='A');
  w.eval(`BMAP.f='all'`);
  const S=w.eval('bmapSvg(bmapData()).svg');
  T('svg draws game hubs, bubbles and strands',/id="bmSvg"/.test(S)&&/id="bmWorld"/.test(S)&&(S.match(/<line /g)||[]).length===5);
  T('dead strands are colored dead, pending ones dashed',S.includes(w.eval('BM_COL.dead'))&&/stroke-dasharray="4 4"/.test(S));
  w.eval(`TICKETTAB='elimmap';renderTickets&&renderTickets()`);
  const body=()=>D.body.innerHTML;
  T('tab renders The Web with header stats + filters',/Still alive/i.test(body())&&/bmSvg/.test(body()),'');
  w.eval(`BMAP.sel={type:'t',id:'A'};bmPaint()`);
  T('selecting a bubble opens its ticket card with an open-ticket button',/openTicketSheet\('A'\)/.test(D.getElementById('bmDetail').innerHTML));
  T('selection dims everything not on that ticket',/opacity="\.13"/.test(D.getElementById('bmSvg').outerHTML));
  w.eval(`BMAP.sel={type:'g',id:bmapData().games.find(g=>/PIT/.test(g.game)).key};bmPaint()`);
  T('selecting a game hub lists every ticket riding on it',/Ticket #A|>A<|'A'/.test(D.getElementById('bmDetail').innerHTML)&&/'B'|Ticket #B/.test(D.getElementById('bmDetail').innerHTML));
  w.eval(`BMAP.sel=null;bmZoom(1.5)`);T('zoom changes the world transform',/scale\(1\.5/.test(D.getElementById('bmWorld').getAttribute('transform')||''));
  w.eval('bmZoom(0)');T('reset zoom',/scale\(1\)/.test(D.getElementById('bmWorld').getAttribute('transform')||''));
  w.eval('gradeLeg=window.__realGrade');
  /* ---------- Skin ---------- */
  w.eval('skinSetup()');
  const nav=D.querySelector('nav');
  T('phone: bottom bar class on body',D.body.classList.contains('bnav'));
  T('phone: nav moved out of the header to <body>',nav.parentNode===D.body);
  T('phone: secondary tabs hidden from the bar',[...nav.querySelectorAll('button.bn-hide')].length>0&&!nav.querySelector(`button[onclick*="tab('games'"]`).classList.contains('bn-hide'));
  T('More is last on the bar',nav.lastElementChild&&nav.lastElementChild.id==='navMore');
  T('icons set on tabs',nav.querySelector(`button[onclick*="tab('tickets'"]`).getAttribute('data-ico')==='🎟');
  w.eval('bnMoreOpen()');T('More sheet lists the hidden tabs',D.querySelectorAll('#bnMore .bn-tile').length>0);
  w.eval('bnMoreOpen()');T('More sheet toggles closed',!D.getElementById('bnMore'));
  T('active sport pill marked',D.getElementById('sportBtn-nhl')&&D.getElementById('sportBtn-nhl').classList.contains('on'));
  T('skin css injected once',D.querySelectorAll('#skinCss').length===1);
  /* ---------- brain: run line uses the same projection as the sim ---------- */
  const r=w.eval(`(()=>{const sv={teamRuns,envMult,h2hAdj,venueAdj,teamRunAdj};
    teamRuns=()=>4.4;envMult=()=>1;h2hAdj=()=>0;venueAdj=()=>1;
    const g=n=>({id:'rl'+n,away:{abbr:'AAA',lineup:[1],p:{}},home:{abbr:'HHH',lineup:[1],p:{}}});
    teamRunAdj=()=>0;const base=rlProb(g(1),null,'home',-1.5);
    teamRunAdj=ab=>ab==='HHH'?1.5:0;const adj=rlProb(g(2),null,'home',-1.5);
    Object.assign(window,sv);teamRuns=sv.teamRuns;envMult=sv.envMult;h2hAdj=sv.h2hAdj;venueAdj=sv.venueAdj;teamRunAdj=sv.teamRunAdj;
    return [base,adj];})()`);
  T('run line applies the learned team bias like simGame does',r[1]>r[0]+0.05,r.map(x=>x&&x.toFixed(3)).join(' → '));
}catch(e){T('harness',false,e.stack);}
console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length} pass / ${out.filter(x=>x.startsWith('FAIL')).length} fail`);process.exit(0);},2500);
