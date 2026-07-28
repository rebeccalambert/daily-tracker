const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function weekdayName(dateISO: string): string {
  return WEEKDAYS[new Date(`${dateISO}T00:00:00`).getDay()]
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
