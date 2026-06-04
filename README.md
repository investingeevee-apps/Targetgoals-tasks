# TargetGoals Tasks

A local-first, open-source task manager inspired by Google Tasks — with a twist:
a **daily tasks** list that resets every day and tracks your completions over time
in a Claude-style **Overview** (streaks, active days, and a contribution heatmap).

Use it **solo** (all local, no account, no backend), or run your own tiny **sync
server** to keep a desktop browser, an installable PWA, and an **Android app** (with a
home‑screen widget + reminders) in sync — reachable from anywhere over **Tailscale**,
with your data never leaving your machines.

| Tasks | Daily | Overview |
| --- | --- | --- |
| Classic lists with notes, due dates & stars | Recurring habits that reset daily | Streaks + activity heatmap |

## Get started

1. **Run it / install it on your computer.** `npm install`, `npm run build`, then start
   the server (`npm run start:server`) and open **http://localhost:4000**. In Chrome/Edge,
   use the address‑bar **install** icon to pin it to your desktop as an app. (Or just
   `npm run dev` for the dev server.)
2. **Keep the server running** so the desktop app and phone always work — auto‑start at
   login, no admin: `npm run startup:install -w @targetgoals/server`.
3. **Pair your phone.** Install the Android app (Releases / [docs/ANDROID.md](docs/ANDROID.md)),
   then in the desktop app's **Sync settings** show the pairing **QR** (enter your LAN IP
   or Tailscale URL so the phone can reach it) and scan it from the app.
4. **Reach it from anywhere** with [Tailscale](https://tailscale.com) — see
   [docs/SELF-HOSTING.md](docs/SELF-HOSTING.md). The in‑app **Setup & Help** page walks
   through all of this too.

## Features

- **Task lists** — create multiple lists, add tasks, notes, due dates, and stars,
  just like Google Tasks. Completed tasks collapse into a "Completed" section.
- **Daily tasks** — define recurring habits (e.g. *Exercise*, *Read*) that reset
  to unchecked every day at local midnight. Each day's completions are logged
  forever.
- **Overview dashboard** — total completions, active days, current & longest
  streaks, daily average, best day, and a GitHub/Claude-style activity heatmap.
- **Hot streak popups** — a celebration when you log your first daily task of
  the day, and a bigger confetti moment when you complete *all* of them.
- **Local & private** — all data persists in `localStorage`. Export is as simple
  as copying the `tally-store-v1` key.

## Android app

`apps/mobile` is an Expo / React Native app (Daily + Overview, offline-first, QR
pairing, home-screen widget, local reminders) that syncs with your server. Quick run:
`npm run dev:mobile` then scan with **Expo Go**. Build a sideloadable APK with EAS — see
**[docs/ANDROID.md](docs/ANDROID.md)**. Releases are automated via GitHub Actions
(**[docs/RELEASING.md](docs/RELEASING.md)**): push a `v*` tag and the APK is built on EAS
and attached to the GitHub Release.

## Tech stack

- [Vite](https://vite.dev/) + [React 19](https://react.dev/) + TypeScript
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [Zustand](https://github.com/pmndrs/zustand) (with the `persist` middleware) for
  state and localStorage persistence

## Run it locally

```bash
# install dependencies
npm install

# start the dev server (http://localhost:5173)
npm run dev

# build a production bundle into dist/
npm run build

# preview the production build
npm run preview
```

Requires Node.js 18+ (developed on Node 24).

## How the daily reset works

A daily task is never "completed" permanently. Instead, completing one writes its
id into `dailyLog[today]`. The checklist's checked state is simply "is this task in
today's log?" — so when the date rolls over to a new day, the list shows up empty
again while every past day stays recorded. The Overview reads `dailyLog` to compute
streaks and the heatmap. See [`apps/web/src/store.ts`](apps/web/src/store.ts) and
[`packages/shared/src/stats.ts`](packages/shared/src/stats.ts).

## Project structure

This is an **npm-workspaces monorepo**. Today it holds the shared core and the web
app; the server and Android app described in [`docs/PLAN.md`](docs/PLAN.md) will be
added as `apps/server` and `apps/mobile`.

```
packages/
  shared/                # @targetgoals/shared — framework-agnostic core
    src/
      types.ts           # shared data types
      dates.ts           # local-timezone date helpers
      stats.ts           # streak / heatmap computation
      index.ts           # barrel export
apps/
  web/                   # @targetgoals/web — Vite + React client
    src/
      App.tsx            # layout shell
      store.ts           # Zustand store + localStorage persistence
      components/
        Sidebar.tsx
        TasksScreen.tsx     # classic task list view
        TaskItem.tsx
        TaskDetail.tsx      # notes / due date / star / delete panel
        DailyScreen.tsx     # recurring daily checklist
        OverviewScreen.tsx  # stat cards + heatmap
        Heatmap.tsx
        Celebration.tsx     # hot-streak / perfect-day popups
        Icons.tsx
docs/
  PLAN.md                # roadmap: self-hosted sync, Android app & widget
```

Run `npm install`, `npm run dev`, and `npm run build` from the **repo root** — the
workspace scripts delegate to the web app (and build `@targetgoals/shared` first).

### Sync server (optional, for multi-device)

`apps/server` is a self-hostable sync server (Express + libSQL/Drizzle) so the web
app and the upcoming Android app can share one source of truth. Your data lives in a
git-ignored SQLite file; a bearer token is generated on first run.

```bash
# (optional) configure: copy apps/server/.env.example -> apps/server/.env
npm run dev:server        # start on http://localhost:4000
# then open http://localhost:4000/pair to scan/copy the pairing QR + token
```

To keep it running and reach it from your phone anywhere, see
**[docs/SELF-HOSTING.md](docs/SELF-HOSTING.md)** — Windows auto-start
(`npm run service:install -w @targetgoals/server`), Tailscale, and HTTPS setup.

Running it day-to-day — publishing updates (OTA vs APK), versioning, and the
server — is covered in **[docs/MANAGING.md](docs/MANAGING.md)**.

Endpoints: `GET /api/health` (open), `POST /api/sync` (push+pull), `GET /api/sync?since=`
(pull), `GET /api/state`, and `GET /pair`. All `/api/*` except health require
`Authorization: Bearer <token>`. See [`docs/PLAN.md`](docs/PLAN.md) for the full
architecture (Tailscale, HTTPS, offline-first clients).

**Connecting the web app:** start the server, run the web app, then click the status
chip at the bottom of the sidebar (“Local only”) → enter the server URL + token from
`/pair` → **Connect**. The web app is **offline-first**: it keeps working with no
connection and syncs (last-write-wins) when the server is reachable. Existing
single-device data is offered as a one-time **import**.

## Publishing to GitHub

This repo is initialized locally. To publish it:

```bash
# create a repo on github.com, then:
git remote add origin https://github.com/<you>/targetgoals-tasks.git
git branch -M main
git push -u origin main
```

Or with the GitHub CLI: `gh repo create targetgoals-tasks --public --source=. --push`.

## License

[MIT](LICENSE)
