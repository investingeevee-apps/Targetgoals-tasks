# Product Requirements Document — TargetGoals Tasks

**Status:** Living document · **Owner:** TargetGoals · **Last updated:** 2026-06-07
**Version:** v0.2 (Goals + Today release)
**Related docs:** [`PLAN.md`](PLAN.md) · [`GOALS-PLAN.md`](GOALS-PLAN.md) · [`SCHEDULED-TASKS-PLAN.md`](SCHEDULED-TASKS-PLAN.md) · [`SELF-HOSTING.md`](SELF-HOSTING.md) · [`STORE-LISTING.md`](STORE-LISTING.md) · [`DATA-SAFETY.md`](DATA-SAFETY.md)

---

## 1. Overview

**TargetGoals Tasks** is an open-source, self-hostable, offline-first task and habit
tracker that helps people **break big goals down into the daily actions that achieve
them**. It runs as a web app (PWA) and a native Android app, syncing privately between a
user's own devices via a server they host themselves — no third-party cloud, no account
with us, no ads, no telemetry.

The product's distinguishing promise is the **goal → daily-action loop**: a user sets a
goal, decomposes it into milestones and recurring habits, schedules the work into a
"Today" view, and watches measurable progress climb — all while owning 100% of their data.

### One-line positioning
> The private, offline-first system that turns your goals into daily tasks — and gets you
> to the finish line. Habit tracker + goal planner + to-do list, all self-hosted.

---

## 2. Problem & opportunity

### Problems we solve
1. **Goals stay abstract.** Most to-do apps capture tasks but never connect them to the
   outcome the user actually wants. Daily check-offs feel arbitrary.
2. **Habit and task tracking are siloed.** Users juggle a habit app, a to-do app, and a
   notes app, none of which share a model of "what am I working toward?"
3. **Privacy & lock-in.** Popular trackers are cloud-only, monetize user data, gate core
   features behind subscriptions, and can disappear or change terms at any time.
4. **No real offline ownership.** "Sync" usually means "our servers." Users can't keep
   their data on hardware they control.

### Why now / why us
- A growing audience wants **self-hosted, privacy-respecting** software (the Tailscale /
  homelab / "own your data" movement).
- Offline-first sync (last-writer-wins on timestamped rows) is now well-understood and can
  be implemented reliably by a small team.
- The combination — **goal decomposition + habits + tasks + self-hosting** in one app — is
  not well served by existing products.

---

## 3. Goals & non-goals

### Product goals
- **G1.** Make goal decomposition the core loop: set a goal → break into milestones &
  habits → act daily → see progress.
- **G2.** Be genuinely **offline-first**: fully usable with no network; sync is additive.
- **G3.** Give users **full data ownership** via self-hosting, export, and an open codebase.
- **G4.** Deliver a **fast, polished** experience on both web and Android.
- **G5.** Reach users on the **Google Play Store** with a credible, privacy-forward listing.

### Non-goals (for now)
- **NG1.** A hosted multi-tenant SaaS we operate on users' behalf. (Single-tenant,
  self-hosted only.)
- **NG2.** iOS app. (Architecturally feasible via React Native, but out of current scope —
  no Apple Developer account / bundle identifier configured.)
- **NG3.** Team/collaboration features (shared lists, assignment, comments).
- **NG4.** Built-in analytics/telemetry of user behavior. (We collect nothing.)
- **NG5.** A marketplace, plugins, or third-party integrations.

---

## 4. Target users & personas

**Primary persona — "The Self-Improver who owns their stack."**
Tech-comfortable individual (developer, homelabber, privacy-conscious professional) who
already runs a home server or uses Tailscale, wants to track goals/habits/tasks, and
refuses cloud lock-in. Values: privacy, control, polish, no subscriptions.

**Secondary persona — "The Goal-Driven Planner."**
Someone with a concrete ambition (run a half marathon, read 24 books, learn a skill, save
money) who wants structure: a place to define the goal and see the daily steps that get
them there. May not self-host initially — uses the app on a single device, syncs later.

**Tertiary persona — "The Privacy-First Minimalist."**
Wants a clean to-do + habit app that simply doesn't phone home. Uses a subset of features.

### Top jobs-to-be-done
- "When I set an ambitious goal, I want to break it into concrete daily steps so it feels
  achievable and I make steady progress."
- "When I plan my day, I want one screen that shows everything due today so I know exactly
  what to do."
- "When I track habits, I want to see streaks and consistency so I stay motivated."
- "When I use a productivity app, I want my data to stay on hardware I control."

---

## 5. Product principles
1. **Offline-first, always.** Every action works with no network. Sync never blocks the UI.
2. **The user owns the data.** Local-first storage, self-hosted sync, full export/import,
   open source.
3. **Goals give daily work meaning.** Every habit/task can point back to a goal.
4. **Calm, not noisy.** No dark patterns, no streak-shaming, no manipulative nudges.
5. **Fast and small.** Snappy interactions; minimal dependencies; quick installs.
6. **Honest privacy.** We collect nothing; the Play Data Safety form reflects that exactly.

---

## 6. Scope — feature set

### 6.1 Shipped (v0.1 → v0.2)

**Tasks & lists**
- Multiple lists; create/rename/delete.
- Tasks with title, notes, due date, star/priority, completed state.
- **Subtasks** with inline accordion display and progress (`☑ 2/5`), reorderable.
- Drag-and-drop reordering of tasks and subtasks.
- Clear-completed; completed section.

**Habits (daily/recurring actions)**
- Recurring daily habits with per-day completion.
- **Streaks** and completion history.
- Overview heatmap and stats (total completed, active days, current/longest streak,
  tracked habits, best day, daily average, completion %).

**Goals (v0.2 — flagship)**
- First-class `Goal` with title, why/motivation, optional target date.
- **Three progress modes**, full-hybrid: **milestones** (`done/total`), **metric**
  (`current/target` with progress log + pace/ETA), **habit consistency**.
- **Break-it-down**: milestones = tasks linked by `goalId`; habits linked by `goalId`.
- Goal detail: progress ring, on-track / behind / ahead-of-pace chip, target-date
  countdown, linked-habit streak, milestone checklist, linked-habit management
  (toggle, inline rename, delete, link/unlink), metric update.
- Create flow with mode selection; **goal-achieved celebration**.
- **Goals tab** + compact **Overview** goals summary.
- Goal chips on linked tasks/habits ("◎ Goal") that jump to the goal.

**Today / scheduling (v0.2)**
- Renamed **Daily → Today**: one screen for everything due today.
- **Scheduled tasks**: one-time "Plan for" date (carry over until done) or **recurrence**
  (daily / weekly weekdays / monthly day-of-month).
- `Today` agenda merges scheduled one-time tasks (overdue-first carry-over) and repeating
  occurrences, plus today's habits.
- Per-occurrence completion for repeating tasks.

**Sync & data ownership**
- Offline-first sync: timestamped DTO rows (epoch-ms `updatedAt`, last-writer-wins),
  `deleted` tombstones, dirty-tracking, push/pull via `/api/sync`.
- Bearer-token auth; **QR-code device pairing**; designed for **Tailscale** private
  networking.
- **Export / import** of all data (lists, tasks, habits, completions, goals, scheduled
  completions) as a backup file.
- Self-hostable server (Express + libSQL/SQLite + Drizzle); idempotent schema migrations.

**Platforms & delivery**
- **Web PWA** (installable; responsive layout with desktop sidebar + mobile bottom-nav).
- **Android app** (Expo / React Native) with home-screen **widget** reflecting the live,
  reordered Today list.
- OTA updates (EAS Update) for JS changes; native builds via EAS Build.
- Brand: logo + favicon + wordmark; brand colors `#1E84E3` (blue) / `#E37D1E` (orange).
- Marketing site at **targetgoals.ca** (GitHub Pages) with privacy policy.

### 6.2 Planned / backlog (not yet built)
- Goal **starter templates** ("Get fit", "Read more", "Learn a skill", "Save money").
- **Weekly review** ("you moved 3 goals forward this week").
- **Stall nudges** & deadline reminders (reusing opt-in notifications).
- **Achieved / archive** trophy shelf for completed goals.
- Metric **trend line** visualization from the progress log.
- "Today, for your goals" grouping of daily actions by goal.
- Richer recurrence (every-N-days, end dates, skip/snooze an occurrence).

### 6.3 Explicitly out of scope (this cycle)
Team collaboration, iOS, hosted SaaS, third-party integrations, in-app purchases.

---

## 7. Functional requirements (selected, testable)

| ID | Requirement |
|----|-------------|
| FR-1 | A user can create a goal with title, optional why, optional target date, and a progress mode (milestones / metric / habits). |
| FR-2 | A user can add milestones (tasks with `goalId`) and link/unlink daily habits to a goal; toggling/renaming/deleting them updates the goal. |
| FR-3 | Goal progress % is **derived** (never stored): milestones = done/total; metric = current/target (clamped 0–100); habits = adherence over window. |
| FR-4 | For metric goals with a target date, the app shows on-track/behind/ahead status and a projected finish date from the progress pace. |
| FR-5 | A user can schedule a task for a one-time date (carries over until completed) or a recurrence (daily / weekly weekdays / monthly day). Scheduling a recurrence clears any one-time date and vice-versa (mutually exclusive). |
| FR-6 | The **Today** view shows: habits for today, scheduled one-time tasks due ≤ today (overdue first), and today's recurring occurrences. |
| FR-7 | All create/edit/delete actions work fully offline and are queued as dirty for the next sync. |
| FR-8 | Sync merges by id using `updatedAt` (last-writer-wins) and honors `deleted` tombstones; a locally-dirty row is not overwritten by an older server copy. |
| FR-9 | A user can export all data to a file and re-import it, with goals and scheduled completions included. |
| FR-10 | The web app is responsive: sidebar layout ≥768px; bottom-tab layout, full-screen task detail, and list-switcher <768px. |
| FR-11 | The Android home-screen widget reflects the current, reordered Today list. |
| FR-12 | Display version (store version name) is decoupled from the OTA `runtimeVersion`, so version names can change without breaking OTA compatibility. |

---

## 8. Non-functional requirements

- **Privacy:** Zero data collection by the publisher. No analytics SDKs, no ad SDKs, no
  third-party network calls except the user's own sync server. Play **Data Safety** form
  must state "no data collected / no data shared."
- **Security:** Bearer-token auth with timing-safe comparison; rate-limited pairing
  endpoint; scoped CORS; server input validation (id length, finite/positive timestamps,
  reject future-dated rows beyond skew); secrets (token, service-account key, db) never
  committed (gitignored).
- **Offline & performance:** App is interactive offline; UI actions feel instant
  (optimistic local writes); first load is fast (PWA precache).
- **Reliability:** Sync is idempotent and convergent; `applyChanges` is transactional;
  schema migrations are additive and idempotent (`addColumnIfMissing`).
- **Accessibility:** Sufficient contrast on the dark theme; tappable targets sized for
  mobile; keyboard-operable web inputs.
- **Compatibility:** Modern evergreen browsers (PWA); Android via Expo SDK 54 / RN 0.81.
- **Maintainability:** Pure business logic in `@targetgoals/shared` with unit tests
  (Node test runner via tsx); TypeScript across the monorepo.
- **Licensing:** Open source; self-hosting documented.

---

## 9. Architecture & data model (summary)

**Monorepo (npm workspaces):**
- `packages/shared` (`@targetgoals/shared`) — types + pure logic (sync merge, recurrence,
  goal progress/pace, today-agenda) with unit tests.
- `apps/web` — Vite + React 19 + Tailwind + Zustand + vite-plugin-pwa.
- `apps/server` — Express + libSQL (SQLite) + Drizzle; `/api/sync`, `/pair`.
- `apps/mobile` — Expo SDK 54 / React Native 0.81 / React 19 + home-screen widget.

**Core entities** (all carry `id`, `updatedAt` epoch-ms, `deleted`, and usually `order`):
- `ListDTO`, `TaskDTO` (+ `subtasks`, optional `goalId` / `scheduledDate` / `recurrence`),
  `DailyTaskDTO` (habit, optional `goalId`), `DailyCompletionDTO`,
  `GoalDTO` (`progressMode`, metric fields, embedded `progressLog`, `status`),
  `ScheduledCompletionDTO` (per-occurrence completion of repeating tasks).

**Sync model:** local store is source of truth; dirty rows are pushed; server returns
changes since a cursor; client merges last-writer-wins by id and applies tombstones.
Auth via bearer token; pairing via QR; transport over the user's private network
(Tailscale recommended). Progress and agendas are **derived on the client**.

---

## 10. Platforms, release & distribution

- **Web:** Built static assets served by the self-hosted server; installable PWA.
- **Android:** EAS Build (AAB for Play, APK for sideload); EAS Update channels
  `preview` / `production`; `versionCode` auto-increments; `runtimeVersion` pinned and
  decoupled from the display `version`.
- **Play Store:** Public listing, offline-first positioning. Internal testing track first,
  then production. Store assets: 512 icon, 1024×500 feature graphic, **5 phone screenshots
  (1080×1920, 9:16)**, short + full descriptions emphasizing goal-planner / habit-tracker
  keywords. Service-account key enables `eas submit` (never committed).
- **Marketing site:** targetgoals.ca (GitHub Pages, custom domain), privacy policy hosted.

---

## 11. Success metrics

Because we collect **no telemetry**, success is measured via **external, privacy-preserving
signals** only:

- **Adoption:** Play Store installs & active-device count (Play Console aggregates),
  GitHub stars/forks, self-host clone activity.
- **Quality:** Play crash-free rate / ANR rate (Play vitals), Play rating ≥ 4.3.
- **Engagement (proxy):** Play retention cohorts (D1/D7/D30) from Play Console.
- **Community:** Issues/PRs, docs traffic to targetgoals.ca.
- **Release health:** OTA update adoption velocity; build success rate.

Explicitly **not** tracked: in-app user behavior, funnels, or per-feature usage — by design.

---

## 12. Roadmap (indicative)

- **v0.2 (current):** Goals (full hybrid), Today + scheduled/recurring tasks, responsive
  web, Play internal testing, store assets.
- **v0.3:** Goal starter templates, achieved/archive shelf, metric trend line, weekly
  review summary.
- **v0.4:** Reminders & stall nudges (opt-in notifications), richer recurrence, "Today for
  your goals" grouping.
- **v1.0:** Stability, polish, accessibility pass, public Play production launch, complete
  self-hosting docs & one-command deploy.
- **Exploratory (post-1.0):** iOS (React Native already cross-platform-capable),
  encrypted backups, optional end-to-end sync hardening.

---

## 13. Risks & mitigations

| Risk | Mitigation |
|------|-----------|
| Sync data loss / divergence | Pure, unit-tested merge logic; tombstones; transactional apply; dirty rows protected from stale overwrites; export/import as a safety net. |
| Self-hosting friction limits reach | Clear `SELF-HOSTING.md`, Tailscale guide, QR pairing; secondary persona can use single-device first. |
| Play policy / Data Safety mismatch | Collect nothing; Data Safety form mirrors reality; documented in `DATA-SAFETY.md`. |
| OTA/runtime-version mistakes break updates | `runtimeVersion` pinned & decoupled from display version; release checklist in `RELEASING.md`. |
| Scope creep (teams, iOS, SaaS) | Explicit non-goals; backlog gating. |
| Single-maintainer bus factor | Open source, documented architecture, tests, planning docs. |

---

## 14. Open questions
1. Default recurrence richness for v0.3 (add every-N-days / end-dates now or later?).
2. Should metric goals support multiple sub-metrics, or stay single-number?
3. Notification delivery on web (PWA push) vs Android-native — unify or platform-specific?
4. Achieved-goals: keep contributing to Overview stats, or archive out of stats?
5. Is a guided onboarding (first-goal wizard + template) worth building before v1.0?

---

*This PRD reflects the product as built through v0.2 plus agreed direction. It is a living
document — update it as decisions land in `GOALS-PLAN.md`, `SCHEDULED-TASKS-PLAN.md`, and
the release docs.*
