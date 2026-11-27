const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
let html=fs.readFileSync(path.join(W,'nhl.html'),'utf8');html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nhl.html',pretendToBeVisual:true,beforeParse(w){
  const RD=w.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[RD.parse('2026-10-10T19:30:00Z')]))}static now(){return RD.parse('2026-10-10T19:30:00Z')}}w.Date=FD;w.__NO_GRADELOOP__=true;
  w.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.localStorage.setItem('d4.setupDone','1');}}).window;
setTimeout(()=>{try{
  const d='2026-10-10';
  /* ESPN: TOR@COL live 2nd period 2-1, PHI@BOS final 3-1 */
  w.eval(`MG_LIVE.nhl={'TOR@COL':[{espnId:'77',date:'${d}',state:'in',detail:'8:12 - 2nd',period:2,clock:492,a:2,h:1,start:'${d}T23:07:00Z'}],'PHI@BOS':[{espnId:'78',date:'${d}',state:'post',detail:'Final',period:3,a:3,h:1,start:'${d}T16:07:00Z'}]};
    set(LS.locked,[{id:'T1',date:'${d}',name:'Saturday 3-leg',source:'mine',stake:5,toWin:20,legs:[
      {sport:'nhl',game:'TOR@COL',pick:'TOR ML',price:179,p:0.36,gameDate:'${d}'},{sport:'nhl',game:'TOR@COL',pick:'Over 6.5',price:-122,p:0.52,gameDate:'${d}'},{sport:'nhl',game:'PHI@BOS',pick:'PHI ML',price:115,p:0.46,gameDate:'${d}'}]}]);`);
  const t=w.eval(`JSON.stringify(get(LS.locked,[])[0])`);
  const c1=w.eval(`legLiveCard(get(LS.locked,[])[0],get(LS.locked,[])[0].legs[0],{link:true})`);
  T('live leg: score, clock, live % to hit and ▲ from pregame',/● LIVE/.test(c1)&&/TOR <b>2<\/b> – <b>1<\/b> COL/.test(c1)&&/% to hit/.test(c1)&&/▲\d+ from 36%/.test(c1),c1.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').slice(0,200));
  const c3=w.eval(`legLiveCard(get(LS.locked,[])[0],get(LS.locked,[])[0].legs[2])`);
  T('final leg shows WON with the final score',/✅ WON/.test(c3)&&/FINAL/.test(c3));
  T('the card links to the whole ticket',/openTicketSheet/.test(c1)&&/tap for the whole ticket/.test(c1));
  w.eval(`openTicketSheet('T1')`);const sh=w.document.getElementById('tkSheet');
  T('tapping opens the whole ticket: every leg, stake and payout',!!sh&&(sh.innerHTML.match(/border-radius:9px;border:1.5px/g)||[]).length===3&&/stake <b>\$5\.00/.test(sh.innerHTML)&&/Saturday 3-leg/.test(sh.innerHTML));
  w.eval('closeTicketSheet()');T('…and closes',!w.document.getElementById('tkSheet'));
  w.eval(`(()=>{const el=document.getElementById('mineBody')||Object.assign(document.body.appendChild(document.createElement('div')),{id:'mineBody'});renderMyGames();})()`);
  T('My Games draws legs as live cards',/% to hit/.test(w.document.getElementById('mineBody').innerHTML));
  /* character props live */
  w.eval(`set(CPROP_KEY,[{id:'p1',sp:'nhl',voice:'Sim',player:'William Nylander',team:'TOR',k:'s',thr:3,p:0.74,d:'${d}',hit:null},{id:'p2',sp:'nhl',voice:'Trends',player:'Brad Marchand',team:'BOS',k:'g',thr:1,p:0.71,d:'${d}',hit:null},{id:'p3',sp:'nhl',voice:'Judge',player:'Cale Makar',team:'COL',k:'pts',thr:1,p:0.72,d:'${d}',hit:null}]);
    FBP_MEM['77']={ts:Date.now(),box:{state:'in',period:2,hockey:true,teams:{TOR:{skaters:[{name:'William Nylander',G:'1',A:'0',S:'4'}],goalies:[]},COL:{skaters:[{name:'Cale Makar',G:'0',A:'0',S:'2'}],goalies:[]}}}};
    FBP_MEM['78']={ts:Date.now(),box:{state:'post',period:3,hockey:true,teams:{BOS:{skaters:[{name:'Brad Marchand',G:'0',A:'1',S:'3'}],goalies:[]}}}};
    sgpProps=()=>[];`);
  const L=JSON.parse(w.eval('JSON.stringify(cpropLiveList(true))'));const by=id=>L.find(x=>x.id===id);
  T('Nylander 3+ SOG shows HIT LIVE at 4 shots',by('p1')&&by('p1').hitLive&&by('p1').state==='in'&&by('p1').val===4);
  T('Makar 1+ point still live at 0',by('p3')&&!by('p3').hitLive&&by('p3').val===0&&by('p3').state==='in');
  T('Marchand 1+ goal missed at the final',by('p2')&&by('p2').miss);
  w.eval('cpropLiveTick()');
  T('a live hit pops a banner naming who called it',/HIT LIVE/.test(w.document.body.innerHTML)&&/The Simulator's pick/.test(w.document.body.innerHTML));
  T('finals grade straight from the box',w.eval(`get(CPROP_KEY,[]).find(x=>x.id==='p2').hit`)===false);
  const n1=(w.document.body.innerHTML.match(/HIT LIVE<\/b> · William/g)||[]).length;w.eval('cpropLiveTick()');
  T('each hit is announced once',(w.document.body.innerHTML.match(/HIT LIVE<\/b> · William/g)||[]).length===n1);
  T('My Games lists character props live with who called them',/Character props — live/.test(w.eval('cpropLiveHtml()'))&&/called by/.test(w.eval('cpropLiveHtml()')));
}catch(e){T('harness',false,e.stack);}
console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length} pass / ${out.filter(x=>x.startsWith('FAIL')).length} fail`);process.exit(0);},2500);
