// Recurrence engine: lazy cycle-reset logic for daily/weekly/monthly/yearly
// items. See ITEM_MODEL_SPEC.md ("Recurrence behavior" + "The done today
// display rule" + "Edge cases (resolved)").
//
// Reset is purely computed on read: an item's completed/completedAt in
// Postgres can go stale for any number of missed cycles, and applyCycleReset
// just recomputes whether that state still belongs to the current cycle.
// Nothing here writes to the database - no cron, no backfill, no pileup.

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const CHICAGO_TZ = 'America/Chicago'

const chicagoFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: CHICAGO_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  weekday: 'long',
})

export interface RecurrenceFields {
  recurrence: string
  completed: boolean
  completedAt: Date | null
  weekday: string | null
  dayOfMonth: number | null
  month: number | null
}

// month is 1-12
export interface DateParts {
  year: number
  month: number
  day: number
  weekday: string
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

// Set Chicago (my) current date. Handles DST
// automatically. Use this only for live instants (e.g. `new Date()`) - never
// for a value already read out of a @db.Date column, see storedDateParts.
export function chicagoDateParts(instant: Date): DateParts {
  const parts = chicagoFormatter.formatToParts(instant)
  const get = (type: string) => parts.find((p) => p.type === type)!.value
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    weekday: get('weekday'),
  }
}

export function chicagoToday(): DateParts {
  return chicagoDateParts(new Date())
}

// Today's Chicago calendar date, re-encoded as a UTC-midnight Date for
// writing into a @db.Date column (used by the PATCH completedAt auto-stamp).
export function todayAsStoredDate(): Date {
  const { year, month, day } = chicagoToday()
  return new Date(Date.UTC(year, month - 1, day))
}

// For reading back a stored @db.Date value (completedAt, dueDate): Prisma
// returns these as UTC-midnight Date objects representing a calendar date
// with no real-world instant attached. Read with plain UTC getters - do NOT
// run this through a timezone conversion, that would shift the date back a
// day (a UTC-midnight instant formatted in Chicago time lands on the
// previous calendar day). This is deliberately a separate function from
// chicagoDateParts even though both return DateParts - don't collapse them.
export function storedDateParts(date: Date): DateParts {
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    weekday: WEEKDAYS[date.getUTCDay()],
  }
}

export function daysInMonth(year: number, month1to12: number): number {
  return new Date(Date.UTC(year, month1to12, 0)).getUTCDate()
}

// effectiveDay = min(dayOfMonth, daysInThatMonth) - see ITEM_MODEL_SPEC.md
// "Edge cases (resolved)". Recomputed fresh every cycle, so a short month
// clamps the trigger down and a later long month bounces it back on its own.
export function effectiveDay(year: number, month1to12: number, dayOfMonth: number): number {
  return Math.min(dayOfMonth, daysInMonth(year, month1to12))
}

/**
 * The cycle key identifies which recurrence "window" a calendar date falls
 * into. Two dates with the same key are the same cycle; comparing an item's
 * completedAt cycle key against today's is the entire reset decision.
 * Returns null when there's no cycle to speak of ('once', or malformed
 * recurrence config) - callers must treat null as "don't touch completed".
 */
export function cycleKey(item: RecurrenceFields, parts: DateParts): string | null {
  switch (item.recurrence) {
    case 'daily':
      return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`

    case 'weekly': {
      if (!item.weekday) return null // no day assigned
      const targetIdx = WEEKDAYS.indexOf(item.weekday)
      if (targetIdx === -1) return null // day isn't valid (eg. mondey)
      const todayIdx = WEEKDAYS.indexOf(parts.weekday)
      const diff = (todayIdx - targetIdx + 7) % 7
      // Most recent occurrence of item.weekday on/before `parts` - the start
      // of the current cycle. Date.UTC normalizes a negative day correctly
      // (rolls back across month/year boundaries on its own).
      const cycleStart = new Date(Date.UTC(parts.year, parts.month - 1, parts.day - diff))
      return `${cycleStart.getUTCFullYear()}-${pad(cycleStart.getUTCMonth() + 1)}-${pad(cycleStart.getUTCDate())}`
    }

    case 'monthly': {
      if (item.dayOfMonth == null) return null
      const trigger = effectiveDay(parts.year, parts.month, item.dayOfMonth)
      if (parts.day >= trigger) {
        return `${parts.year}-${pad(parts.month)}`
      }
      // Trigger hasn't hit yet this month - still in last month's cycle.
      if (parts.month === 1) {
        return `${parts.year - 1}-12`
      }
      return `${parts.year}-${pad(parts.month - 1)}`
    }

    case 'yearly': {
      if (item.dayOfMonth == null || item.month == null) return null
      const trigger = effectiveDay(parts.year, item.month, item.dayOfMonth)
      const reached = parts.month > item.month || (parts.month === item.month && parts.day >= trigger)
      return reached ? `${parts.year}` : `${parts.year - 1}`
    }

    default:
      return null // 'once' has no cycle
  }
}

/**
 * Applies the lazy reset: if a recurring item's completedAt cycle doesn't
 * match today's cycle, it flips back to pending for the response. Purely
 * computed - never writes to the database (see file header).
 */
export function applyCycleReset<T extends RecurrenceFields>(item: T, today: DateParts = chicagoToday()): T {
  if (item.recurrence === 'once' || !item.completed) {
    return item
  }

  // Shouldn't happen given the PATCH auto-stamp, but a completed item with
  // no completedAt (stale/manually-edited data) has no cycle to trust. Fail
  // safe by resetting rather than coercing through Date parsing.
  if (!item.completedAt) {
    return { ...item, completed: false }
  }

  const currentCycle = cycleKey(item, today)
  const completedCycle = cycleKey(item, storedDateParts(item.completedAt))

  if (currentCycle !== null && currentCycle !== completedCycle) {
    return { ...item, completed: false }
  }

  return item
}
