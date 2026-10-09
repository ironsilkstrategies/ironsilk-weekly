const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';const out=[];const T=(n,ok,d)=>out.push((ok?'PASS':'FAIL')+'  '+n+(d?'  — '+d:''));
function boot(page){let html=fs.readFileSync(path.join(W,page),'utf8');
  html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
  return new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/'+page,pretendToBeVisual:true,beforeParse(w){
    const RD=w.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[RD.parse('2026-10-09T20:30:00Z')]))}static now(){return RD.parse('2026-10-09T20:30:00Z')}}w.Date=FD;
    w.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});
    w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.localStorage.setItem('d4.setupDone','1');}}).window;}
const w=boot('mlb.html');
setTimeout(()=>{
  w.eval(`(()=>{const V=[];const T=['NYY','BOS','LAD','SD','SEA','HOU','CHC','MIL','ATL','PHI','NYM','TOR','DET','CLE','KC','MIN'];const sps=['mlb','nfl','nhl','ncaaf'];
    for(let i=0;i<8000;i++){const a=T[i%16],h=T[(i*7+3)%16];const d='2026-'+(i<7700?'09-'+String(1+i%28).padStart(2,'0'):'10-09');
      V.push({id:'v'+i,voice:CHAR_ORDER[i%CHAR_ORDER.length],sp:sps[i%4],market:['ml','spread','total'][i%3],side:['home','away','over','under'][i%4],game:a+'@'+(a===h?'TB':h),date:d,price:-110,graded:d<'2026-10-09',hit:d<'2026-10-09'?i%3!==0:null});}
    set(VOICES_KEY,V);localStorage.removeItem(CPAR_KEY);})()`);
  const t=(lab,code,max)=>{const s=Date.now();w.eval(code);const ms=Date.now()-s;T(lab+' under '+max+'ms',ms<max,ms+'ms');};
  t('character parlays x5 (8,000-call ledger)','for(let i=0;i<5;i++)cparState()',600);
  t('Banker slate x5','for(let i=0;i<5;i++)bkSlate()',150);
  t('Banker challenge filter over 60 legs (was 6.5s)','for(let i=0;i<60;i++)MS_FILTERS.banker.f({game:"NYY@BOS",pick:"NYY ML"})',150);
  t('character desk render','charDeskHtml({sp:"all"})',400);T('Banker filter still matches its own legs',w.eval('(()=>{const S=bkSlate();const l=S.picks[0]&&S.picks[0].P.legs[0];return !l||MS_FILTERS.banker.f({game:l.game,pick:l.pick})})()'));
  t('Banker ledger rebuild','bkLedger(true)',200);console.log(out.join('\n'));console.log('\n'+out.filter(x=>x.startsWith('PASS')).length+' pass / '+out.filter(x=>x.startsWith('FAIL')).length+' fail');
  process.exit(0);},2000);
