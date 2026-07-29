import { getItem, setItem } from './storage'
import { emptyDailyState, type DailyState } from '../types'

function key(date: string): string {
  return `dailyState:${date}`
}

export function getDailyState(date: string): DailyState {
  return getItem<DailyState>(key(date), emptyDailyState(date))
}

export function saveDailyState(state: DailyState): void {
  setItem(key(state.date), state)
}

export function updateDailyState(date: string, patch: Partial<DailyState>): DailyState {
  const next = { ...getDailyState(date), ...patch }
  saveDailyState(next)
  return next
}

const LAST_LOGGED_DATE_KEY = 'lastLoggedDate'

/**
 * The most recent day that actually completed a Sheets append (see saveDailyLog), as distinct
 * from the last day the app happened to be opened. Used to detect a skipped-day gap on load.
 * `null` means no day has ever been successfully logged (e.g. first-ever use) — callers must
 * treat that as "no gap", not as an infinitely-old last-logged day.
 */
export function getLastLoggedDate(): string | null {
  return getItem<string | null>(LAST_LOGGED_DATE_KEY, null)
}

export function setLastLoggedDate(date: string): void {
  setItem(LAST_LOGGED_DATE_KEY, date)
}
