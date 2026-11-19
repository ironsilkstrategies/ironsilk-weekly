/* ═══ THE DAILY VIDEO (v3.3, Nov 19) ═════════════════════════════════════════════════════════════════════════════
   The growth playbook's noon slot: "the daily 20-second vertical video, rendered from the debate cards — the noon video becomes
   a review, not a shoot." Once a day (its own workflow, .github/workflows/daily-video.yml) this draws a 1080×1920 video:
     · the day's debate when the board has one (the open beta), worded as sports talk so TikTok doesn't read it as gambling
       (no odds, no lines, no "bet", no units) — or yesterday's receipts from the public record
     · 4–5 frames, 4 seconds each, crossfaded (ffmpeg: H.264, 30 fps, no sound — TikTok, Reels and Shorts add music in-app)
   and DMs it to the owner with a caption, ready to post to TikTok, Reels and Shorts. VIDEO_TO=channel also posts it on the free
   channel. Only public data (the public picks.json and the public feeds); the bot token is the only secret, never printed. */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as Soc from './social.mjs';
import * as Gr from './growth.mjs';
const env = process.env, log = (...a) => console.log('[video]', ...a);
const TOKEN = () => (env.TG_BOT_TOKEN || '').trim();
if (TOKEN() && env.GITHUB_ACTIONS === 'true') console.log('::add-mask::' + TOKEN());
const SITE = String(env.STATE_REPO || 'ironsilkstrategies/ironsilk-weekly-site').trim(), FEEDS = 'https://raw.githubusercontent.com/ironsilkstrategies/ironsilk-weekly/feeds/';
export const chicagoDay = now => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date((now || Date.now()) - 5 * 36e5));

/* ── the frames: TheDesk's look (the picture cards' colors and type), stood up for a phone, text kept clear of the
   bottom quarter and the right edge where TikTok and Reels put their buttons and captions ── */
const C = { bg: '#0A0D12', panel: '#121821', rule: '#243042', ink: '#EEF2F7', soft: '#C9D2DE', mute: '#8D9AAE', gold: '#F2C94C', gold2: '#C9A227', win: '#3DDC84', loss: '#FF6B5B', push: '#8D9AAE' };
const h = (type, style, ...children) => ({ type, props: { style: { display: 'flex', ...style }, children: children.flat().filter(c => c != null && c !== false && c !== '') } });
const clip = (s, n) => { s = Soc.txt(s); return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s; };
const fit = (s, big, mid, small) => { const n = Soc.txt(s).length; return n <= 12 ? big : n <= 22 ? mid : small; };
const PILL = { W: ['WIN', C.win], L: ['LOSS', C.loss], P: ['PUSH', C.push] };
export function frameTree(f, i, n) {
  const body = f.k === 'hook' ? [h('div', { fontFamily: 'Archivo', fontWeight: 900, fontSize: fit(f.big, 150, 124, 104), lineHeight: 1.02, letterSpacing: -3 }, clip(f.big, 48)), f.sub ? h('div', { marginTop: 40, fontSize: 46, color: C.soft, lineHeight: 1.3 }, clip(f.sub, 70)) : null]
    : f.k === 'side' ? [h('div', { fontFamily: 'Archivo', fontWeight: 900, fontSize: fit(f.big, 132, 108, 88), lineHeight: 1.04, letterSpacing: -2 }, clip(f.big, 34)), h('div', { marginTop: 34, fontSize: 48, color: C.soft }, clip(f.mid, 30)),
      h('div', { marginTop: 18, fontFamily: 'Archivo', fontWeight: 900, fontSize: fit(f.gold, 120, 96, 78), color: C.gold, lineHeight: 1.06, letterSpacing: -2 }, clip(f.gold, 40)), f.small ? h('div', { marginTop: 40, fontSize: 38, color: C.mute }, clip(f.small, 60)) : null]
    : f.k === 'count' ? [h('div', { fontFamily: 'Archivo', fontWeight: 900, fontSize: 250, color: C.gold, lineHeight: 1, letterSpacing: -6 }, clip(f.gold, 9)), f.sub ? h('div', { marginTop: 34, fontSize: 52, color: C.soft, lineHeight: 1.3 }, clip(f.sub, 60)) : null]
    : f.k === 'list' ? [h('div', { flexDirection: 'column', gap: 22 }, (f.rows || []).map(r => h('div', { alignItems: 'center', gap: 26, background: C.panel, border: `2px solid ${C.rule}`, borderLeft: `10px solid ${PILL[r.res] ? PILL[r.res][1] : C.gold}`, borderRadius: 26, padding: '26px 30px' },
        h('div', { flexDirection: 'column', flexGrow: 1, flexShrink: 1 }, h('div', { fontFamily: 'Archivo', fontWeight: 800, fontSize: 46, lineHeight: 1.1 }, clip(r.label, 30)), r.meta ? h('div', { marginTop: 8, fontSize: 30, color: C.mute }, clip(r.meta, 40)) : null),
        PILL[r.res] ? h('div', { fontFamily: 'Archivo', fontWeight: 900, fontSize: 30, letterSpacing: 2, color: C.bg, background: PILL[r.res][1], borderRadius: 16, padding: '12px 20px' }, PILL[r.res][0]) : null))),
      f.more ? h('div', { marginTop: 22, fontSize: 32, color: C.mute }, `+${f.more} more on the app`) : null]
    : [h('div', { fontFamily: 'Archivo', fontWeight: 900, fontSize: fit(f.big, 140, 118, 100), lineHeight: 1.04, letterSpacing: -3 }, clip(f.big, 48)), f.sub ? h('div', { marginTop: 44, fontSize: 52, fontWeight: 600, color: C.gold }, clip(f.sub, 40)) : null];
  return h('div', { width: 1080, height: 1920, flexDirection: 'column', background: C.bg, color: C.ink, fontFamily: 'Plex', padding: '120px 150px 0 84px', position: 'relative' },
    h('div', { position: 'absolute', left: 0, top: 0, width: 1080, height: 18, background: `linear-gradient(90deg, ${C.gold2}, ${C.gold} 45%, ${C.bg} 90%)` }),
    h('div', { position: 'absolute', right: -320, top: -260, width: 1000, height: 1000, borderRadius: 500, background: 'radial-gradient(circle, rgba(242,201,76,0.20), rgba(242,201,76,0) 65%)' }),
    h('div', { alignItems: 'center', gap: 22 },
      h('div', { width: 84, height: 84, borderRadius: 22, background: `linear-gradient(135deg, ${C.gold}, ${C.gold2})`, color: C.bg, fontFamily: 'Archivo', fontWeight: 900, fontSize: 36, alignItems: 'center', justifyContent: 'center' }, 'TD'),
      h('div', { fontFamily: 'Archivo', fontWeight: 900, fontSize: 40, letterSpacing: 3 }, 'THEDESK')),
    h('div', { marginTop: 230, fontSize: 36, fontWeight: 600, letterSpacing: 8, color: C.gold }, clip(f.kicker, 30).toUpperCase()),
    h('div', { marginTop: 30, flexDirection: 'column' }, body),
    h('div', { position: 'absolute', left: 84, right: 150, top: 1380, alignItems: 'center', gap: 14 }, ...Array.from({ length: n }, (_, j) => h('div', { width: j === i ? 64 : 22, height: 10, borderRadius: 5, background: j === i ? C.gold : C.rule }))),
    h('div', { position: 'absolute', left: 84, top: 1426, fontSize: 30, color: C.mute }, 'For entertainment · 21+'));
}
export async function renderFrames(spec, deps) { const R = deps?.renderer ? await deps.renderer() : await Soc.renderer(); if (!R) return null; const out = [];
  for (let i = 0; i < spec.frames.length; i++) { const svg = await R.satori(frameTree(spec.frames[i], i, spec.frames.length), { width: 1080, height: 1920, fonts: R.fonts });
    out.push(Buffer.from(new R.Resvg(svg, { fitTo: { mode: 'width', value: 1080 } }).render().asPng())); }
  return out; }
/* each frame d seconds, crossfades of t: total n·d − (n−1)·t (5 frames → 18 s) */
export function ffArgs(files, out, d = 4, t = 0.5) { const a = ['-y', '-loglevel', 'error']; for (const f of files) a.push('-framerate', '30', '-loop', '1', '-t', String(d), '-i', f);
  let fc = '', last = '[0:v]'; for (let i = 1; i < files.length; i++) { const lab = `[v${i}]`; fc += `${last}[${i}:v]xfade=transition=fade:duration=${t}:offset=${(i * (d - t)).toFixed(2)}${lab};`; last = lab; }
  fc += `${last}format=yuv420p[out]`; a.push('-filter_complex', fc, '-map', '[out]', '-r', '30', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '22', '-movflags', '+faststart', '-an', out); return a; }
export function encode(pngs, opt = {}) { const dir = mkdtempSync(path.join(os.tmpdir(), 'tdv-'));
  try { const files = pngs.map((b, i) => { const f = path.join(dir, `f${i}.png`); writeFileSync(f, b); return f; }), mp4 = path.join(dir, 'out.mp4');
    const r = spawnSync(opt.ffmpeg || env.FFMPEG_PATH || 'ffmpeg', ffArgs(files, mp4, opt.dur, opt.fade), { encoding: 'utf8' }); if (r.status !== 0) { log('ffmpeg failed:', String(r.stderr || (r.error && r.error.message) || '').slice(0, 200)); return null; }
    return readFileSync(mp4); } finally { rmSync(dir, { recursive: true, force: true }); } }

/* ── Telegram (the bot token in the URL is the only secret; replies never echo it) ── */
async function tg(method, form, F) { try { const r = await (F || fetch)(`https://api.telegram.org/bot${TOKEN()}/${method}`, { method: 'POST', body: form }); const j = await r.json().catch(() => ({})); return j && j.ok ? j : null; } catch (e) { return null; } }
const form = o => { const fd = new FormData(); for (const [k, v] of Object.entries(o)) fd.append(k, v); return fd; };
async function owners(chats, F) { const ids = new Set(); for (const c of chats) { const r = await tg('getChatAdministrators', form({ chat_id: c }), F); const cr = r && (r.result || []).find(x => x && x.status === 'creator' && x.user && !x.user.is_bot); if (cr) ids.add(String(cr.user.id)); } return [...ids]; }
async function sendVideo(chat, mp4, caption, F) { const fd = form({ chat_id: String(chat), caption: String(caption).slice(0, 1024), supports_streaming: 'true', width: '1080', height: '1920' }); fd.append('video', new Blob([mp4], { type: 'video/mp4' }), 'thedesk-daily.mp4'); return !!(await tg('sendVideo', fd, F)); }
const getJSON = async (u, F) => { try { const r = await (F || fetch)(u, { headers: { 'User-Agent': 'thedesk-video' } }); return r.ok ? await r.json() : null; } catch (e) { return null; } };

export async function main(deps = {}) { const now = deps.now || Date.now(), today = chicagoDay(now), F = deps.fetch;
  if (!TOKEN() && !deps.fetch) { log('TG_BOT_TOKEN not set — nothing to do'); return 0; }
  const feed = deps.feed || await getJSON(`https://raw.githubusercontent.com/${SITE}/main/public/picks.json?t=${Math.floor(now / 6e5)}`, F); if (!feed) { log('couldn\'t read the public page'); return 0; }
  const coach = 'coach' in deps ? deps.coach : await getJSON(FEEDS + 'coach.json', F);
  const spec = Gr.videoSpec(feed, now, today, { app: env.APP_URL || feed.home || '', coach }); if (!spec) { log('nothing to show today (no debate on the board, under two graded calls yesterday)'); return 0; }
  const pngs = await renderFrames(spec, deps); if (!pngs) { log('no picture renderer installed'); return 0; }
  const mp4 = (deps.encode || encode)(pngs); if (!mp4) return 0; log('video ·', spec.kind, '·', spec.title, '·', (mp4.length / 1e6).toFixed(2), 'MB ·', spec.frames.length, 'frames');
  const chan = ((feed.social && feed.social.tg) || '').match(/t\.me\/([A-Za-z0-9_]{4,})/); const chanAt = chan ? '@' + chan[1] : null;
  const ids = String(env.VIDEO_OWNER_ID || '').split(/[\s,]+/).filter(x => /^\d{3,20}$/.test(x)); const who = ids.length ? ids : await owners([chanAt].filter(Boolean), F);
  const cap = `🎬 Today's video: ${spec.kind === 'debate' ? 'the debate' : 'yesterday\'s receipts'} (${spec.title}). Save it, then post it to TikTok, Reels and Shorts.\n\nCaption:\n${spec.caption}`;
  let sent = 0; for (const id of who) if (await sendVideo(id, mp4, cap, F)) sent++;
  if (/channel/.test(String(env.VIDEO_TO || '').toLowerCase()) && chanAt && await sendVideo(chanAt, mp4, spec.caption, F)) sent++;
  log(sent ? `sent to ${sent} chat(s)` : 'couldn\'t send it (has the owner pressed Start on the bot?)'); return sent; }
if (import.meta.url === 'file://' + process.argv[1]) main().then(() => process.exit(0)).catch(e => { log('failed:', String(e && e.message || e).slice(0, 160)); process.exit(1); });
