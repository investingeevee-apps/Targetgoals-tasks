# Managing TargetGoals Tasks

A practical runbook for running and updating the app day‑to‑day: the web/desktop
app, the self‑hosted server, and the Android app (APK + over‑the‑air updates).

Your specific values are baked in below so you can copy‑paste.

| Thing | Value |
| --- | --- |
| Repo | `github.com/investingeevee-apps/Targetgoals-tasks` |
| EAS account | `deveevee` |
| EAS project id | `6f90eccc-4125-4230-b256-9efe5cdab72f` |
| Update channel / branch | `preview` |
| Runtime version | `0.1.0` (policy: `appVersion`) |
| Server port | `4000` |
| Public URL (Tailscale) | `https://eevee-dev.tail754786.ts.net` |
| Repo root | `C:\Users\Targe\OneDrive\Desktop\Programming\Local Tasks app` |

---

## 1. The one mental model: OTA vs APK

There are **two ways** a change reaches your phone. Pick the right one and the rest is easy.

| | **OTA update** (`eas update`) | **APK rebuild** (`eas build`) |
| --- | --- | --- |
| Ships… | JavaScript, styles, images, most UI/logic | Native code + anything baked at build time |
| Speed | ~30s to publish, downloads silently on the phone | ~10–20 min cloud build, then manual install |
| User action | Tap **Restart** in the banner | **Download + install** the `.apk` manually |
| Use for | Features, bug fixes, color/text/layout changes, the streak logic, sync logic, the widget *render* logic | App icon / splash / name, Android permissions, new native library, SDK bump, `app.json` plugin changes |

**Rule of thumb:** if you only touched files under `apps/mobile/src`, `apps/web`, or
`packages/shared` → **OTA**. If you touched `app.json` (icon, splash, permissions,
plugins), added a native dependency, or bumped the Expo SDK → **APK rebuild**.

> ⚠️ OTA only works on a **real installed APK** (not Expo Go) whose **runtime
> version matches** (`0.1.0`). If you bump the native app `version` in `app.json`,
> the runtime version changes and old installs stop receiving OTA until they install
> a new APK — so leave `version` alone for JS‑only releases (see §6).

---

## 2. Day‑to‑day: make a change → ship it

### A. Make the change
```powershell
cd "C:\Users\Targe\OneDrive\Desktop\Programming\Local Tasks app"
# edit code...
npm run -w @targetgoals/web build      # sanity: web compiles
npx tsc -p apps/mobile/tsconfig.json --noEmit   # sanity: mobile typechecks
npm test                                # run the shared unit tests
```

### B. Commit & push
```powershell
git add -A
git commit -m "what changed"
git push origin main
```
Pushing triggers **CI** (build + typecheck + tests) on GitHub.

### C. Ship to each surface
- **Desktop / web:** rebuild and let the server serve it (§3). Users get an
  "Update available — version x.x.x" banner and click **Reload**.
- **Android (JS change):** publish an **OTA** (§4).
- **Android (native change):** rebuild the **APK** (§5).

---

## 3. Web / desktop

The server serves the built web app from `apps/web/dist`.

**Deploy a new web version:**
```powershell
cd "C:\Users\Targe\OneDrive\Desktop\Programming\Local Tasks app"
npm run -w @targetgoals/web build
# the running server serves dist live — no server restart needed for web-only changes
```
Open `https://eevee-dev.tail754786.ts.net` (or `http://localhost:4000`) and **hard‑refresh**
(Ctrl+Shift+R) the first time so the service worker picks up the new build.

**The update banner:** bump `apps/web/package.json` `version` (e.g. `0.1.1` → `0.1.2`)
before building. The build writes that into `dist/version.json`, and the banner shows
"Update available — version 0.1.2". (Installed PWAs see the banner automatically when
the service worker detects the new build.)

---

## 4. Android — publish an OTA update

For any JS/UI/logic change (no native change):
```powershell
cd "C:\Users\Targe\OneDrive\Desktop\Programming\Local Tasks app\apps\mobile"
npx eas-cli update --branch preview --message "what changed"
```
- Publishes in ~30s. Phones on the installed APK download it **in the background** on
  next launch/foreground, then show the **Restart** banner.
- Bump `app.json` → `extra.appVersion` (e.g. `0.1.1` → `0.1.2`) before publishing so
  the banner names the new version. This is a *display* version only — it does **not**
  change the runtime version, so OTA stays compatible. (See §6.)

> Note: you're on **Expo SDK 54**, so `eas update` does **not** require the
> `--environment` flag. (That flag becomes required only on SDK 55+.) `--branch preview`
> and `--channel preview` are equivalent here because the `preview` build profile is
> tied to the `preview` channel.

**Check what's published:**
```powershell
npx eas-cli update:list --branch preview
```

---

## 5. Android — rebuild the APK

Only when something **native** changed (icon, splash, permissions, plugins, native deps, SDK).
```powershell
cd "C:\Users\Targe\OneDrive\Desktop\Programming\Local Tasks app\apps\mobile"
npx eas-cli build -p android --profile preview
# add --no-wait to return immediately and track in the dashboard
```
- Builds in Expo's cloud (~10–20 min), reuses your managed keystore.
- When done, the build page gives a **download link + QR**. On the phone:
  download the `.apk` → tap to install → allow "install unknown apps" if asked.
- Installing over the old app keeps your data (it re‑syncs from the server anyway).

**Check build status:**
```powershell
npx eas-cli build:list --platform android --limit 5
```

**After installing a fresh APK,** OTA takes over again — the APK is the new baseline,
and future JS changes ship via §4.

---

## 6. Versioning — the three "versions" and when to bump

| Field | Where | Bump when | Effect |
| --- | --- | --- | --- |
| Web app version | `apps/web/package.json` → `version` | every web release you want named in the banner | banner text only |
| Mobile display version | `apps/mobile/app.json` → `extra.appVersion` | every OTA you want named in the banner | banner text only |
| Native app version | `apps/mobile/app.json` → `version` | a real **native** release (new APK that should be a new runtime) | **changes runtimeVersion** → old installs need a new APK |

**Golden rule:** for OTA‑only releases, bump the *display* versions, **never** the
native `version`. Bump the native `version` only when you're cutting a new APK and
deliberately want to break OTA compatibility with old installs.

---

## 7. The server

- **Start/keep running:** a no‑admin launcher auto‑starts it at login —
  `Startup\TargetGoalsTasksServer.vbs` (runs `npm run start:server`, port 4000).
- **Manual start:** `npm run start:server` from the repo root.
- **Restart** (needed after changing **server** code in `apps/server`, e.g. the pairing
  page): stop the process on port 4000 and re‑launch the VBS, or just run
  `npm run start:server` again.
- **Data lives in** `apps/server/data/` (SQLite DB + `config.json` with your token) —
  **git‑ignored, never committed**. Back this folder up.
- **Health check:** `curl http://localhost:4000/api/health`.
- **Remote access:** via Tailscale; `tailscale serve` exposes HTTPS at your `*.ts.net`
  URL so the web PWA works remotely and the phone syncs from anywhere.

---

## 8. Pairing a device

1. Open `https://eevee-dev.tail754786.ts.net/pair` (or the in‑app QR in web Sync settings).
2. In the Android app → scan the QR (or enter URL + token manually).
3. The token authenticates sync; Tailscale limits who can reach the server at all.

---

## 9. Quick command cheat‑sheet

```powershell
# --- verify before shipping ---
npm run -w @targetgoals/web build
npx tsc -p apps/mobile/tsconfig.json --noEmit
npm test

# --- web release ---
# (bump apps/web/package.json version first)
npm run -w @targetgoals/web build

# --- android OTA (JS changes) ---
# (bump apps/mobile/app.json extra.appVersion first)
cd apps/mobile
npx eas-cli update --branch preview --message "..."

# --- android APK (native changes) ---
cd apps/mobile
npx eas-cli build -p android --profile preview --no-wait
npx eas-cli build:list --platform android --limit 5

# --- server ---
npm run start:server
curl http://localhost:4000/api/health

# --- who am I / status ---
npx eas-cli whoami
git status
```

---

## 10. Troubleshooting

- **OTA not arriving:** confirm you're on the **installed APK** (not Expo Go), the
  device has network, runtime versions match (`0.1.0`), and you published to the same
  channel (`preview`). Force‑close and reopen the app up to twice. See
  Expo's update debugging guide.
- **Favicon/PWA looks stale on desktop:** hard‑refresh (Ctrl+Shift+R); browsers cache
  favicons aggressively and may take a reload or two.
- **Sync error on the phone:** check the server is up (`/api/health`), the pairing
  URL/token are current, and (for HTTP/LAN) cleartext is allowed — prefer the HTTPS
  `*.ts.net` URL.
- **Server won't start after a pull:** `npm install` (deps may have changed), then
  `npm run start:server`.
