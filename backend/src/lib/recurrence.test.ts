import { describe, it, expect } from 'vitest'
import { applyCycleReset, cycleKey, daysInMonth, effectiveDay, type DateParts, type RecurrenceFields } from './recurrence.js'

// Helper: build a DateParts from a UTC calendar date (weekday derived for you).
function parts(year: number, month: number, day: number): DateParts {
  const d = new Date(Date.UTC(year, month - 1, day))
  const weekday = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getUTCDay()]
  return { year, month, day, weekday }
}

function storedDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day))
}

function item(overrides: Partial<RecurrenceFields>): RecurrenceFields {
  return {
    recurrence: 'daily',
    completed: true,
    completedAt: null,
    weekday: null,
    dayOfMonth: null,
    month: null,
    ...overrides,
  }
}

describe('daysInMonth / effectiveDay', () => {
  it('matches the spec table for dayOfMonth=31', () => {
    expect(daysInMonth(2026, 1)).toBe(31)
    expect(daysInMonth(2026, 2)).toBe(28) // 2026 is not a leap year
    expect(daysInMonth(2026, 3)).toBe(31)
    expect(daysInMonth(2026, 4)).toBe(30)
    expect(daysInMonth(2026, 5)).toBe(31)
    expect(daysInMonth(2028, 2)).toBe(29) // 2028 is a leap year

    expect(effectiveDay(2026, 1, 31)).toBe(31)
    expect(effectiveDay(2026, 2, 31)).toBe(28)
    expect(effectiveDay(2026, 3, 31)).toBe(31)
    expect(effectiveDay(2026, 4, 31)).toBe(30)
    expect(effectiveDay(2026, 5, 31)).toBe(31)
    expect(effectiveDay(2028, 2, 31)).toBe(29)
  })

  it('never touches the clamp for dayOfMonth <= 28', () => {
    expect(effectiveDay(2026, 2, 15)).toBe(15)
  })
})

describe('cycleKey: once', () => {
  it('has no cycle', () => {
    expect(cycleKey(item({ recurrence: 'once' }), parts(2026, 8, 28))).toBeNull()
  })
})

describe('cycleKey: daily', () => {
  it('keys by the exact calendar date', () => {
    expect(cycleKey(item({ recurrence: 'daily' }), parts(2026, 8, 28))).toBe('2026-08-28')
  })
})

describe('cycleKey: weekly', () => {
  const monday = item({ recurrence: 'weekly', weekday: 'Monday' })

  it('keys by the most recent occurrence of the pinned weekday', () => {
    // 2026-08-24 is a Monday
    expect(cycleKey(monday, parts(2026, 8, 24))).toBe('2026-08-24') // Monday itself
    expect(cycleKey(monday, parts(2026, 8, 25))).toBe('2026-08-24') // Tuesday, same cycle
    expect(cycleKey(monday, parts(2026, 8, 30))).toBe('2026-08-24') // Sunday, still same cycle
    expect(cycleKey(monday, parts(2026, 8, 31))).toBe('2026-08-31') // next Monday, new cycle
  })

  it('spans a Dec 31 -> Jan 1 boundary correctly', () => {
    // 2026-12-31 is a Thursday
    const thursday = item({ recurrence: 'weekly', weekday: 'Thursday' })
    expect(cycleKey(thursday, parts(2027, 1, 2))).toBe('2026-12-31') // Saturday, still last Thursday's cycle
    expect(cycleKey(thursday, parts(2027, 1, 7))).toBe('2027-01-07') // next Thursday
  })

  it('returns null for missing/unrecognized weekday', () => {
    expect(cycleKey(item({ recurrence: 'weekly', weekday: null }), parts(2026, 8, 28))).toBeNull()
    expect(cycleKey(item({ recurrence: 'weekly', weekday: 'Funday' }), parts(2026, 8, 28))).toBeNull()
  })
})

describe('cycleKey: monthly, dayOfMonth=31 (spec table)', () => {
  const item31 = item({ recurrence: 'monthly', dayOfMonth: 31 })

  it('January: triggers on the 31st', () => {
    expect(cycleKey(item31, parts(2026, 1, 30))).toBe('2025-12')
    expect(cycleKey(item31, parts(2026, 1, 31))).toBe('2026-01')
  })

  it('February: clamps to the 28th', () => {
    expect(cycleKey(item31, parts(2026, 2, 27))).toBe('2026-01')
    expect(cycleKey(item31, parts(2026, 2, 28))).toBe('2026-02')
  })

  it('March: bounces back to the 31st', () => {
    expect(cycleKey(item31, parts(2026, 3, 30))).toBe('2026-02')
    expect(cycleKey(item31, parts(2026, 3, 31))).toBe('2026-03')
  })

  it('April: clamps to the 30th', () => {
    expect(cycleKey(item31, parts(2026, 4, 29))).toBe('2026-03')
    expect(cycleKey(item31, parts(2026, 4, 30))).toBe('2026-04')
  })

  it('May: bounces back to the 31st', () => {
    expect(cycleKey(item31, parts(2026, 5, 30))).toBe('2026-04')
    expect(cycleKey(item31, parts(2026, 5, 31))).toBe('2026-05')
  })

  it('leap year: February clamps to the 29th, not the 28th', () => {
    expect(cycleKey(item31, parts(2028, 2, 28))).toBe('2028-01')
    expect(cycleKey(item31, parts(2028, 2, 29))).toBe('2028-02')
  })
})

describe('cycleKey: monthly, January wraparound', () => {
  it('buckets into December of the previous year, not an invalid month', () => {
    const item15 = item({ recurrence: 'monthly', dayOfMonth: 15 })
    expect(cycleKey(item15, parts(2026, 1, 5))).toBe('2025-12')
    expect(cycleKey(item15, parts(2026, 1, 15))).toBe('2026-01')
  })
})

describe('cycleKey: monthly guards', () => {
  it('returns null when dayOfMonth is missing', () => {
    expect(cycleKey(item({ recurrence: 'monthly', dayOfMonth: null }), parts(2026, 8, 28))).toBeNull()
  })
})

describe('cycleKey: yearly, Feb 29', () => {
  const feb29 = item({ recurrence: 'yearly', month: 2, dayOfMonth: 29 })

  it('non-leap year clamps the trigger to Feb 28', () => {
    expect(cycleKey(feb29, parts(2026, 2, 27))).toBe('2025')
    expect(cycleKey(feb29, parts(2026, 2, 28))).toBe('2026')
  })

  it('the next leap year independently recomputes the trigger back to the 29th', () => {
    expect(cycleKey(feb29, parts(2028, 2, 28))).toBe('2027')
    expect(cycleKey(feb29, parts(2028, 2, 29))).toBe('2028')
  })

  it('early in the year, before the trigger, still buckets to the previous year', () => {
    expect(cycleKey(feb29, parts(2026, 1, 1))).toBe('2025')
  })
})

describe('cycleKey: yearly guards', () => {
  it('returns null when month or dayOfMonth is missing', () => {
    expect(cycleKey(item({ recurrence: 'yearly', month: null, dayOfMonth: 15 }), parts(2026, 8, 28))).toBeNull()
    expect(cycleKey(item({ recurrence: 'yearly', month: 6, dayOfMonth: null }), parts(2026, 8, 28))).toBeNull()
  })
})

describe('applyCycleReset', () => {
  it('once items never reset, even years later', () => {
    const it1 = item({ recurrence: 'once', completed: true, completedAt: storedDate(2020, 1, 1) })
    expect(applyCycleReset(it1, parts(2026, 8, 28)).completed).toBe(true)
  })

  it('leaves non-completed items untouched regardless of recurrence', () => {
    const it1 = item({ recurrence: 'daily', completed: false, completedAt: null })
    expect(applyCycleReset(it1, parts(2026, 8, 28))).toBe(it1) // same reference, true no-op
  })

  it('daily: resets when completedAt is not today', () => {
    const it1 = item({ recurrence: 'daily', completed: true, completedAt: storedDate(2026, 8, 27) })
    expect(applyCycleReset(it1, parts(2026, 8, 28)).completed).toBe(false)
  })

  it('daily: stays completed when completedAt is today', () => {
    const it1 = item({ recurrence: 'daily', completed: true, completedAt: storedDate(2026, 8, 28) })
    expect(applyCycleReset(it1, parts(2026, 8, 28)).completed).toBe(true)
  })

  it('weekly: stays completed through the rest of the cycle, resets on the next occurrence', () => {
    const monday = item({ recurrence: 'weekly', weekday: 'Monday', completed: true, completedAt: storedDate(2026, 8, 24) })
    expect(applyCycleReset(monday, parts(2026, 8, 27)).completed).toBe(true) // Thursday, same cycle
    expect(applyCycleReset(monday, parts(2026, 8, 30)).completed).toBe(true) // Sunday, still same cycle
    expect(applyCycleReset(monday, parts(2026, 8, 31)).completed).toBe(false) // next Monday, resets
  })

  it('monthly: dayOfMonth=31 completion stays through the rest of January, resets exactly on Feb\'s clamped trigger', () => {
    const it1 = item({ recurrence: 'monthly', dayOfMonth: 31, completed: true, completedAt: storedDate(2026, 1, 31) })
    expect(applyCycleReset(it1, parts(2026, 2, 27)).completed).toBe(true) // Feb trigger (clamped to 28) not reached yet
    expect(applyCycleReset(it1, parts(2026, 2, 28)).completed).toBe(false) // Feb's clamped trigger itself — resets
  })

  it('yearly: stays completed through the year, resets on the next trigger (leap-year jump)', () => {
    const feb29 = item({ recurrence: 'yearly', month: 2, dayOfMonth: 29, completed: true, completedAt: storedDate(2027, 2, 28) })
    expect(applyCycleReset(feb29, parts(2027, 6, 1)).completed).toBe(true) // mid-2027, same cycle
    expect(applyCycleReset(feb29, parts(2028, 2, 28)).completed).toBe(true) // trigger this leap year is the 29th, not yet reached
    expect(applyCycleReset(feb29, parts(2028, 2, 29)).completed).toBe(false) // leap day itself, resets
  })

  it('guards: completed with no completedAt resets rather than throwing', () => {
    const it1 = item({ recurrence: 'daily', completed: true, completedAt: null })
    expect(() => applyCycleReset(it1, parts(2026, 8, 28))).not.toThrow()
    expect(applyCycleReset(it1, parts(2026, 8, 28)).completed).toBe(false)
  })

  it('guards: malformed monthly config (no dayOfMonth) returns unchanged, does not throw', () => {
    const it1 = item({ recurrence: 'monthly', dayOfMonth: null, completed: true, completedAt: storedDate(2020, 1, 1) })
    expect(() => applyCycleReset(it1, parts(2026, 8, 28))).not.toThrow()
    expect(applyCycleReset(it1, parts(2026, 8, 28)).completed).toBe(true)
  })

  it('guards: unrecognized weekday returns unchanged, does not throw', () => {
    const it1 = item({ recurrence: 'weekly', weekday: 'Funday', completed: true, completedAt: storedDate(2020, 1, 1) })
    expect(() => applyCycleReset(it1, parts(2026, 8, 28))).not.toThrow()
    expect(applyCycleReset(it1, parts(2026, 8, 28)).completed).toBe(true)
  })

  it('does not mutate the DB row or the input object', () => {
    const it1 = item({ recurrence: 'daily', completed: true, completedAt: storedDate(2026, 8, 27) })
    const result = applyCycleReset(it1, parts(2026, 8, 28))
    expect(it1.completed).toBe(true) // input untouched
    expect(result).not.toBe(it1) // reset returns a new object, not a mutation
  })
})
