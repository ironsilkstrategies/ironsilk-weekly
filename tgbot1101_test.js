/* v2.82 · the Telegram robot, Nov 1: it answers only inside TheDesk's own chats (the public lounge keeps full access),
   leaves anyone else's group, welcomes new members with the rules and an "I agree" button, gives admins /warn (3 = ban),
   /ban and /unban, answers /live /next /status /rules /why on its own, listens between passes, and stays up in lounge hours. */
process.env.AUTOPILOT_KEY='k';process.env.TG_BOT_TOKEN='t';process.env.GITHUB_REPOSITORY='o/r';process.env.GITHUB_TOKEN='g';process.env.LOUNGE='';
const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
const NOW=Date.parse('2026-11-01T18:00:00Z'),D='2026-11-01',SEC=Math.floor(NOW/1000);
const ADM={'-1001':[{status:'creator',user:{id:42}},{status:'administrator',user:{id:777,is_bot:true}}],'-1003':[{status:'creator',user:{id:42}},{status:'administrator',user:{id:600}}],
  '-1009':[{status:'administrator',user:{id:42}},{status:'creator',user:{id:55}}],'-1666':[{status:'creator',user:{id:66}}],'-1888':[{status:'creator',user:{id:88}}]};
const MEM={'-1003|501':'member','-1003|600':'administrator','-1003|42':'creator','-1003|902':'member'};
function bot(updates,o){o=o||{};const sent=[];const tg=async(m,p)=>{sent.push([m,p]);
    if(m==='getUpdates'){const off=+p.offset||0;return{ok:true,result:(updates||[]).filter(u=>u.update_id>=off)};}
    if(m==='getChatAdministrators'){const a=ADM[String(p.chat_id)];return a===undefined?null:{ok:true,result:a};}
    if(m==='getChatMember'){const s=MEM[String(p.chat_id)+'|'+p.user_id];return{ok:true,result:{status:s||'left',user:{id:+p.user_id}}};}
    if(m==='banChatMember'&&o.noBan)return null;
    if(m==='sendMessage')return{ok:true,result:{message_id:1000+sent.length}};return{ok:true,result:true};};return{tg,sent};}
const legs=[{k:'a',kind:'Best 3',sp:'nhl',game:'COL@BOS',label:'COL ML (-120)'},{k:'b',kind:'Top 10',sp:'nhl',game:'NYR@PIT',label:'NYR ML (+110)'},{k:'c',kind:'Prop',sp:'nhl',game:'COL@BOS',player:'X',label:'X 1+ G'},{k:'d',kind:'Top 10',sp:'nfl',game:'KC@BUF',label:'KC +2.5 (-110)'}];
const state=(cmdx)=>({posts:{[D]:{d:D,chat:'-1001',legs,st:{a:'W'},bc:{pub:'@TheDeskApp',vipLounge:'-1002',pubLounge:'-1003'},feedTs:NOW-36e5,
  cmd:{d:D,r:{best:'<b>⭐ Best</b> ⟦m:a⟧COL ML',top10:'TOP TEN',why:'WHY ALL',why2:'WHY TWO',help:'HELP'},menu:[{command:'best',description:'Best'}],join:'https://t.me/TheDeskApp',...(cmdx||{})}}}});
const ev=(state,det,date)=>({competitions:[{date,status:{type:{state,completed:state==='post',shortDetail:det}}}]});
const FE=async(sp,d,[a,h])=>a==='COL'?{ev:ev('post','Final','2026-11-01T17:00:00Z'),T:{a:'COL',h:'BOS',as:4,hs:2}}:a==='NYR'?{ev:ev('in','2nd 10:12','2026-11-01T17:30:00Z'),T:{a:'PIT',h:'NYR',as:2,hs:1}}:a==='KC'?{ev:ev('pre','1:00 PM','2026-11-01T19:00:00Z'),T:{a:'KC',h:'BUF',as:0,hs:0}}:null;
let U=0;const msg=(chat,from,text,x)=>({update_id:++U,message:{message_id:100+U,chat,from:{id:from,first_name:'U'+from},text,date:SEC,...(x||{})}});
const sends=(B,chat)=>B.sent.filter(([m,p])=>m==='sendMessage'&&(chat==null||String(p.chat_id)===String(chat)));
(async()=>{try{
  const Wk=await import('file://'+path.join(W,'autopilot/worker.mjs'));
  const LG=[];const L0=console.log;console.log=(...a)=>{LG.push(a.join(' '));};
  /* ── who may use it ── */
  let S=state();let B=bot([msg({id:-1003,type:'supergroup'},900,'/best@TheDeskAppBot')]);let n=await Wk.runCommands(S,{tg:B.tg,now:NOW,findEvent:FE});
  T('the public lounge (on the card) gets full answers, as a reply',sends(B,-1003).length===1&&/⭐ Best/.test(sends(B,-1003)[0][1].text)&&/✅ COL ML/.test(sends(B,-1003)[0][1].text)&&sends(B,-1003)[0][1].reply_to_message_id===String(100+U)&&n>=1);
  T('…without asking Telegram who owns it',!B.sent.some(([m])=>m==='getChatAdministrators'||m==='getChatMember'));
  S=state();B=bot([msg({id:-1005,type:'supergroup',username:'TheDeskApp'},900,'/best')]);await Wk.runCommands(S,{tg:B.tg,now:NOW});
  T('a chat on the card by @username counts too',sends(B,-1005).length===1&&/⭐ Best/.test(sends(B,-1005)[0][1].text));
  S=state();B=bot([msg({id:-1666,type:'supergroup',title:'Steal'},66,'/best'),msg({id:-1666,type:'supergroup'},66,'/top10')]);await Wk.runCommands(S,{tg:B.tg,now:NOW});
  const st1=sends(B,-1666);
  T('someone else\'s group: one notice, then the bot leaves, and no picks',st1.length===1&&/only works inside TheDesk's own chats/.test(st1[0][1].text)&&B.sent.filter(([m,p])=>m==='leaveChat'&&String(p.chat_id)==='-1666').length>=1&&!B.sent.some(([m,p])=>/Best/.test((p&&p.text)||'')));
  T('the owner is read from the VIP channel\'s creator and cached',JSON.stringify(S.mod.owner.ids)==='[42]'&&S.mod.acl['-1666'].v==='stranger');
  T('the logs never name the chat',!LG.some(l=>/1666/.test(l))&&LG.some(l=>/left a chat that isn't TheDesk's/.test(l)));
  B=bot([msg({id:-1666,type:'supergroup'},66,'/best')]);await Wk.runCommands(S,{tg:B.tg,now:NOW});
  T('…a second try there gets no second notice (it just leaves again)',sends(B,-1666).length===0&&B.sent.some(([m])=>m==='leaveChat'));
  S=state();B=bot([msg({id:-1009,type:'supergroup'},900,'/best')]);await Wk.runCommands(S,{tg:B.tg,now:NOW});
  T('a group where the owner is an admin works (a new lounge of his)',sends(B,-1009).length===1&&/⭐ Best/.test(sends(B,-1009)[0][1].text)&&!B.sent.some(([m])=>m==='leaveChat'));
  S=state();B=bot([msg({id:-1777,type:'supergroup'},900,'/best')]);await Wk.runCommands(S,{tg:B.tg,now:NOW});
  T('can\'t check a chat: stays quiet and never leaves',sends(B,-1777).length===0&&!B.sent.some(([m])=>m==='leaveChat')&&S.mod.acl['-1777'].v==='unknown');
  S=state();B=bot([msg({id:42,type:'private'},42,'/best'),msg({id:501,type:'private'},501,'/best'),msg({id:999,type:'private'},999,'/best'),msg({id:999,type:'private'},999,'/top10')]);await Wk.runCommands(S,{tg:B.tg,now:NOW});
  T('private: the owner gets answers',sends(B,42).length===1&&/⭐ Best/.test(sends(B,42)[0][1].text));
  T('private: a public-lounge member gets answers',sends(B,501).length===1&&/⭐ Best/.test(sends(B,501)[0][1].text));
  T('private: an outsider is pointed to the lounge once, never given picks',sends(B,999).length===1&&/Join the lounge first/.test(sends(B,999)[0][1].text)&&/t\.me\/TheDeskApp/.test(sends(B,999)[0][1].text));
  S=state();B=bot([{update_id:++U,my_chat_member:{chat:{id:-1888,type:'group',title:'X'},from:{id:88},new_chat_member:{status:'member',user:{id:777,is_bot:true}}}}]);await Wk.runCommands(S,{tg:B.tg,now:NOW});
  T('added to a stranger\'s group: says so and leaves at once',sends(B,-1888).length===1&&B.sent.some(([m,p])=>m==='leaveChat'&&String(p.chat_id)==='-1888'));
  T('it listens for joins, taps and being added (allowed_updates)',/callback_query/.test(B.sent.find(([m])=>m==='getUpdates')[1].allowed_updates)&&/my_chat_member/.test(B.sent.find(([m])=>m==='getUpdates')[1].allowed_updates));
  /* ── the welcome ── */
  S=state();const LC={id:-1003,type:'supergroup'};
  B=bot([{update_id:++U,message:{message_id:300,chat:LC,from:{id:301},date:SEC,new_chat_members:[{id:301,first_name:'Ann'}]}},{update_id:++U,message:{message_id:301,chat:LC,from:{id:302},date:SEC,new_chat_members:[{id:302,first_name:'Bo',last_name:'Lee'},{id:778,is_bot:true,first_name:'Spam bot'},{id:42,first_name:'Chris'}]}}]);
  n=await Wk.runCommands(S,{tg:B.tg,now:NOW});const w1=sends(B,-1003);
  T('new members get ONE welcome naming them (bots and the owner left out)',w1.length===1&&/Welcome to TheDesk, Ann and Bo Lee!/.test(w1[0][1].text)&&!/Spam bot|Chris/.test(w1[0][1].text),w1.map(x=>x[1].text.slice(0,60)).join('|'));
  T('…with the rules, the ban warning and an "I agree" button',/Respect everyone/.test(w1[0][1].text)&&/1-800-GAMBLER/.test(w1[0][1].text)&&/Break a rule and you're out/.test(w1[0][1].text)&&/three warnings is an automatic ban/.test(w1[0][1].text)&&JSON.parse(w1[0][1].reply_markup).inline_keyboard[0][0].callback_data==='agree');
  const wid=S.mod.wel['-1003'].id;T('the welcome is remembered (to swap it for the next one)',wid===1000+B.sent.indexOf(w1[0])+1);
  B=bot([{update_id:++U,message:{message_id:310,chat:LC,from:{id:303},date:SEC,new_chat_members:[{id:303,first_name:'Cy'}]}}]);await Wk.runCommands(S,{tg:B.tg,now:NOW});
  T('the next join swaps the old welcome out (one on screen)',B.sent.some(([m,p])=>m==='deleteMessage'&&p.message_id===String(wid))&&/Welcome to TheDesk, Cy!/.test(sends(B,-1003)[0][1].text));
  const wid2=S.mod.wel['-1003'].id;
  B=bot([{update_id:++U,message:{message_id:320,chat:LC,from:{id:304},date:SEC-13*3600,new_chat_members:[{id:304,first_name:'Old'}]}},{update_id:++U,message:{message_id:321,chat:{id:-1666,type:'supergroup'},from:{id:305},date:SEC,new_chat_members:[{id:305,first_name:'Elsewhere'}]}}]);await Wk.runCommands(S,{tg:B.tg,now:NOW});
  T('no welcome for a join 13 hours old, or in someone else\'s group',sends(B).length===0||sends(B).every(x=>!/Welcome/.test(x[1].text)));
  /* ── I agree ── */
  B=bot([{update_id:++U,callback_query:{id:'cq1',from:{id:303,first_name:'Cy'},data:'agree',message:{message_id:wid2,chat:LC}}}]);await Wk.runCommands(S,{tg:B.tg,now:NOW});
  const ans=B.sent.find(([m])=>m==='answerCallbackQuery'),ed=B.sent.find(([m])=>m==='editMessageText');
  T('tapping "I agree" thanks them and records it',ans&&/Thanks, Cy/.test(ans[1].text)&&S.mod.agreed['-1003|303']>0);
  T('…and the welcome lists who read and agreed',ed&&ed[1].message_id===String(wid2)&&/Read and agreed:<\/b> Cy/.test(ed[1].text)&&/Welcome to TheDesk, Cy!/.test(ed[1].text));
  B=bot([{update_id:++U,callback_query:{id:'cq2',from:{id:303,first_name:'Cy'},data:'agree',message:{message_id:wid2,chat:LC}}}]);await Wk.runCommands(S,{tg:B.tg,now:NOW});
  T('a second tap: "already agreed", no re-edit',/already agreed/.test(B.sent.find(([m])=>m==='answerCallbackQuery')[1].text)&&!B.sent.some(([m])=>m==='editMessageText'));
  /* ── moderation ── */
  const rep=(from,text,to,x)=>msg(LC,from,text,{reply_to_message:{message_id:49,from:{id:to,first_name:'Spammy'},...(x||{})}});
  for(let i=1;i<=2;i++){B=bot([rep(600,'/warn spam links',501)]);await Wk.runCommands(S,{tg:B.tg,now:NOW});
    T(`an admin's /warn ${i}: "warning ${i} of 3" with the reason`,new RegExp(`Spammy</b>, warning ${i} of 3: spam links`).test(sends(B,-1003)[0][1].text)&&!B.sent.some(([m])=>m==='banChatMember'));}
  B=bot([rep(600,'/warn',501)]);await Wk.runCommands(S,{tg:B.tg,now:NOW});
  T('the third warning bans and deletes the message',B.sent.some(([m,p])=>m==='banChatMember'&&p.user_id==='501')&&B.sent.some(([m,p])=>m==='deleteMessage'&&p.message_id==='49')&&/is banned: three warnings/.test(sends(B,-1003).pop()[1].text));
  B=bot([rep(42,'/unban',501)]);await Wk.runCommands(S,{tg:B.tg,now:NOW});
  T('/unban lifts it and clears the count',B.sent.some(([m,p])=>m==='unbanChatMember'&&p.user_id==='501')&&S.mod.warns['-1003|501'].n===0);
  const w0={...S.mod.warns['-1003|501']};const back=Wk.mergeMod(S.mod,{warns:{'-1003|501':{n:2,ts:w0.ts-5000}}});
  T('…and an older copy of the robot\'s memory can\'t bring the warnings back',back.warns['-1003|501'].n===0);
  B=bot([rep(501,'/warn',902)]);await Wk.runCommands(S,{tg:B.tg,now:NOW});T('a member can\'t /warn',/Only admins can use \/warn/.test(sends(B,-1003)[0][1].text)&&!B.sent.some(([m])=>m==='banChatMember'));
  B=bot([msg(LC,600,'/ban')]);await Wk.runCommands(S,{tg:B.tg,now:NOW});T('/ban without a reply explains how',/Reply to the member's message with \/ban/.test(sends(B,-1003)[0][1].text));
  B=bot([rep(600,'/ban',42)]);await Wk.runCommands(S,{tg:B.tg,now:NOW});T('admins and the owner can\'t be warned or banned',/Admins can't be warned or banned/.test(sends(B,-1003)[0][1].text)&&!B.sent.some(([m])=>m==='banChatMember'));
  B=bot([rep(42,'/ban scam DMs',902)]);await Wk.runCommands(S,{tg:B.tg,now:NOW});T('the owner\'s /ban bans on the spot, with the reason',B.sent.some(([m,p])=>m==='banChatMember'&&p.user_id==='902')&&/is banned: scam DMs/.test(sends(B,-1003).pop()[1].text));
  B=bot([rep(42,'/ban',902)],{noBan:true});await Wk.runCommands(S,{tg:B.tg,now:NOW});T('no ban rights: it says which rights it needs',/Ban users<\/b> and <b>Delete messages/.test(sends(B,-1003)[0][1].text));
  /* ── the robot's own answers ── */
  S=state();B=bot([msg(LC,900,'/live'),msg(LC,900,'/next'),msg(LC,900,'/status'),msg(LC,900,'/rules'),msg(LC,900,'/why 2'),msg(LC,900,'/why')]);await Wk.runCommands(S,{tg:B.tg,now:NOW,findEvent:FE});
  const [lv,nx,stt,ru,wy2,wy]=sends(B,-1003).map(x=>x[1].text);
  T('/live: graded picks with the final, live games with the score and clock',/✅ <b>COL ML \(-120\)<\/b> · COL 4–2 BOS \(final\)/.test(lv)&&/🔴 <b>NYR ML \(\+110\)<\/b> · NYR 1–2 PIT · 2nd 10:12/.test(lv),lv);
  T('…upcoming games with the start time; props left out',/⏳ <b>KC \+2\.5 \(-110\)<\/b> · KC@BUF · 1:00 PM CT/.test(lv)&&!/X 1\+ G/.test(lv));
  T('/next: the next game on the card and how long until it',/Next up: KC@BUF · 1:00 PM CT<\/b> \(in 1 h 0 min\)/.test(nx)&&/• <b>KC \+2\.5/.test(nx),nx);
  T('/status: online, today\'s card, graded so far, the answer hours',/TheDesk robot: online/.test(stt)&&/Graded so far: 1 of 4/.test(stt)&&/8 AM to midnight CT/.test(stt),stt);
  T('/rules: the default six with the ban warning',/TheDesk lounge rules/.test(ru)&&/1\. Respect everyone/.test(ru)&&/6\. 21\+ only/.test(ru)&&/three warnings is an automatic ban/.test(ru));
  T('/why 2 answers for one pick; /why for all',wy2==='WHY TWO'&&wy==='WHY ALL');
  S=state({rules:['No politics.','Be cool.']});B=bot([msg(LC,900,'/rules')]);await Wk.runCommands(S,{tg:B.tg,now:NOW});
  T('/rules uses the rules written in the app when there are any',/1\. No politics\.\n2\. Be cool\./.test(sends(B)[0][1].text)&&!/Respect everyone/.test(sends(B)[0][1].text));
  S=state({d:'2026-10-31'});B=bot([msg(LC,900,'/best'),msg(LC,900,'/rules')]);await Wk.runCommands(S,{tg:B.tg,now:NOW});
  T('an answer from yesterday\'s card says so; the robot\'s own answers don\'t',/from 2026-10-31/.test(sends(B)[0][1].text)&&!/from 2026-10-31/.test(sends(B)[1][1].text));
  S=state();B=bot([msg(LC,900,'/best'),msg(LC,901,'/best'),msg(LC,902,'/best'),msg(LC,903,'/top10'),msg({id:501,type:'private'},501,'/best'),msg({id:501,type:'private'},501,'/best')]);await Wk.runCommands(S,{tg:B.tg,now:NOW});
  T('spam guard: the same command in the same group within 15 s gets one answer (private chats always answered)',sends(B,-1003).filter(x=>/⭐ Best/.test(x[1].text)).length===1&&sends(B,-1003).length===2&&sends(B,501).length===2);
  S=state();const B9=bot([msg(LC,900,'/help@OtherBot'),msg(LC,900,'/shrug'),msg(LC,900,'/nope@thedeskappbot'),msg({id:501,type:'private'},501,'/nope')]);const tg9=async(m,p)=>m==='getMe'?{ok:true,result:{username:'TheDeskAppBot'}}:B9.tg(m,p);
  await Wk.runCommands(S,{tg:tg9,now:NOW});const t9=sends(B9).map(x=>[String(x[1].chat_id),x[1].text]);
  T('a command for another bot is ignored; a stray /word in a group stays quiet; unknown commands addressed to us (or in private) point to /help',t9.length===2&&t9.every(([c,t])=>/tap \/help/.test(t))&&t9.some(([c])=>c==='-1003')&&t9.some(([c])=>c==='501'),JSON.stringify(t9));
  /* ── the / menu ── */
  S=state();B=bot([]);await Wk.runCommands(S,{tg:B.tg,now:NOW});const sm=B.sent.filter(([m])=>m==='setMyCommands');
  T('the menu carries the robot\'s own commands; admins also see /warn /ban /unban',sm.length===2&&['live','next','rules','status'].every(c=>JSON.parse(sm[0][1].commands).some(x=>x.command===c))&&/all_chat_administrators/.test(sm[1][1].scope)&&['warn','ban','unban'].every(c=>JSON.parse(sm[1][1].commands).some(x=>x.command===c)));
  S={posts:{[D]:{d:D,chat:'-1001',legs}}};B=bot([]);await Wk.runCommands(S,{tg:B.tg,now:NOW});T('no app answers on file: the menu is left alone',!B.sent.some(([m])=>m==='setMyCommands'));
  S=state();S.cmdSig='v2|best,live,next,rules,status';B=bot([{update_id:++U,message:{message_id:5,chat:LC,from:{id:9},text:'just chatting',date:SEC}}]);n=await Wk.runCommands(S,{tg:B.tg,now:NOW});
  T('plain chatter moves the offset but doesn\'t force a save',S.tgOff===U&&n===0&&!B.sent.some(([m])=>m==='setMyCommands'),'n='+n);
  B=bot([msg(LC,9,'/best')]);n=await Wk.runCommands(S,{tg:B.tg,now:NOW});T('…a command does',n>=1);
  B=bot([]);await Wk.ackUpdates({tgOff:41},{tg:B.tg});const ak=B.sent[0];T('before it stops, it confirms what it read (nothing is answered twice next run)',ak[0]==='getUpdates'&&ak[1].offset==='42'&&ak[1].limit==='1'&&ak[1].timeout==='0');
  /* ── lounge hours ── */
  T('lounge hours: default 8 AM to midnight CT; "off"; "0-24"; wrap-around; junk = default',JSON.stringify(Wk.loungeHours(''))==='[8,24]'&&Wk.loungeHours('off')===null&&JSON.stringify(Wk.loungeHours('0-24'))==='[0,24]'&&JSON.stringify(Wk.loungeHours('18-2'))==='[18,2]'&&JSON.stringify(Wk.loungeHours('lol'))==='[8,24]');
  const at=s=>Date.parse(s);
  T('open at 8:00 AM CT, closed at 7:59',Wk.loungeOpen(at('2026-11-01T14:00:00Z'),'8-24')&&!Wk.loungeOpen(at('2026-11-01T13:59:00Z'),'8-24'));
  T('open at 11:59 PM, closed at 12:30 AM',Wk.loungeOpen(at('2026-11-02T05:59:00Z'),'8-24')&&!Wk.loungeOpen(at('2026-11-02T06:30:00Z'),'8-24'));
  T('"0-24" never closes, "off" never opens, "18-2" spans midnight',Wk.loungeOpen(at('2026-11-02T06:30:00Z'),'0-24')&&!Wk.loungeOpen(at('2026-11-01T18:00:00Z'),'off')&&Wk.loungeOpen(at('2026-11-02T07:30:00Z'),'18-2')&&!Wk.loungeOpen(at('2026-11-01T15:00:00Z'),'18-2'));
  T('summer time too (8 AM CDT = 13:00 UTC)',Wk.loungeOpen(at('2026-07-01T13:00:00Z'),'8-24')&&!Wk.loungeOpen(at('2026-07-01T12:59:00Z'),'8-24'));
  T('in lounge hours the relay stays up with nothing live',Wk.relayPending({posts:{}},at('2026-11-01T15:00:00Z'),'8-24')===true);
  T('…after hours it rests unless a game is on',Wk.relayPending({posts:{}},at('2026-11-02T08:00:00Z'),'8-24')===false&&Wk.relayPending({posts:{}},at('2026-11-01T15:00:00Z'),'off')===false);
  /* ── memory merges ── */
  const x={owner:{ids:[1],ts:5},acl:{a:{v:'ok',ts:1}},agreed:{k1:10},warns:{w:{n:1,ts:9}},wel:{c:{id:1,ts:1}},note:{z:3}},y={owner:{ids:[2],ts:7},acl:{a:{v:'stranger',ts:3}},agreed:{k2:11},warns:{w:{n:2,ts:2}},wel:{c:{id:2,ts:4}},note:{z:8}};
  const M=Wk.mergeMod(x,y);
  T('the robot\'s memory merges newest-wins (owner, access, warnings, welcome) and keeps every agreement',JSON.stringify(M.owner.ids)==='[2]'&&M.acl.a.v==='stranger'&&M.agreed.k1===10&&M.agreed.k2===11&&M.warns.w.n===1&&M.wel.c.id===2&&M.note.z===8);
  const wa={c:{id:5,ts:1,ok:['A']}},wb={c:{id:5,ts:1,at:9,ok:['A','B']}};T('a welcome with a newer "I agree" wins over the same welcome without it',Wk.mergeMod({wel:wa},{wel:wb}).wel.c.ok.length===2&&Wk.mergeMod({wel:wb},{wel:wa}).wel.c.ok.length===2);
  T('the worker\'s state merge carries it',JSON.stringify(Wk.mergeState({posts:{},mod:x},{posts:{}}).mod.owner.ids)==='[1]'&&!('mod' in Wk.mergeState({posts:{}},{posts:{}})));
  const sh=fs.readFileSync(path.join(W,'shared.js'),'utf8');const src=sh.match(/function tgwMerge\(a,b\)\{[\s\S]*?\n  Object\.keys\(out\.posts\)\.sort\(\)\.slice\(0,-5\)\.forEach\(d=>delete out\.posts\[d\]\);return out;\}/)[0];
  const tgwMerge=new Function(src+';return tgwMerge;')();
  T('the app\'s hand-off keeps the robot\'s memory (never drops warnings or the rules agreements)',JSON.stringify(tgwMerge({v:1,posts:{}},{posts:{},mod:x}).mod)===JSON.stringify(x));
  /* ── the workflow ── */
  const wf=fs.readFileSync(path.join(W,'.github/workflows/tg-autopilot.yml'),'utf8');
  T('the workflow wakes for lounge hours and passes the LOUNGE switch',/cron: '7 13,14 \* \* \*'/.test(wf)&&/LOUNGE: \$\{\{ vars\.LOUNGE \}\}/.test(wf));
  const wsrc=fs.readFileSync(path.join(W,'autopilot/worker.mjs'),'utf8');
  T('the relay cap fits lounge hours (240)',/n >= 240/.test(wsrc));
  console.log=L0;
}catch(e){T('harness',false,e.stack);}
console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length} pass / ${out.filter(x=>x.startsWith('FAIL')).length} fail`);process.exit(0);})();
