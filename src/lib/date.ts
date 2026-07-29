const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function weekdayName(dateISO: string): string {
  return WEEKDAYS[new Date(`${dateISO}T00:00:00`).getDay()]
}

/** Returns the ISO date `days` away from `dateISO` (negative goes backward). */
export function addDays(dateISO: string, days: number): string {
  const d = new Date(`${dateISO}T00:00:00`)
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Formats the "Date" cell written to the Sheets log: the calendar day being reviewed, plus the
 * real-world clock time the row was actually submitted. Keeping both means a catch-up review
 * (logged under a past day, submitted "now") still records true submission order relative to
 * other rows — and multiple rows for the same calendar day (re-saves, catch-up vs. same-day)
 * stay distinguishable.
 */
export function formatLogTimestamp(dateISO: string, submittedAt: Date = new Date()): string {
  const hh = String(submittedAt.getHours()).padStart(2, '0')
  const mm = String(submittedAt.getMinutes()).padStart(2, '0')
  return `${dateISO} (${weekdayName(dateISO).slice(0, 3)}) ${hh}:${mm}`
}

export function formatShortDate(dateISO: string): string {
  return new Date(`${dateISO}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export interface DueInfo {
  text: string
  overdue: boolean
}

export function formatDue(dateISO: string | undefined, today: string): DueInfo {
  if (!dateISO) return { text: '', overdue: false }
  if (dateISO === today) return { text: 'Due today', overdue: false }
  if (dateISO < today) return { text: `Overdue · ${formatShortDate(dateISO)}`, overdue: true }
  return { text: `Due ${formatShortDate(dateISO)}`, overdue: false }
}

/** For sorting: dailies count as "due today" since they have no real due date. Undated todos have no sort date. */
export function effectiveSortDate(item: { type: string; dueDate?: string }, today: string): string | null {
  if (item.type === 'daily') return today
  return item.dueDate ?? null
}
