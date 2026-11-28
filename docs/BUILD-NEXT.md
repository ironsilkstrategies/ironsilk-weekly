# TheDesk — Next Build: "The Felt Is Alive"

Hand-off brief for a fresh Claude session. Written Nov 27, 2026 (machine v3.5.39, public app v87).
Creative direction: **Noah** (Creative Director, IronSilk) and the team he picked, below.
Read this whole file first, then work the phases in order. Commit and push after every finished piece.

Chris, Nov 27: "I want to take this site into a visual supernatural type of artistic genius in the UI and graphics… maybe a
sound when you click a game… notifications to a device so they get updates on their phones and CPUs… maybe even a widget…
next level futuristic… the best shit visually on the market… customize the widget and filter so when on the screen it's
exactly what the subscriber wants… do the last audit after the other new tasks."

---

## 0 · Ground rules (read before touching anything)

**Repos and where things live**

| What | Where |
| --- | --- |
| Machine + public app source + chat server | `ironsilkstrategies/ironsilk-weekly` (public, GitHub Pages at ironsilkweekly.com). Clone to `/home/claude/work`: most tests use that absolute path. |
| Public app (the subscriber app) | `desk/` — `index.html`, `app.js` (one ES module, ~441 KB; budget 460 KB in `pubapp1112_test.js`), `app.css`, `sw.js`, `manifest.webmanifest` (already has `shortcuts`), `gamecast.js`, `wire.js`, `voice.js`, `chal-lib.js` |
| Site mirror | `ironsilkstrategies/ironsilk-weekly-site`: after every app change copy the changed `desk/*` files there (new files too) and commit. Never delete the site's `desk/games/`. |
| Chat/accounts server | `chat/worker.mjs` (Cloudflare Worker `thedesk-chat`, Durable Objects `Room`, `Accounts`, `Inbox`, SQLite migrations v1–v3 in `chat/wrangler.toml`). Pushing `chat/**` to main auto-deploys via `.github/workflows/chat-deploy.yml`. URL: `https://thedesk-chat.ironsilkstrategies.workers.dev` |
| Public feed | Machine writes `public/picks.json` to the site repo: `desk-core.js` `deskPublishPage` (~L1792), `shared.js` `publishPicks` (~L4329), and the GitHub Actions autopilot `autopilot/worker.mjs` `sitePut` (~L909). The app reads `../public/picks.json`, falling back to raw GitHub. It is ~1.5–2.6 MB. |
| Feed builder | `desk-core.js` `publicFeedCore` (beta blocks: vip, characters, bloodlines, board, founder, props). After the beta the roster still goes out with today's calls sealed (`pubCharSealed`). |

**Versions (bump with every shipped change)**
- Machine: build stamp `20261127e`, `DESK_VER='3.5.39'`. Bump:
  `sed -i "s/OLDSTAMP/NEWSTAMP/g" *.html shared.js; sed -i "s/BUILD vOLD</BUILD vNEW</g" *.html; sed -i "s/DESK_VER='OLD'/DESK_VER='NEW'/" shared.js; bash build.sh`
  (`build.sh` minifies every page script into `min/` with terser; pages load `min/*.js`.)
- App: `desk/index.html` → `app.js?v=87`, `app.css?v=64`; `desk/sw.js` → `thedesk-shell-v90` and the `SHELL` list. Every new file the app loads goes in `SHELL` with a `?v=`.

**Tests** — Node 20+, `npm i jsdom fake-indexeddb playwright terser` (Chromium for Playwright). Each `*_test.js` / `*_test.mjs` runs alone with `node <file>` and prints `N pass / M fail` or `N/N passed`. Run them all (8 at a time) before every push:
`ls *_test.js *_test.mjs | xargs -P 8 -I{} sh -c 'timeout 420 node {} > /tmp/t_{}.log 2>&1 || echo FAIL {}'`.
Known flaky alone-reruns: `perf_test.js`, `sync1123_test.js`, `slow_test.js`, `home1123_test.js`, `sgp_match_test.js`.
Every feature below ships with its own test file (`<name>1128app_test.js` style) and screenshots you have looked at.

**Commits**: identity `Christopher Fleming <ironsilkstrategies@gmail.com>` (`git -c user.name=... -c user.email=...`), end messages with the attribution lines your session's system gives. Push to main after each change, then mirror `desk/` to the site repo. Decline any hook asking to rewrite authors.

**Never**
- Print, paste or commit tokens/keys. Cloudflare, Facebook, site and sync tokens live only in GitHub secrets / worker secrets. Don't ask Chris to paste any key in chat.
- Put the owner admin code in the public app or any public file.
- Write to the private data repo `thedesk-data` (read-only copy at most) or commit decoded copies of it.
- Expose a paid pick before its 30-minute unlock when the beta is off (`beta:false`). Widgets, notifications and share cards follow the same seal.
- Use player photos or team logos in any graphic (team colors are fine).
- Use "lock", "guaranteed", "risk-free", sportsbook links or bonus codes. Keep "21+ · 1-800-MY-RESET" on every page and share image.
- Flip the beta switch, turn on `FREE3` / Messenger auto-replies, or open the D$ store (lawyer first; Oklahoma SB 1589). D$ is play money, never cashed out.
- Mention Hobart or Oklahoma in TheDesk promo copy; keep TheDesk off IronSilk Weekly's civic channels.

**Run order** (Chris: the audit goes last)
1. Phase 1 — Foundations (fx runtime, tokens, settings)
2. Phase 2 — Sound & haptics
3. Phase 3 — Notifications (do the server early: Chris needs real-device time to test)
4. Phase 4 — The visual layer
5. Phase 5 — Customizable widgets
6. Phase 6 — Final triple-check audit
7. Ship, verify live, short report to Chris

---

## 1 · Noah's creative brief

**Concept: THE FELT IS ALIVE.** TheDesk already looks like a card room: green felt, gold foil, cream paper slips, sealed
cards. Tonight the room wakes up. The felt breathes when games are live. The foil sees you: it catches real light as you
tilt your phone. Seals crack and bleed light when a pick opens. A cash lands like a brass stamp and throws gold. Card room
meets mission control: old-world materials, future-world behavior. Same bold, pop-out energy as our SROs, moving.

**Pillars**
1. **Physical first.** Everything has weight, snap and sound: card stock, wax, brass, felt, glass. Springs, not linear tweens.
2. **Light is the magic.** Foil reacts to tilt and touch; seals leak light; wins glow. Color stays felt/foil/cream/ink; the
   iridescent "aurora" lives only inside foil and light, never in UI chrome.
3. **Live means alive.** A live game changes the room: breathing edges, split-flap scores, a pulse you can feel.
4. **Earned spectacle.** One hero moment per screen. Big effects only for big events: an unlock, a cash, a birth. Never noise.
5. **Every effect has a quiet twin.** Calm mode and `prefers-reduced-motion` get crossfades; sound is never required to
   understand anything.
6. **Built to last.** Tokens, not magic numbers. Every effect behind a flag with a kill switch. Graceful when a device can't.

**Noah's team**

| Who | Owns |
| --- | --- |
| **Noah** (Creative Director) | Concept, art direction, final visual sign-off on every screenshot set |
| **Evan Cross** (Data & Future Signals) | Motion for data: split-flap scores, live gauges, the Bloodlines constellation, stat reveals |
| **Malik Grant** (Social Dynamics) | The feel and the ethics of reward moments: celebrate without pressure, notification timing and caps, no dark patterns |
| **Jordan Vale** (Growth & Distribution) | Notifications, widgets, share cards, install flow, the stream overlay |
| **Miles Rowan** (Features & Culture) | Voice: microcopy, sound-cue names, notification copy, character cameo lines |
| **Diamanté Crossfield** (Youth Formation) | The Gen Z bar: haptics, shareability, "would I screenshot this?" |
| **Ashley Wu** (Editor-in-Chief) | Final copy and claims check (no lock/guaranteed language; 21+ line present) |

**Noah's review checklist (every moment, every phase)**: captured as a frame strip (0 / 25 / 50 / 100%) at phone size in
both Full and Calm mode; reads at a glance; one hero; nothing clipped or overlapping; 60 fps on a mid-tier phone trace;
sound beat lands on the motion beat; looks deliberate, not templated; would a rival app copy it?

---

## Phase 1 · Foundations

Lead: Noah · With: Evan Cross

- **Lazy fx runtime.** New ES modules loaded after first paint with dynamic `import()`, so `app.js` stays under its
  460 KB budget: `desk/fx/core.js` (flags, device tier, settings, scheduler), `desk/fx/motion.js` (spring solver on top of
  the Web Animations API, stagger, FLIP helper), `desk/fx/particles.js` (one pooled canvas 2D layer), `desk/fx/foil.js`
  (WebGL thin-film foil with context-loss handling; CSS conic-gradient + `mix-blend-mode` fallback), `desk/fx/sound.js`,
  `desk/fx/haptics.js`. Add each to the SW `SHELL`. Budget for all fx together: ≤ 60 KB gzipped.
- **Tokens** in one place (`desk/fx/tokens.js` + CSS custom properties in `app.css`): colors (existing felt/foil/cream/ink +
  foil spectrum stops), motion (durations, spring stiffness/damping presets `snap`, `settle`, `float`), sound cue names,
  haptic patterns, z-layers. No magic numbers in components.
- **Device tier**: `high` (WebGL2, ≥ 6 cores or `deviceMemory` ≥ 4, not save-data), `mid`, `low` → decides foil shader vs CSS,
  particle counts, tilt.
- **Settings** (Account page + a header quick toggle): Motion `Full | Calm`, Sound `On | Off` + volume, Haptics `On | Off`,
  Tilt `On | Off` (asks iOS `DeviceOrientationEvent.requestPermission()` only on tap). Stored in `localStorage` (`tdp.fx`),
  synced to the account when signed in. Kill switch: `?fx=0` and `tdp.fx.off=1`.
- **Tests**: modules load lazily (not in the first-paint network list), budgets enforced, Calm and reduced-motion disable
  tilt/particles/parallax, kill switch works, no errors with WebGL unavailable.

## Phase 2 · Sound & haptics — "next level futuristic"

Lead: Noah · With: Miles Rowan (names), Diamanté Crossfield (feel), Malik Grant (restraint)

- **Engine**: Web Audio, synthesized at runtime (no audio files): FM + additive voices, filtered noise for texture, a
  generated short convolution "room" so everything sounds like one space (felt room, brass, glass). Master bus with a soft
  limiter (peaks ≤ −3 dBFS), ducking, max 6 voices, stereo pan by the element's x position on screen.
- **iOS**: create/resume the `AudioContext` inside the first tap; set `navigator.audioSession.type = 'ambient'` where
  supported so the silent switch is respected. Nothing ever plays before a user gesture.
- **Cue sheet** (Miles names them; each ≤ 900 ms, signature motif: a rising perfect fifth in glass):
  - `tap` — opening a game / card: a soft felt knock + tiny glass tick (the one Chris asked for)
  - `select` — chips, filters, toggles: short brass click
  - `deal` — the Best 3 land: three staggered card swishes, panned left → center → right
  - `seal` — a pick unlocks: wax crack + rising shimmer that resolves on the fifth
  - `stamp` — a pick grades: low brass thud
  - `cash` — a win: two-note glass chime + coin shimmer; `cash-big` for parlays/LongShots: a rising arpeggio
  - `miss` — a loss: one muted tick. Never punitive, never sad-trombone.
  - `live` — a tracked game goes live: a single low pulse
  - `birth` — an heir is born: a soft choir-like pad swell
- **Haptics**: `navigator.vibrate` patterns where supported (Android): tap 8 ms, select 5 ms, seal [10,30,14], cash
  [12,40,18,40,26]. iOS Safari has no vibrate API: optional, feature-detected trick (a hidden `<input type="checkbox" switch>`
  toggled by a label click gives a system tick on iOS 18+). Off if it misbehaves; never required.
- **Defaults**: sound on, quiet (−18 dB), mute in the header that remembers; haptics on; all off in Calm unless chosen.
- **Tests**: render every cue in an `OfflineAudioContext` (not silent, length and peak within spec), no `AudioContext`
  before a gesture, mute persists across reloads, cues fire on the right actions (spy), pan follows element position.

## Phase 3 · Notifications — "even better if that's possible"

Lead: Jordan Vale · With: Malik Grant (timing/ethics), Miles Rowan (copy), Ashley Wu (claims)

**Data: a tiny pulse feed.** Wherever `public/picks.json` is written (3 places above), also write `public/pulse.json`
(schema `v:1`, ≤ 8 KB): `{v, ts, d, beta, lockedAt, picks:[{n, sp, game?, label?, start, unlockAt, hidden, hit, push}],
props:[…same], rec:{w,l,u}, founder:{hits}, heirs:{born:[{key,name,d}]}}`. `label`/`game` only when the pick is open (beta
on, unlocked, or graded). Add a machine test that a sealed pick never carries `label`/`game`/`price`.

**Server (chat worker).** New Durable Object `Push` (migration `v4`, `new_sqlite_classes = ["Push"]`) and a cron trigger
(`[triggers] crons = ["*/2 * * * *"]`, `scheduled()` handler):
- **VAPID keys generated and kept by the worker** (ECDSA P-256 via WebCrypto on first use, private JWK in the DO). No new
  secrets for Chris to add. `GET /push/key` returns the public key.
- `POST /push/sub` (subscription + topics + filters + timezone + quiet hours + optional account name), `POST /push/unsub`,
  `POST /push/test` (sends one to that subscription only), owner-only `POST /push/broadcast` (owner code checked
  server-side, copy runs through the banned-words check).
- **Web Push in pure WebCrypto**: RFC 8291 `aes128gcm` payload encryption (ECDH + HKDF + AES-GCM) and RFC 8292 VAPID JWT
  (ES256). Prune subscriptions on 404/410. TTL by event (results 6 h, unlocks 30 min). `Urgency` header high for unlocks.
- **Cron diff**: fetch `pulse.json` (raw GitHub with a `?t=` cache-buster, ETag aware), diff against the stored copy,
  emit events, fan out per subscription filters, store the new copy.
- **Events and copy** (Miles writes, Ashley checks):
  - card locked — beta: "Today's Best 3 are in"; after the beta: "Today's Best 3 are locked. No. 1 opens at 1:10 PM."
  - pick opens (after the beta) — "No. 2 is open: NHL, 7:00 PM"
  - pick graded — "✓ Under 40 cashed, +0.91u" / "✗ Rangers ML missed"
  - card final — "Friday's card: 2–1, +0.8u"
  - LongShot cashed — "🎯 A founder LongShot just cashed at +4000"
  - heir born — "A new character joined the desk: The Closer"
  - signed-in only (the worker already knows these): D$ bet settled, challenge checkpoint hit, **"It's your pick" in a
    draft**, league rank changed, a reply in the chat
- **Even better**: one notification per pick updated in place (same `tag`, `renotify` only on result) — live score at
  start/half/final for picks you track; action buttons ("Open card", "Track it"); collapse by tag; quiet hours (default
  11 PM–8 AM local) with one morning digest of what happened overnight; a daily cap (default 8); per-topic, per-sport,
  per-character and per-tier filters that match the widget config (Phase 5: one "My Desk" config drives both).
- **App badge**: `navigator.setAppBadge(n)` in the app and the SW (n = open picks matching My Desk, or unread), cleared on view.
- **Client**: an Alerts sheet (Account + a bell in the header): master switch, topics, sports, characters, tiers, quiet
  hours, "Send me a test". iOS Safari not installed → a 3-step animated "Share → Add to Home Screen → open TheDesk" card;
  only then ask permission, and only from a tap. A soft prompt after the 2nd visit, never on the first. SW: `push`
  (show with icon, monochrome badge, tag, data.url, actions), `notificationclick` (focus or open the deep link),
  `pushsubscriptionchange` (re-subscribe).
- **Tests**: RFC 8291 Appendix A test vector round-trip; VAPID JWT verifies with the public key; diff engine (lock, unlock,
  grade, final, founder, heir; no duplicates; sealed picks never reveal text after the beta); quiet hours + digest; daily
  cap; prune on 410; client flows with mocked `Notification`/`PushManager` (granted, denied, default, iOS not installed).
  Real delivery can't be tested from a sandbox: ship the test button and ask Chris to try it on his iPhone (installed) and
  his computer.

## Phase 4 · The visual layer — "the best visuals on the market"

Lead: Noah · With: Evan Cross (data motion), Diamanté Crossfield (Gen Z bar), Malik Grant (reward ethics)

Signature moments, in priority order. Each: hero spec, Calm twin, sound + haptic beat, frame strip for Noah.

1. **The Deal** (Today, on load): the Best 3 fly from a deck at the top with spring physics, land with a felt thud, then a
   foil sweep crosses all three. Calm: fade up. Beat: `deal`.
2. **Living Foil**: sealed cards, the VIP pass and the "Get it now" button get a thin-film holographic foil (WebGL fragment
   shader: iridescence by view angle + noise grain) driven by device tilt (permission on tap) or pointer position; specular
   highlight follows the light. Fallback: CSS conic-gradient sheen. Low tier: static foil.
3. **The Seal Break** (at unlock, or the first time you see an opened pick): the wax seal cracks along SVG paths, light bleeds
   through the cracks, the card flips in 3D to reveal the pick. ≤ 900 ms. Beat: `seal`.
4. **The Stamp** (graded): WIN stamp slams with overshoot and ink splatter; a cash throws a gold particle burst (pooled canvas,
   ≤ 60 particles, 900 ms); MISS gets a grey ink stamp, no burst. Beat: `stamp` → `cash` / `miss`.
5. **Live Pulse**: live slips breathe (edge glow on the felt), scores roll on split-flap digits, a momentum bar under the
   matchup; the Wire ticker gets the same flaps. Evan owns the data motion.
6. **Holo character cards** (Cast): each character as a holographic trading card: parallax layers (crest, generative sigil
   seeded by the character key, name plate), rarity foil by generation (Gen 2+ prismatic), flip to the back for its record and
   best lanes. Heirs get a "newborn" shimmer for 7 days. **Bloodlines as a constellation**: parents and heirs as stars, lines
   that light up on births.
7. **Transitions**: View Transitions API between tabs (shared title/icon morph); fallback crossfade.
8. **Ambient room**: a slow light sweep across the felt; dust motes in Full mode only; time-of-day lighting (morning gold →
   night neon accents on foil only).
9. **Share cards, SRO-grade**: canvas-rendered images of a graded card, a character's week, a LongShot cash, built to Noah's
   SRO standard (bold display type, foil, felt, big numbers), no player photos or logos, 21+ line on every image, Web Share
   with file where supported.
10. **Loading and empty states**: a deck-shuffle loader instead of the grey shimmer; empty states get a character cameo line
    (Miles writes).

**Craft rules**: transforms and opacity only; one hero per screen; springs from the tokens; no layout thrash; pause all loops
when the tab is hidden; 60 fps target on an iPhone 12-class device (verify with Playwright traces + CPU throttling); WebGL
only on `high` tier and never more than one GL context.

**Tests**: per moment — triggers on the right state change, Calm/reduced-motion twin used, no errors without WebGL, loops
stop when hidden, a frame strip saved for review; existing suites still pass; app.js stays under budget.

## Phase 5 · Customizable widgets — "exactly what the subscriber wants on the screen"

Lead: Jordan Vale · With: Noah (look), Evan Cross (data), Diamanté Crossfield

- **One config, "My Desk"**: sports, characters (reuse the existing ⭐ favorites by sport and bet type), tiers (Unanimous /
  Supreme / Strong), markets (ML / spread / total / props), what to show (Best 3 · my tracked tickets · one character's card ·
  next unlock countdown · record · LongShots · live scores), theme (Felt / Ink / Paper / Foil), size (S / M / L). Stored
  locally, synced to the account. The same config filters the widget, the Alerts (Phase 3) and the app badge.
- **Widget builder** (Account → "Make your widget"): live preview as you choose; outputs below.
- **Glance mode**: `desk/widget.html?cfg=…` — a full-screen, auto-refreshing widget view. "Add to Home Screen" from it gives a
  phone home-screen tile that opens straight to the subscriber's exact view.
- **Embeddable web widget**: an `<iframe>` snippet (and a tiny script loader) for any website, sandboxed
  (`sandbox="allow-scripts allow-popups"`), reads `pulse.json` only, honors seals after the beta.
- **Stream overlay**: the same widget with a transparent background and big type for OBS/streams (Chris's video reels):
  rotating Best 3, live scores, results stamps.
- **Windows 11 desktop widget**: manifest `widgets` member (Adaptive Card template + data URL) and SW `widgetinstall` /
  `widgetresume` / `widgetclick` handlers; feature-detected, harmless where unsupported.
- **Already there**: manifest `shortcuts` (Today's card, The sheet, Every result) — add My tickets, LongShots and Alerts.
- **Honest limits**: iPhone and Android do not allow web apps to place true home-screen widgets. The lock-screen notifications,
  the app badge and Glance mode are the web answer. **True native widgets come with the App Store / Google Play build**: a
  Capacitor wrapper of `desk/` plus a WidgetKit (iOS) and Glance (Android) widget reading `pulse.json` with the same My Desk
  config. Plan it as a separate project; don't start it here.
- **Tests**: config round-trip (URL ↔ object, validated), filters produce the right picks, sealed picks never leak into any
  widget output, iframe sandbox attributes present, overlay transparency, Windows widget template validates.

## Phase 6 · Final triple-check audit (last, after everything above)

Lead: Ashley Wu (sign-off) · With: everyone

1. **Sweep**: every tab (today, slate, props, longshots, challenges, leagues, cast, one character, chat, receipts, tix, me,
   live, join, gamecast, privacy + the new Alerts sheet, widget builder, Glance mode) × phone / small phone / desktop ×
   signed out / signed in: page errors, console errors, horizontal overflow, clipped text, dead buttons.
2. **Accessibility**: `axe-core` on every view: zero serious/critical; text contrast AA; keyboard order, visible focus,
   Escape closes sheets; every icon button labeled; motion respects `prefers-reduced-motion`.
3. **Links & routes**: every hash route resolves; external links https with `rel="noopener"`.
4. **PWA**: manifest valid (192/512/maskable icons, shortcuts), installable, SW update flow (new version picked up), offline
   Today shows the last card.
5. **Performance**: app.js budget, fx lazy, LCP < 2.5 s and INP < 200 ms on throttled mobile, no long tasks during the Deal,
   no timer/listener leaks over a 10-minute live session.
6. **Sound & motion**: nothing plays before a gesture; mute persists; Calm mode is calm.
7. **Notifications**: every permission state; iOS-not-installed path; unsubscribe; payload ≤ 4 KB; quiet hours.
8. **Widgets**: sandbox, seals, config validation.
9. **Post-beta re-check** with a `beta:false` feed (sealed picks, T-30 unlock, members gates, Get it now) — see
   `postbeta1127app_test.js`.
10. Fix everything found, then write `docs/AUDIT-<date>.md` (what was checked, what was fixed, what's left).

## Ship checklist

- [ ] All suites green; new test files added; screenshots reviewed (Noah's checklist)
- [ ] Versions bumped (machine stamp + DESK_VER; app `?v=`, SW shell version + SHELL list)
- [ ] Committed and pushed to `ironsilk-weekly`; `desk/` mirrored to `ironsilk-weekly-site`
- [ ] Worker deployed (watch the "Chat server" Action), `GET /push/key` answers
- [ ] Live check: ironsilkweekly.com/desk/ serves the new `app.js?v=`; machine pages show the new BUILD
- [ ] Message Chris: what shipped, how to test notifications on his phone and computer, what's left

## Context the next session should know

- The public app is in **open beta** (`beta:true`): everything is free and visible. Post-beta behavior is built and tested
  (v87) but the switch stays off until Chris decides (cutoff date, LongShots public or not, Quick Pick/drafts without the
  board).
- From **Dec 1** the Best 3 rank by "proven lanes" (`d4.b3lane`, v3.5.38); November's card is untouched.
- The womb/storage incident of Nov 26 is fixed (v3.5.37): storage merges all the way down; pages without saved history leave
  the womb, calibration rows and power history alone.
- The December launch brief (audit, backtest, beta-exit plan, positioning) is a Claude Doc Chris has.
