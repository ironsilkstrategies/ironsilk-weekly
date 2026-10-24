/* v2.62 · roadmap challenges: a daily budget, the price it takes from here, both branches, and live boxes */
const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);const NOW=Date.parse('2026-10-24T15:00:00Z'),D='2026-10-24';
let html=fs.readFileSync(path.join(W,'nhl.html'),'utf8');html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const pk=(g,pick,price,p)=>({sp:'nhl',game:g,pick,price,p,m:'ml',sd:'away',start:'2026-10-24T23:00:00Z',main:true});
const top3=[pk('A@B','A ML',-150,0.74),pk('C@D','C ML',-120,0.72),pk('E@F','E ML',110,0.70)];
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nhl.html',pretendToBeVisual:true,beforeParse(x){const RD=x.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[NOW]))}static now(){return NOW}}x.Date=FD;
  x.__NO_GRADELOOP__=true;x.__NO_REOPEN__=true;x.__NO_BACKFILL__=true;x.__NO_SYNC_LOOP__=true;x.__NO_FLIP_RELOAD__=true;
  x.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});x.scrollTo=()=>{};x.alert=()=>{};x.confirm=()=>true;x.localStorage.setItem('d4.setupDone','1');
  x.localStorage.setItem('d4.best5',JSON.stringify({d:D,locked:true,lockedAt:NOW,top3,bySport:{},picks:[],props:[]}));}}).window;
setTimeout(()=>{try{
  const c={id:1,preset:'road:trail',road:true,name:'The Trail',ico:'🗺️',start:100,goal:300,days:20,startDate:D,pot:100,steps:[],status:'active',src:'road'};
  const P=w.eval(`ch2RoadPlays(${JSON.stringify(c)})`);
  T('$100 over 20 days: today risks $5, on the ticket the pace needs (a 2-teamer or longer)',P.length===1&&P[0].stake===5&&P[0].legs.length>=2,JSON.stringify(P.map(o=>({l:o.label,st:o.stake,dec:o.dec.toFixed(2)}))));
  const ahead={...c,pot:180,startDate:'2026-10-21'};const A=w.eval(`ch2RoadPlays(${JSON.stringify(ahead)})`);
  T('ahead after an early win: it eases off (smaller ask, shorter ticket), never doubles down',A.length===1&&A[0].dec<P[0].dec,JSON.stringify(A.map(o=>({l:o.label,st:o.stake,dec:o.dec.toFixed(2)}))));
  const behind={...c,pot:70,startDate:'2026-10-14'};const B=w.eval(`ch2RoadPlays(${JSON.stringify(behind)})`);
  T('behind: same capped stake, it reaches for the longer ticket',B.length===1&&B[0].legs.length>=3&&B[0].stake<=5,JSON.stringify(B.map(o=>({l:o.label,st:o.stake,dec:o.dec.toFixed(2)}))));
  const h=w.eval(`ch2RoadHtml(${JSON.stringify(c)})`);
  T('the card shows the pace and both branches',/ON pace/.test(h)&&/If today wins/.test(h)&&/If today loses/.test(h)&&/tomorrow \$\d/.test(h),h.replace(/<[^>]+>/g,' ').slice(0,400));
  T('roadmaps are on the board',w.eval(`ch2Lib().filter(x=>x.road).length`)===4);
  w.eval(`ch2Start('road:trail')`);T('starting one makes a roadmap challenge',w.eval(`ch2All().some(x=>x.road&&x.preset==='road:trail')`));
}catch(e){T('no crash',false,e.stack.slice(0,500));}
const p=out.filter(x=>x.startsWith('PASS')).length;console.log(out.join('\n'));console.log(`${p} pass / ${out.length-p} fail`);process.exit(0);},3500);
