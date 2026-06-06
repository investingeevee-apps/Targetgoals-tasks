<div align="center">

# TargetGoals Tasks

**Tasks and daily habits with streaks — private, offline, no account needed.**

A clean, open‑source task & habit tracker for **web** and **Android**. Your data lives
on your device; multi‑device sync via a server you run yourself is entirely optional.

[Website](https://targetgoals.ca) · [Privacy](https://targetgoals.ca/privacy.html) · [MIT License](LICENSE)

</div>

---

## What it does

| Goals | Today | Tasks | Overview |
| --- | --- | --- | --- |
| Set a goal, break it into milestones + habits, track **progress** | Habits **and** tasks scheduled for today | Lists, tasks, due dates, stars, inline **subtasks** | **Streaks** + a completion **heatmap** |

- **Goals** — set a goal and choose how to measure it (steps, a number, or daily habits),
  then **break it down** into milestones and linked habits. Watch a **progress ring**, an
  **on‑track / behind** read, a target‑date countdown, and (for number goals) a
  **projected finish date**. A 🏆 celebration when you reach it.
- **Today** — one place for the day: your recurring **habits** plus any **tasks scheduled
  for today**. Schedule a task for a one‑time date (carries over if overdue) or a repeat
  (daily / specific weekdays / monthly) with per‑occurrence completion.
- **Task lists** — multiple lists; tasks with notes, due dates, and stars. Subtasks show
  **inline** as an expandable checklist, and tasks/subtasks can be **reordered**
  (drag‑and‑drop on web, move buttons on mobile).
- **Daily habits** — recurring habits that reset each day; every day's completions are
  recorded forever, feeding your streaks.
- **Overview** — total completions, active days, current & longest streaks, best day, a
  GitHub/Claude‑style activity heatmap, and a **goals progress summary**.
- **Streak & goal celebrations** — a pop when you log your first habit, a bigger one when
  you finish them all, and a trophy moment when you achieve a goal.
- **Private & offline‑first** — everything works with no account and no connection. Data
  is stored locally on the device.
- **Local backup** — export/restore your data so you never lose it (mobile).
- **Optional self‑hosted sync** — run your own tiny server to keep a desktop browser, an
  installable PWA, and the Android app in sync — reachable anywhere over
  [Tailscale](https://tailscale.com), with your data never leaving your machines.
- **Installable** — the web app is a PWA; the Android app has a read‑only home‑screen
  **widget** and opt‑in **reminders**, and updates over‑the‑air.

## Platforms

- **Web / desktop** — a Vite + React PWA. Install it from the browser address bar.
- **Android** — an Expo / React Native app (offline‑first, optional QR pairing, widget,
  reminders, OTA updates). Heading to the Play Store as a public, offline‑first app — see
  [`docs/PLAY-STORE.md`](docs/PLAY-STORE.md).

## Privacy

TargetGoals Tasks stores your data **on your device**. The project runs no servers and
collects nothing — no accounts, no ads, no analytics. The optional sync feature sends data
only to a server **you** run and control. Full policy:
[targetgoals.ca/privacy.html](https://targetgoals.ca/privacy.html).

## Run it locally

Requires Node.js 18+ (developed on Node 24). It's an **npm‑workspaces monorepo** — run
scripts from the repo root.

```bash
npm install            # installs all workspaces; builds @targetgoals/shared
npm run dev            # web dev server  -> http://localhost:5173
npm run build          # production web build into apps/web/dist
npm test               # shared streak/date unit tests
```

The web app works **standalone** (local storage) with no server. To sync across devices,
run the optional server below.

## Android app

`apps/mobile` is an Expo (SDK 54) / React Native app. Quick run: `npm run dev:mobile` then
scan with **Expo Go**. Build an installable APK / Play AAB with **EAS** — see
[`docs/ANDROID.md`](docs/ANDROID.md). After the first build, JS/UI changes ship
**over‑the‑air** with `eas update` (no reinstall). Day‑to‑day workflow — OTA vs rebuild,
versioning, releases — is in [`docs/MANAGING.md`](docs/MANAGING.md).

## Optional sync server (multi‑device)

`apps/server` is a self‑hostable sync server (Express + libSQL/Drizzle). Your data lives in
a git‑ignored SQLite file; a bearer token is generated on first run. Offline‑first delta
sync (`updatedAt` + tombstones, last‑write‑wins).

```bash
npm run dev:server     # http://localhost:4000
# open http://localhost:4000/pair to scan/copy the pairing QR + token
```

Then connect a client: in the web app's **Sync settings** (or the mobile **Settings** tab)
scan the QR or paste the URL + token. To keep the server running and reach it from your
phone anywhere (Windows auto‑start, Tailscale, HTTPS), see
[`docs/SELF-HOSTING.md`](docs/SELF-HOSTING.md).

API: `GET /api/health` (open) · `POST /api/sync` (push+pull) · `GET /api/sync?since=` ·
`GET /api/state` · `GET /pair`. All `/api/*` except health require
`Authorization: Bearer <token>`.

## How the daily reset works

Completing a daily habit writes a **completion** row tagged with today's date; the
checkbox is simply "is there a completion for this habit today?" When the date rolls over,
the list shows empty again while every past day stays recorded. The Overview derives
streaks and the heatmap from those completions. See
[`packages/shared/src/stats.ts`](packages/shared/src/stats.ts) and the stores in
`apps/web` / `apps/mobile`.

## Tech stack

- **Shared** — `@targetgoals/shared`: framework‑agnostic types, local‑timezone date
  helpers, and streak/heatmap stats (with unit tests).
- **Web** — [Vite](https://vite.dev/) + [React 19](https://react.dev/) + TypeScript +
  [Tailwind](https://tailwindcss.com/) + [Zustand](https://github.com/pmndrs/zustand)
  (persist) + vite‑plugin‑pwa. Drag‑and‑drop via @dnd‑kit.
- **Server** — Node + Express + [libSQL](https://github.com/tursodatabase/libsql) +
  [Drizzle ORM](https://orm.drizzle.team/); bearer‑token auth; QR pairing.
- **Mobile** — Expo SDK 54 / React Native 0.81 / React 19; AsyncStorage; expo‑camera (QR),
  expo‑notifications, expo‑updates (OTA), react‑native‑android‑widget.

## Project structure

```
packages/
  shared/        # @targetgoals/shared — types, dates, streak/heatmap stats (+ tests)
apps/
  web/           # @targetgoals/web — Vite + React PWA
  server/        # @targetgoals/server — Express + libSQL/Drizzle sync server
  mobile/        # @targetgoals/mobile — Expo / React Native Android app
docs/            # plan, self-hosting, Android, managing, Play Store guides
store-assets/    # Play Store icon + feature graphic
```

## Docs

- [`docs/PLAN.md`](docs/PLAN.md) — architecture & roadmap
- [`docs/SELF-HOSTING.md`](docs/SELF-HOSTING.md) — run the server, Tailscale, HTTPS
- [`docs/ANDROID.md`](docs/ANDROID.md) — Expo Go, EAS builds, pairing
- [`docs/MANAGING.md`](docs/MANAGING.md) — day‑to‑day: OTA vs APK, versioning, server
- [`docs/RELEASING.md`](docs/RELEASING.md) — automated APK releases via GitHub Actions
- [`docs/PLAY-STORE.md`](docs/PLAY-STORE.md) · [`docs/PLAY-SUBMISSION.md`](docs/PLAY-SUBMISSION.md) · [`docs/STORE-LISTING.md`](docs/STORE-LISTING.md) · [`docs/DATA-SAFETY.md`](docs/DATA-SAFETY.md) — Play Store

## Continuous integration

GitHub Actions build + typecheck + run unit tests on every push/PR, and (on a `v*` tag)
build the Android APK on EAS and attach it to the Release.

## License

[MIT](LICENSE)
