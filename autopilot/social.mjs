/* ═══ THE SOCIAL DESK (v2.98) ═══════════════════════════════════════════════════════════════════════════════════════
   Nov 8, 8:27 PM: "Send pictures of what it's saying in text attached to the post on Facebook and TG… forward to the
   Instagram account as well… TikTok, Threads etc." — X stays manual.

   Every public post the autopilot makes (an unlock 30 minutes before each game, results, the public recap, a cashed
   ticket, the daily lounge invite) is drawn once as a TheDesk card — 1080×1350, the portrait size every feed shows
   whole — and goes out with its words to:
     · Telegram   — the picture with the words as its caption (a long post: the picture, then the words)
     · Facebook   — a photo post on the page, the words as its message
     · Instagram  — the same picture (Instagram takes only pictures), the words as its caption
     · Threads    — the picture and the words (cut to Threads' 500 characters), or the words alone
   Instagram and Threads fetch the picture from a public address: the worker hands them the copy Facebook already holds,
   so nothing is stored anywhere new, and only what's already public. Each outlet is on only when its keys are set as repo
   secrets; a missing renderer or a dead outlet never stops the Telegram post. Tokens are masked and never printed.
     FB_PAGE_ID + FB_PAGE_TOKEN          Facebook page (the same token, re-made with Instagram's permissions, serves Instagram)
     IG_USER_ID                          the Instagram professional account connected to that page
     IG_KINDS (repo variable)            which posts Instagram gets: "unlock,recap,cash,invite,spotlight" unset (each result is
                                         in the recap — 20 posts a day would bury the feed), "all" for everything
     THREADS_TOKEN (+ THREADS_USER_ID)   Threads; the 60-day token is refreshed weekly by the worker and kept encrypted in
                                         its own file on the state branch (never in the card, never on the phone) */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const env = process.env;
const HERE = path.dirname(fileURLToPath(import.meta.url));
const log = (...a) => console.log('[autopilot]', ...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ── the card ──────────────────────────────────────────────────────────────────────────────────────────────────── */
let R = null;   /* the renderer, loaded once; false = not installed (posts go out as words) */
async function renderer() { if (R !== null) return R;
  try { const [{ default: satori }, { Resvg }, jpeg] = await Promise.all([import('satori'), import('@resvg/resvg-js'), import('jpeg-js')]);
    const f = (pkg, file) => readFileSync(path.join(HERE, 'node_modules', '@fontsource', pkg, 'files', file));
    const fonts = [{ name: 'Archivo', data: f('archivo', 'archivo-latin-800-normal.woff'), weight: 800, style: 'normal' }, { name: 'Archivo', data: f('archivo', 'archivo-latin-900-normal.woff'), weight: 900, style: 'normal' },
      { name: 'Plex', data: f('ibm-plex-sans', 'ibm-plex-sans-latin-400-normal.woff'), weight: 400, style: 'normal' }, { name: 'Plex', data: f('ibm-plex-sans', 'ibm-plex-sans-latin-600-normal.woff'), weight: 600, style: 'normal' }];
    R = { satori, Resvg, jpeg: jpeg.default || jpeg, fonts }; } catch (e) { log('social: no picture renderer —', String(e && e.message || e).slice(0, 60)); R = false; }
  return R; }
const h = (type, style, ...children) => ({ type, props: { style: { display: 'flex', ...style }, children: children.flat().filter(c => c != null && c !== false && c !== '') } });
const C = { bg: '#0A0D12', panel: '#121821', rule: '#243042', ink: '#EEF2F7', soft: '#C9D2DE', mute: '#8D9AAE', gold: '#F2C94C', gold2: '#C9A227', win: '#3DDC84', loss: '#FF6B5B', push: '#8D9AAE' };
const PILL = { W: ['WIN', C.win], L: ['LOSS', C.loss], P: ['PUSH', C.push] };
/* the card's fonts are Latin only: emoji and symbols are dropped, arrows become a dot */
export const txt = s => String(s ?? '').replace(/[←-⇿]/g, '·').replace(/[^ -ɏ‐-‧‰-⁞−]/g, '').replace(/\s{2,}/g, ' ').trim();
const clip = (s, n) => { s = txt(s); return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s; };
/* rows fit by measure: three densities, then "+N more" (the words under the picture always carry the full list) */
const DENS = { normal: { pitch: 164, gap: 20, pad: '26px 30px', lab: 42, meta: 26, cl: [32, 28], cm: 56 }, dense: { pitch: 128, gap: 14, pad: '18px 26px', lab: 34, meta: 22, cl: [38, 34], cm: 64 }, tight: { pitch: 103, gap: 10, pad: '12px 24px', lab: 30, meta: 20, cl: [42, 38], cm: 72 } };
export function layout(card) { const title = txt(card.title); let fs = title.length <= 16 ? 86 : title.length <= 22 ? 70 : 56, tl = 30, lines = 1;
  /* v2.99 · a question card (wrap) lets its headline run two big lines */
  if (card.wrap) { fs = title.length <= 18 ? 86 : 74; const cpl = Math.floor(940 / (fs * 0.56)); tl = cpl * 2; lines = title.length > cpl ? 2 : 1; }
  const top = 292 + fs * 1.04 * lines + (card.sub ? 58 : 0) + (card.big ? 163 : 0), room = 1185 - top; const all = (card.rows || []).filter(r => r && r.label);
  for (const k of ['normal', 'dense', 'tight']) { const D = DENS[k]; const fit = Math.floor((room + D.gap) / D.pitch); if (all.length <= fit) return { fs, tl, dens: k, rows: all, more: 0 }; }
  const fit = Math.max(1, Math.floor((room - 44 + DENS.tight.gap) / DENS.tight.pitch)); return { fs, tl, dens: 'tight', rows: all.slice(0, fit), more: all.length - fit }; }
export const loungeUrl = deps => (deps?.lounge || env.LOUNGE_URL || '').trim() || 'https://t.me/TheDeskLounge';
/* a card = { kicker, title, sub?, big?: { value, label }, rows: [{ label, meta?, res?: 'W'|'L'|'P', lock?: a locked leg }], foot? } */
export function cardTree(card, deps) { const L = layout(card), D = DENS[L.dens];
  return h('div', { width: 1080, height: 1350, flexDirection: 'column', background: C.bg, color: C.ink, fontFamily: 'Plex', padding: '64px 70px 56px', position: 'relative' },
    h('div', { position: 'absolute', left: 0, top: 0, width: 1080, height: 14, background: `linear-gradient(90deg, ${C.gold2}, ${C.gold} 45%, ${C.bg} 90%)` }),
    h('div', { position: 'absolute', right: -260, top: -300, width: 820, height: 820, borderRadius: 410, background: 'radial-gradient(circle, rgba(242,201,76,0.22), rgba(242,201,76,0) 65%)' }),
    h('div', { alignItems: 'center', gap: 18 },
      h('div', { width: 64, height: 64, borderRadius: 16, background: `linear-gradient(135deg, ${C.gold}, ${C.gold2})`, color: C.bg, fontFamily: 'Archivo', fontWeight: 900, fontSize: 28, alignItems: 'center', justifyContent: 'center' }, 'TD'),
      h('div', { fontFamily: 'Archivo', fontWeight: 900, fontSize: 30, letterSpacing: 2 }, 'THEDESK')),
    h('div', { marginTop: 70, fontSize: 26, fontWeight: 600, letterSpacing: 6, color: C.gold }, clip(card.kicker, 40).toUpperCase()),
    h('div', { marginTop: 14, fontFamily: 'Archivo', fontWeight: 900, fontSize: L.fs, lineHeight: 1.04, letterSpacing: -2 }, clip(card.title, L.tl)),
    card.sub ? h('div', { marginTop: 18, fontSize: 30, color: C.soft, lineHeight: 1.35 }, clip(card.sub, 58)) : null,
    card.big ? h('div', { marginTop: 40, alignItems: 'baseline', gap: 22 }, h('div', { fontFamily: 'Archivo', fontWeight: 900, fontSize: 150, color: C.gold, lineHeight: 1 }, clip(card.big.value, 9)), h('div', { fontSize: 32, color: C.mute }, clip(card.big.label, 34))) : null,
    h('div', { flexDirection: 'column', gap: D.gap, marginTop: 44 },
      L.rows.map(r => h('div', { alignItems: 'center', gap: 24, background: C.panel, border: `2px solid ${C.rule}`, borderLeft: `8px solid ${PILL[r.res] ? PILL[r.res][1] : r.lock ? '#3A4A60' : C.gold}`, borderRadius: 22, padding: D.pad },
        h('div', { flexDirection: 'column', flexGrow: 1, flexShrink: 1 },
          h('div', { fontFamily: 'Archivo', fontWeight: 800, fontSize: D.lab, lineHeight: 1.1, color: r.lock ? C.mute : C.ink }, clip(r.label, D.cl[PILL[r.res] ? 1 : 0])),
          r.meta ? h('div', { marginTop: 6, fontSize: D.meta, color: C.mute }, clip(r.meta, D.cm)) : null),
        PILL[r.res] ? h('div', { fontFamily: 'Archivo', fontWeight: 900, fontSize: 24, letterSpacing: 2, color: C.bg, background: PILL[r.res][1], borderRadius: 14, padding: '9px 16px' }, PILL[r.res][0]) : null)),
      L.more ? h('div', { fontSize: 24, color: C.mute, paddingLeft: 8 }, `+${L.more} more in the post`) : null),
    h('div', { position: 'absolute', left: 70, right: 70, bottom: 52, justifyContent: 'space-between', alignItems: 'flex-end', borderTop: `2px solid ${C.rule}`, paddingTop: 22 },
      h('div', { flexDirection: 'column' }, h('div', { fontSize: 26, fontWeight: 600, color: C.ink }, clip(card.foot || 'Talk sports with us: ' + loungeUrl(deps).replace(/^https?:\/\//, ''), 50)), h('div', { marginTop: 6, fontSize: 21, color: C.mute }, 'Every pick locked before the games, graded at the final')),
      h('div', { fontSize: 21, color: C.mute }, '21+ · bet responsibly'))); }
/* → { png, jpg } buffers, or null when there's no renderer */
export async function renderCard(card, deps) { const r = await renderer(); if (!r || !card) return null;
  try { const svg = await r.satori(cardTree(card, deps), { width: 1080, height: 1350, fonts: r.fonts });
    const img = new r.Resvg(svg, { fitTo: { mode: 'width', value: 1080 } }).render(); const png = Buffer.from(img.asPng());
    const jpg = Buffer.from(r.jpeg.encode({ data: Buffer.from(img.pixels), width: img.width, height: img.height }, 90).data); return { png, jpg }; }
  catch (e) { log('social: card failed —', String(e && e.message || e).slice(0, 80)); return null; } }

/* ── words for each outlet ─────────────────────────────────────────────────────────────────────────────────────── */
export const plain = html => String(html || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/\n{3,}/g, '\n\n').trim();
export const foot = deps => `\n\n💬 We talk sports in TheDesk's free Telegram lounge… not just picks. Pull up → ${loungeUrl(deps)}`;
const cut = (s, n) => s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…';

/* ── the outlets ───────────────────────────────────────────────────────────────────────────────────────────────── */
const SOC = { thTok: '' };   /* the worker's own memory for Threads (its refreshed token), loaded from social.enc */
export const useSocial = S => { SOC.thTok = (S && S.thTok) || ''; if (SOC.thTok && env.GITHUB_ACTIONS === 'true') console.log('::add-mask::' + SOC.thTok); };
const cfg = deps => { const v = (env.FB_GRAPH_VERSION || 'v24.0').trim();
  return { fb: deps?.fb || { page: (env.FB_PAGE_ID || '').trim(), tok: (env.FB_PAGE_TOKEN || '').trim(), v },
    ig: deps?.ig || { user: (env.IG_USER_ID || '').trim(), tok: (env.IG_TOKEN || env.FB_PAGE_TOKEN || '').trim(), v, kinds: (env.IG_KINDS || '').trim() },
    th: deps?.th || { user: (env.THREADS_USER_ID || '').trim() || 'me', tok: SOC.thTok || (env.THREADS_TOKEN || '').trim() } }; };
export const on = (deps, which) => { const c = cfg(deps)[which]; return which === 'fb' ? !!(c.page && c.tok) : which === 'ig' ? !!(c.user && c.tok) : which === 'th' ? !!c.tok : false; };
export const anyOn = deps => on(deps, 'fb') || on(deps, 'ig') || on(deps, 'th');
export const igWants = (kind, deps) => { const k = (cfg(deps).ig.kinds || 'unlock,recap,cash,invite,spotlight,drop').toLowerCase(); return k === 'all' || k.split(/[\s,]+/).includes(String(kind || '').toLowerCase()); };
if (env.GITHUB_ACTIONS === 'true') for (const t of [env.FB_PAGE_TOKEN, env.IG_TOKEN, env.THREADS_TOKEN]) if ((t || '').trim()) console.log('::add-mask::' + t.trim());
const KNOWN = new Set();   /* every token this run has used: each log line is scrubbed of all of them, not just its own */
const hide = (s, toks) => { s = String(s || ''); for (const t of toks) if (t) KNOWN.add(t); for (const t of [...KNOWN, env.TG_BOT_TOKEN, env.FB_PAGE_TOKEN, env.IG_TOKEN, env.THREADS_TOKEN, SOC.thTok]) if (t && String(t).trim().length > 3) s = s.split(String(t).trim()).join('…'); return s; };
async function call(F, url, body, toks, what) { toks.forEach(t => t && KNOWN.add(t)); try { const r = await F(url, body ? { method: 'POST', body } : {}); let j = {}; try { j = await r.json(); } catch (e) { }
    if (!r.ok || (j && j.error)) { log(what + ':', r.status, hide((j && j.error && (j.error.message || j.error.description)) || (j && j.description) || '', toks).slice(0, 90)); return null; } return j || {}; }
  catch (e) { log(what + ':', hide(e && e.message || e, toks).slice(0, 60)); return null; } }
const form = o => { const f = new FormData(); for (const [k, v] of Object.entries(o)) { if (v == null) continue; if (v.buf) f.append(k, new Blob([v.buf], { type: v.type }), v.name); else f.append(k, String(v)); } return f; };

/* Telegram: the picture with the words as its caption (a caption holds 1024 characters; a longer post sends the words after) */
export async function tgPhoto(token, chat, img, html, deps) { if (!token || !img) return false; const F = deps?.fetch || fetch; const url = m => `https://api.telegram.org/bot${token}/${m}`;
  const fits = html.length <= 1000; const j = await call(F, url('sendPhoto'), form({ chat_id: chat, photo: { buf: img.png, type: 'image/png', name: 'thedesk.png' }, caption: fits ? html : html.split('\n')[0], parse_mode: 'HTML' }), [token], 'telegram photo');
  if (!j) return false; if (!fits) await call(F, url('sendMessage'), new URLSearchParams({ chat_id: chat, text: html, parse_mode: 'HTML', disable_web_page_preview: 'true' }), [token], 'telegram text');
  return true; }
/* Facebook: a photo post (a text post when there's no picture); hands back the picture's public address */
export async function fbSend(html, img, deps, opt) { const c = cfg(deps).fb; if (!c.page || !c.tok) return null; const F = deps?.fetch || fetch; const G = `https://graph.facebook.com/${c.v || 'v24.0'}`;
  const message = plain(html) + (opt && opt.bare ? '' : foot(deps));
  const words = async () => { const j = await call(F, `${G}/${encodeURIComponent(c.page)}/feed`, new URLSearchParams({ message, access_token: c.tok }), [c.tok], 'facebook'); if (j) log('facebook ✓', message.split('\n')[0].slice(0, 70)); return j ? { ok: true, url: null, id: j.id || null } : null; };
  if (!img) return words();
  const j = await call(F, `${G}/${encodeURIComponent(c.page)}/photos`, form({ source: { buf: img.jpg, type: 'image/jpeg', name: 'thedesk.jpg' }, message, published: 'true', access_token: c.tok }), [c.tok], 'facebook photo');
  if (!j) { log('facebook: the picture didn\'t take — posting the words'); return words(); } log('facebook ✓ photo ·', message.split('\n')[0].slice(0, 64));
  let url = null; if (j.id) { const g = await call(F, `${G}/${j.id}?fields=images&access_token=${encodeURIComponent(c.tok)}`, null, [c.tok], 'facebook picture'); url = (g && g.images && g.images[0] && g.images[0].source) || null; }
  return { ok: true, url, id: j.post_id || j.id || null }; }
/* v2.99 · how many reactions a page post has (the "100 reactions and we drop the card" goal) — null when unknown */
export async function fbReactions(id, deps) { const c = cfg(deps).fb; if (!c.page || !c.tok || !id) return null; const F = deps?.fetch || fetch;
  const j = await call(F, `https://graph.facebook.com/${c.v || 'v24.0'}/${id}?fields=reactions.summary(total_count).limit(0)&access_token=${encodeURIComponent(c.tok)}`, null, [c.tok], 'facebook reactions');
  const n = j && j.reactions && j.reactions.summary && j.reactions.summary.total_count; return Number.isFinite(+n) ? +n : null; }
/* Instagram: a picture post from that public address, the words as its caption (Instagram's links don't click: the lounge goes by name) */
export async function igSend(html, imgUrl, deps, opt) { const c = cfg(deps).ig; if (!c.user || !c.tok || !imgUrl) return false; const F = deps?.fetch || fetch; const w = deps?.wait || sleep; const G = `https://graph.facebook.com/${c.v || 'v24.0'}`;
  const caption = cut(plain(html) + (opt && opt.bare ? '' : `\n\n💬 We talk sports in TheDesk's free Telegram lounge… not just picks. Link in bio · ${loungeUrl(deps).replace(/^https?:\/\//, '')}`) + '\n\n#TheDesk #sportspicks #sportsbetting', 2150);
  const m = await call(F, `${G}/${encodeURIComponent(c.user)}/media`, new URLSearchParams({ image_url: imgUrl, caption, access_token: c.tok }), [c.tok], 'instagram'); if (!m || !m.id) return false;
  for (let i = 0; i < 6; i++) { const s = await call(F, `${G}/${m.id}?fields=status_code&access_token=${encodeURIComponent(c.tok)}`, null, [c.tok], 'instagram status'); if (s && s.status_code === 'FINISHED') break; if (s && s.status_code === 'ERROR') { log('instagram: the picture was refused'); return false; } await w(3000); }
  const p = await call(F, `${G}/${encodeURIComponent(c.user)}/media_publish`, new URLSearchParams({ creation_id: m.id, access_token: c.tok }), [c.tok], 'instagram publish'); if (p) log('instagram ✓', caption.split('\n')[0].slice(0, 70)); return !!p; }
/* Threads: the picture and the words (500 characters), or the words alone */
export async function thSend(html, imgUrl, deps, opt) { const c = cfg(deps).th; if (!c.tok) return false; const F = deps?.fetch || fetch; const w = deps?.wait || sleep; const B = 'https://graph.threads.net/v1.0';
  const tail = opt && opt.bare ? '' : `\n\n💬 Talk sports with us → ${loungeUrl(deps)}`; const text = cut(plain(html), 495 - tail.length) + tail;
  const q = imgUrl ? { media_type: 'IMAGE', image_url: imgUrl, text, access_token: c.tok } : { media_type: 'TEXT', text, access_token: c.tok };
  const m = await call(F, `${B}/${encodeURIComponent(c.user)}/threads`, new URLSearchParams(q), [c.tok], 'threads'); if (!m || !m.id) return false;
  for (let i = 0; i < 6; i++) { const s = await call(F, `${B}/${m.id}?fields=status&access_token=${encodeURIComponent(c.tok)}`, null, [c.tok], 'threads status'); if (!s || s.status === 'FINISHED' || !s.status) break; if (s.status === 'ERROR' || s.status === 'EXPIRED') { log('threads: the post was refused'); return false; } await w(5000); }
  const p = await call(F, `${B}/${encodeURIComponent(c.user)}/threads_publish`, new URLSearchParams({ creation_id: m.id, access_token: c.tok }), [c.tok], 'threads publish'); if (p) log('threads ✓', text.split('\n')[0].slice(0, 70)); return !!p; }
/* Threads' long-lived token lasts 60 days: refreshed once a week into the worker's own encrypted file. A new THREADS_TOKEN
   secret (it changed since the worker last refreshed) takes over from the stored one. Returns true when S changed. */
export const seedOf = t => t ? createHash('sha256').update(t).digest('hex').slice(0, 16) : '';
export async function thRefresh(S, deps) { const envTok = (deps?.thSeed ?? env.THREADS_TOKEN ?? '').trim(); const now = deps?.now || Date.now(); let changed = false;
  if (envTok && S.seed !== seedOf(envTok)) { S.seed = seedOf(envTok); S.thTok = envTok; S.thAt = 0; changed = true; }
  if (!S.thTok) return changed; useSocial(S);
  if (S.thAt && now - S.thAt < 7 * 864e5) return changed; const F = deps?.fetch || fetch;
  const j = await call(F, `https://graph.threads.net/refresh_access_token?grant_type=th_refresh_token&access_token=${encodeURIComponent(S.thTok)}`, null, [S.thTok], 'threads token');
  if (j && j.access_token) { S.thTok = j.access_token; S.thAt = now; useSocial(S); log('threads token refreshed · good for', Math.round((+j.expires_in || 5184000) / 864e2), 'days'); }
  else S.thAt = now - 6 * 864e5;   /* try again tomorrow (a token under a day old can't refresh yet) */
  return true; }

/* ── one post to every outlet that's on. done = what already has it (retries skip those). Each value: true posted,
   false tried and missed (retry next pass), 'skip' won't go there (Instagram without a picture, or not a kind it takes). */
export async function mirror(html, img, deps, opt = {}, done = {}) { const out = {}; let url = null;
  if (on(deps, 'fb') && !done.fb) { const r = await fbSend(html, img, deps, opt); out.fb = !!r; url = (r && r.url) || null; out.fbId = (r && r.id) || null; }
  if (opt.only === 'fb') return out;   /* v2.99 · a Facebook-only post (the reactions goal lives there) */
  if (on(deps, 'ig') && !done.ig) out.ig = !igWants(opt.kind, deps) ? 'skip' : url ? await igSend(html, url, deps, opt) : (done.fb || !on(deps, 'fb') || (out.fb && !img)) ? 'skip' : false;
  if (on(deps, 'th') && !done.th) out.th = await thSend(html, url, deps, opt);
  return out; }
