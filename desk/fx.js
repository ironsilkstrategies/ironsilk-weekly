/* TheDesk · FX (v88) — Noah's layer over the felt, directed with Evan Cross (motion), Malik Grant (when to celebrate, and when not to),
   Miles Rowan (the cues and the words), Diamanté Crossfield (the bar), Jordan Vale (alerts, the widget, the overlay) and Ashley Wu (claims).
   Sound is synthesized right here (nothing downloads, nothing to license); haptics where the phone allows; foil, tilt, the seal break and
   the stamp burst; a constellation for every character (an heir's stars come from both parents); and the bell's sheet: alerts, sound and
   feel, and My Desk (the widget). The app loads this once it's up; ?fx=0 never loads it, and the app is the same app without it.
   Malik's rules: a win gets gold, a loss gets an honest stamp and a low note (never hidden, never an "almost!"), and nothing nags. */
let A = null;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const rd = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
const wr = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } };
const P = Object.assign({ sound: true, vol: 0.55, haptics: true, motion: 'full', tilt: true, gyro: false }, rd('tdp.fx') || {});
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const calm = () => P.motion === 'calm' || reduced();
const touch = matchMedia('(pointer: coarse)').matches;
function savePrefs() { wr('tdp.fx', P); applyPrefs(); }
function applyPrefs() { const h = document.documentElement; h.classList.add('fx-on'); h.classList.toggle('calm', calm()); h.classList.toggle('fx-touch', touch); h.classList.toggle('fx-gyro', !!(P.gyro && GYRO_OK)); if (OUT) OUT.gain.value = P.vol; }

/* ── sound: one small synth. Ambient session, so it mixes under music and the iPhone's silent switch silences it ── */
let AC = null, OUT = null, NOISE = null; const LAST = {};
function audio() { if (AC) return AC; try { if (navigator.audioSession) navigator.audioSession.type = 'ambient'; } catch (e) { }
  const C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
  try { AC = new C({ latencyHint: 'interactive' }); } catch (e) { return null; }
  const lim = AC.createDynamicsCompressor(); lim.threshold.value = -14; lim.knee.value = 8; lim.ratio.value = 8; lim.attack.value = 0.002; lim.release.value = 0.12;
  OUT = AC.createGain(); OUT.gain.value = P.vol; OUT.connect(lim); lim.connect(AC.destination);
  const n = AC.createBuffer(1, AC.sampleRate, AC.sampleRate), d = n.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; NOISE = n; return AC; }
const panOut = pan => { if (!AC.createStereoPanner || !pan) return OUT; const p = AC.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); p.connect(OUT); return p; };
function env(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
function tone(t, { f = 440, f2 = 0, type = 'sine', a = 0.004, d = 0.12, g = 0.2, pan = 0, fm = 0, fmr = 2 }) {
  const o = AC.createOscillator(), v = AC.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + a + d);
  if (fm) { const m = AC.createOscillator(), mg = AC.createGain(); m.frequency.value = f * fmr; mg.gain.setValueAtTime(fm, t); mg.gain.exponentialRampToValueAtTime(1, t + a + d); m.connect(mg); mg.connect(o.frequency); m.start(t); m.stop(t + a + d + 0.05); }
  env(v, t, a, g, d); o.connect(v); v.connect(panOut(pan)); o.start(t); o.stop(t + a + d + 0.05); }
function noise(t, { a = 0.002, d = 0.05, g = 0.2, hp = 0, lp = 0, bp = 0, q = 1, f2 = 0, pan = 0 }) {
  const s = AC.createBufferSource(); s.buffer = NOISE; let node = s;
  const filt = (type, f) => { const b = AC.createBiquadFilter(); b.type = type; b.frequency.setValueAtTime(f, t); if (type === 'bandpass') { b.Q.value = q; if (f2) b.frequency.exponentialRampToValueAtTime(f2, t + a + d); } node.connect(b); node = b; };
  if (hp) filt('highpass', hp); if (lp) filt('lowpass', lp); if (bp) filt('bandpass', bp);
  const v = AC.createGain(); env(v, t, a, g, d); node.connect(v); v.connect(panOut(pan)); s.start(t, Math.random() * 0.5); s.stop(t + a + d + 0.05); }
/* the cue sheet (Miles named them): felt ticks, poker-chip clacks, a paper slide for sheets, the deal, the wax seal, brass for a win */
const CUES = {
  tap: t => { noise(t, { d: 0.016, g: 0.045, hp: 3200 }); tone(t, { f: 2200, d: 0.025, g: 0.02 }); },
  tick: t => { tone(t, { f: 1480, f2: 1720, d: 0.04, g: 0.05, type: 'triangle' }); noise(t, { d: 0.012, g: 0.035, hp: 4200 }); },
  select: (t, o) => { const pan = o.pan || 0; noise(t, { d: 0.024, g: 0.12, bp: 2400, q: 2.5, pan }); tone(t, { f: 660, f2: 990, d: 0.07, g: 0.085, type: 'triangle', pan }); tone(t + 0.045, { f: 1320, d: 0.1, g: 0.045, pan }); },
  chip: (t, o) => { const pan = o.pan || 0; noise(t, { d: 0.03, g: 0.17, bp: 3300, q: 4, pan }); noise(t + 0.03, { d: 0.024, g: 0.1, bp: 2500, q: 4, pan }); tone(t, { f: 1850, d: 0.05, g: 0.035, type: 'triangle', pan }); },
  nav: (t, o) => { noise(t, { a: 0.03, d: 0.1, g: 0.06, bp: 520, f2: 1700, q: 1.2, pan: o.pan || 0 }); },
  open: t => { noise(t, { a: 0.04, d: 0.16, g: 0.065, bp: 380, f2: 1400, q: 0.9 }); tone(t + 0.02, { f: 520, f2: 780, a: 0.02, d: 0.12, g: 0.025 }); },
  close: t => { noise(t, { a: 0.02, d: 0.12, g: 0.055, bp: 1300, f2: 360, q: 0.9 }); },
  deal: t => { for (let i = 0; i < 3; i++) { const u = t + i * 0.085, pan = (i - 1) * 0.35; noise(u, { d: 0.03, g: 0.14, hp: 1800, pan }); tone(u, { f: 260 + i * 40, f2: 200, d: 0.05, g: 0.045, type: 'triangle', pan }); } },
  seal: t => { noise(t, { d: 0.06, g: 0.22, bp: 1800, q: 1.5 }); tone(t, { f: 140, f2: 70, d: 0.22, g: 0.2 }); [2093, 2637, 3136].forEach((f, i) => tone(t + 0.06 + i * 0.05, { f, d: 0.5, g: 0.032, fm: 300, fmr: 2.01 })); },
  cash: t => { [[1046.5, 0], [1318.5, 0.075], [1568, 0.15], [2093, 0.24]].forEach(([f, dt]) => tone(t + dt, { f, d: 0.9, g: 0.08, fm: f * 0.6, fmr: 3.5 })); noise(t, { d: 0.04, g: 0.07, hp: 5000 }); tone(t, { f: 98, f2: 60, d: 0.25, g: 0.12 }); },
  cashbig: t => { CUES.cash(t); [[2637, 0.38], [3136, 0.46], [4186, 0.56]].forEach(([f, dt]) => tone(t + dt, { f, d: 1.1, g: 0.05, fm: f * 0.4, fmr: 3.5 })); noise(t + 0.3, { a: 0.2, d: 0.9, g: 0.045, hp: 6000 }); tone(t, { f: 55, f2: 41, d: 0.6, g: 0.22 }); },
  miss: t => { tone(t, { f: 196, d: 0.18, g: 0.1, type: 'triangle' }); tone(t + 0.14, { f: 146.8, d: 0.3, g: 0.1, type: 'triangle' }); noise(t, { d: 0.05, g: 0.06, lp: 700 }); },
  push: t => { tone(t, { f: 330, d: 0.16, g: 0.06, type: 'triangle' }); tone(t + 0.1, { f: 330, d: 0.16, g: 0.05, type: 'triangle' }); },
  live: t => { tone(t, { f: 1244.5, d: 0.14, g: 0.045 }); tone(t + 0.18, { f: 1244.5, d: 0.2, g: 0.028 }); },
  birth: t => { [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone(t + i * 0.09, { f, a: 0.03, d: 1.4, g: 0.04, fm: 4, fmr: 1.5 })); noise(t + 0.2, { a: 0.4, d: 1.2, g: 0.03, hp: 7000 }); },
  on: t => tone(t, { f: 880, f2: 1320, d: 0.07, g: 0.07, type: 'triangle' }),
  off: t => tone(t, { f: 1100, f2: 660, d: 0.07, g: 0.06, type: 'triangle' }),
};
export function cue(name, o = {}) { if (!P.sound || document.hidden || !CUES[name]) return; const now = performance.now(); if (LAST[name] && now - LAST[name] < (o.gap || 45)) return; LAST[name] = now;
  const c = audio(); if (!c) return; if (c.state === 'suspended') { c.resume().catch(() => { }); return; } try { CUES[name](c.currentTime + 0.005 + (o.delay || 0), o); } catch (e) { } }
/* haptics: Android vibrates; on an iPhone a real tap on a hidden switch gives the system's light tick (it can't be fired from code) */
const VIB = { tap: 5, tick: 4, select: 10, chip: [8, 28, 8], nav: 5, open: 7, close: 5, cash: [14, 50, 26], cashbig: [16, 40, 16, 40, 40], miss: 22, push: 12, seal: [8, 36, 18], on: 8, off: 6 };
function buzz(n) { if (!P.haptics || !navigator.vibrate || (navigator.userActivation && !navigator.userActivation.hasBeenActive)) return; try { navigator.vibrate(VIB[n] || 0); } catch (e) { } }
const IOS_HX = !navigator.vibrate && touch && (() => { try { const i = document.createElement('input'); i.type = 'checkbox'; return 'switch' in i; } catch (e) { return false; } })();
const HX_SEL = '.tabs button,[data-act="game"],[data-act="ddpick"],[data-act="pslip"],[data-act="tail"],.fs-btn,.btn.foil,[data-act="qpopen"],.rm';
function hxArm(root) { if (!IOS_HX || !P.haptics || !root.querySelectorAll) return; const L = root.matches && root.matches(HX_SEL) ? [root, ...$$(HX_SEL, root)] : $$(HX_SEL, root);
  for (const el of L) { if (el.dataset.hx || el.disabled) continue; el.dataset.hx = '1'; const l = document.createElement('label'); l.className = 'hx'; l.setAttribute('aria-hidden', 'true');
    const i = document.createElement('input'); i.type = 'checkbox'; i.setAttribute('switch', ''); i.tabIndex = -1; i.addEventListener('click', e => e.stopPropagation()); l.appendChild(i); el.appendChild(l); } }
const hxOff = () => { for (const l of $$('label.hx')) { const p = l.parentElement; l.remove(); if (p) delete p.dataset.hx; } };
/* what each tap sounds like */
function cueFor(t) {
  if (t.closest('.tabs [data-go],.nav-top [data-go]')) return ['nav'];
  const a = t.closest('[data-act]'); const act = a && a.dataset.act;
  if (act === 'game') return ['select']; if (act === 'ddpick' || act === 'pslip') return ['chip'];
  if (/^(fsopen|info|rooms|cc|ccwidget|qpopen)$/.test(act || '')) return ['open']; if (/^(fsclose|infoclose|roomsclose|ccclose)$/.test(act || '')) return ['close'];
  if (/^(bf|bfx|pf|pfx|cxf|cxfx|psort|slatesp|slateday|dockpin|ccx)$/.test(act || '')) return ['tick']; if (act === 'tail') return ['select'];
  if (t.closest('[data-go]')) return ['nav'];
  if (t.closest('button,a,summary,[role="button"]')) return ['tap']; return null; }

/* ── particles: one canvas over everything, only while something is flying ── */
let CV = null, CX = null, PARTS = [], RAF = 0;
function canvas() { if (CV) return CX; CV = document.createElement('canvas'); CV.className = 'fx-cv'; CV.setAttribute('aria-hidden', 'true'); document.body.appendChild(CV); CX = CV.getContext('2d'); size(); addEventListener('resize', size); return CX; }
function size() { if (!CV) return; const d = Math.min(2, devicePixelRatio || 1); CV.width = innerWidth * d; CV.height = innerHeight * d; CX.setTransform(d, 0, 0, d, 0, 0); }
function burst(x, y, kind) { if (calm()) return; canvas(); const big = kind === 'big', loss = kind === 'loss', n = big ? 130 : kind === 'win' ? 74 : kind === 'seal' ? 48 : kind === 'birth' ? 60 : 24;
  const cols = loss ? ['#C23A2B', '#8a1f15', '#e2604f'] : kind === 'push' ? ['#9aa093', '#c9cdc2'] : kind === 'birth' ? ['#ffffff', '#cfe7ff', '#F2D067', '#b9a7ff'] : ['#FFF2BD', '#F2D067', '#C4932A', '#ffffff', '#ffd75e'];
  for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, s = (loss ? 1.1 : 2.4) + Math.random() * (big ? 7.5 : 5);
    PARTS.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - (loss ? 0 : 2.4), g: loss ? 0.05 : kind === 'birth' ? 0.02 : 0.12, life: 0, max: 46 + Math.random() * 42, r: 1.4 + Math.random() * 3.2, c: cols[i % cols.length], rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, flake: !loss && i % 3 !== 0 }); }
  if (!RAF) RAF = requestAnimationFrame(step); }
function step() { const W = innerWidth, H = innerHeight; CX.clearRect(0, 0, W, H); PARTS = PARTS.filter(p => p.life < p.max);
  for (const p of PARTS) { p.life++; p.vx *= 0.985; p.vy = p.vy * 0.985 + p.g; p.x += p.vx; p.y += p.vy; p.rot += p.vr; CX.globalAlpha = Math.max(0, 1 - p.life / p.max); CX.fillStyle = p.c;
    if (p.flake) { CX.save(); CX.translate(p.x, p.y); CX.rotate(p.rot); CX.fillRect(-p.r, -p.r * 0.45, p.r * 2, p.r * 0.9); CX.restore(); } else { CX.beginPath(); CX.arc(p.x, p.y, p.r, 0, 6.2832); CX.fill(); } }
  CX.globalAlpha = 1; if (PARTS.length) RAF = requestAnimationFrame(step); else { RAF = 0; CX.clearRect(0, 0, W, H); } }
const inView = r => r.bottom > 0 && r.top < innerHeight && r.width > 0;
function shine(el) { if (!el || calm()) return; const s = document.createElement('i'); s.className = 'fx-shine'; s.setAttribute('aria-hidden', 'true'); el.appendChild(s); setTimeout(() => s.remove(), 1400); }

/* ── foil and tilt: the hero slips, the sealed slips, the character cards ── */
const FOIL_SEL = '#v-today .slip, .slip.locked, .castcard, .newheir .nh, .qpdoor';
function foilArm(root) { if (!root.querySelectorAll) return; const L = root.matches && root.matches(FOIL_SEL) ? [root, ...$$(FOIL_SEL, root)] : $$(FOIL_SEL, root);
  for (const el of L) { if (el.dataset.foil) continue; el.dataset.foil = '1'; const g = document.createElement('i'); g.className = 'fx-glare'; g.setAttribute('aria-hidden', 'true'); const h = document.createElement('i'); h.className = 'fx-holo'; h.setAttribute('aria-hidden', 'true'); el.append(h, g); } }
let TL = null, TE = null, TRAF = 0;
function tiltTo(el, x, y) { const dx = x * 2 - 1, dy = y * 2 - 1, m = Math.min(1, Math.hypot(dx, dy)); el.classList.add('tilting'); el.style.setProperty('--mx', (x * 100).toFixed(1) + '%'); el.style.setProperty('--my', (y * 100).toFixed(1) + '%');
  el.style.rotate = m > 0.02 ? `${(-dy).toFixed(3)} ${dx.toFixed(3)} 0 ${(m * (el.classList.contains('castcard') ? 5 : 6.5)).toFixed(2)}deg` : ''; }
function untilt(el) { el.classList.remove('tilting'); el.style.rotate = ''; el.style.removeProperty('--mx'); el.style.removeProperty('--my'); }
document.addEventListener('pointermove', e => { if (e.pointerType !== 'mouse' || !P.tilt || calm()) return; const el = e.target.closest && e.target.closest('[data-foil]');
  if (el !== TL) { if (TL) untilt(TL); TL = el; } if (!el) return; TE = e; if (!TRAF) TRAF = requestAnimationFrame(() => { TRAF = 0; if (!TL || !TE) return; const r = TL.getBoundingClientRect(); tiltTo(TL, Math.max(0, Math.min(1, (TE.clientX - r.left) / r.width)), Math.max(0, Math.min(1, (TE.clientY - r.top) / r.height))); }); }, { passive: true });
document.addEventListener('pointerleave', () => { if (TL) untilt(TL); TL = null; }, true);
/* a phone tilts the foil with the phone itself, once the member allows motion (iPhone asks) */
let GYRO_OK = false, GRAF = 0, GV = null;
function gyroOn() { if (GYRO_OK) return; GYRO_OK = true; addEventListener('deviceorientation', e => { GV = e; if (!GRAF) GRAF = requestAnimationFrame(() => { GRAF = 0; if (!GV || !P.gyro || calm()) return;
    const gx = Math.max(-1, Math.min(1, (GV.gamma || 0) / 30)), gy = Math.max(-1, Math.min(1, ((GV.beta || 45) - 45) / 30)), m = Math.min(1, Math.hypot(gx, gy)), s = document.documentElement.style;
    s.setProperty('--gmx', (50 + gx * 50).toFixed(1) + '%'); s.setProperty('--gmy', (50 + gy * 50).toFixed(1) + '%'); s.setProperty('--grot', m > 0.03 ? `${(-gy).toFixed(3)} ${gx.toFixed(3)} 0 ${(m * 5).toFixed(2)}deg` : '0 0 1 0deg'); }); }, { passive: true }); applyPrefs(); }
async function gyroAsk() { try { const D = window.DeviceOrientationEvent; if (D && typeof D.requestPermission === 'function') { const r = await D.requestPermission(); if (r !== 'granted') return false; } gyroOn(); return true; } catch (e) { return false; } }

/* ── constellations: every character's stars come from its name; an heir's from both parents, its own star in the middle ── */
const seeded = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } h >>>= 0; return () => { h ^= h << 13; h >>>= 0; h ^= h >>> 17; h ^= h << 5; h >>>= 0; return (h % 100000) / 100000; }; };
const starsOf = (name, n, box = [8, 8, 84, 84]) => { const r = seeded(name); return Array.from({ length: n }, () => [box[0] + r() * box[2], box[1] + r() * box[3], 0.7 + r() * 1.5]); };
function chain(S) { if (S.length < 2) return []; const left = S.slice(1), out = []; let cur = S[0]; while (left.length) { let bi = 0, bd = 1e9; left.forEach((p, i) => { const d = (p[0] - cur[0]) ** 2 + (p[1] - cur[1]) ** 2; if (d < bd) { bd = d; bi = i; } }); const nx = left.splice(bi, 1)[0]; out.push([cur, nx]); cur = nx; } return out; }
const colOk = c => /^#[0-9a-f]{3,8}$/i.test(String(c || '')) ? c : '#F2D067';
export function constellation(c, byName, big) {
  const kid = c && c.kid, col = colOk(c && c.color); let groups;
  if (kid && kid.a && kid.b) { const pa = byName(kid.a) || {}, pb = byName(kid.b) || {}; groups = [[starsOf(kid.a, 4, [6, 10, 44, 80]), colOk(kid.ca || pa.color)], [starsOf(kid.b, 4, [50, 10, 44, 80]), colOk(kid.cb || pb.color)]]; }
  else groups = [[starsOf(c ? c.name : '?', 5 + Math.floor(seeded(c ? c.name : '?')() * 3)), col]];
  let lines = '', dots = '', i = 0;
  for (const [S, k] of groups) { for (const [p, q] of chain(S)) lines += `<line x1="${p[0].toFixed(1)}" y1="${p[1].toFixed(1)}" x2="${q[0].toFixed(1)}" y2="${q[1].toFixed(1)}" stroke="${k}"/>`;
    for (const s of S) dots += `<circle cx="${s[0].toFixed(1)}" cy="${s[1].toFixed(1)}" r="${s[2].toFixed(2)}" fill="${k}" style="--d:${(i++ * 0.37) % 3}s"/>`; }
  if (kid && groups.length === 2) { const a = groups[0][0], b = groups[1][0], ca = a[a.length - 1], cb = b[0], m = [50, 50];
    lines += `<line x1="${ca[0].toFixed(1)}" y1="${ca[1].toFixed(1)}" x2="${m[0]}" y2="${m[1]}" stroke="${groups[0][1]}"/><line x1="${cb[0].toFixed(1)}" y1="${cb[1].toFixed(1)}" x2="${m[0]}" y2="${m[1]}" stroke="${groups[1][1]}"/>`;
    dots += `<circle class="heir" cx="50" cy="50" r="3.2" fill="#fff" style="--d:0s"/>`; }
  return `<svg class="fx-const${big ? ' big' : ''}" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><g class="ln">${lines}</g><g class="st">${dots}</g></svg>`; }
function constArm(root) { if (!root.querySelectorAll || !A) return; const C = ((A.feed() || {}).characters) || []; if (!C.length) return; const by = n => C.find(c => c.name === n), byV = v => C.find(c => c.v === v);
  for (const el of (root.matches && root.matches('.castcard') ? [root] : []).concat($$('.castcard', root))) { if (el.dataset.const) continue; const c = byV(el.dataset.v); if (!c) continue; el.dataset.const = '1'; el.insertAdjacentHTML('beforeend', constellation(c, by)); }
  const fam = root.querySelector ? (root.matches && root.matches('.family') ? root : root.querySelector('.family')) : null;
  if (fam && !fam.dataset.const && A.S.castPick) { const c = byV(A.S.castPick); if (c && c.kid) { fam.dataset.const = '1'; fam.insertAdjacentHTML('beforeend', `<div class="fx-famsky">${constellation(c, by, true)}<small>${esc(c.kid.a)}’s stars and ${esc(c.kid.b)}’s, and ${esc(c.name)} in the middle.</small></div>`); } } }
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

/* ── the moments: watch the rooms redraw and answer what changed ── */
const LIVE_SEEN = new Set(), SCORE = new Map();
function moments(root) {
  const q = sel => (root.matches && root.matches(sel) ? [root] : []).concat(root.querySelectorAll ? $$(sel, root) : []);
  if (q('.slips.deal').length) cue('deal');
  q('.slip.turn').forEach((el, i) => setTimeout(() => { cue('seal'); buzz('seal'); const r = el.getBoundingClientRect(); if (inView(r)) burst(r.left + r.width / 2, r.top + r.height * 0.42, 'seal'); }, 380 + i * 200));
  q('.stamp.land').forEach((el, i) => { const loss = el.classList.contains('loss'), push = el.classList.contains('push'), win = !loss && !push;
    setTimeout(() => { cue(win ? 'cash' : loss ? 'miss' : 'push', { gap: 10 }); buzz(win ? 'cash' : loss ? 'miss' : 'push'); const r = el.getBoundingClientRect(); if (inView(r)) burst(r.left + r.width / 2, r.top + r.height / 2, win ? 'win' : loss ? 'loss' : 'push'); if (win) shine(el.closest('.slip')); }, 280 + i * 240); });
  q('.slip[data-key]').forEach(el => { const k = el.dataset.key, live = !!el.querySelector('.when.live'), sc = (el.querySelector('.score') || {}).textContent || '';
    if (live && !LIVE_SEEN.has(k)) { if (LIVE_SEEN.size || SCORE.size) cue('live', { gap: 1500 }); LIVE_SEEN.add(k); }
    const was = SCORE.get(k); if (sc && was != null && was !== sc && !calm()) { const s = el.querySelector('.score'); s.classList.add('fx-bump'); } if (sc) SCORE.set(k, sc); });
  q('.newheir .nh').forEach(el => { const k = 'tdp.fx.heir.' + (el.dataset.v || ''); if (rd(k)) return; wr(k, 1); setTimeout(() => { cue('birth'); const r = el.getBoundingClientRect(); if (inView(r)) burst(r.left + 30, r.top + r.height / 2, 'birth'); }, 600); }); }

/* ── the bell's sheet: Alerts · Sound & feel · My Desk ── */
const API = () => ((A && A.cfg && A.cfg().chat) || 'https://thedesk-chat.ironsilkstrategies.workers.dev');
const ALP = Object.assign({ lock: true, open: true, graded: true, final: true, longshot: true, heir: false, quiet: [23, 8] }, rd('tdp.alerts') || {});
const SPORTS = { nfl: 'NFL', ncaaf: 'College football', nba: 'NBA', ncaab: 'College hoops', nhl: 'NHL', mlb: 'MLB' };
const MD0 = { sp: [], ch: [], show: { best3: true, live: true, longshots: true, record: true, tix: false }, theme: 'felt', size: 'm' };
const MD = Object.assign({}, MD0, rd('tdp.mydesk') || {}); MD.show = Object.assign({}, MD0.show, MD.show || {});
let CC = { tab: 'alerts', open: false, push: null, busy: false, msg: '' };
const isIOS = () => /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const b64u = s => { const p = '='.repeat((4 - s.length % 4) % 4), b = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(b, c => c.charCodeAt(0)); };
async function pushState() { const can = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  if (!can) return { can: false, ios: isIOS(), sa: standalone() };
  try { const reg = await Promise.race([navigator.serviceWorker.ready, new Promise((_, no) => setTimeout(() => no(new Error('no service worker')), 4000))]); const sub = await reg.pushManager.getSubscription(); return { can: true, perm: Notification.permission, sub, reg, ios: isIOS(), sa: standalone() }; } catch (e) { return { can: false, err: String(e) }; } }
const post = (p, b) => fetch(API() + p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) }).then(r => r.json().catch(() => ({})).then(j => (r.ok ? j : Promise.reject(new Error(j.error || r.status)))));
const tz = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) { return 'America/Chicago'; } };
const subBody = sub => { widgetSync(); return { sub: sub.toJSON ? sub.toJSON() : sub, prefs: ALP, tz: tz(), desk: { sp: MD.sp, ch: MD.ch } }; };
async function pushOn() { const st = await pushState(); if (!st.can) return st; const perm = await Notification.requestPermission(); if (perm !== 'granted') return Object.assign(st, { perm });
  const k = await fetch(API() + '/push/key').then(r => r.json()); const sub = st.sub || await st.reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64u(k.key) });
  await post('/push/sub', subBody(sub)); wr('tdp.alerts.on', 1); return pushState(); }
async function pushOff() { const st = await pushState(); if (st.sub) { try { await post('/push/unsub', { endpoint: st.sub.endpoint }); } catch (e) { } try { await st.sub.unsubscribe(); } catch (e) { } } wr('tdp.alerts.on', 0); return pushState(); }
async function pushSync() { const st = await pushState(); if (st.sub) try { await post('/push/sub', subBody(st.sub)); } catch (e) { } }
const sw = (k, on, lab, sub) => `<label class="cc-sw"><span><b>${lab}</b>${sub ? `<small>${sub}</small>` : ''}</span><input type="checkbox" switch data-ccx="${k}"${on ? ' checked' : ''}></label>`;
function alertsHtml() { const st = CC.push || {};
  if (!st.can) { if (st.ios && !st.sa) return `<div class="cc-card"><h3 class="cc-t">First, put TheDesk on your Home Screen</h3><p>iPhone sends alerts only to apps on the Home Screen. It takes a few seconds:</p>
      <ol class="cc-steps"><li>In Safari, tap <b>•••</b> (or the Share button) at the bottom.</li><li>Tap <b>Share</b>, then scroll and tap <b>Add to Home Screen</b>.</li><li>Leave <b>Open as Web App</b> on and tap <b>Add</b>.</li><li>Open TheDesk from your Home Screen and tap the 🔔 again.</li></ol></div>`;
    return `<div class="cc-card"><h3 class="cc-t">This browser can’t take alerts</h3><p>Open TheDesk in Chrome, Edge, Firefox or Safari (on an iPhone, from the Home Screen) to get them.</p></div>`; }
  const on = !!st.sub && st.perm === 'granted';
  return `<div class="cc-card hero${on ? ' on' : ''}"><div><h3 class="cc-t">${on ? 'Alerts are on' : 'Get alerts on this device'}</h3><p>${on ? 'You’ll hear from the desk when it matters, and never in your quiet hours.' : 'The card locking, each pick opening 30 minutes before its game, and every result as it lands.'}</p></div>
      <button type="button" class="btn ${on ? 'line' : 'foil'} sm" data-act="ccx" data-k="${on ? 'pushoff' : 'pushon'}"${CC.busy ? ' disabled' : ''}>${CC.busy ? 'One moment…' : on ? 'Turn off' : 'Turn on alerts'}</button></div>
    ${st.perm === 'denied' ? '<p class="cc-warn">Notifications are blocked for TheDesk in this browser’s settings. Allow them there, then come back.</p>' : ''}${CC.msg ? `<p class="cc-msg">${esc(CC.msg)}</p>` : ''}
    <h3 class="cc-k">What to send</h3>${sw('a.lock', ALP.lock, 'The card locks', 'Each morning, when the Best 3 are set')}${sw('a.open', ALP.open, 'A pick opens', '30 minutes before its game')}${sw('a.graded', ALP.graded, 'Results', 'Each pick as it’s graded')}
    ${sw('a.final', ALP.final, 'The day’s final', 'How the card finished')}${sw('a.longshot', ALP.longshot, 'LongShots', 'When one of the founder’s tickets cashes')}${sw('a.heir', ALP.heir, 'New characters', 'When an heir is born')}
    <h3 class="cc-k">Quiet hours</h3><div class="cc-row"><label>From <select data-ccx="q0">${hrs(ALP.quiet[0])}</select></label><label>to <select data-ccx="q1">${hrs(ALP.quiet[1])}</select></label></div>
    ${on ? `<div class="cc-test"><button type="button" class="btn line sm" data-act="ccx" data-k="pushtest"${CC.busy ? ' disabled' : ''}>${CC.busy ? 'Sending…' : 'Send me a test'}</button></div>` : ''}
    <p class="cc-fine">Your sports and characters in My Desk filter these too.</p>`; }
const hrs = v => Array.from({ length: 24 }, (_, h) => `<option value="${h}"${+v === h ? ' selected' : ''}>${h === 0 ? '12 AM' : h < 12 ? h + ' AM' : h === 12 ? '12 PM' : h - 12 + ' PM'}</option>`).join('');
function feelHtml() { return `${sw('p.sound', P.sound, 'Sound', 'Felt ticks, chips, the deal, brass for a win. Your phone’s silent switch silences it.')}
    <div class="cc-vol"><label for="ccVol">Volume</label><input id="ccVol" type="range" min="0" max="1" step="0.05" value="${P.vol}" data-ccx="vol"><button type="button" class="btn line sm" data-act="ccx" data-k="hear">Hear it</button></div>
    ${sw('p.haptics', P.haptics, 'Haptics', navigator.vibrate ? 'A light buzz on taps and results' : IOS_HX ? 'A light tick on taps (iPhone)' : 'Not on this device')}
    <h3 class="cc-k">Motion</h3><div class="cc-seg" role="group" aria-label="Motion">${[['full', 'Full'], ['calm', 'Calm']].map(([v, l]) => `<button type="button" data-act="ccx" data-k="motion" data-v="${v}" aria-pressed="${P.motion === v}">${l}</button>`).join('')}</div>
    <p class="cc-fine">${reduced() ? 'Your device asks for reduced motion, so TheDesk stays calm either way.' : 'Calm keeps every screen still: no foil, no confetti, no page turns.'}</p>
    ${touch ? sw('p.gyro', P.gyro && GYRO_OK, 'Tilt the foil with your phone', 'The cards catch the light as you move') : sw('p.tilt', P.tilt, 'Tilt the cards', 'They follow your pointer')}`; }
const mdUrl = (mode, ex) => { const c = btoa(unescape(encodeURIComponent(JSON.stringify({ sp: MD.sp, ch: MD.ch, show: MD.show, theme: MD.theme, size: MD.size })))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return new URL(`widget.html?c=${c}${mode ? '&mode=' + mode : ''}${ex || ''}`, location.href).href; };
function deskHtml() { const C = ((A.feed() || {}).characters) || [];
  const chip = (k, v, l, on) => `<button type="button" class="cc-chip" data-act="ccx" data-k="${k}" data-v="${esc(v)}" aria-pressed="${on}">${l}</button>`;
  return `<p class="cc-lede">Build the desk you want on your screen. It drives your widget, your pop-out, your overlay and the alerts you get.</p>
    <h3 class="cc-k">Sports</h3><div class="cc-chips">${chip('md.sp', '', 'All sports', !MD.sp.length)}${Object.entries(SPORTS).map(([k, l]) => chip('md.sp', k, l, MD.sp.includes(k))).join('')}</div>
    <h3 class="cc-k">Characters</h3><div class="cc-chips">${chip('md.ch', '', 'Every character', !MD.ch.length)}${C.slice(0, 40).map(c => chip('md.ch', c.v, esc(c.name), MD.ch.includes(c.v))).join('')}</div>
    <h3 class="cc-k">What to show</h3><div class="cc-chips">${[['best3', 'Today’s Best 3'], ['live', 'Live scores'], ['longshots', 'LongShots'], ['record', 'The record'], ['tix', 'My tickets']].map(([k, l]) => chip('md.show', k, l, !!MD.show[k])).join('')}</div>
    <h3 class="cc-k">Look</h3><div class="cc-chips">${[['felt', 'Felt'], ['midnight', 'Midnight'], ['gold', 'Gold']].map(([k, l]) => chip('md.theme', k, l, MD.theme === k)).join('')}<span class="cc-gap"></span>${[['s', 'Small'], ['m', 'Medium'], ['l', 'Large']].map(([k, l]) => chip('md.size', k, l, MD.size === k)).join('')}</div>
    <div class="cc-prev"><iframe title="Your widget, live" src="${esc(mdUrl('embed', '&prev=1'))}" loading="lazy"></iframe></div>
    <h3 class="cc-k">Put it on your screen</h3><div class="cc-outs">
      <button type="button" class="cc-out" data-act="ccx" data-k="pop"><i>🪟</i><span><b>Pop out a mini desk</b><small>${'documentPictureInPicture' in window ? 'Floats over every other window on this computer' : 'A small window you can keep open'}</small></span></button>
      <button type="button" class="cc-out" data-act="ccx" data-k="ios"><i>📱</i><span><b>iPhone home or lock screen</b><small>Through the free Scriptable app: copy, paste, add the widget</small></span></button>
      <button type="button" class="cc-out" data-act="ccx" data-k="embed"><i>🧩</i><span><b>Embed it on a site</b><small>Copies the code for your page</small></span></button>
      <button type="button" class="cc-out" data-act="ccx" data-k="obs"><i>🎥</i><span><b>Stream overlay</b><small>A see-through link for OBS or Streamlabs</small></span></button>
      <button type="button" class="cc-out" data-act="ccx" data-k="win"><i>🪄</i><span><b>Windows widget</b><small>Install TheDesk from Edge, then Win + W → Add widgets</small></span></button></div>
    <div id="ccHow"></div>`; }
function ccHtml() { const T = [['alerts', '🔔 Alerts'], ['feel', '🎚 Sound & feel'], ['desk', '🧩 My Desk']];
  return `<div class="sheet-bg" data-act="ccclose"></div><section class="csheet fsheet ccsheet" role="dialog" aria-modal="true" aria-label="Alerts and settings">
    <div class="fs-h"><h2>Your desk</h2><button type="button" class="fs-x" data-act="ccclose" aria-label="Close">✕</button></div>
    <div class="cc-tabs" role="tablist">${T.map(([k, l]) => `<button type="button" role="tab" aria-selected="${CC.tab === k}" data-act="ccx" data-k="tab" data-v="${k}">${l}</button>`).join('')}</div>
    <div class="cc-body">${CC.tab === 'alerts' ? alertsHtml() : CC.tab === 'feel' ? feelHtml() : deskHtml()}</div>
    <p class="cc-rg">Entertainment only, 21+. If betting stops being fun, call or text 1-800-MY-RESET.</p></section>`; }
let CC_RET = null;
function ccPaint(keepScroll) { const n = $('#ccLayer'); if (!n) return; const s = n.querySelector('.ccsheet'), y = s ? s.scrollTop : 0; n.innerHTML = ccHtml(); const s2 = n.querySelector('.ccsheet'); if (s2 && keepScroll) { s2.classList.add('still'); s2.scrollTop = y; } }
export async function openCC(tab) { let n = $('#ccLayer'); if (!n) { n = document.createElement('div'); n.id = 'ccLayer'; document.body.appendChild(n); }
  CC_RET = document.activeElement; CC.open = true; if (tab === 'widget') CC.tab = 'desk'; else if (tab) CC.tab = tab; CC.msg = ''; document.body.classList.add('cc-on'); ccPaint(false);
  const x = n.querySelector('.fs-x'); try { x && x.focus({ preventScroll: true }); } catch (e) { } CC.push = await pushState(); if (CC.open && CC.tab === 'alerts') ccPaint(true); }
function ccClose() { const n = $('#ccLayer'); if (n) n.innerHTML = ''; CC.open = false; document.body.classList.remove('cc-on'); try { CC_RET && CC_RET.isConnected && CC_RET.focus({ preventScroll: true }); } catch (e) { } }
const toast = m => { try { A.toast(m); } catch (e) { } };
async function copy(t, ok) { try { await navigator.clipboard.writeText(t); toast(ok); } catch (e) { const h = $('#ccHow'); if (h) h.innerHTML = `<textarea class="cc-code" readonly>${esc(t)}</textarea>`; } }
function scriptable() { const cfg = JSON.stringify({ sp: MD.sp, ch: MD.ch, show: MD.show, theme: MD.theme });
  return `// TheDesk widget for Scriptable (iPhone), built from your My Desk settings. Scriptable is free on the App Store.
// Paste this as a new script, then add a Scriptable widget to your Home Screen or Lock Screen and choose this script.
const CFG = ${cfg};
const PULSE = "${API()}/pulse";
const T = { felt: ["#1D5F47", "#06190F", "#F2D067"], midnight: ["#24325e", "#05070f", "#a9c8ff"], gold: ["#6b4e10", "#120c02", "#FFE7A3"] }[CFG.theme] || ["#1D5F47", "#06190F", "#F2D067"];
const LG = { nfl: "NFL", ncaaf: "CFB", nba: "NBA", ncaab: "CBB", nhl: "NHL", mlb: "MLB" };
const clock = t => { const d = new Date(typeof t === "number" ? t : Date.parse(t)); const f = new DateFormatter(); f.dateFormat = "h:mm a"; return isNaN(d) ? "" : f.string(d); };
const odds = p => { p = +p; return !p ? "" : p > 0 ? "+" + p : "−" + Math.abs(p); };
let d = null; try { const r = new Request(PULSE); r.timeoutInterval = 8; d = await r.loadJSON(); } catch (e) { }
const w = new ListWidget(); const g = new LinearGradient(); g.colors = [new Color(T[0]), new Color(T[1])]; g.locations = [0, 1]; w.backgroundGradient = g;
w.url = "https://ironsilkweekly.com/desk/#today"; const fam = config.widgetFamily || "medium";
const line = (t, sz, c, b) => { const x = w.addText(t); x.font = b ? Font.heavySystemFont(sz) : Font.mediumSystemFont(sz); x.textColor = new Color(c || "#F3EEDF"); x.lineLimit = 1; x.minimumScaleFactor = 0.7; return x; };
const now = Date.now(), L = ((d && d.picks) || []).filter(x => (!CFG.sp.length || CFG.sp.includes(x.sp)) && (!CFG.ch.length || x.sealed || !(x.who || []).length || x.who.some(v => CFG.ch.includes(v))));
const tag = x => x.sealed ? "🔒 " + (LG[x.sp] || "") + " · opens " + clock(x.opens || (Date.parse(x.start) - 1800000)) : (x.res === "win" ? "✅ " : x.res === "loss" ? "❌ " : x.res === "push" ? "➖ " : Date.parse(x.start) <= now ? "🔴 " : "• ") + x.pick + (x.price ? " " + odds(x.price) : "");
if (!d || !d.day) { line("TheDesk", 14, T[2], true); line("Can't reach the desk right now", 11); }
else if (fam.startsWith("accessory")) { const p = L.find(x => !x.sealed && !x.res && Date.parse(x.start) <= now) || L[0]; line(p ? tag(p) : "TheDesk · no play today", 12, "#ffffff", true); }
else { const day = new Date(d.day + "T12:00:00Z").toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" }); line(day + "’s Best " + ((d.picks || []).length || 3), 13, T[2], true); w.addSpacer(4);
  for (const p of L.slice(0, fam === "small" ? 2 : 3)) line(tag(p), 12, "#F3EEDF", !p.sealed && !p.res && Date.parse(p.start) <= now);
  if (!L.length) line("No play in your sports today", 11, "#cfc8b4");
  const R = d.rec || {}; if (CFG.show.record && (R.w || R.l)) { w.addSpacer(); line("On the record: " + R.w + "–" + R.l + ", " + (R.u >= 0 ? "+" : "−") + Math.abs(R.u).toFixed(1) + "u", 10, "#cfc8b4"); } }
w.refreshAfterDate = new Date(now + 15 * 60e3); if (config.runsInWidget) Script.setWidget(w); else await w.presentMedium(); Script.complete();`; }
async function ccAct(k, v, el) {
  if (k === 'tab') { CC.tab = v; CC.msg = ''; ccPaint(false); if (v === 'alerts') { CC.push = await pushState(); ccPaint(true); } return; }
  if (k === 'pushon' || k === 'pushoff') { CC.busy = true; ccPaint(true); try { CC.push = k === 'pushon' ? await pushOn() : await pushOff(); CC.msg = k === 'pushon' ? (CC.push.sub ? 'Done. A quiet test is on its way.' : '') : 'Alerts are off on this device.';
      if (k === 'pushon' && CC.push.sub) post('/push/test', { endpoint: CC.push.sub.endpoint }).catch(() => { }); } catch (e) { CC.msg = 'That didn’t go through: ' + (e.message || 'try again'); } CC.busy = false; ccPaint(true); badge(); return; }
  if (k === 'pushtest') { if (CC.busy) return; CC.busy = true; CC.msg = ''; ccPaint(true);
    try { const st = await pushState(); if (!st.sub) CC.msg = 'Alerts aren’t on for this device yet: tap Turn on alerts.'; else { await post('/push/test', { endpoint: st.sub.endpoint }); CC.msg = 'Test sent. It should land in a few seconds.'; } }
    catch (e) { CC.msg = /minute/i.test(e.message || '') ? 'One test a minute: the last one just went out. Try again in a minute.' : 'That test didn’t go through: ' + (e.message || 'try again') + '.'; }
    CC.busy = false; ccPaint(true); return; }
  if (k === 'hear') { cue('select'); setTimeout(() => cue('cash'), 380); return; }
  if (k === 'motion') { P.motion = v; savePrefs(); ccPaint(true); return; }
  if (k === 'md.sp' || k === 'md.ch') { const key = k.slice(3); MD[key] = !v ? [] : MD[key].includes(v) ? MD[key].filter(x => x !== v) : MD[key].concat(v); mdSave(); return; }
  if (k === 'md.show') { MD.show[v] = !MD.show[v]; if (!Object.values(MD.show).some(Boolean)) MD.show.best3 = true; mdSave(); return; }
  if (k === 'md.theme' || k === 'md.size') { MD[k.slice(3)] = v; mdSave(); return; }
  if (k === 'pop') return popOut();
  if (k === 'ios') { await copy(scriptable(), 'Script copied: open Scriptable, tap +, paste'); const h = $('#ccHow'); if (h) h.innerHTML = `<ol class="cc-steps"><li>Get <b>Scriptable</b> from the App Store (free).</li><li>Open it, tap <b>+</b>, paste, and name it <b>TheDesk</b>.</li><li>On your Home Screen, press and hold, tap <b>Edit → Add Widget</b>, pick <b>Scriptable</b>.</li><li>Tap the new widget, choose <b>TheDesk</b> as the script. Lock Screen works the same way.</li></ol>`; return; }
  if (k === 'embed') { await copy(`<iframe src="${mdUrl('embed')}" title="TheDesk" width="360" height="${MD.size === 'l' ? 520 : MD.size === 's' ? 300 : 420}" style="border:0;border-radius:18px;overflow:hidden" loading="lazy"></iframe>`, 'Embed code copied'); return; }
  if (k === 'obs') { await copy(mdUrl('overlay'), 'Overlay link copied: add it as a Browser source in OBS'); return; }
  if (k === 'win') { const h = $('#ccHow'); if (h) h.innerHTML = `<ol class="cc-steps"><li>On Windows 11, open TheDesk in <b>Microsoft Edge</b> and choose <b>Install TheDesk</b> (App available, in the address bar).</li><li>Press <b>Win + W</b>, tap <b>+</b> and add <b>TheDesk</b>.</li><li>It shows today’s card with your My Desk filters, and updates on its own.</li></ol>`; return; } }
function mdSave() { wr('tdp.mydesk', MD); widgetSync(); ccPaint(true); pushSync(); }
/* the Windows widget and the service worker read My Desk from the cache (they can't see this page's storage) */
function widgetSync() { try { caches.open('thedesk-mydesk').then(c => Promise.all([c.put(new Request('mydesk.json'), new Response(JSON.stringify(MD), { headers: { 'content-type': 'application/json' } })), c.put(new Request('alerts.json'), new Response(JSON.stringify({ prefs: ALP, tz: tz(), desk: { sp: MD.sp, ch: MD.ch }, api: API() }), { headers: { 'content-type': 'application/json' } }))])).catch(() => { }); } catch (e) { } }
async function popOut() { const url = mdUrl('pop'), W = 340, H = MD.size === 'l' ? 560 : MD.size === 's' ? 330 : 440;
  if ('documentPictureInPicture' in window) { try { const pw = await documentPictureInPicture.requestWindow({ width: W, height: H }); pw.document.body.style.cssText = 'margin:0;background:#06190F';
      const f = pw.document.createElement('iframe'); f.src = url; f.title = 'TheDesk mini desk'; f.style.cssText = 'border:0;width:100vw;height:100vh;display:block'; pw.document.body.appendChild(f); ccClose(); return; } catch (e) { } }
  const w = window.open(url, 'thedeskmini', `popup,width=${W},height=${H}`); if (!w) location.href = url; else ccClose(); }
/* the app icon's badge: today's picks that are live right now */
function badge() { try { if (!('setAppBadge' in navigator)) return; const F = A.feed(), T = ((F && F.today && F.today.picks) || []).filter(x => !x.hidden && x.hit == null && !x.push); const live = T.filter(x => { const t = Date.parse(x.start); return t && t < Date.now() && Date.now() - t < 4 * 36e5; }).length;
  if (live) navigator.setAppBadge(live).catch(() => { }); else navigator.clearAppBadge().catch(() => { }); } catch (e) { } }

/* ── the styles that ride with this layer ── */
const CSS = `
@property --mx{syntax:'<percentage>';inherits:true;initial-value:50%}@property --my{syntax:'<percentage>';inherits:true;initial-value:50%}
.fx-cv{position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:90}
[data-foil]{transition:rotate .5s var(--spring-soft,ease)}[data-foil].tilting{transition:rotate .08s linear}
.castcard[data-foil],.qpdoor[data-foil],.newheir .nh[data-foil]{position:relative;overflow:hidden;isolation:isolate}
.fx-glare,.fx-holo,.fx-shine{position:absolute;inset:0;pointer-events:none;border-radius:inherit;z-index:5}
.fx-glare{opacity:0;transition:opacity .3s;mix-blend-mode:soft-light;background:radial-gradient(farthest-corner circle at var(--mx) var(--my),rgba(255,255,255,.7),rgba(255,255,255,.14) 28%,transparent 58%)}
.fx-holo{opacity:0;transition:opacity .3s;mix-blend-mode:color-dodge;filter:saturate(.85) brightness(.75);background:repeating-linear-gradient(115deg,#ff2d6f 0%,#ffd75e 7%,#5bffb0 14%,#4fc3ff 21%,#c56bff 28%,#ff2d6f 35%);background-size:260% 260%;background-position:calc(var(--mx) * 1.3) calc(var(--my) * 1.3)}
.tilting>.fx-glare{opacity:1}.tilting>.fx-holo{opacity:.16}.slip.locked.tilting>.fx-holo,.castcard.tilting>.fx-holo{opacity:.3}
.fx-touch .slip.locked>.fx-glare{opacity:.85;animation:fxSheen 7s ease-in-out infinite}.fx-touch .slip.locked>.fx-holo{opacity:.14;animation:fxSheen 7s ease-in-out infinite}
@keyframes fxSheen{0%,55%{--mx:-40%;--my:20%}85%,100%{--mx:140%;--my:80%}}
.fx-gyro [data-foil]{rotate:var(--grot,0 0 1 0deg);transition:rotate .25s linear}.fx-gyro [data-foil]>.fx-glare{opacity:.9;--mx:var(--gmx,50%);--my:var(--gmy,50%);animation:none}.fx-gyro [data-foil]>.fx-holo{opacity:.18;--mx:var(--gmx,50%);--my:var(--gmy,50%);animation:none}
.fx-shine{z-index:6;overflow:hidden;mix-blend-mode:screen;background:linear-gradient(105deg,transparent 35%,rgba(255,236,170,.0) 40%,rgba(255,236,170,.85) 50%,rgba(255,236,170,0) 60%,transparent 65%);background-size:300% 100%;animation:fxShine 1.2s cubic-bezier(.3,.6,.2,1) both}
@keyframes fxShine{from{background-position:120% 0}to{background-position:-60% 0}}
.fx-on #v-today .slip:has(.when.live)>.slip-main{animation:fxLive 2.4s ease-in-out infinite}
@keyframes fxLive{0%,100%{box-shadow:inset 0 0 0 0 rgba(229,72,77,0)}50%{box-shadow:inset 0 0 0 2px rgba(229,72,77,.5),0 0 22px rgba(229,72,77,.25)}}
.score.fx-bump{animation:fxBump .9s var(--spring-pop,ease) both}@keyframes fxBump{0%{transform:scale(1)}20%{transform:scale(1.08);color:#b8860b}100%{transform:scale(1)}}
.fx-const{position:absolute;right:-6px;bottom:-10px;width:118px;height:118px;z-index:-1;opacity:.5;pointer-events:none}
.fx-const .ln line{stroke-width:.55;opacity:.55}.fx-const .st circle{animation:fxTwinkle 3.2s ease-in-out infinite;animation-delay:var(--d)}.fx-const .heir{filter:drop-shadow(0 0 3px #fff)}
@keyframes fxTwinkle{0%,100%{opacity:1}50%{opacity:.35}}
.fx-famsky{flex-basis:100%;display:grid;grid-template-columns:120px 1fr;gap:12px;align-items:center;margin-top:10px;padding-top:10px;border-top:1px solid rgba(242,208,103,.25)}
.family{flex-wrap:wrap}.fx-famsky .fx-const{position:static;width:120px;height:120px;opacity:.95}.fx-famsky small{font-size:13px;opacity:.85}
label.hx{position:absolute;inset:0;z-index:7;opacity:0;cursor:inherit}label.hx input{position:absolute;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none}[data-hx]{position:relative}
body.cc-on{overflow:hidden}
.ccsheet .cc-tabs{display:flex;gap:6px;margin:6px 0 12px;padding:4px;border-radius:16px;background:rgba(0,0,0,.3)}
.ccsheet .cc-tabs button{flex:1;min-height:40px;border:0;border-radius:12px;background:none;color:var(--cream-2);font:700 13.5px/1.1 var(--text);cursor:pointer}
.ccsheet .cc-tabs button[aria-selected="true"]{background:linear-gradient(180deg,rgba(242,208,103,.28),rgba(242,208,103,.12));color:var(--foil);box-shadow:inset 0 0 0 1px rgba(242,208,103,.45)}
.ccsheet .cc-k{margin:18px 0 8px;font:800 15px/1 var(--display);letter-spacing:.07em;text-transform:uppercase;color:var(--foil)}
.cc-card{padding:14px 16px;border-radius:16px;background:rgba(0,0,0,.28);box-shadow:inset 0 0 0 1px rgba(255,244,214,.12)}.cc-card .cc-t{margin:0 0 4px;font:900 20px/1.1 var(--display);letter-spacing:.02em;color:var(--cream)}.cc-card p{margin:0;color:var(--cream-2);font-size:14.5px;line-height:1.45}
.cc-card.hero{display:flex;align-items:center;gap:12px;justify-content:space-between}.cc-card.hero.on{box-shadow:inset 0 0 0 1.5px rgba(127,214,164,.6)}.cc-card.hero .btn{flex:none}
.cc-steps{margin:10px 0 0;padding-left:22px;display:grid;gap:8px;color:var(--cream);font-size:14.5px;line-height:1.45}
.cc-sw{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:11px 0;border-bottom:1px solid rgba(255,244,214,.08);cursor:pointer}.cc-sw b{display:block;font:700 15px/1.2 var(--text);color:var(--cream)}.cc-sw small{display:block;margin-top:2px;font-size:12.5px;color:var(--cream-3)}
.cc-sw input{flex:none;width:46px;height:28px;accent-color:#d9ab3c}
.cc-row{display:flex;gap:12px;flex-wrap:wrap}.cc-row label{display:flex;align-items:center;gap:8px;color:var(--cream-2);font-size:14px}.cc-row select{min-height:40px;border-radius:10px;border:1px solid rgba(242,208,103,.35);background:#0d1812;color:var(--cream);padding:0 10px;font:600 14px var(--text)}
.cc-test{margin:14px 0 0}.cc-fine{margin:12px 0 0;font-size:12.5px;color:var(--cream-3);line-height:1.45}.cc-fine .link{color:var(--foil)}.cc-warn{margin:10px 0 0;color:#ffb4a8;font-size:13.5px}.cc-msg{margin:10px 0 0;color:#a8e6c1;font-size:13.5px}
.cc-vol{display:flex;align-items:center;gap:12px;margin:6px 0 4px}.cc-vol label{color:var(--cream-2);font-size:14px}.cc-vol input{flex:1;accent-color:#d9ab3c}
.cc-seg{display:inline-flex;padding:3px;border-radius:99px;border:1px solid rgba(244,236,216,.22)}.cc-seg button{min-height:36px;padding:0 18px;border:0;border-radius:99px;background:none;color:var(--cream-2);font:700 14px var(--text);cursor:pointer}.cc-seg button[aria-pressed="true"]{background:var(--cream);color:#14231b}
.cc-lede{margin:4px 0 0;color:var(--cream-2);font-size:14.5px;line-height:1.45}
.cc-chips{display:flex;flex-wrap:wrap;gap:6px}.cc-chip{min-height:34px;padding:0 12px;border-radius:99px;border:1.5px solid rgba(243,238,223,.25);background:rgba(0,0,0,.22);color:var(--cream-2);font:600 13.5px/1 var(--text);cursor:pointer}.cc-chip[aria-pressed="true"]{background:var(--cream);border-color:var(--cream);color:var(--ink)}.cc-gap{flex-basis:100%;height:0}
.cc-prev{margin:16px 0 4px;border-radius:18px;overflow:hidden;box-shadow:0 0 0 1px rgba(255,244,214,.14),0 16px 34px -14px rgba(0,0,0,.7)}.cc-prev iframe{display:block;width:100%;height:300px;border:0;background:#06190F}
.cc-outs{display:grid;gap:8px}.cc-out{display:flex;align-items:center;gap:12px;padding:12px 14px;border:0;border-radius:14px;background:rgba(255,255,255,.07);box-shadow:inset 0 0 0 1px rgba(255,244,214,.1);color:var(--cream);text-align:left;cursor:pointer}
.cc-out i{flex:none;width:30px;font-style:normal;font-size:22px;text-align:center}.cc-out b{display:block;font:700 15px/1.2 var(--text)}.cc-out small{display:block;margin-top:2px;font-size:12.5px;color:var(--cream-3)}
.cc-code{width:100%;min-height:120px;margin-top:10px;border-radius:12px;background:#0b140f;color:var(--cream);font:12px/1.4 ui-monospace,monospace;padding:10px}
.cc-rg{margin:18px 0 0;font-size:12px;color:var(--cream-3);text-align:center}
html.calm .fx-holo,html.calm .fx-glare,html.calm .fx-shine{display:none}html.calm [data-foil]{rotate:none!important}html.calm .fx-const .st circle,html.calm .slip>.slip-main{animation:none!important}
@media (prefers-reduced-motion:reduce){.fx-holo,.fx-glare,.fx-shine{display:none}[data-foil]{rotate:none!important}.fx-const .st circle{animation:none}}
`;
export function boot(api) { if (A) return; A = api; const st = document.createElement('style'); st.id = 'fxCss'; st.textContent = CSS; document.head.appendChild(st); applyPrefs();
  if (P.gyro && !(window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function')) gyroOn();
  addEventListener('pointerdown', () => { if (P.sound) { const c = audio(); if (c && c.state === 'suspended') c.resume().catch(() => { }); } }, { capture: true, passive: true });
  document.addEventListener('click', e => { const t = e.target; if (!t || !t.closest || t.closest('#ccLayer .cc-sw')) return; const c = cueFor(t); if (!c) return; let pan = 0; try { const r = t.getBoundingClientRect(); pan = ((r.left + r.width / 2) / innerWidth - 0.5) * 0.8; } catch (er) { } cue(c[0], { pan }); buzz(c[0]); }, true);
  document.addEventListener('click', e => { const a = e.target.closest && e.target.closest('#ccLayer [data-act]'); if (!a) return; const act = a.dataset.act; if (act === 'ccclose') { e.stopPropagation(); ccClose(); return; } if (act === 'ccx') { e.stopPropagation(); ccAct(a.dataset.k, a.dataset.v, a); } }, true);
  document.addEventListener('change', async e => { const x = e.target.closest && e.target.closest('#ccLayer [data-ccx]'); if (!x) return; const k = x.dataset.ccx;
    if (k.startsWith('a.')) { ALP[k.slice(2)] = x.checked; wr('tdp.alerts', ALP); pushSync(); cue(x.checked ? 'on' : 'off'); return; }
    if (k === 'q0' || k === 'q1') { ALP.quiet[k === 'q0' ? 0 : 1] = +x.value; wr('tdp.alerts', ALP); pushSync(); return; }
    if (k === 'p.gyro') { if (x.checked) { const ok = await gyroAsk(); P.gyro = ok; if (!ok) { x.checked = false; toast('Motion wasn’t allowed: you can allow it in Settings → Safari'); } } else P.gyro = false; savePrefs(); return; }
    if (k.startsWith('p.')) { P[k.slice(2)] = x.checked; savePrefs(); if (k === 'p.haptics') { if (x.checked) hxArm(document.body); else hxOff(); } if (P.sound) cue(x.checked ? 'on' : 'off'); return; } });
  document.addEventListener('input', e => { if (e.target.id !== 'ccVol') return; P.vol = +e.target.value; if (OUT) OUT.gain.value = P.vol; wr('tdp.fx', P); });
  document.addEventListener('keydown', e => { if (!CC.open) return; if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); ccClose(); return; }
    if (e.key === 'Tab') { const s = $('#ccLayer .ccsheet'); if (!s) return; const F = $$('button,[href],input,select,textarea', s).filter(x => !x.disabled && x.offsetParent !== null); if (!F.length) return; const i = F.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); F[F.length - 1].focus(); } else if (!e.shiftKey && (i < 0 || i === F.length - 1)) { e.preventDefault(); F[0].focus(); } } }, true);
  const main = document.getElementById('main'); const all = r => { foilArm(r); hxArm(r); constArm(r); };
  new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1) { all(n); moments(n); } }).observe(main, { childList: true, subtree: true });
  new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1 && n.id !== 'ccLayer') hxArm(n); }).observe(document.body, { childList: true });
  all(main); hxArm(document.body); moments(main); widgetSync(); badge(); setInterval(badge, 60e3);
  const bell = $('#ccBtn'); if (bell) { bell.classList.toggle('on', !!rd('tdp.alerts.on')); const dot = bell.querySelector('.cc-dot'); if (dot) dot.hidden = !!rd('tdp.alerts.on') || !!rd('tdp.fx.seenbell'); }
  if (navigator.serviceWorker) navigator.serviceWorker.addEventListener('message', e => { const d = e.data || {}; if (d.type === 'push') cue(d.kind === 'graded' ? 'tick' : d.kind === 'open' ? 'live' : d.kind === 'longshot' ? 'cashbig' : 'tap'); }); }
