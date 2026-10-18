/* v2.47.1 · a locked ticket never pops back up as the slip; the ungraded-legs list stays open while you grade, each grade lands at once */
const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
let html=fs.readFileSync(path.join(W,'nfl.html'),'utf8');html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const NOW=Date.parse('2026-10-18T15:00:00Z');
const slip=[{id:'401872996|JAX ML',pick:'JAX ML',game:'JAX@LAR',gameDate:'2026-10-18'},{id:'401872996|Over 41.5',pick:'Over 41.5',game:'JAX@LAR',gameDate:'2026-10-18'},
  {id:'401873001|KC ML',pick:'KC ML',game:'KC@DEN',gameDate:'2026-10-18',at:NOW-60e3},{id:'401872981|JAX spread',pick:'JAX spread',game:'JAX@SEA',gameDate:'2026-10-11'}];
const locked=[{id:NOW-3600e3,date:'2026-10-18',name:"Dev's First look",source:'mine',legs:[{id:'401872996|JAX ML',pick:'JAX ML',game:'JAX@LAR',sport:'nfl',gameDate:'2026-10-18'},{id:'401872996|Over 41.5',pick:'Over 41.5',game:'JAX@LAR',sport:'nfl',gameDate:'2026-10-18'}],p:0.3},
  {id:NOW-86400e3*6,date:'2026-10-12',name:'My late tix',source:'mine',legs:[{id:'X|A',pick:'GB 1H spread',game:'GB@CHI',sport:'nfl',gameDate:'2026-10-12'},{id:'X|B',pick:'BUF spread',game:'BUF@NE',sport:'nfl',gameDate:'2026-10-12'}],p:0.3}];
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nfl.html',pretendToBeVisual:true,beforeParse(x){const RD=x.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[NOW]))}static now(){return NOW}}x.Date=FD;
  x.__NO_GRADELOOP__=true;x.__NO_REOPEN__=true;x.__NO_FLIP_RELOAD__=true;x.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});x.scrollTo=()=>{};x.alert=()=>{};x.confirm=()=>true;
  x.localStorage.setItem('d4.setupDone','1');x.localStorage.setItem('d4.slip',JSON.stringify(slip));x.localStorage.setItem('d4.locked',JSON.stringify(locked));}}).window;
setTimeout(async()=>{try{
  w.eval('loadSlip()');const S=w.eval('SLIP.map(x=>x.pick)');
  T('legs already locked into a ticket leave the slip (no more "same ticket every reboot")',!S.includes('JAX ML')&&!S.includes('Over 41.5'),JSON.stringify(S));
  T('…a leg added after that ticket stays, and a past day\'s leg goes',S.includes('KC ML')&&!S.includes('JAX spread'),JSON.stringify(S));
  T('…and the slip is this device\'s own (a cleared slip can\'t come back by sync)',w.eval(`syncSkip(LS.slip)===true&&syncSkip(LS.locked)===false`));
  const tid=String(locked[1].id);
  w.eval(`set(GHEALTH_KEY,{ts:Date.now(),before:2,graded:0,left:[{tid:'${tid}',i:0,pick:'GB 1H spread',game:'GB@CHI',sp:'nfl',d:'2026-10-12',code:'pick',msg:'x'},{tid:'${tid}',i:1,pick:'BUF spread',game:'BUF@NE',sp:'nfl',d:'2026-10-12',code:'pick',msg:'y'}]});gradeBannerPaint();`);
  w.eval(`document.querySelector('#gradeBanner details').open=true;SWEEP_BUSY=true;`);
  w.eval(`gradeBannerSet('${tid}',0,'won')`);
  const r=w.eval(`(()=>{const el=document.getElementById('gradeBanner');const L=get(LS.locked,[]).find(t=>String(t.id)==='${tid}');return{open:!!el.querySelector('details[open]'),rows:(el.innerHTML.match(/gradeBannerSet\\(/g)||[]).length/3,leg:L.legs[0].manual};})()`);
  T('grade one leg: it leaves the list at once and the list stays open for the next',r.open&&r.rows===1&&r.leg&&r.leg.hit===true,JSON.stringify(r));
  await new Promise(z=>setTimeout(z,600));
  T('"Sweep again" tapped while a sweep is running queues one more pass instead of doing nothing',w.eval('SWEEP_AGAIN')===true);
}catch(e){T('crashed',false,String(e&&e.stack||e).slice(0,300));}
  console.log(out.join('\n'));const f=out.filter(x=>x.startsWith('FAIL')).length;console.log(`${out.length-f} pass / ${f} fail`);process.exit(0);},2500);
