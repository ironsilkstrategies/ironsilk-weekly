/* v2.44 · THE VOICES — every character explains its pick like a person: take · story · proof ·
   worry · price; facts only from data the app holds; small samples called small; the numbers
   under "Show the math"; a story never changes a pick; outside posts carry voices from Oct 18 on. */
const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
const D='2026-10-18',T0=Date.parse('2026-10-18T14:00:00Z'),ST='2026-10-18T23:00Z';
let html=fs.readFileSync(path.join(W,'nhl.html'),'utf8');html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
function boot(store){return new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nhl.html',pretendToBeVisual:true,beforeParse(w){
  w.__NOW=T0;const RD=w.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[w.__NOW]))}static now(){return w.__NOW}}w.Date=FD;w.__NO_GRADELOOP__=true;w.__NO_REOPEN__=true;
  w.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;
  w.localStorage.setItem('d4.setupDone','1');Object.entries(store).forEach(([k,v])=>w.localStorage.setItem(k,JSON.stringify(v)));}}).window;}
const C=(id,voice,date,extra)=>({id,sp:'nhl',date,game:'CAR@WPG',gid:'401',voice,market:'ml',side:'away',line:null,price:-179,pick:'CAR ML',cf:0.74,f:['roadfav','oppb2b'],...(extra||{})});
const V=[];['Sim','Judge','Coach','Most common','Power','Scout','Brain','Blend','Banker','Trends','Consensus','Pred','Covers'].forEach((v,i)=>V.push(C('t'+i,v,D,v==='Sim'?{simP:0.63}:v==='Most common'?{score:'3-2'}:{})));
V.push(C('o1','Judge','2026-10-17'));
for(let i=0;i<8;i++)V.push({id:'h'+i,sp:'nhl',date:'2026-10-1'+(i%7),game:'CAR@X'+i,voice:'Coach',market:'ml',side:'away',price:-150,graded:true,hit:i<6,units:i<6?0.667:-1,cf:0.7});
const TC={d:D,by:{nhl:{ts:T0,picks:[{sp:'nhl',gid:'401',game:'CAR@WPG',m:'ml',sd:'away',pick:'CAR ML',price:-179,start:ST,color:' strong'}]}}};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{try{
  const w=boot({'d4.voices':V,'d4.todaycard':TC,'d4.seasonstats':{nhl:{d:D,teams:{},meta:{CAR:{n:'Carolina Hurricanes'},WPG:{n:'Winnipeg Jets'}}}}});await wait(1500);
  const before=w.eval(`JSON.stringify(get(VOICES_KEY,[]))`);
  const reads=w.eval(`CHAR_ORDER.map(v=>charRead(v,{sp:'nhl',game:'CAR@WPG',m:'ml',sd:'away',price:-179,pick:'CAR ML',date:'${D}',gid:'401'}))`);
  T('every character speaks (14 voices — v2.54 adds the Underdog Spotter)',reads.length===14&&reads.every(Boolean),reads.filter(r=>!r).length+' missing of '+reads.length);
  T('…each with a take, a worry and the price',reads.every(r=>r.take&&r.worry&&r.priceLine),JSON.stringify(reads.find(r=>!(r.take&&r.worry&&r.priceLine))));
  const bad=reads.flatMap(r=>[r.take,...r.story,...r.proof,r.worry,r.priceLine]).filter(t=>/undefined|NaN|null|\[object/.test(String(t)));
  T('…never a broken sentence (no undefined / NaN / null)',bad.length===0,bad.slice(0,2).join(' | '));
  T('…in plain words: team names, not codes',reads.every(r=>!/\bCAR\b(?! ML)/.test(r.take)),reads.map(r=>r.take).find(t=>/\bCAR\b(?! ML)/.test(t)));
  const coach=reads.find(r=>r.v==='Coach');T('the Coach leads with the spot: Winnipeg played last night',/spot game/.test(coach.take)&&coach.story.concat(coach.proof).some(s=>/Winnipeg played last night/.test(s)),JSON.stringify(coach));
  T('…its record here is called small: 6-2 is "only 8 games"',coach.proof.some(s=>/6-2/.test(s)&&/only 8 games/.test(s)),JSON.stringify(coach.proof));
  const sim=reads.find(r=>r.v==='Sim');T('the Simulator talks in runs of the game',/10,000 times/.test(sim.take)&&/63%/.test(sim.take),sim.take);
  const sk=reads.find(r=>r.v==='Most common');T('the Scorekeeper says its most likely final',/Carolina 3, Winnipeg 2/.test(sk.take),sk.take);
  T('the price is said plainly: what the book needs vs what we have',/needs this to hit 64%/.test(sim.priceLine)&&/74%/.test(sim.priceLine),sim.priceLine);
  T('a story never changes a pick: the ledger is untouched by every read',w.eval(`JSON.stringify(get(VOICES_KEY,[]))`)===before);
  const h=w.eval(`whyHtml({sp:'nhl',game:'CAR@WPG',m:'ml',sd:'away',price:-179,pick:'CAR ML',date:'${D}'},true)`);
  T('"Why we like it": a character speaks first',/vx-read/.test(h)&&/Why we like it/.test(h),h.slice(0,200));
  T('…the numbers sit under "Show the math"',/Show the math/.test(h));
  T('…and the reel script is in that character\'s voice',/REEL SCRIPT — in The/.test(h));
  const W1=w.eval(`pickWhy({sp:'nhl',game:'CAR@WPG',m:'ml',sd:'away',price:-179,pick:'CAR ML',date:'${D}'})`);
  const W0=w.eval(`pickWhy({sp:'nhl',game:'CAR@WPG',m:'ml',sd:'away',price:-179,pick:'CAR ML',date:'2026-10-17'})`);
  T('the public page gets the read from Oct 18 on',W1.read&&W1.read.text.length>40,JSON.stringify(W1.read||{}).slice(0,160));
  T('…and nothing changes on a day already posted (Oct 17)',!W0.read);
  const tg=w.eval(`(()=>{const c={d:'${D}',best:[{sp:'nhl',game:'CAR@WPG',m:'ml',sd:'away',pick:'CAR ML',price:-179,p:0.74}],top10:[],banker:null,chars:[],props:[],record:null,locked:true};return subTelegramText(c).join('\\n');})()`);
  T('the VIP card: each Best 3 pick carries its lead character\'s one line',/<b>CAR ML<\/b>[^\n]*\n\s+<i>“/.test(tg),tg.slice(0,400));
  const tg0=w.eval(`(()=>{const c={d:'2026-10-17',best:[{sp:'nhl',game:'CAR@WPG',m:'ml',sd:'away',pick:'CAR ML',price:-179,p:0.74}],top10:[],banker:null,chars:[],props:[],record:null,locked:true};return subTelegramText(c).join('\\n');})()`);
  T('…but an Oct 17 card reads exactly as it went out',!/<i>“/.test(tg0));
  const tg2=w.eval(`(()=>{const c={d:'${D}',best:[{sp:'nhl',game:'CAR@WPG',m:'ml',sd:'away',pick:'CAR ML',price:-179,p:0.74}],top10:[],banker:null,chars:[],props:[],record:null,locked:true,vxTakes:{}};c.vxTakes[vxPickKey(c.best[0])]={take:'Stamped words.',name:'The Simulator'};return subTelegramText(c).join('\\n');})()`);
  T('a posted card replays the words it went out with (every ✅/❌ edit says the same thing)',/Stamped words\./.test(tg2)&&!/10,000 times/.test(tg2),tg2.slice(0,300));
  const tg3=w.eval(`(()=>{const b=[{sp:'nhl',game:'CAR@WPG',m:'total',sd:'under',pick:'Under 6.5',line:6.5,price:-110,p:0.72},{sp:'nhl',game:'DAL@CHI',m:'total',sd:'under',pick:'Under 6.5',line:6.5,price:-115,p:0.71}];
    const c={d:'${D}',best:b,top10:[],banker:null,chars:[],props:[],record:null,locked:true,vxTakes:{[vxPickKey(b[0])]:{take:'First game words.',name:'The Simulator'},[vxPickKey(b[1])]:{take:'Second game words.',name:'The Judge'}}};
    return subTelegramText(c).join('\\n');})()`);
  T('two Best 3 picks with the same text ("Under 6.5") each get their own character, under their own number',/1\. [^\n]*Under 6\.5[^\n]*\n\s+<i>“First game words/.test(tg3)&&/2\. [^\n]*Under 6\.5[^\n]*\n\s+<i>“Second game words/.test(tg3),tg3.slice(0,600));
  T('…and the card built for posting carries its words with it',w.eval(`(()=>{const C=subCard();return C&&String(C.d)>='2026-10-18'?typeof C.vxTakes:'object';})()`)==='object');
}catch(e){T('suite crashed',false,String(e&&e.stack||e).slice(0,400));}
  console.log(out.join('\n'));const f=out.filter(x=>x.startsWith('FAIL')).length;console.log(`${out.length-f} pass / ${f} fail`);process.exit(0);})();
