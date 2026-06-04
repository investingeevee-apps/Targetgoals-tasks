# Play Store plan — public, offline-first

Goal: publish the Android app to Google Play as a **public, offline-first** app.
A new user installs it and it works immediately with data stored **on their phone**.
Syncing to a self-hosted server is an **optional, advanced** feature — not required.

## How the server fits in (the architecture question)

Play Store distributes the **client app**, not your server. So:

- **You** keep using your PC server over Tailscale — the Play build pairs to it exactly
  like the sideloaded APK does today.
- **Everyone else** just uses the app **standalone** (local storage). If a power user
  wants multi-device sync, they can run their own server and pair to it.

Nothing about sync changes; the server simply becomes optional. Today the app already
boots straight to the tabs with no pairing gate, and the sync engine no-ops without a
server — so the foundation is in place.

---

## Phase 1 — Make "no server" a first-class experience (app changes)

The app is already local-first; this phase is polish so a stranger never feels like
they're missing a backend.

- [ ] **Onboarding / first run:** a short welcome that lets you start using it instantly.
      No mention of servers up front.
- [ ] **Reframe the "Sync" tab → "Settings":** make sync an *optional* section:
      "Your data lives on this device. Optionally connect your own server to sync across
      devices." Move self-host setup behind an "Advanced / Sync" disclosure.
- [ ] **Empty states:** friendly Tasks/Daily/Overview empty states for a brand-new user
      (and decide whether to keep the example seed habits or start clean).
- [ ] **Local backup / export + import (JSON):** offline users have no server backup, and
      uninstall wipes local data. A "Export data" / "Import data" (share-sheet JSON) gives
      them a backup path and satisfies Play's data-control expectations.
- [ ] **Copy audit:** remove self-host-first framing from any general-user screens; keep
      Tailscale/server docs as "advanced".
- [ ] **Verify the cold path:** fresh install → add tasks/habits → streaks/widget/
      notifications all work with **no server ever configured** (mostly true today; confirm
      on a real build).

## Phase 2 — Legal & compliance (required by Play)

- [ ] **Privacy policy (hosted URL, required).** Our story is clean: data is stored
      **locally on the device**; optional sync sends data **only to the user's own
      self-hosted server**; the developer collects/receives **nothing**; camera is used
      **only** to scan a pairing QR; no ads, no analytics, no third-party sharing.
      Publish `PRIVACY.md` via **GitHub Pages** (free) to get a public URL.
- [ ] **Data safety form** (Play Console): declare "no data collected or shared" by the
      developer, and the camera usage. Matches the privacy policy.
- [ ] **Data deletion path:** no accounts, so "uninstall removes all data" + the in-app
      export/clear covers it.
- [ ] **Content rating** questionnaire → expected "Everyone".
- [ ] **Target audience & ads:** no ads; pick the audience (not directed at children).

## Phase 3 — Build configuration for Play

- [ ] **AAB, not APK.** Play requires an Android App Bundle. Set the `production` profile
      in `eas.json` to build an `app-bundle` (EAS default for production) with
      `channel: production`. Keep `preview` as an APK for sideload/testing.
- [ ] **Version codes.** You already use `appVersionSource: remote`, so EAS manages the
      Play `versionCode` and auto-increments each build. Confirm `autoIncrement` on the
      production profile.
- [ ] **Scope cleartext traffic.** The global `usesCleartextTraffic: true` may draw review
      scrutiny and isn't needed for offline-first users. Either remove it (require the
      self-host HTTPS `*.ts.net` URL) or scope it to private IP ranges via a network
      security config. (Native change → ships in the AAB build.)
- [ ] **Permissions:** `CAMERA` only (already), justified as optional QR pairing.
      `RECORD_AUDIO` already removed/blocked.
- [ ] **Target API level:** Expo SDK 54 targets a current API level (meets Play's minimum).
      Confirm at build time.

## Phase 4 — Google Play account, signing, and upload

- [ ] **Create a Google Play Developer account** (one-time **$25**). Personal is fine
      (note the production-testing requirement in Phase 6).
- [ ] **Create the app** in Play Console with package `com.targetgoals.tasks`
      (already set; the package name is **permanent**).
- [ ] **Play App Signing:** let Google manage the signing key; EAS uploads the bundle.
- [ ] **Build the AAB:** `eas build -p android --profile production`.
- [ ] **Submit:** configure `eas submit` (Google service-account JSON) and run
      `eas submit -p android --profile production` to push the AAB to a track.

## Phase 5 — Store listing assets

- [ ] **App icon 512×512** (have the mark — generate this size).
- [ ] **Feature graphic 1024×500** (brand: wordmark/mark on background — I can generate).
- [ ] **Phone screenshots** (2–8): Tasks, Daily, Overview/streaks, widget. I can capture
      from the running app.
- [ ] **Title** (30 chars), **short description** (80), **full description** (4000).
- [ ] Category **Productivity**, contact email, privacy policy URL.

## Phase 6 — Testing tracks & release (the timeline gate)

Recommended path, fastest to slowest:

1. **Internal testing** (up to 100 testers, **no waiting period**) — get it on your phone
   via Play with auto-updates immediately. Great for finishing everything else.
2. **Closed testing** — **personal accounts must run a closed test with ≥20 testers for
   ≥14 days** before they can request production access. Start this early and recruit the
   20 testers; the 14 days run in parallel with listing/legal work.
3. **Production** — request access after the closed-test requirement is met, then roll out
   (can do a staged % rollout).

> ⚠️ The 20-testers / 14-days requirement is the main calendar item. Verify the current
> rule in Play Console when you start (Google adjusts it).

## Phase 7 — Keep OTA working alongside Play

- Play handles **native** updates (new AAB). **EAS Update** keeps shipping JS/UI fixes.
- The Play build uses the **`production`** channel; publish OTA to live users with
  `eas update --branch production`. Keep `preview` for your own dev loop.
- Policy note: OTA is fine for bug fixes/features; don't use it to change the app's core
  purpose (that needs a real review). Update `docs/MANAGING.md` once `production` is live.

---

## Who does what

**I can do:** Phase 1 app/UX changes; write `PRIVACY.md` + set up GitHub Pages; configure
`eas.json` (AAB/production/channel) and scope cleartext; generate the 512 icon, 1024×500
feature graphic, and screenshots; draft the listing text + Data-safety answers; set up
`eas submit` config.

**Only you can:** create + pay for the Play account, accept agreements, enroll in Play App
Signing, add the EAS service account in Play Console, recruit testers, and press Publish.

## Suggested first steps (no Play account needed yet)

1. Phase 1 offline-first polish (onboarding, Settings reframe, export/import).
2. Phase 2 privacy policy published via GitHub Pages.
3. Phase 3 build config (AAB + scoped cleartext) and a first **production AAB** to verify
   it builds.

Then you create the Play account and we do Phases 4–6.
