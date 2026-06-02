# TargetGoals Tasks — Self‑Hosted Sync, Android App & Widget

**Status:** Plan / roadmap (no implementation yet)
**Author:** drafted 2026‑06‑02
**Scope of this document:** how to evolve the current browser‑only app into a
self‑hostable system where your PC runs the data server and an **Android app +
home‑screen widget** show the same tasks, reachable from anywhere over Tailscale.

---

## 1. Goals

1. **Host the data on your PC** — one source of truth, not per‑device localStorage.
2. **See the same tasks everywhere** — PC browser *and* Android app stay in sync.
3. **Android app (sideloaded APK)** focused on **Daily tasks + Overview** first.
4. **Home‑screen widget** — read‑only, showing streak + today's progress *and*
   today's task list; tapping opens the app.
5. **Reminders** — a daily nudge to log tasks, plus a streak‑at‑risk warning.
6. **Reachable from anywhere** via **Tailscale** (no port‑forwarding).
7. **Open source & self‑hostable** — anyone can run their own server and install
   the app; **nobody's task data ever lives in the repo**.

### Non‑goals (for now)
- iOS (explicitly out of scope).
- Multiple user accounts on one server (single‑tenant per install).
- Full multi‑list task management in the Android app v1 (web keeps it; Android
  gains it in a later pass).

---

## 2. Decisions (from planning Q&A)

| Area | Decision |
| --- | --- |
| Mobile platform | **Android only** |
| Web app | **Keep it**, and switch it to the shared server (with offline cache) |
| Data model | Central server is source of truth; clients are **offline‑first** with sync |
| Remote access | **Tailscale** (private mesh VPN) |
| Auth | **Single‑tenant, no login**; per‑install secret **API token**, Tailscale for privacy |
| Open source | Code is public; **each user's data is local & git‑ignored** |
| Android scope v1 | **Daily + Overview** first |
| Widget | **Read‑only**: glanceable stats **and** today's task list; tap → open app |
| Notifications | **Daily reminder + streak‑at‑risk** |
| Server runtime | **Auto‑start Windows background service** |
| Pairing | **QR code** (server shows URL+token, app scans) |
| Distribution | **Prebuilt signed APK on GitHub Releases + full source** |

---

## 3. Target architecture

```
                         Tailscale private network (your devices only)
   ┌─────────────────────────────────────────────────────────────────────┐
   │                                                                       │
   │   Windows PC                                  Android phone           │
   │   ┌───────────────────────────┐              ┌──────────────────────┐ │
   │   │  TargetGoals server        │   HTTPS/JSON │  Android app (Expo)  │ │
   │   │  (Node + Express)          │◀────────────▶│  - Daily + Overview  │ │
   │   │  - REST + /sync API        │   bearer tok │  - local SQLite cache│ │
   │   │  - QR pairing page         │              │  - sync engine       │ │
   │   │  - serves the web build    │              │  - notifications     │ │
   │   │  - SQLite file (git‑ignored)│             │  - home widget       │ │
   │   └──────────▲────────────────┘               └──────────────────────┘ │
   │              │ same API                                                 │
   │   ┌──────────┴────────────────┐                                        │
   │   │  Web app (browser, PWA)   │   localhost / Tailscale                 │
   │   │  - offline cache + sync   │                                        │
   │   └───────────────────────────┘                                        │
   └─────────────────────────────────────────────────────────────────────┘
```

Three clients (web, Android app, Android widget) all talk to **one** local
server. The server owns the database; clients keep a local cache so they work
offline and reconcile when the PC is reachable.

---

## 4. Repository layout (monorepo)

Convert the current single Vite app into an **npm‑workspaces** monorepo so the
date/stats/types logic is shared, not copy‑pasted:

```
targetgoals-tasks/
├─ package.json                 # workspaces root
├─ packages/
│  └─ shared/                   # pure TS: types, date helpers, stats, sync types
│     └─ src/{types,dates,stats,sync}.ts   # moved from current src/lib + types.ts
├─ apps/
│  ├─ web/                      # the existing Vite React app (refactored)
│  ├─ server/                   # Node + Express + SQLite
│  └─ mobile/                   # Expo (React Native) Android app + widget
├─ docs/
│  └─ PLAN.md                   # this file
└─ .github/workflows/           # CI: build web, build & sign APK, attach to Release
```

The current `src/lib/dates.ts`, `src/lib/stats.ts`, and `src/types.ts` become the
**`shared`** package, consumed by web, server, and mobile — the streak/heatmap
math lives in exactly one place.

---

## 5. Data model & sync

### 5.1 Tables (SQLite, via Drizzle ORM)
Relational versions of today's data, **plus sync columns**:

- `lists(id, name, created_at, updated_at, deleted)`
- `tasks(id, list_id, title, notes, due, starred, completed, completed_at, created_at, updated_at, deleted)`
- `daily_tasks(id, title, archived, created_at, updated_at, deleted)`
- `daily_completions(id, daily_task_id, date_key, created_at, updated_at, deleted)`
  *(replaces the `dailyLog` map — one row per (habit, day) completion; easy to sync)*
- `settings(key, value, updated_at)` — reminder time, server timezone, etc.

Every row carries:
- `updated_at` (ms epoch) — for conflict resolution
- `deleted` (0/1) — **tombstones** so deletes propagate to other devices

### 5.2 Sync protocol (offline‑first, single‑user → last‑write‑wins)
- **Pull:** `GET /api/sync?since=<ms>` → all rows with `updated_at > since` (incl. tombstones).
- **Push:** `POST /api/sync` with the client's locally‑changed rows.
- **Conflict:** highest `updated_at` wins (safe because it's a single user).
- Client stores `lastSyncedAt`; runs sync on app open, on change (debounced), and
  periodically. Fully usable offline; queue flushes when the server is reachable.

### 5.3 Daily reset & timezone
- "Today" is the **device‑local date key** (`YYYY‑MM‑DD`), exactly as now.
- Server records a `timezone` setting; PC and phone in the same zone roll over
  together. (Documented assumption; revisit only if you travel across zones mid‑day.)

### 5.4 One‑time migration from today's localStorage
- The web app gets an **"Import local data"** action that reads the existing
  `tally-store-v1` blob and POSTs it to the server, so your current tasks/streak
  carry over. After import, the web app uses the server as source of truth.

---

## 6. Auth & pairing

- On first run the **server generates a random API token** and stores it in a
  **git‑ignored** `.env` / config file (never committed).
- All `/api/*` calls require `Authorization: Bearer <token>`.
- **QR pairing:** the server hosts a `/pair` page showing a QR that encodes
  `{ serverUrl (Tailscale), token }`. The Android app scans it once and saves both
  to secure storage (`expo-secure-store`). Manual entry is the fallback.
- The web app, served by the same server, gets the token via a same‑origin httpOnly
  cookie on the `/pair` page (or is simply trusted on `localhost`).
- Because the APK is generic, **no URL/token is baked into the build** — pairing is
  what makes one APK work for every self‑hoster.

---

## 7. Networking (Tailscale)

- Install Tailscale on the PC and the phone; both join your **tailnet**.
- The server binds to the Tailscale interface; the app uses the PC's Tailscale
  hostname (e.g. `http://your‑pc.tailnet‑name.ts.net:4000`) — works on cellular,
  no router config, encrypted.
- LAN still works at home automatically.
- **Constraint:** the PC must be **awake** to sync. Offline‑first means the phone
  keeps working and reconciles when the PC is next reachable. (Optional later:
  Wake‑on‑LAN, or host the server on an always‑on mini‑PC/Raspberry Pi.)

---

## 8. Server runtime on Windows

- Package as an **auto‑start background service** so it survives reboots and runs
  without a console window. Options, in order of preference:
  1. **`node-windows`** (or **NSSM**) to register a real Windows Service.
  2. A **Task Scheduler** task triggered "at log on".
- Ship a one‑command setup script (`npm run install-service`) plus uninstall.
- Logs to a rotating file under the (git‑ignored) data directory.

---

## 9. Android app (Expo / React Native)

- **Expo** managed workflow with a **dev/prod build** (not Expo Go, because we need
  native modules for the widget + notifications).
- **v1 screens:** Daily checklist, Overview (stat cards + heatmap), Settings
  (pairing, reminder time). Regular multi‑list tasks come later.
- **Offline cache:** `expo-sqlite` mirroring the server schema (Drizzle supports
  expo‑sqlite, so the **same schema** is reused) + the shared sync engine.
- **Celebrations:** reuse the "hot streak / perfect day" popups (shared logic).
- **State/UX:** mirror the web components; share types & stats via `packages/shared`.

---

## 10. Home‑screen widget

- Built with **`react-native-android-widget`** (declarative widget UI from JS).
- **Read‑only** (per decision), two sizes:
  - **Small:** streak number + today's `X / Y` progress ring/bar.
  - **Medium/large:** the same stats **plus** today's daily‑task list with
    check/uncheck status (display only).
- **Tap anywhere → opens the app.**
- **Refresh:** a periodic `WorkManager` task updates the widget from the local
  SQLite cache (Android min interval ~15–30 min); it also refreshes right after the
  app makes changes. No network needed to render — it reads the cache.

---

## 11. Notifications (local, on‑device)

Use **`expo-notifications`** with **locally scheduled** notifications (reliable
under Android Doze; no server push needed):

- **Daily reminder:** configurable time (default e.g. 9:00 AM) — "Log your daily
  tasks." Skipped if everything's already done.
- **Streak‑at‑risk:** an evening check (default e.g. 8:00 PM) that fires only if
  today isn't logged and a streak is on the line.
- Both computed from the **local cache**, so they work even if the PC is offline.
- Respect OEM battery‑optimization caveats; surface a one‑time "allow background"
  hint in Settings.

---

## 12. Open source & data privacy

- **MIT** license stays.
- `.gitignore` additions: `*.sqlite`, `*.sqlite-*`, `*.db`, `.env`, `data/`,
  `*.keystore`, `*.jks`, build artifacts.
- Provide **`.env.example`** (no secrets) and a **self‑hosting guide** in the README:
  install Node, run the server, install the service, join Tailscale, scan the QR.
- The repo ships **only code** — every self‑hoster's tasks live in *their* local DB.

---

## 13. Build & distribution

- **APK build:** local Gradle (Android SDK on Windows) **or** Expo **EAS Build**
  (cloud, no local Android SDK needed). EAS is the lower‑friction default.
- **Signing:** a release keystore kept **out of git** (and in CI secrets).
- **GitHub Releases:** CI builds the signed APK on tag push and attaches it, so
  others can download‑and‑install; source is always available to build their own.
- **CI (`.github/workflows`):** lint + typecheck + `web` build + `mobile` APK build.

---

## 14. Phased roadmap

> Each phase is independently shippable and leaves the app working.

- [ ] **Phase A — Monorepo & shared package.** Convert to npm workspaces; extract
  `types/dates/stats` into `packages/shared`. *No user‑visible change.*
- [ ] **Phase B — Server.** Express + SQLite (Drizzle) schema, REST + `/sync`, token
  auth, `/pair` QR page. Seed/migrate tooling.
- [ ] **Phase C — Web on server.** Refactor web persistence from localStorage →
  API + offline cache; keep PWA; add the **one‑time localStorage import**.
- [ ] **Phase D — Windows service + Tailscale.** Auto‑start service scripts; docs
  for joining the tailnet and finding the server URL.
- [ ] **Phase E — Android app.** Expo app: Daily + Overview, expo‑sqlite cache,
  shared sync engine, QR pairing, celebrations.
- [ ] **Phase F — Widget.** `react-native-android-widget` (two sizes), WorkManager
  refresh, tap‑to‑open.
- [ ] **Phase G — Notifications.** Daily reminder + streak‑at‑risk (local schedule),
  Settings controls.
- [ ] **Phase H — Build & release.** Keystore, EAS/Gradle APK, GitHub Releases, CI,
  self‑hosting README.
- [ ] **Later — Android task lists** (parity with web), Wake‑on‑LAN, optional
  multi‑user.

---

## 15. Risks & constraints

- **PC must be awake to sync.** Mitigated by offline‑first; long‑term option is an
  always‑on host (Pi/mini‑PC) or Wake‑on‑LAN.
- **Android widget update cadence** is OS‑limited (~15 min minimum); fine for a
  read‑only widget, and it refreshes immediately after in‑app changes.
- **Background notification reliability** varies by phone vendor (battery killers);
  we use scheduled local notifications and a setup hint to minimize misses.
- **Building/signing an APK on Windows** needs JDK + Android SDK, or EAS Build
  (cloud). EAS chosen as the default to avoid local toolchain pain.
- **Single‑user assumption** underpins last‑write‑wins sync; revisit before any
  multi‑user feature.

---

## 16. Open questions to confirm before/while building

1. **Server port & name** (default `:4000`, hostname via Tailscale) — any preference?
2. **Reminder default times** (proposed 9:00 AM daily, 8:00 PM streak‑at‑risk).
3. **EAS Build vs local Gradle** for the APK — comfortable installing the Android
   SDK locally, or prefer Expo's cloud builds?
4. **Always‑on hosting** — happy relying on your PC, or eventually move the server
   to a Raspberry Pi / mini‑PC so it's up 24/7?
5. **Heatmap/Overview on a small phone screen** — keep the full 18‑week grid or a
   compact range on mobile?
```
