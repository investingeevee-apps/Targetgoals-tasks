# TargetGoals Tasks — Android app

The Android app (`apps/mobile`) is an [Expo](https://expo.dev) / React Native app
that shows your **Daily tasks** and **Overview**, and syncs with your self-hosted
server (see [SELF-HOSTING.md](SELF-HOSTING.md)). It reuses the same core logic
(`@targetgoals/shared`) as the web app, and is **offline-first**.

> **What's in v1:** Daily checklist, Overview (stats + heatmap), hot-streak / perfect-day
> celebrations, and Sync settings with **QR pairing** (or manual URL + token).
> Regular multi-list task management, the home-screen **widget**, and **notifications**
> come in later phases (F, G).

---

## Quick run (no build needed) — Expo Go

Fastest way to try it on your phone:

```bash
npm install                 # from the repo root (builds @targetgoals/shared)
npm run dev:mobile          # = expo start in apps/mobile
```

Install **Expo Go** from the Play Store, then scan the QR shown in the terminal.
The app opens on your phone. (Your phone and PC must be on the same network, or use
Tailscale.)

Then go to the **Sync** tab → **Scan pairing QR** and point it at your server's
`/pair` page (or paste the URL + token).

---

## Build a sideloadable APK — EAS Build

This produces a signed `.apk` you can install directly (no Play Store). It runs in
Expo's cloud, so **no local Android SDK/JDK is needed**.

1. Create a free **Expo account** at <https://expo.dev>.
2. From `apps/mobile`:

   ```bash
   npx eas-cli login
   npx eas-cli build:configure          # first time only
   npx eas-cli build -p android --profile preview
   ```

3. EAS builds in the cloud and gives you a download link. Copy the APK to your phone
   and install it (allow "install unknown apps" for your browser/file manager).

Profiles are in [`apps/mobile/eas.json`](../apps/mobile/eas.json):
`preview` and `production` both output an **APK** (`android.buildType: apk`).
EAS manages the signing keystore by default (or supply your own).

> **Publishing for others (optional):** attach the built APK to a GitHub Release so
> people can download-and-install without building. CI to automate this is Phase H.

---

## Connecting to your server

- **Same network:** use the LAN URL (e.g. `http://192.168.1.50:4000`).
- **Anywhere:** install Tailscale on the phone, sign in to your tailnet, and use the
  Tailscale URL. The Android app works fine over plain HTTP through the encrypted
  Tailscale tunnel (HTTPS via `tailscale serve` is only needed for the *web* app).

Pairing is stored on the device; the app re-syncs automatically on launch, every
~25 s, and after each edit. With no connection it keeps working and syncs later.

---

## Notes & limitations

- Local data is cached with **AsyncStorage** (small dataset; `expo-sqlite` is a
  possible future upgrade).
- The token is stored in the app's local storage; treat your device accordingly
  (`expo-secure-store` is a future hardening step).
- Building the APK and running on a device happen **on your machine** — they can't be
  done from this repo's CI without your Expo account.
