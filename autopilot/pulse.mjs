/* TheDesk · the pulse (v88): the public card in a few hundred bytes, for device alerts and widgets. Built from exactly what the public
   page shows (publicView: sealed picks stay sealed until 30 minutes before their games), posted to the chat worker's Push object, which
   turns what changed into alerts and serves it at /pulse (the iPhone widget, the pop-out, the overlay read that, not the 1.5 MB page).
   The key is an HMAC of the owner code (the code itself never leaves GitHub's secrets); no code set, no pulse. */
import { createHmac } from 'node:crypto';
export const pushKey = code => createHmac('sha256', String(code)).update('thedesk-push-v1').digest('hex');
const amOf = dec => { const d = +dec; if (!isFinite(d) || d <= 1) return ''; const a = d >= 2 ? Math.round((d - 1) * 100) : Math.round(-100 / (d - 1)); return (a > 0 ? '+' : '−') + Math.abs(a).toLocaleString('en-US'); };
const res = x => x.push ? 'push' : x.hit === true ? 'win' : x.hit === false ? 'loss' : null;
const tms = v => { const t = typeof v === 'number' ? v : Date.parse(v || ''); return isFinite(t) ? t : null; };
export function pulseOf(V, now = Date.now()) {
  const F = V || {}, T = F.today || {}, R = F.record || {};
  const one = (x, i) => x.hidden ? { i, sp: x.sp, sealed: 1, start: x.start || '', opens: tms(x.unlockAt) || (tms(x.start) ? tms(x.start) - 30 * 60e3 : null) }
    : { i, sp: x.sp, pick: String(x.pick || (x.player ? `${x.player} ${x.thr != null ? x.thr + '+ ' : ''}${x.stat || ''}` : '')).trim().slice(0, 80), price: isFinite(+x.price) && +x.price ? +x.price : null, game: String(x.game || '').slice(0, 24), start: x.start || '', res: res(x), who: (x.calls || []).filter(c => c && c.with && c.v).map(c => String(c.v).slice(0, 24)).slice(0, 8) };
  const ls = (((F.founder || {}).tix) || []).slice(0, 4).map(t => ({ id: String(t.id || ''), name: String(t.name || 'LongShot').slice(0, 40), n: (t.legs || []).length, hit: (t.legs || []).filter(l => l.st === 'hit').length, res: t.res || 'open', odds: amOf(t.dec) }));
  const heirs = (F.characters || []).filter(c => c && c.kid && T.d && String(c.kid.born || '').slice(0, 10) === T.d).map(c => String(c.name)).slice(0, 5);
  return { v: 1, day: T.d || null, locked: tms(T.lockedAt) || (T.lockedAt ? 1 : null), beta: F.beta === true, rec: { w: R.w || 0, l: R.l || 0, pu: R.pu || 0, u: +(+R.u || 0).toFixed(2), first: R.first || null },
    picks: (T.picks || []).slice(0, 5).map(one), props: (T.props || []).slice(0, 3).map(one), ls, heirs, ts: now };
}
let LAST = '';   /* the last pulse this run sent (the relay loop checks every 75 seconds; the worker also ignores a pulse it already has) */
export async function pulseSend(V, sig, now, deps, env) { const code = deps && 'pushCode' in deps ? deps.pushCode : String((env && env.CHAT_ADMIN_CODE) || '').trim(); if (!code || !V || !V.today || LAST === sig) return 0;
  const url = String((env && env.PUSH_URL) || 'https://thedesk-chat.ironsilkstrategies.workers.dev').replace(/\/$/, '') + '/push/pulse', F = (deps && deps.fetch) || fetch;
  try { const r = await F(url, { method: 'POST', headers: { 'content-type': 'application/json', 'x-push-key': pushKey(code), 'user-agent': 'thedesk-autopilot' }, body: JSON.stringify({ sig, pulse: pulseOf(V, now) }) });
    if (r.ok) { LAST = sig; return 1; } console.log('[autopilot] pulse: HTTP', r.status); } catch (e) { console.log('[autopilot] pulse:', String((e && e.message) || e).slice(0, 60)); } return 0; }
