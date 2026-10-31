/* v2.80.7 · a phone never loads a second sport page inside a hidden frame (that doubled memory and iOS killed the tab):
   the Book's re-read skips it, and "Load all sports" walks page to page with the relay (mode 'load'). */
const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
const IPHONE='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
function page(file,qs,pre){let html=fs.readFileSync(path.join(W,file),'utf8');
  html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
  return new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/'+file+(qs||''),pretendToBeVisual:true,beforeParse(w){
    const RD=w.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[RD.parse('2026-10-31T16:30:00Z')+(RD.now()-T00)]))}static now(){return RD.parse('2026-10-31T16:30:00Z')+(RD.now()-T00)}}const T00=RD.now();w.Date=FD;
    w.__NO_GRADELOOP__=true;w.__NO_BACKFILL__=true;w.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});
    Object.defineProperty(w.navigator,'userAgent',{get:()=>IPHONE});Object.defineProperty(w.navigator,'maxTouchPoints',{get:()=>5});
    w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.localStorage.setItem('d4.setupDone','1');if(pre)pre(w);}}).window;}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{try{
  const w=page('nba.html');await sleep(2500);
  T('an iPhone is not allowed hidden sport frames',w.eval('deskFramesOK()')===false);
  const R=await w.eval(`bookBgEval('nhl')`);
  T('the Book\'s background re-read skips on a phone (no frame, no 60 s wait)',R&&R.skipped===true&&w.document.querySelectorAll('iframe').length===0,JSON.stringify(R));
  w.eval(`window.__GO=0;evalChainGo=function(){window.__GO=(window.__GO||0)+1;};`);
  await w.eval(`loadAllSports({sports:['nhl','mlb'],force:true})`);await sleep(500);
  const C=w.eval(`get(EVAL_CHAIN_KEY,null)`);
  T('"Load all sports" on a phone walks page to page instead (relay, mode load)',C&&C.mode==='load'&&JSON.stringify(C.todo)==='["nhl","mlb"]'&&C.back==='nba.html'&&w.eval('window.__GO')===1&&w.document.querySelectorAll('iframe').length===0,JSON.stringify(C));
  w.close();
  /* a hop page in load mode moves on once its board is on Today's card */
  const day='2026-10-31';
  const h=page('nhl.html','?bg=1&chain=1&v=1',x=>{x.localStorage.setItem('d4.evalchain',JSON.stringify({ts:Date.parse('2026-10-31T16:30:00Z'),d:day,todo:['nhl','mlb'],done:[],miss:[],back:'nba.html',mode:'load'}));});
  await sleep(2500);
  T('the hop page says it is loading boards, not evaluating',/Loading every board/.test(h.document.body.innerHTML));
  /* its own boot snapshot put the board on Today's card, so it has already moved on (jsdom can't follow the navigation) */
  const G=h.eval('get(EVAL_CHAIN_KEY,null)');
  T('…and hops on once its board is on Today\'s card, that board marked done',G&&JSON.stringify(G.done)==='["nhl"]'&&JSON.stringify(G.todo)==='["mlb"]'&&!!(h.eval('get(TC_KEY,{})').by||{}).nhl,JSON.stringify(G));
  h.close();
  /* home again */
  const b=page('nba.html','?loaddone=1&v=2',x=>{x.localStorage.setItem('d4.evalchain',JSON.stringify({ts:Date.parse('2026-10-31T16:30:00Z'),d:day,todo:[],done:['nhl'],miss:['mlb'],back:'nba.html',mode:'load'}));});
  await sleep(4500);
  T('back home: the relay is cleared',b.localStorage.getItem('d4.evalchain')==null);
  b.close();
}catch(e){T('harness',false,e.stack);}
console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length} pass / ${out.filter(x=>x.startsWith('FAIL')).length} fail`);process.exit(0);})();
