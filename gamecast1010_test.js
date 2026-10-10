const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
const team=(id,ab,ha,score,extra)=>({homeAway:ha,score:String(score),team:{id,abbreviation:ab,displayName:ab+' Team',color:'112233'},record:[{summary:'4-1'}],...(extra||{})});
const FB={header:{competitions:[{status:{type:{state:'in',shortDetail:'8:12 - 2nd'},period:2,displayClock:'8:12'},competitors:[team('1','IU','away',3,{possession:true}),team('2','NEB','home',10)]}]},
  situation:{down:2,distance:7,yardLine:34,downDistanceText:'2nd & 7 at NEB 34',isRedZone:false,possession:'1',lastPlay:{text:'Rush for 3 yards'}},
  drives:{previous:[{description:'8 plays, 75 yards',team:{abbreviation:'NEB',id:'2'},plays:[{text:'Touchdown pass 12 yds',scoringPlay:true,period:{number:1},clock:{displayValue:'2:10'},awayScore:3,homeScore:10}]}],current:{team:{abbreviation:'IU',id:'1'},plays:[{text:'Rush for 3 yards',period:{number:2},clock:{displayValue:'8:12'},awayScore:3,homeScore:10}]}},
  winprobability:[{homeWinPercentage:.5},{homeWinPercentage:.62},{homeWinPercentage:.71}],leaders:[{team:{abbreviation:'NEB'},leaders:[{displayName:'Passing',leaders:[{athlete:{shortName:'D. Raiola'},displayValue:'12/16, 140 YDS'}]}]}]};
const MLB={header:{competitions:[{status:{type:{state:'in',shortDetail:'Top 6th'},period:6},competitors:[team('3','CWS','away',2),team('4','CLE','home',3)]}]},
  situation:{balls:2,strikes:1,outs:1,onFirst:{athlete:{id:1}},onSecond:false,onThird:{athlete:{id:2}},batter:{athlete:{shortName:'L. Robert'}},pitcher:{athlete:{shortName:'G. Williams'}},lastPlay:{text:'Single to left'}},
  plays:[{text:'Single to left',period:{displayValue:'Top 6th'},awayScore:2,homeScore:3},{text:'Home run to center',scoringPlay:true,period:{displayValue:'Bot 5th'},awayScore:1,homeScore:3}]};
let html=fs.readFileSync(path.join(W,'cfb.html'),'utf8');html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/cfb.html',pretendToBeVisual:true,beforeParse(w){
  const RD=w.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[RD.parse('2026-10-10T19:30:00Z')]))}static now(){return RD.parse('2026-10-10T19:30:00Z')}}w.Date=FD;w.__NO_GRADELOOP__=true;
  w.fetch=u=>{u=String(u);if(/college-football\/summary\?event=55/.test(u))return Promise.resolve({ok:true,json:()=>Promise.resolve(FB)});if(/baseball\/mlb\/summary\?event=66/.test(u))return Promise.resolve({ok:true,json:()=>Promise.resolve(MLB)});
    return Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});};
  w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.localStorage.setItem('d4.setupDone','1');}}).window;
setTimeout(async()=>{try{
  await w.eval(`openGamecast('ncaaf','IU@NEB','2026-10-10','55')`);const g=()=>w.document.getElementById('gcIn').innerHTML;
  T('gamecast opens with the live scoreboard',/● LIVE/.test(g())&&/3<span[^>]*>–<\/span>10/.test(g())&&/8:12 - 2nd/.test(g()));
  T('football: field with the ball, down & distance, last play',/🏈/.test(g())&&/2nd &amp; 7 at NEB 34/.test(g())&&/Rush for 3 yards/.test(g()));
  T('ESPN win probability line',/ESPN win probability/.test(g())&&/NEB 71%/.test(g()));
  T('play-by-play newest first, scoring plays lit',g().indexOf('Rush for 3 yards')<g().lastIndexOf('Touchdown pass')&&/🔥 Touchdown pass/.test(g()));
  w.eval(`gcTab('leaders')`);T('leaders tab',/D\. Raiola/.test(g()));
  w.eval(`set(LS.locked,[{id:'K',date:'2026-10-10',source:'mine',legs:[{sport:'ncaaf',game:'IU@NEB',pick:'NEB +9',price:-110,gameDate:'2026-10-10'}]}]);gcTab('bets')`);
  T('my bets tab shows the tickets riding on this game',/NEB \+9/.test(g()));
  w.eval('closeGamecast()');T('closes',!w.document.getElementById('gcSheet'));
  await w.eval(`openGamecast('mlb','CWS@CLE','2026-10-10','66')`);w.eval(`gcTab('plays')`);
  T('baseball: diamond, count, outs, batter vs pitcher',/L\. Robert/.test(g())&&/G\. Williams/.test(g())&&/Top 6th/.test(g())&&/🔥 Home run/.test(g()));
  w.eval('closeGamecast()');
  T('📺 button helper renders',/openGamecast\('ncaaf','IU@NEB'/.test(w.eval(`gcBtn('ncaaf','IU@NEB','2026-10-10')`)));
}catch(e){T('harness',false,e.stack);}
console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length} pass / ${out.filter(x=>x.startsWith('FAIL')).length} fail`);process.exit(0);},2500);
