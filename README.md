# Tally

A local-first, open-source task manager inspired by Google Tasks — with a twist:
a **daily tasks** list that resets every day and tracks your completions over time
in a Claude-style **Overview** (streaks, active days, and a contribution heatmap).

Everything is stored in your browser's `localStorage`. There is no backend, no
account, and no data leaves your machine.

| Tasks | Daily | Overview |
| --- | --- | --- |
| Classic lists with notes, due dates & stars | Recurring habits that reset daily | Streaks + activity heatmap |

## Features

- **Task lists** — create multiple lists, add tasks, notes, due dates, and stars,
  just like Google Tasks. Completed tasks collapse into a "Completed" section.
- **Daily tasks** — define recurring habits (e.g. *Exercise*, *Read*) that reset
  to unchecked every day at local midnight. Each day's completions are logged
  forever.
- **Overview dashboard** — total completions, active days, current & longest
  streaks, daily average, best day, and a GitHub/Claude-style activity heatmap.
- **Local & private** — all data persists in `localStorage`. Export is as simple
  as copying the `tally-store-v1` key.

## Tech stack

- [Vite](https://vite.dev/) + [React 18](https://react.dev/) + TypeScript
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
streaks and the heatmap. See [`src/store.ts`](src/store.ts) and
[`src/lib/stats.ts`](src/lib/stats.ts).

## Project structure

```
src/
  App.tsx              # layout shell
  store.ts             # Zustand store + localStorage persistence
  types.ts             # shared data types
  lib/
    dates.ts           # local-timezone date helpers
    stats.ts           # streak / heatmap computation
  components/
    Sidebar.tsx
    TasksScreen.tsx    # classic task list view
    TaskItem.tsx
    TaskDetail.tsx     # notes / due date / star / delete panel
    DailyScreen.tsx    # recurring daily checklist
    OverviewScreen.tsx # stat cards + heatmap
    Heatmap.tsx
    Icons.tsx
```

## Publishing to GitHub

This repo is initialized locally. To publish it:

```bash
# create a repo on github.com, then:
git remote add origin https://github.com/<you>/tally.git
git branch -M main
git push -u origin main
```

Or with the GitHub CLI: `gh repo create tally --public --source=. --push`.

## License

[MIT](LICENSE)
