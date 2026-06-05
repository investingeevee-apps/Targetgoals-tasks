# Feature plan — Goals

Make **Goals** a first-class concept: the user sets a goal, **breaks it down** into the
daily tasks and habits that get them there, and watches **progress** climb in the
Overview. This turns the app from "a list + habit tracker" into "the system that gets you
to your goal" — exactly the store promise.

## 1. The big idea: a three-level hierarchy

```
GOAL  (the outcome — "Run a half marathon by Oct 1")
 ├── Milestones  (one-off steps — "Buy shoes", "Run 10K", "Run 18K")
 ├── Daily habits (recurring actions — "Run", "Stretch", "Sleep 8h")
 └── Progress    (a % / number that climbs toward the target)
        ↓
DAILY ACTION  (today's tasks + habits, each tied back to its goal)
```

A goal sits **above** today's work and gives it meaning. Every daily habit or task can
point back to a goal, so the daily view answers "why am I doing this?"

## 2. Anatomy of a Goal

- **Title** — "Run a half marathon"
- **Why / motivation** (optional) — a one-liner shown on the goal (and, optionally, when
  you're about to skip a linked habit).
- **Target date** (optional) — a deadline that powers countdowns and "on track / behind".
- **Measurable target** (optional) — a number + unit ("24 books", "100 miles", "$5,000")
  with a **current value** the user updates.
- **Milestones** — a checklist of one-off steps (these are tasks linked to the goal).
- **Linked daily habits** — the recurring actions that move the goal forward.
- **Status** — active · achieved · archived.

## 3. How progress works (the key design)

Three ways to measure progress; a goal picks a **primary mode** at creation (changeable):

1. **Milestones** — `completed milestones / total`. Simple and objective. Default when a
   goal has steps but no number.
2. **Metric** — `current / target` (e.g. 12/24 books = 50%). Best for countable goals.
   Enables **pace/ETA**: "at this rate you'll finish ~Aug 12", and progress updates log a
   history for a trend line.
3. **Habit consistency** — adherence of linked habits over a window (e.g. last 4 weeks),
   or "X of Y habit-days done". Best for pure habit goals ("meditate daily for 90 days").

Whatever the primary mode, the goal card always *also* shows the **streak** of its linked
habits (momentum) and the **target-date countdown**. Overall % = the primary mode; the
others are supporting signals.

## 4. Usability — the flows

### 4a. Create + "Break it down" (the core moment)
A short, guided create flow:
1. Name the goal (+ optional why).
2. Pick how you'll measure it: **steps**, **a number**, or **a daily habit** (sets the
   primary mode). Optional target date.
3. **Break it down** on the same screen — add the first milestones and the daily habits
   that will get you there. Offer **starter templates** for common goals (e.g. "Get fit",
   "Read more", "Learn a skill", "Save money") that pre-fill suggested habits/milestones
   to remove the blank-page problem.

### 4b. Goals in the Overview (the list + progress)
The Overview gains a **Goals** section: each goal as a card with
- progress **bar/ring + %**,
- **target-date** countdown ("23 days left") and an **on-track / behind** chip,
- linked-habit **streak**,
- a peek at the **next milestone** or **today's linked actions**.
Sorted by most active / nearest deadline. Tapping a card opens the goal.

### 4c. Goal detail
- Big **progress ring** + (for metric goals) a **+ update progress** button and a small
  **trend** of value over time.
- **Milestones** checklist (reorder, check off → progress moves).
- **Linked habits** with mini-streaks and today's check state.
- **Why**, target date, and an **on-track** read ("3 days ahead of pace").
- Actions: edit, mark **achieved** (celebration), archive.

### 4d. The daily connection
- In the **Daily** and **Tasks** views, a habit/task linked to a goal shows a small
  **goal chip** ("◎ Half Marathon"). One tap jumps to the goal.
- Optional grouping: "Today, for your goals" — today's actions grouped by goal.
- This is what makes daily check-offs feel meaningful instead of arbitrary.

### 4e. Motivation & momentum
- **On-track indicator** from target date vs progress pace; **projected finish date** for
  metric goals.
- **Milestone celebrations** (small) and a big **goal-achieved** moment.
- **Weekly review**: "This week you moved 3 goals forward — Half Marathon +8%."
- **Stall nudges**: a goal with no linked activity for N days surfaces gently.
- **Reminders**: optional "deadline approaching" / "this goal has been quiet" nudges
  (reuses the existing opt-in notification system).

### 4f. Achieved & archive
- Completed goals move to an **Achieved** list (a trophy shelf) — visible proof of
  progress, great for motivation. Archived goals are hidden but kept.

## 5. Data model & sync

New `GoalDTO` (same sync pattern: `updatedAt` + `deleted` tombstone + `order`):
```
GoalDTO {
  id, title, why?, targetDate?,            // string YYYY-MM-DD
  progressMode: 'milestones' | 'metric' | 'habits',
  targetValue?, unit?, currentValue?,      // metric mode
  status: 'active' | 'achieved' | 'archived',
  createdAt, updatedAt, deleted, order
}
```
Linking (additive, backward-compatible):
- `TaskDTO.goalId?` — a task with a goalId is a **milestone** of that goal.
- `DailyTaskDTO.goalId?` — a habit linked to a goal.
- (Metric history) optional `GoalProgressDTO { id, goalId, dateKey, value, note?, ... }`
  for the trend line — or start by storing just `currentValue` and add history later.

Server: new `goals` table + `goal_id` columns on `tasks`/`daily_tasks` via the existing
idempotent `addColumnIfMissing` migrations; goals join the `/api/sync` push/pull, dirty
tracking, and tombstone handling like every other entity. Progress (%) is **derived** on
the client from milestones/metric/habits — not stored — so it's always consistent.

Stores (web + mobile): `goals` array + actions (addGoal, updateGoal, linkHabit/Task,
setProgress, achieveGoal, archiveGoal, reorderGoals) and selectors that compute each
goal's progress, streak, and on-track status. Shared `@targetgoals/shared` gets the
`GoalDTO` type + pure progress/pace helpers (with unit tests).

## 6. Phasing

**Phase G1 — MVP (milestones + habits)**
- `GoalDTO` (no metric yet), `goalId` on tasks/habits, server migration + sync.
- Goals section in Overview (list + % from milestones), goal detail, create + break-down
  flow with templates, goal chips in Daily/Tasks, achieved celebration + Achieved list.
- Web + mobile + server. Ships via OTA (mobile) / reload (web) — except the server needs
  a restart and the new `goalId` columns migrate automatically.

**Phase G2 — Metric goals & pace**
- Numeric targets, "+ update progress", projected finish + on-track chip, progress trend.

**Phase G3 — Insight & polish**
- Weekly review, stall nudges, deadline reminders, "today by goal" grouping, richer
  templates, sub-goals (optional).

## 7. Open decisions (confirm before building)

1. **v1 progress model** — milestones+habits only, or include metric/number goals from the
   start? (Drives scope.)
2. **Where Goals live** — a dedicated **Goals tab**, a section **inside Overview**, or
   **promote a list** into a goal? (The brand suggests a dedicated tab; the user asked for
   Overview progress — these can combine: a Goals tab *and* a progress summary in Overview.)
3. **Milestones vs reusing tasks** — model milestones as tasks-with-`goalId` (reuse
   everything) vs a separate lightweight milestone type. (Reuse is faster and consistent.)
