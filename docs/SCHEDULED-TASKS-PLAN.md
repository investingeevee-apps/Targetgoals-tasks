# Feature plan — Scheduled tasks in Today

Let a one-off **list task** be **scheduled** so it automatically shows up in the
**Daily / Today** view on its date — sitting alongside your recurring habits. This makes
the Today view a true "here's everything for today" agenda: habits **and** the specific
tasks you planned for the day.

## 1. The idea

Today's "Daily" tab shows only recurring **habits**. This feature adds the other half of a
day: **dated one-off tasks** pulled in from your lists.

```
A task in a list  →  give it a date + "show in Today"  →  on that date it appears
in the Daily/Today view, checkable, next to your habits.
```

Unlike a habit (which resets every morning and tracks a streak), a scheduled task is a
**one-off**: checking it off completes the task for good.

## 2. Behavior

- A list task can be **scheduled for a date**. When that date is **today**, the task
  appears in the Today view (in a "Scheduled for today" section).
- **Completion:** checking it in Today completes the real task (`completed = true`) — it
  does not reset tomorrow. Unchecking re-opens it.
- **Source stays linked:** the task still lives in its list; Today is just a second place
  it surfaces. Edits/notes/subtasks/due-date all carry over.
- **Carry-over (proposed default):** if a scheduled task isn't done by its date, it keeps
  showing in Today (marked **overdue**) until it's done or rescheduled — so nothing slips.
  (Alternative: show only on the exact date — see Decisions.)
- **Goals synergy:** a goal milestone (a task with `goalId`) can be scheduled into Today
  too, so "work on my goal today" is one tap. Today view = habits + scheduled tasks
  (+ goal actions).

## 3. Usability — the flows

### 3a. Scheduling a task
On a task (web `TaskDetail` / mobile `TaskDetailModal`, and a quick action on the row):
- A **"Plan for"** control with quick picks **Today / Tomorrow / pick a date**, and a
  **"Show in Today"** toggle.
- A one-tap **"Do today"** action on any task row that schedules it for today instantly.

### 3b. The Today view
The Daily tab becomes a two-part agenda:
- **Habits** — the existing recurring checklist with streak + progress (unchanged).
- **Scheduled for today** — the dated one-off tasks, each showing its **source list**
  (and goal chip if linked), a checkbox to complete, and a **⋯** to **reschedule / snooze
  to tomorrow / remove from today**.
- Overdue scheduled tasks float to the top with an overdue tint.

### 3c. "Plan my day"
From a list (or a global view), a quick way to **pick several tasks and schedule them for
today** at once — turn a backlog into a focused today list in seconds.

### 3d. Reminders (reuses opt-in notifications)
Optional "You have N tasks scheduled for today" morning nudge, folded into the existing
notification preferences — fully opt-in.

## 4. Recurrence (later phase)

The natural extension: a scheduled task can **repeat** — every weekday, specific weekdays
(Mon/Wed/Fri), weekly, or monthly (e.g. "Pay rent on the 1st"). On each occurrence date it
appears in Today.

Note the overlap with habits: a recurring scheduled task with per-occurrence completion is
essentially a non-daily habit. To avoid duplicating concepts, recurrence is a **v2** that
either (a) extends habits to support non-daily schedules, or (b) adds a recurrence rule to
tasks with a generic per-date completion. Kept out of v1 to ship the simple, high-value
single-date version first.

## 5. Data model & sync

Additive fields on `TaskDTO` (backward-compatible; same sync pattern):
```
TaskDTO {
  ...existing...
  scheduledDate?: string | null   // 'YYYY-MM-DD' — the day it surfaces in Today
  // (recurrence?: RecurrenceRule  — v2)
}
```
- The Today view is **derived**: "scheduled tasks for today" = non-deleted, non-completed
  (or completed-today) tasks where `scheduledDate <= today` (carry-over) or `=== today`
  (exact), depending on the carry-over decision.
- No new entity for v1 — completion uses the task's existing `completed`/`completedAt`.
- Server: add a `scheduled_date` column to `tasks` via the idempotent `addColumnIfMissing`
  migration; it rides the existing `/api/sync`.
- Stores (web + mobile): a `scheduleTask(id, date)` / `unscheduleTask(id)` action, a
  `toggleScheduledToday(id)` (completes the task), and a `scheduledForToday` selector.
  persist migrate bump to backfill `scheduledDate: null`. Shared date helpers already
  cover today/compare.

## 6. Phasing

**Phase S1 — single-date scheduling (this feature)**
- `scheduledDate` on tasks + server migration + sync.
- Today view "Scheduled for today" section (with carry-over), schedule controls + "Do
  today" quick action, complete-from-today, reschedule/snooze.
- Web + mobile. Ships via OTA (mobile) / reload (web); server restart for the migration.

**Phase S2 — recurrence**
- Recurrence rules (weekdays/weekly/monthly), per-occurrence completion, recurring
  reminders, "snooze series vs occurrence". Decide habits-vs-tasks unification first.

## 7. Open decisions (confirm before building)

1. **Schedule field** — add a separate **"Plan for" date** (distinct from the existing
   *due* deadline), or **reuse the `due` date** + a "Show in Today" toggle? A separate
   field cleanly separates "when I'll do it" from "when it's due"; reuse is fewer fields.
2. **Carry-over** — should an unfinished scheduled task keep showing in Today after its
   date (overdue, until done/rescheduled), or appear **only on the exact date**?
3. **Recurrence timing** — single date in v1 (recurrence as v2), or include basic
   recurrence now?
4. **Daily tab naming** — keep **"Daily"** with a Habits + Scheduled split, or rename the
   tab to **"Today"** to reflect the combined agenda?

## 8. Relationship to other work

- **Goals:** scheduled tasks + goal milestones share the `TaskDTO` changes and the Today
  view — build the task-model migrations once and both features benefit. Sensible to
  sequence Goals' data layer and this together.
- **Habits:** keep habits (recurring, streaks) and scheduled tasks (one-off, dated)
  distinct in v1; revisit unifying them only when adding recurrence (S2).
