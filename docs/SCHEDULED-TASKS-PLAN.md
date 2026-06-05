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

## 4. Recurrence (in v1)

A scheduled task can be **one-time** (a single "Plan for" date) or **repeating**:
- **Daily**, **Weekly** on chosen weekdays (e.g. Mon/Wed/Fri), or **Monthly** on a
  day-of-month (e.g. the 1st). (Interval / end-date are easy later additions.)
- On each matching date, the task appears in Today.

**Per-occurrence completion.** A repeating task is never "done" forever — each day's
instance is its own check, exactly like a habit. Completing Tuesday's instance doesn't
touch next Tuesday. One-time scheduled tasks keep using the task's normal `completed` flag.

**Carry-over applies to one-time tasks** — an unfinished one-time scheduled task stays in
Today (overdue) until done/rescheduled. **Repeating occurrences are per-date** (like
habits): each day shows that day's instance; a missed day doesn't pile up.

> This makes a repeating scheduled task behave much like a habit, but it originates from a
> list and keeps its notes/subtasks/goal link, and lives in Today's **Scheduled** section
> rather than the **Habits** section. We keep them as separate surfaces but share the
> per-occurrence completion mechanic.

## 5. Data model & sync

`TaskDTO` additions (backward-compatible):
```
scheduledDate?: string | null            // one-time: the day it appears in Today
recurrence?: {                           // repeating (null when one-time)
  freq: 'daily' | 'weekly' | 'monthly',
  weekdays?: number[],                   // weekly: 0=Sun .. 6=Sat
  monthday?: number,                     // monthly: 1..31
} | null
```
New synced entity for repeating completions (mirrors `dailyCompletions`, so the existing
habit path is untouched):
```
ScheduledCompletionDTO { id, taskId, dateKey, createdAt, updatedAt, deleted }
```
**Today derivation:**
- one-time → tasks where `scheduledDate <= today` (carry-over) and not completed.
- repeating → tasks whose recurrence **occurs on** today AND have no occurrence completion
  for today.

Server: add `scheduled_date` + `recurrence` (JSON) columns to `tasks`, plus a new
`scheduled_completions` table — all via the idempotent DDL/`addColumnIfMissing`; they join
`/api/sync`. Stores (web + mobile): `scheduleTask` / `setRecurrence` / `unschedule`,
`toggleScheduledToday` (one-time → sets `completed`; repeating → adds/removes an occurrence
completion), and a `todayAgenda` selector. Shared `recurs.ts`: `occursOn(rule, dateKey)`
\+ unit tests. persist migrate bump (web/mobile) backfilling `scheduledDate: null`,
`recurrence: null`, and `scheduledCompletions: []`.

## 6. Build order (vertical slices)

**S1 — Data layer:** `scheduledDate` + `recurrence` on `TaskDTO`, `ScheduledCompletionDTO`,
shared `occursOn` + tests; server columns + `scheduled_completions` table + sync; verify a
one-time and a recurring task round-trip.

**S2 — Stores + engine:** schedule/recurrence actions, occurrence completions,
`todayAgenda` selector, sync wiring, persist migrate (web + mobile).

**S3 — Web UI:** rename **Daily → Today**; a **"Scheduled for today"** section (overdue
one-time carry-over + today's recurring occurrences) above/below Habits; a
schedule + recurrence editor in `TaskDetail` (None / Daily / Weekly·weekdays / Monthly·day +
"Plan for" date); a **"Do today"** row action; reschedule / snooze; **plan-my-day**.

**S4 — Mobile UI:** mirror (tab label **Today**, sections, recurrence editor, row actions);
typecheck + bundle.

**S5 — Polish & ship:** optional "N tasks scheduled today" reminder (existing opt-in
notifications), copy, docs; deploy (server restart + web reload + mobile `eas update`).

## 7. Decisions (locked)

1. **Separate "Plan for" date** — distinct from the *due* deadline.
2. **Carry-over** unfinished one-time scheduled tasks (overdue until done/rescheduled);
   repeating occurrences are per-date (no pile-up), like habits.
3. **Recurrence in v1** — daily / weekly-by-weekday / monthly-by-day, with per-occurrence
   completion.
4. **Rename the "Daily" tab → "Today"** (Habits + Scheduled sections inside).

## 8. Relationship to other work

- **Goals:** scheduled tasks + goal milestones share the `TaskDTO` changes and the Today
  view — build the task-model migrations once and both features benefit. Sensible to
  sequence Goals' data layer and this together.
- **Habits:** keep habits (recurring, streaks) and scheduled tasks (one-off, dated)
  distinct in v1; revisit unifying them only when adding recurrence (S2).
