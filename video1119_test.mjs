/* v3.3 · the daily video (Nov 19, the growth playbook): the words (sports talk, never betting talk), the frames, the encode, and the
   send (the owner's DM; the free channel only when asked). Real renderer + real ffmpeg, fake Telegram, no network. */
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
let pass = 0, fail = 0; const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  — ' + String(x ?? '').slice(0, 400))); };
process.env.TG_BOT_TOKEN = 'TESTTOKEN-123456:SECRET'; delete process.env.VIDEO_TO; delete process.env.VIDEO_OWNER_ID; delete process.env.GITHUB_ACTIONS;
const Gr = await import('/home/claude/work/autopilot/growth.mjs'); const V = await import('/home/claude/work/autopilot/video.mjs');
const N = { A: { full: 'Buffalo Bills', nick: 'Bills', ab: 'BUF' }, H: { full: 'Miami Dolphins', nick: 'Dolphins', ab: 'MIA' } };
T('plain words: a favorite\'s spread → "by N+"', Gr.plainSide('BUF -3.5', 'nfl', N) === 'Buffalo Bills by 4+' && Gr.plainSide('BUF -3', 'nfl', N) === 'Buffalo Bills by 4+');
T('…a dog\'s spread → "within N"; +0.5 → "to win"', Gr.plainSide('MIA +3.5', 'nfl', N) === 'Miami Dolphins within 3' && Gr.plainSide('MIA +0.5', 'nfl', N) === 'Miami Dolphins to win');
T('…a moneyline → "to win"', Gr.plainSide('MIA ML', 'nfl', N) === 'Miami Dolphins to win');
T('…totals in the sport\'s own unit: points, goals, runs (integer lines handled)', Gr.plainSide('Over 47.5', 'nfl', N) === '48+ points' && Gr.plainSide('Under 51', 'ncaaf', N) === '50 or fewer points' && Gr.plainSide('Over 51', 'ncaaf', N) === '52+ points' && Gr.plainSide('Under 5.5', 'nhl', N) === '5 or fewer goals' && Gr.plainSide('Over 8.5', 'mlb', N) === '9+ runs');
const NOW = Date.parse('2026-11-19T16:40:00Z');
const call = (v, s, pick, rk) => ({ v, s, pick, price: -110, p: 0.55, r: { lab: 'NFL spread', rk, of: 8 } });
const board = { d: '2026-11-19', cast: { Judge: { name: 'The Judge' }, Dog: { name: 'The Underdog Spotter' }, Sim: { name: 'The Simulator' } }, games: [{ sp: 'nfl', game: 'BUF@MIA', start: '2026-11-19T22:00:00Z', st: 'pre', picks: [], calls: { spread: [call('Judge', 'away', 'BUF -3.5', 2), call('Sim', 'away', 'BUF -3.5', 4), call('Dog', 'home', 'MIA +3.5', 1)] } }] };
const S = Gr.videoSpec({ beta: true, board }, NOW, '2026-11-19', {});
const words = s => [...s.frames.flatMap(f => [f.kicker, f.big, f.mid, f.gold, f.sub, f.small, ...(f.rows || []).flatMap(r => [r.label, r.meta])]), s.caption].filter(Boolean).join(' | ');
T('a debate day: five frames (hook, each side, the count, the call to action)', S && S.kind === 'debate' && S.frames.map(f => f.k).join(',') === 'hook,side,side,count,cta', S && S.frames.map(f => f.k));
T('…in plain sports words: "The Judge is with Buffalo Bills by 4+", "2 of 3"', S.frames[1].big === 'The Judge' && S.frames[1].gold === 'Buffalo Bills by 4+' && S.frames[2].gold === 'Miami Dolphins within 3' && S.frames[3].gold === '2 of 3', JSON.stringify(S.frames.slice(1, 4)));
T('…and nothing TikTok reads as gambling: no odds, lines, "bet", "units", "ML", "lock"', !/(\bbet|odds|units?\b|\bML\b|[+-]\d{3}\b|[+-]\d+\.5\b|\block\b|parlay|wager)/i.test(words(S)), words(S));
T('…the caption: who\'s on each side, the question, sports hashtags only', /The Judge: Buffalo Bills by 4\+/.test(S.caption) && /Who you got\?/.test(S.caption) && /#NFL #sports #predictions/.test(S.caption) && !/#(SportsBetting|Gambling|Parlay)/i.test(S.caption), S.caption);
const hist = [{ d: '2026-11-18', picks: [{ sp: 'nfl', game: 'BUF@MIA', pick: 'BUF -3.5', price: -110, hit: true }, { sp: 'nhl', game: 'NSH@MIN', pick: 'Under 5.5', price: -120, hit: false }, { sp: 'nba', game: 'NY@TOR', pick: 'TOR +3.5', price: -110, push: true }] }];
const R = Gr.videoSpec({ beta: false, history: hist }, NOW, '2026-11-19', {});
T('no debate (the beta is off): yesterday\'s receipts instead, graded, in plain words', R && R.kind === 'receipts' && R.frames[1].rows.length === 3 && R.frames[1].rows[0].label === 'Buffalo Bills by 4+' && R.frames[1].rows[1].label === '5 or fewer goals' && R.frames[1].rows[1].res === 'L' && R.frames[2].gold === '1-1', JSON.stringify(R && R.frames[1]));
T('…also free of betting words', !/(\bbet|odds|units?\b|\bML\b|[+-]\d{3}\b|parlay)/i.test(words(R)), words(R));
T('nothing to show (no debate, under two graded calls yesterday): no video', Gr.videoSpec({ beta: false, history: [{ d: '2026-11-18', picks: [{ pick: 'A ML', hit: true }] }] }, NOW, '2026-11-19', {}) === null);
/* the encode */
const A = V.ffArgs(['a.png', 'b.png', 'c.png', 'd.png', 'e.png'], 'out.mp4'); const fc = A[A.indexOf('-filter_complex') + 1];
T('ffmpeg: four crossfades at 3.5, 7, 10.5 and 14 seconds (18 s for five frames), H.264, yuv420p, 30 fps, no sound, fast preset', (fc.match(/xfade/g) || []).length === 4 && /offset=3\.50/.test(fc) && /offset=14\.00/.test(fc) && /format=yuv420p/.test(fc) && A.includes('libx264') && A.includes('veryfast') && A.includes('-an') && A[A.length - 1] === 'out.mp4', fc);
const pngs = await V.renderFrames(S);
T('the frames render: five 1080×1920 PNGs', pngs && pngs.length === 5 && pngs.every(b => b.slice(1, 4).toString() === 'PNG' && b.readUInt32BE(16) === 1080 && b.readUInt32BE(20) === 1920));
const mp4 = V.encode(pngs);
const probe = mp4 ? (() => { const f = '/tmp/claude-0/-home-claude/12429b40-4b2e-5193-937c-60a0550c1741/scratchpad/video/test.mp4'; writeFileSync(f, mp4); return spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_name,width,height,pix_fmt', '-show_entries', 'format=duration', '-of', 'compact=p=0:nk=1', f], { encoding: 'utf8' }).stdout; })() : '';
T('…and encode to a real MP4 (H.264, 1080×1920, about 18 seconds)', mp4 && mp4.slice(4, 8).toString() === 'ftyp' && /h264\|1080\|1920\|yuv420p/.test(probe) && /18\.0/.test(probe), probe);
/* the send */
const sent = []; const fetchFake = async (u, o) => { const m = String(u).split('/').pop(); const fd = o && o.body; const get = k => fd && typeof fd.get === 'function' ? fd.get(k) : null;
  sent.push({ url: String(u), m, chat: get('chat_id'), caption: get('caption'), video: get('video') });
  if (m === 'getChatAdministrators') return { ok: true, json: async () => ({ ok: true, result: [{ status: 'administrator', user: { id: 1, is_bot: true } }, { status: 'creator', user: { id: 4242, is_bot: false } }] }) };
  return { ok: true, json: async () => ({ ok: true, result: { message_id: 9 } }) }; };
const logs = []; const ol = console.log; console.log = (...a) => { logs.push(a.join(' ')); };
let n = await V.main({ now: NOW, feed: { beta: true, board, social: { tg: 'https://t.me/TheDeskApp' } }, coach: null, fetch: fetchFake, encode: () => Buffer.from('fake-mp4') });
console.log = ol; const vids = sent.filter(x => x.m === 'sendVideo');
T('it finds the owner (the free channel\'s creator) and DMs the video with its caption, ready to post', n === 1 && vids.length === 1 && vids[0].chat === '4242' && /Today's video: the debate/.test(vids[0].caption) && /Caption:\n/.test(vids[0].caption) && vids[0].video, JSON.stringify(vids.map(v => [v.chat, (v.caption || '').slice(0, 60)])));
T('…only the owner unless VIDEO_TO says channel', !vids.some(v => v.chat === '@TheDeskApp'));
T('…and the bot token never reaches the logs', !logs.join('\n').includes('SECRET') && !logs.join('\n').includes('TESTTOKEN'), logs.join(' / '));
process.env.VIDEO_TO = 'channel'; sent.length = 0; n = await V.main({ now: NOW, feed: { beta: true, board, social: { tg: 'https://t.me/TheDeskApp' } }, coach: null, fetch: fetchFake, encode: () => Buffer.from('fake-mp4') }); delete process.env.VIDEO_TO;
T('VIDEO_TO=channel: the owner and the free channel', n === 2 && sent.filter(x => x.m === 'sendVideo').map(x => x.chat).sort().join(',') === '4242,@TheDeskApp');
/* the workflow */
const yml = readFileSync('/home/claude/work/.github/workflows/daily-video.yml', 'utf8');
T('the workflow: once a day (+ by hand), ffmpeg from apt, read-only, the bot token as its one secret', /cron: '40 16 \* \* \*'/.test(yml) && /workflow_dispatch/.test(yml) && /apt-get install[^\n]*ffmpeg/.test(yml) && /node autopilot\/video\.mjs/.test(yml) && /contents: read/.test(yml) && /secrets\.TG_BOT_TOKEN/.test(yml) && !/AUTOPILOT_KEY|GITHUB_TOKEN/.test(yml) && (yml.match(/secrets\./g) || []).length === 1);
console.log(`${pass} pass / ${fail} fail`); process.exit(fail ? 1 : 0);
