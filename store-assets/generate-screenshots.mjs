/*
 * Generates Play Store phone screenshots (1080x1920 PNG, 9:16) from the responsive
 * web app, with rich demo data injected via localStorage.
 *
 * Prereqs:
 *   - The web app must be served locally:  http://localhost:4000  (npm run dev / server)
 *   - Google Chrome installed (used via Playwright's `channel: 'chrome'` — no download)
 *   - npm i -D playwright-core
 *
 * Run from the repo root:
 *   node store-assets/generate-screenshots.mjs
 *
 * Output: store-assets/screenshots/*.png  (1080x1920 each)
 *
 * Note: demo data is written to a throwaway browser profile and the sync connection
 * is cleared first, so nothing touches your real server data.
 */
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'

const OUT = 'store-assets/screenshots'
mkdirSync(OUT, { recursive: true })

// ---- demo data ----
const pad = (n) => String(n).padStart(2, '0')
function key(off) {
  const d = new Date()
  d.setDate(d.getDate() + off)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
const isoOf = (off) => `${key(off)}T12:00:00.000Z`
const dow = new Date().getDay()

const lists = [
  { id: 'L1', name: 'Personal', createdAt: isoOf(-60), updatedAt: 1, deleted: false },
  { id: 'L2', name: 'Work', createdAt: isoOf(-60), updatedAt: 1, deleted: false },
]

const goals = [
  { id: 'g_mara', title: 'Run a half marathon', why: 'Cross the finish line strong', targetDate: key(45), progressMode: 'milestones', targetValue: null, unit: null, currentValue: null, progressLog: [], status: 'active', createdAt: isoOf(-30), updatedAt: 1, deleted: false, order: 0 },
  { id: 'g_books', title: 'Read 24 books this year', why: 'Keep learning', targetDate: key(150), progressMode: 'metric', targetValue: 24, unit: 'books', currentValue: 14, progressLog: [{ dateKey: key(-60), value: 6 }, { dateKey: key(-20), value: 11 }, { dateKey: key(-1), value: 14 }], status: 'active', createdAt: isoOf(-60), updatedAt: 1, deleted: false, order: 1 },
  { id: 'g_med', title: 'Meditate 90 days straight', why: 'Calmer mornings', targetDate: key(60), progressMode: 'habits', targetValue: null, unit: null, currentValue: null, progressLog: [], status: 'active', createdAt: isoOf(-30), updatedAt: 1, deleted: false, order: 2 },
]

const sub = (id, title, completed) => ({ id, title, completed })
const T = (o) => ({
  id: o.id, listId: o.listId, title: o.title, notes: o.notes ?? '', due: o.due ?? null,
  starred: o.starred ?? false, completed: o.completed ?? false, completedAt: o.completed ? isoOf(-1) : null,
  createdAt: isoOf(-20), updatedAt: 1, deleted: false, subtasks: o.subtasks ?? [], order: o.order ?? 0,
  goalId: o.goalId ?? null, scheduledDate: o.scheduledDate ?? null, recurrence: o.recurrence ?? null,
})
const tasks = [
  T({ id: 't1', listId: 'L1', title: 'Plan weekend trip', due: key(2), order: 0, subtasks: [sub('s1', 'Book hotel', true), sub('s2', 'Pack bags', false), sub('s3', 'Print tickets', false)] }),
  T({ id: 't2', listId: 'L1', title: 'Buy groceries', order: 1, scheduledDate: key(0), subtasks: [sub('s4', 'Milk', false), sub('s5', 'Eggs', true), sub('s6', 'Bread', false)] }),
  T({ id: 't3', listId: 'L1', title: 'Call the dentist', order: 2, starred: true }),
  T({ id: 't4', listId: 'L2', title: 'Team standup', recurrence: { freq: 'weekly', weekdays: [dow] }, order: 0 }),
  T({ id: 'm1', listId: 'L1', title: 'Buy running shoes', goalId: 'g_mara', completed: true, order: 3 }),
  T({ id: 'm2', listId: 'L1', title: 'Run 5K without stopping', goalId: 'g_mara', completed: true, order: 4 }),
  T({ id: 'm3', listId: 'L1', title: 'Run 10K', goalId: 'g_mara', completed: true, order: 5 }),
  T({ id: 'm4', listId: 'L1', title: 'Run 18K long run', goalId: 'g_mara', completed: false, order: 6 }),
]

const dailyTasks = [
  { id: 'h_run', title: 'Run', archived: false, createdAt: isoOf(-60), updatedAt: 1, deleted: false, order: 0, goalId: 'g_mara' },
  { id: 'h_read', title: 'Read 20 minutes', archived: false, createdAt: isoOf(-60), updatedAt: 1, deleted: false, order: 1, goalId: 'g_books' },
  { id: 'h_med', title: 'Meditate', archived: false, createdAt: isoOf(-60), updatedAt: 1, deleted: false, order: 2, goalId: 'g_med' },
  { id: 'h_water', title: 'Drink 2L water', archived: false, createdAt: isoOf(-60), updatedAt: 1, deleted: false, order: 3, goalId: null },
]

const dailyCompletions = []
for (let off = -55; off <= 0; off++) {
  for (let i = 0; i < dailyTasks.length; i++) {
    const h = dailyTasks[i]
    const keep = off >= -19 || (off + i) % 10 < 7
    if (!keep) continue
    dailyCompletions.push({ id: `c_${h.id}_${off}`, dailyTaskId: h.id, dateKey: key(off), createdAt: isoOf(off), updatedAt: 1, deleted: false })
  }
}

const state = {
  state: { lists, tasks, dailyTasks, dailyCompletions, goals, scheduledCompletions: [], dirty: {}, lastSyncedAt: 2, screen: 'daily', currentListId: 'L1' },
  version: 4,
}

// ---- capture ----
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const ctx = await browser.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3 })
const page = await ctx.newPage()
await page.goto('http://localhost:4000', { waitUntil: 'load' })
await page.evaluate(
  ([k, st, conn]) => { localStorage.setItem(k, st); localStorage.removeItem(conn) },
  ['targetgoals-store-v2', JSON.stringify(state), 'targetgoals-conn-v1'],
)
await page.reload({ waitUntil: 'load' })
await page.waitForTimeout(1000)

const nav = async (label) => {
  await page.locator('nav.fixed.bottom-0 button', { hasText: label }).first().click()
  await page.waitForTimeout(700)
}
const shot = (name) => page.screenshot({ path: `${OUT}/${name}.png` })

await nav('Today'); await shot('01-today')
await nav('Goals'); await shot('02-goals')
await page.getByRole('button', { name: /Run a half marathon/ }).first().click()
await page.waitForTimeout(700); await shot('03-goal-detail')
await nav('Tasks')
const chip = page.locator('button', { hasText: /☑\s*\d+\/\d+/ }).first()
if (await chip.count()) { await chip.click(); await page.waitForTimeout(400) }
await shot('04-tasks')
await nav('Overview'); await page.waitForTimeout(400); await shot('05-overview')

await browser.close()
console.log('done')
