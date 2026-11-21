const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
let html=fs.readFileSync(path.join(W,'nfl.html'),'utf8');
html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nfl.html',pretendToBeVisual:true,beforeParse(w){w.__NO_GRADELOOP__=true;w.__NO_BACKFILL__=true;
  w.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('{}')});w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.localStorage.setItem('d4.setupDone','1');}}).window;
setTimeout(()=>{try{
  /* NFL spread dogs: Judge great, Coach awful, Sim middling — 20 graded calls each over 10 days */
  const V=[];const mk=(v,n,wins,day0)=>{for(let i=0;i<n;i++){const d='2026-09-'+String(day0+Math.floor(i/2)).padStart(2,'0');V.push({id:v+i,sp:'nfl',date:d,game:'A'+i+'@B'+i,voice:v,market:'spread',side:'away',line:3.5,price:-110,graded:true,hit:i<wins,units:i<wins?0.909:-1});}};
  mk('Judge',20,15,1);mk('Coach',20,5,1);mk('Sim',20,10,1);
  V.push({id:'tj',sp:'nfl',date:'2026-10-11',game:'DEN@LAC',voice:'Judge',market:'spread',side:'away',line:3.5,price:-110});
  V.push({id:'tc',sp:'nfl',date:'2026-10-11',game:'DEN@LAC',voice:'Coach',market:'spread',side:'home',line:-3.5,price:-110});
  w.eval(`set(VOICES_KEY,${JSON.stringify(V)});SPEC_C=null;PR_C=null;`);
  const R=w.eval(`prRead('nfl','DEN@LAC','2026-10-11','spread','away',-110,3.5)`);
  T('#1 in NFL spread dogs is the Judge, worst is the Coach',R.king.v==='Judge'&&R.goat.v==='Coach'&&R.lab==='NFL spread dogs',R.lab);
  T('on/against read from the locked calls',R.kingPos==='on'&&R.goatPos==='against');
  const leg=w.eval(`prLegHtml({sport:'nfl',game:'DEN@LAC',pick:'DEN +3.5',price:-110,gameDate:'2026-10-11'},'2026-10-11')`).replace(/<[^>]+>/g,'');
  T('ticket leg shows the category king and that he is on it',/👑/.test(leg)&&/#1 NFL spread dogs/.test(leg)&&/on it/.test(leg),leg);
  const leg2=w.eval(`prLegHtml({sport:'nfl',game:'DEN@LAC',pick:'LAC -3.5',price:-110,gameDate:'2026-10-11'},'2026-10-11')`).replace(/<[^>]+>/g,'');
  T('…and on the other side, that the #1 is against it',leg2===''||/against|no call/.test(leg2),leg2);
  const tr=w.eval('prTrack()');T('walk-forward tracker only counts calls made after a #1 was already ranked',tr.king.n<20&&tr.king.n+tr.goat.n+tr.rest.n===60,JSON.stringify(tr.king));
  T('no weight until a real forward edge over 60+ calls',w.eval('prWeight()')===0);
  T('rankings panel renders',/Character power rankings/.test(w.eval(`prPanelHtml('nfl')`)));
  /* gamecast field reads the ball spot from ESPN text */
  const Tm={away:{id:'7',abbr:'DEN'},home:{id:'24',abbr:'LAC'}};
  T('field: "LAC 34" is 66 yards from the left goal',w.eval(`gcYardX('LAC 34',${JSON.stringify(Tm)})`)===66&&w.eval(`gcYardX('DEN 20',${JSON.stringify(Tm)})`)===20);
  const fh=w.eval(`(GC.id='x',gcFieldPro({down:3,distance:4,possession:'7',possessionText:'LAC 34',downDistanceText:'3rd & 4 at LAC 34',awayTimeouts:2,homeTimeouts:3},${JSON.stringify(Tm)},{drives:{current:{start:{text:'DEN 25'},description:'6 plays, 41 yards'}}}))`);
  T('field draws scrimmage + first-down lines, ball, down & distance, timeouts, drive',/#3b82f6/.test(fh)&&/#facc15/.test(fh)&&/3rd &amp; 4|3rd & 4/.test(fh)&&/34 yds to the end zone/.test(fh)&&/TO/.test(fh)&&/Current drive/.test(fh));
  const ch=w.eval(`gcDriveChart({drives:{previous:[{team:{id:'7'},start:{text:'DEN 25'},end:{text:'LAC 2'},displayResult:'Touchdown',yards:73}]}},${JSON.stringify(Tm)})`);
  T('drive chart lists possessions with results',/Touchdown/.test(ch)&&/Drive chart/.test(ch));
}catch(e){out.push('CRASH '+e.stack);}
console.log(out.join('\n'));process.exit(0);},1500);
