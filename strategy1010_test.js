const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
let html=fs.readFileSync(path.join(W,'nhl.html'),'utf8');html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nhl.html',pretendToBeVisual:true,beforeParse(w){
  const RD=w.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[RD.parse('2026-10-10T19:30:00Z')]))}static now(){return RD.parse('2026-10-10T19:30:00Z')}}w.Date=FD;w.__NO_GRADELOOP__=true;
  w.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});
  w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.localStorage.setItem('d4.setupDone','1');}}).window;
setTimeout(()=>{try{
  const td=w.eval('today()');
  /* graded Sim history shaped like Chris's calibration table */
  let V=[],id=0;const add=(n,p,hits,extra)=>{for(let i=0;i<n;i++)V.push({id:'v'+(id++),voice:'Sim',sp:'nhl',date:'2026-10-0'+(1+i%8),game:'G'+id,market:'ml',side:'home',price:-150,pUsed:p,simP:p,graded:true,hit:i<hits,units:i<hits?0.667:-1,...(extra||{})});};
  add(133,0.53,68);add(92,0.58,52);add(58,0.62,44);add(73,0.68,46);add(71,0.75,34);add(33,0.89,24);
  w.eval(`set(VOICES_KEY,${JSON.stringify(V)})`);
  const tp=p=>w.eval(`truthP('nhl',${p})`);
  T('truth map: a 75% call is priced near what that range hit, not 75%',tp(0.75)<0.68&&tp(0.75)>0.5,tp(0.75).toFixed(3));
  T('truth map is monotone (more confident never maps lower)',[0.5,0.55,0.6,0.65,0.7,0.75,0.8,0.85,0.9].map(tp).every((v,i,a)=>!i||v>=a[i-1]-1e-9));
  T('well-calibrated range stays put (53% → ~52%)',Math.abs(tp(0.53)-0.52)<0.03,tp(0.53).toFixed(3));
  T('best5Prob runs through the truth map',Math.abs(w.eval(`best5Prob({blend:0.75,sp:'nhl'})`)-tp(0.75))<1e-9);
  /* lanes */
  const J=[];for(let i=0;i<36;i++)J.push({id:'j'+i,voice:'Judge',sp:'nhl',date:'2026-10-05',game:'J'+i,market:'total',side:'over',line:6.5,price:-110,graded:true,hit:i<15,units:i<15?0.909:-1});
  const S=[];for(let i=0;i<36;i++)S.push({id:'s'+i,voice:'Scorekeeper',sp:'nhl',date:'2026-10-05',game:'S'+i,market:'ml',side:'home',price:-150,graded:true,hit:i<27,units:i<27?0.667:-1});
  w.eval(`set(VOICES_KEY,get(VOICES_KEY,[]).concat(${JSON.stringify(J.concat(S))}))`);
  T('lane judged on units: NHL overs (15-21) blocked',w.eval(`laneStatus('nhl|total|over','Judge')`)==='blocked');
  T('a voice-specific blocked lane follows that voice',w.eval(`laneTable().BYV.Judge['nhl|total|over'].st`)==='blocked');
  T('lane type: -1.5 puck line is a fav spread, +150 ML is a dog side',w.eval(`laneKey('nhl','spread','home',180,-1.5)`)==='nhl|spread|fav'&&w.eval(`laneKey('nhl','ml','away',150,null)`)==='nhl|ml|dog');
  /* leg budget */
  T('leg budget: five 62% legs → 3 (24%), not 4 (15%)',w.eval('legBudget([.62,.62,.62,.62,.62],5)')===3);
  T('leg budget never goes under 2',w.eval('legBudget([.4,.4,.4],3)')===2);
  w.eval(`set(LS.locked,[{id:9,date:'${td}',source:'mine',legs:Array.from({length:10},(_,i)=>({sport:'nhl',game:'A'+i+'@B'+i,pick:'B'+i+' ML',price:-150,p:0.6,gameDate:'2027-01-0'+(1+i%9)}))}])`);
  const lt=w.eval('legTaxHtml(get(LS.locked,[])[0])');
  T('your 10-leg ticket shows the leg tax and what the best 3 would cash',/Leg tax: 10 legs/.test(lt)&&/best 3 alone/.test(lt),lt.replace(/<[^>]+>/g,''));
  T('no leg tax on short tickets',w.eval(`legTaxHtml({legs:[{p:.6},{p:.6}]})`)==='');
  /* Best card: lanes + disagreement */
  const by={nhl:{picks:[
    {game:'X1@Y1',m:'total',sd:'over',pick:'Over 6.5',price:-110,line:6.5,color:' strong',blend:0.6,mp:0.6,mkt:0.52,start:'2026-10-10T23:00:00Z'},
    {game:'X2@Y2',m:'ml',sd:'home',pick:'Y2 ML',price:120,color:' strong',blend:0.56,mp:0.64,mkt:0.45,start:'2026-10-10T23:00:00Z'},
    {game:'X3@Y3',m:'ml',sd:'home',pick:'Y3 ML',price:110,color:' strong',unan:true,blend:0.55,mp:0.55,mkt:0.5,start:'2026-10-10T23:00:00Z'}]}};
  const pool=w.eval(`(()=>{const r=best3Pool(${JSON.stringify(by)},null);return{picks:r.map(x=>x.pick),why:r.why};})()`);
  T('Best card drops the blocked-lane over and the model-vs-market fight, keeps the clean pick',pool.picks.join()==='Y3 ML'&&pool.why.lane===1&&pool.why.flag>=1,JSON.stringify(pool));
  /* character parlay gate */
  w.eval(`set(TC_KEY,{d:'${td}',by:{nhl:{picks:[
    {game:'A1@B1',m:'ml',sd:'home',pick:'B1 ML',price:-130,unan:true,blend:.6,mp:.6,mkt:.58},
    {game:'A2@B2',m:'ml',sd:'home',pick:'B2 ML',price:-120,unan:true,blend:.58,mp:.58,mkt:.55},
    {game:'A3@B3',m:'ml',sd:'home',pick:'B3 ML',price:-140,unan:false,blend:.62,mp:.62,mkt:.59},
    {game:'A4@B4',m:'total',sd:'over',pick:'Over 6',price:-110,line:6,unan:true,blend:.6,mp:.6,mkt:.55}]}}})`);
  const calls=[['A1@B1','ml','home',-130,null,'B1 ML'],['A2@B2','ml','home',-120,null,'B2 ML'],['A3@B3','ml','home',-140,null,'B3 ML'],['A4@B4','total','over',-110,6,'Over 6']]
    .map(([game,market,side,price,line,pick],i)=>({id:'c'+i,voice:'Judge',sp:'nhl',date:td,game,market,side,price,line,pick}));
  w.eval(`set(VOICES_KEY,get(VOICES_KEY,[]).concat(${JSON.stringify(calls)}))`);
  const P=w.eval(`(()=>{const P=cparBuild('Judge');return P&&{games:P.legs.map(l=>l.game),gated:P.gated,why:P.size.why};})()`);
  T('character parlay takes only unanimous, unblocked legs',P&&P.games.sort().join()==='A1@B1,A2@B2'&&P.gated===2,JSON.stringify(P));
  T('Records hub carries the strategy panel',/🧭 Strategy/.test(w.eval('strategyHtml()'))&&/Truth map/.test(w.eval('strategyHtml()'))&&/⛔/.test(w.eval('strategyHtml()')));
  /* below the minimum sample, nothing is overridden */
  w.eval(`set(VOICES_KEY,get(VOICES_KEY,[]).filter(x=>x.voice!=='Sim').concat(${JSON.stringify(V.slice(0,20))}))`);
  T('under 60 graded calls the truth map stays out of the way',Math.abs(tp(0.75)-0.75)<1e-9);
}catch(e){T('harness',false,e.stack);}
console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length} pass / ${out.filter(x=>x.startsWith('FAIL')).length} fail`);process.exit(0);},2500);
