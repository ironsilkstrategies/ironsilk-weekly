# TheDesk — fixes for Claude duet, one at a time

Written Nov 27, 2026 (night), after app v88 shipped: the calm pass (dock + Rooms, filter sheets), Noah's effects layer, device alerts,
My Desk widgets. The triple-check audit ran after the build, and its quick fixes are already in. Everything below is what's left, in the
order to do it. Each item stands on its own: what, why, where, how to know it's done.

## Ground rules (read once)

- Repos: `ironsilkstrategies/ironsilk-weekly` (work: machine pages, `desk/` app source, `chat/` worker, `autopilot/`) and
  `ironsilkstrategies/ironsilk-weekly-site` (the live site). After any `desk/` change, copy the changed files into the site repo's
  `desk/` and push both. Never delete the site's `desk/games/`.
- Commit as `Christopher Fleming <ironsilkstrategies@gmail.com>`. End messages with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Push to `main` after every change.
- Versions: bump `app.js?v=` / `app.css?v=` in `desk/index.html`, the matching entries plus `V` in `desk/sw.js`
  (`thedesk-shell-vNN`), and the `?v=` of any module you touch (`rooms.js`, `fx.js`, `widget.js`). The app now is v88, css v65, sw v91.
- Budget: `desk/app.js` must stay under 460,000 bytes (`pubapp1112_test.js`). New UI goes in a lazy module (`rooms.js`, `fx.js`) when it can.
- Tests: add a test for every fix. The full suite is `ls *_test.js *_test.mjs | xargs -P 8 -I{} node {}`. Known flaky (rerun alone):
  perf_test, sync1123, slow_test, home1123, sgp_match_test.
- The worker deploys itself when `chat/**` changes (`.github/workflows/chat-deploy.yml`). Check it with the Cloudflare connector
  (`workers_list` modified time) and the public routes: `GET /push/key`, `GET /pulse`.
- Never print or commit secrets (CHAT_ADMIN_CODE, Cloudflare and Meta tokens, SITE_TOKEN, AUTOPILOT_KEY, the Telegram token). The pulse
  is signed with an HMAC of CHAT_ADMIN_CODE; never send the code itself. Actions logs are public.
- The public site must never show a sealed pick before its unlock (30 minutes before its game). The pulse and the widgets read only
  what the public page shows.
- Words: no "guaranteed", "lock of the day", "risk-free"; keep 21+ and 1-800-MY-RESET where they are. D$ is play money, never cash.
  Don't flip the beta switch, turn on FREE3 or Messenger replies, or open the D$ store.

---

## 1 · Prove device alerts on real phones (with Chris)

**Why.** Everything is tested in code (the RFC 8291 vector, the Push object, the service worker handlers), but a headless browser
can't be granted notification permission, so no real device has shown one yet.
**Do.** Have Chris turn alerts on from the bell on: an iPhone (TheDesk added to the Home Screen, opened from there), an Android phone
(Chrome), and a computer (Chrome or Edge). Each "Send me a test" should arrive. Then watch the next real events (a pick opening, a
result). If Apple returns 403, check the VAPID `sub` claim (a site URL now) and the JWT `aud`.
**Done when.** All three devices show the test and a real event. Notes go in this file under item 1.

## 2 · Owner stats and a broadcast for alerts

**Why.** `GET /push/stats?k=` needs the HMAC key, which only the worker and the autopilot can make. Chris needs to see members,
sends and failures from the Admin room, and to send a rare announcement (for example, the beta ending).
**Do.** In `chat/worker.mjs` `Accounts.admin`, add `act: 'pushstats'` and `act: 'pushsend' {title, body, url}`. Each is owner-only
(the session is already checked). Call the Push object directly (`env.PUSH.get(env.PUSH.idFromName('push')).fetch(...)`) with
`x-push-key: await pushKeyOf(env.ADMIN_CODE)`. Add `POST /push/broadcast` to `chat/push-do.mjs` behind `owner()`: one queued job,
kind `news`, a `news` switch in PREF0 (default on), counted against the daily cap. Show the stats on Admin → System in `desk/app.js`
(`adSystem`), with a send box that previews first and refuses the banned words.
**Done when.** Admin shows members, sent today, failures and the last pulse time, and a broadcast reaches a test subscription in
`pushdo1127_test.mjs`.

## 3 · A morning digest for quiet hours

**Why.** Alerts that land in quiet hours are dropped now. Members should wake up to what happened.
**Do.** In `chat/push-do.mjs` `alarm()`, when `wants()` fails only because of quiet hours, append the event's words to `s.pend`
(keep 6). Keep a `digest:<HH>` job per quiet-hours end hour, re-armed daily. At quiet end, send one bundled notification titled
"While you slept" (for example, "While you slept: ✅✅❌, the card finished 2–1, +0.8u"). Clear `pend`.
**Done when.** In the test, a member with quiet 23–8 gets nothing at 3 AM and one digest at 8 AM in their own zone.

## 4 · The calm pass for the rooms not done yet

**Why.** Chris: "compartmentalize things so the screens aren't always so busy… don't lose any of the tech and options." The Slate,
Props, Challenges, explainers and LongShots are done. Still long: Receipts (about 6 screens), Characters (about 9), Leagues, the
Account room, and Today's live rail.
**Do.**
- Receipts: a month picker in a sheet, days folded to one line each (W–L, units) with their picks inside.
- Characters: a compact two-up grid on phones (name, title, record, today's count), sorted by a sheet: hot, steady, cold, or A–Z.
- Account: group into sections that fold (wallet, record and privacy, inbox, sign-out and delete).
- Leagues: put "Have a code?" in a sheet.
Use `fsSheet` / `fsBar` / `infoOpen` from `app.js` (the "v88 · THE CALM PASS" block) so they behave like the others.
**Done when.** Each room is at most about 60% of its old height at phone size. Every control is still reachable; extend
`calm1127app_test.js` to count them.

## 5 · SRO-grade share cards (Noah)

**Why.** Wins and receipts should travel. Noah's SROs are bold, pop-out graphics, and right now sharing is a link.
**Do.** In `desk/fx.js`, add `shareCard(kind, data)`. It draws on a canvas at 1080×1350: felt, a foil border, the slip in paper with
its stamp, the record line, "TheDesk" and the site, 21+ small print. Use only shapes and type: no player photos, no team logos.
Hand it to `navigator.share({ files: [png] })`, and fall back to download. Add a share button to graded slips on Today, to a day on
Receipts, and to a cashed LongShot.
**Done when.** A test renders the card (Playwright) and checks its size, the text it carries, and that a sealed pick can never be
shared.

## 6 · Accessibility left from the audit

**Why.** axe found these, and they were older than v88.
**Do.** Fix heading order: `.castcard h3` under the page `h1` needs an `h2` section heading; slip `.pick` is an `h3` with no `h2`
above it; the Join `.pass h3`. Name the Live room's `.wl-g` buttons (for example, "NBA: Nuggets 98, Jazz 102, final").
Re-check the Receipts calendar's faint win days with axe. Leave the iPhone viewport's `maximum-scale=1` alone: iOS ignores it for
pinch zoom, and it stops input-focus zoom.
**Done when.** `scratchpad`-style axe run (axe-core 4.10) is clean on Today, Slate, Props, Characters, Receipts, Live, Join and every sheet.

## 7 · Make the public feed lighter

**Why.** `public/picks.json` is 1.58 MB. Every visit downloads it, and so did the autopilot until the pulse.
**Do.** Measure which blocks weigh the most (board, characters, history). Move the heavy, rarely used ones to their own files (for
example, `public/board.json`) that the app fetches only when a room needs them, in all three writers: `desk-core.js` publishPicks,
`shared.js` (around line 4329) and `autopilot/worker.mjs` publishPublic. Keep the beta and post-beta gating identical, and add a parity test.
**Done when.** `picks.json` is under 400 KB and every room still renders (run the app tests).

## 8 · Noah's last visual pieces

- **Ambient light sweep.** The felt's lamp drifts very slowly (a 40-second loop) in `fx.js` CSS. Turn it off in Calm and under
  reduced motion.
- **Deck-shuffle loader.** Replace `.shimmer` while the card loads with three slips shuffling.
- **Scroll-driven header.** The header condenses as you scroll (`animation-timeline: scroll()` inside `@supports`), like iOS 26.
**Done when.** It looks right in screenshots at phone and desktop size, and nothing moves in Calm.

## 9 · Alerts tied to a member's account

**Why.** D$ bets, challenge checkpoints and league results belong to one member, not everyone.
**Do.** When signed in, `/push/sub` also sends the account token. The Push object asks Accounts to verify it, then stores `s.acct`.
Accounts calls the Push object when one of that member's bets grades, a checkpoint is hit, or a league ends (kinds `bet`,
`checkpoint`, `league`, with switches in the bell's Alerts tab).
**Done when.** A test grades a D$ bet and only that member's subscription gets "Your D$ ticket won: +D$60".

## 10 · Windows and iPhone widgets on real devices

**Do.** Windows 11: install from Edge, add the widget (Win + W), and check that it shows today's card and updates after a push. If
the Widgets Board needs `periodicsync`, register it from the page when installed (`registration.periodicSync.register('widgets', …)`).
iPhone: run the Scriptable script from the bell → My Desk → iPhone on a real phone. Check Small, Medium and Lock Screen, and that a
sealed pick shows "opens 7:10 PM" and never the pick.
**Done when.** Screenshots from both devices are in this file under item 10.

## 11 · Check the Cloudflare plan

**Why.** The Push object sends eight per wake-up to fit the free plan (10 ms CPU, 50 subrequests).
**Do.** Ask Chris which plan the account is on. If it's Workers Paid, raise `BATCH` in `chat/push-do.mjs` to 25.
**Done when.** The constant matches the plan, with a comment saying which.

## 12 · Steady the flaky tests

perf_test, sync1123, slow_test, home1123 and sgp_match_test fail now and then under load. Find each one's timing assumption
(fixed sleeps, wall-clock budgets) and wait for a condition instead.
**Done when.** Ten full runs in a row are green.
