const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
let html=fs.readFileSync(path.join(W,'nhl.html'),'utf8');
html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nhl.html',pretendToBeVisual:true,beforeParse(w){
  w.fetch=()=>Promise.resolve({ok:true,status:200,json:()=>Promise.resolve({}),text:()=>Promise.resolve('{}')});
  w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.localStorage.setItem('d4.setupDone','1');}}).window;
setTimeout(()=>{try{
  w.eval(`window.__G={id:'g1',away:{abbr:'VAN'},home:{abbr:'EDM'},__date:today(),abstract:'pre'};
    window.__S={aw:0.38,hw:0.62,homeProj:3.4,awayProj:2.6,med:6,modeScore:'2-4',over:l=>l<6?0.6:0.42,under:l=>l<6?0.4:0.58,homeCover:l=>l<0?0.44:0.7,awayCover:l=>l<0?0.3:0.56};`);
  T('Brain and Blend are on the roster',w.eval(`!!CHARS.Brain&&!!CHARS.Blend&&CHAR_ORDER.includes('Brain')&&CHAR_ORDER.includes('Blend')`));
  T('…but are not voters (derived voices)',w.eval(`!VOTER_ORDER.includes('Brain')&&!VOTER_ORDER.includes('Blend')&&VOTER_ORDER.includes('Judge')`));
  w.eval(`set(VOICES_KEY,[])`);
  let C=w.eval(`characterCalls('nhl',__G,__S)`);
  const bl=C.filter(c=>c.voice==='Blend');
  T('Blend calls every market the Sim calls',['ml','spread','total'].every(m=>bl.some(c=>c.market===m)),bl.map(c=>c.pick+' '+c.simP).join(', '));
  T('Blend sides with its higher chance (no market → the Sim\'s side)',bl.find(c=>c.market==='ml').side==='home'&&bl.find(c=>c.market==='ml').simP>0.5);
  T('Brain stays silent with no graded character history',!C.some(c=>c.voice==='Brain'));
  /* graded history: the Judge is great at NHL ML, Most common is poor */
  const V=[];const hist=(voice,market,side,n,wins)=>{for(let i=0;i<n;i++)V.push({id:voice+market+i,sp:'nhl',date:'2026-09-'+String(1+i%28).padStart(2,'0'),game:'A'+i+'@B'+i,voice,market,side,graded:true,hit:i<wins,price:-110});};
  hist('Judge','ml','home',40,32);hist('Most common','ml','home',40,12);
  w.eval(`set(VOICES_KEY,${JSON.stringify(V)});CHAR_BRAIN=null;Object.keys(CHAR_CACHE).forEach(k=>delete CHAR_CACHE[k])`);
  C=w.eval(`characterCalls('nhl',__G,__S)`);const br=C.find(c=>c.voice==='Brain'&&c.market==='ml');
  T('Brain calls once characters have records',!!br,br&&br.pick+' '+br.simP);
  const judge=C.find(c=>c.voice==='Judge'&&c.market==='ml');
  const exp=w.eval(`(()=>{const C=characterCalls('nhl',__G,__S).filter(c=>c.market==='ml'&&isVoter(c.voice));return [brainSideP('nhl',__G,C,'ml','home',0.62,null,null),brainSideP('nhl',__G,C,'ml','away',0.38,null,null)];})()`);
  T('Brain picks the side its weighted chance favors',br.side===(exp[0]>exp[1]?'home':'away')&&Math.abs(br.simP-Math.max(...exp))<1e-4,`home ${exp[0].toFixed(3)} away ${exp[1].toFixed(3)} · judge ${judge&&judge.side}`);
  T('Brain matches the square\'s "brain %" for that side',Math.abs(w.eval(`charSquare('nhl',__G,__S,'${br.pick}',{modelP:${br.side==='home'?0.62:0.38}}).brainP`)-br.simP)<1e-3);
  const sq=w.eval(`charSquare('nhl',__G,__S,'EDM ML',{modelP:0.62})`);
  T('square meter counts voters only (Brain/Blend never vote)',new RegExp('of '+w.eval('VOTER_ORDER.length')+' on').test(sq.meter)&&!/BRAIN|BLEND/.test(sq.chips),sq.meter.replace(/<[^>]+>/g,' ').slice(0,90));
  /* lock to the ledger */
  w.eval(`window.sportGames=()=>[__G];window.sportSims=()=>({g1:__S});`);
  w.eval(`voicesLog('nhl')`);let L=w.eval(`get(VOICES_KEY,[]).filter(x=>x.date===today())`);
  T('voicesLog locks Brain + Blend calls like every character',L.some(x=>x.voice==='Brain')&&L.filter(x=>x.voice==='Blend').length===3);
  /* a game already logged under the old 70% rule isn't logged twice */
  w.eval(`(()=>{const V=get(VOICES_KEY,[]).filter(x=>!(x.date===today()&&(x.voice==='Brain'||x.voice==='Blend')));V.push({id:['Blend','nhl','VAN@EDM',today(),'ml'].join('|'),sp:'nhl',date:today(),game:'VAN@EDM',voice:'Blend',market:'ml',side:'home',simP:0.72});set(VOICES_KEY,V);Object.keys(CHAR_CACHE).forEach(k=>delete CHAR_CACHE[k]);})()`);
  w.eval(`voicesLog('nhl')`);L=w.eval(`get(VOICES_KEY,[]).filter(x=>x.date===today()&&x.voice==='Blend'&&x.market==='ml')`);
  T('legacy 70%+ entry is not duplicated',L.length===1);
  /* graded → records + specialties */
  w.eval(`(()=>{const V=get(VOICES_KEY,[]);for(let i=0;i<14;i++)V.push({id:'bb'+i,sp:'nhl',date:'2026-09-'+String(1+i).padStart(2,'0'),game:'Q'+i+'@R'+i,voice:'Brain',market:'ml',side:'away',price:150,graded:true,hit:i<9,units:i<9?1.5:-1});set(VOICES_KEY,V);SPEC_C=null;})()`);
  const sp=w.eval(`charSpecialty('Brain','nhl','ml','away',150,null)`);
  T('Brain gets its own specialty table (units)',!!sp&&JSON.stringify(sp).length>2,JSON.stringify(sp).slice(0,120));
  T('Brain\'s calls stay out of the crowd buckets',w.eval(`(()=>{CHAR_BRAIN=null;const B=charBrain();return !Object.keys(B.combo).some(k=>/Brain|Blend/.test(k));})()`));
  T('Brain is never a "top character" for the 💎 check',!w.eval(`charTop('nhl')`).some(t=>t.v==='Brain'||t.v==='Blend'));
  T('legacy 70% logger no longer runs from the snapshot',!/voiceLog70\(sp,merged/.test(w.eval('todaySnapshot.toString()')));
}catch(e){out.push('CRASH '+e.stack);}
console.log(out.join('\n'));process.exit(0);},1500);
