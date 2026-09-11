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

export function formatShortDate(dateISO: string): string {
  return new Date(`${dateISO}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export interface DueInfo {
  text: string
  overdue: boolean
}

/** Due-date display for a `once` item, shared by TodosTab and Home so both read the same way. */
export function formatOnceDue(dueDate: string | null, today: string): DueInfo {
  if (!dueDate) return { text: '', overdue: false }
  if (dueDate === today) return { text: 'Due today', overdue: false }
  if (dueDate < today) return { text: `Overdue · ${formatShortDate(dueDate)}`, overdue: true }
  return { text: `Due ${formatShortDate(dueDate)}`, overdue: false }
}
