# Play Store submission — step by step

Everything code-side is ready (offline-first UX, AAB build config, scoped cleartext,
privacy policy, store assets, listing copy). This is the runbook for the parts that
need **your** Google account. Commands run from `apps/mobile`.

## 0. One-time: prerequisites

- [ ] **Google Play Developer account** — register at
      [play.google.com/console](https://play.google.com/console) and pay the one-time
      **$25** fee. (Personal account is fine; note the closed-testing requirement in §5.)
- [ ] **Host the privacy policy** at a public URL via **GitHub Pages**:
  - GitHub → Settings → Pages → Source = "Deploy from a branch" → `main` / `/docs` → Save.
  - The repo's `docs/CNAME` points it at the custom domain, so the policy lives at
    **`https://targetgoals.ca/privacy.html`** (and `targetgoals.ca` shows a landing page).
    DNS records for `targetgoals.ca` → GitHub Pages:
    - Apex `@` **A** records: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
    - `www` **CNAME** → `investingeevee-apps.github.io`
    - (Recommended) verify the domain in GitHub org → Settings → Pages, via the TXT
      challenge GitHub provides.
  - After DNS propagates, tick **Enforce HTTPS**, then use the URL for the listing + Data safety.

## 1. Build the production AAB

`eas.json` `production` now builds an **app bundle** (`.aab`) with auto-incrementing
version code on the `production` channel.

```sh
npx eas-cli build -p android --profile production
```
- First run will offer to create/reuse the **upload keystore** (let EAS manage it).
- Output is an `.aab` (not an APK) — that's what Play wants.

> Versioning: keep `app.json` → `version` at `0.1.0` for now. When you do the real
> public launch, bump it to `1.0.0` (that starts a fresh production runtime). Don't bump
> it just to test internal — it would cut off the existing `preview` OTA.

## 2. Create the app in Play Console

- [ ] Play Console → **Create app**. Name `TargetGoals Tasks`, app (not game), free.
- [ ] App package name is fixed by the build: **`com.targetgoals.tasks`** (permanent).
- [ ] Complete **App content**: Privacy policy URL, Data safety (use
      `docs/DATA-SAFETY.md`), Ads = none, Content rating questionnaire, Target audience,
      Government/Financial = no, Data deletion = uninstall + in-app export.

## 3. Play App Signing + first upload

You can upload the AAB manually the first time to enroll in Play App Signing, **or**
automate with `eas submit`.

**Option A — manual (simplest first time):**
- [ ] In Play Console → **Testing → Internal testing → Create new release** → upload the
      `.aab` from the EAS build page. Accept **Play App Signing** enrollment.

**Option B — automated with `eas submit`:**
- [ ] Create a **Google Cloud service account** with the **Google Play Android Developer
      API** enabled, grant it access in Play Console (Users & permissions), download its
      JSON key.
- [ ] Point `eas.json` → `submit.production.android.serviceAccountKeyPath` at that JSON
      (keep the key **out of git**), then:
```sh
npx eas-cli submit -p android --profile production
```
  This uploads the latest production build to the **internal** track (set in `eas.json`).

## 4. Store listing & graphics

- [ ] Fill the listing from **`docs/STORE-LISTING.md`** (name, short + full description).
- [ ] Upload graphics from **`store-assets/`**: `play-icon-512.png` (icon),
      `feature-graphic-1024x500.png` (feature graphic).
- [ ] Capture **2–8 phone screenshots** on the device after installing the internal build
      (see the shot list in `STORE-LISTING.md`) and upload them.

## 5. Testing tracks → production (the timeline gate)

1. **Internal testing** (now): up to 100 testers, **no waiting period**. Add your own
   email as a tester, get the opt-in link, install from Play, and you're running the app
   from the store with auto-updates. Use this to finish screenshots + verify the cold
   (no-server) path.
2. **Closed testing:** **personal accounts must run a closed test with ≥20 testers for
   ≥14 continuous days** before they can request production access. Create a closed track,
   add ≥20 testers (an email list or a Google Group), and start the clock early.
3. **Production:** once the closed-test requirement is satisfied, request production
   access, then create a production release (you can use a **staged rollout** %).

> Verify the exact testing requirement in Play Console when you start — Google updates it.

## 6. Keep OTA working after launch

The production build listens on the **`production`** channel, so ship JS/UI fixes to live
users without a new AAB:
```sh
# bump apps/mobile/app.json -> extra.appVersion first (names the banner)
npx eas-cli update --branch production --message "what changed"
```
- Keep `--branch preview` for your own dev loop; use `--branch production` for released users.
- A **new AAB** is only needed for native changes (icon, permissions, plugins, SDK).
- Play policy: OTA is fine for fixes/features; don't use it to change the app's core
  purpose (that needs a store review).

## Quick reference

```sh
# production AAB
npx eas-cli build -p android --profile production
# submit to Play (after service-account setup)
npx eas-cli submit -p android --profile production
# OTA to released users
npx eas-cli update --branch production --message "..."
```

See also: `docs/PLAY-STORE.md` (the overall plan), `docs/STORE-LISTING.md` (copy),
`docs/DATA-SAFETY.md` (form answers), `docs/privacy.html` (policy), `docs/MANAGING.md`
(day-to-day).
