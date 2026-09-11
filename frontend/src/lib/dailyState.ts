import { getItem, setItem } from './storage'
import { emptyDailyState, type DailyState } from '../types'

function key(date: string): string {
  return `dailyState:${date}`
}

export function getDailyState(date: string): DailyState {
  // Merge over emptyDailyState rather than using it only as a getItem fallback: a stored blob
  // from before a new DailyState field existed is still valid JSON (getItem's fallback only
  // kicks in when the key is missing entirely), so without this merge, older/existing stored
  // days would resolve new fields to `undefined` instead of their real default.
  return { ...emptyDailyState(date), ...getItem<Partial<DailyState>>(key(date), {}) }
}

export function saveDailyState(state: DailyState): void {
  setItem(key(state.date), state)
}

export function updateDailyState(date: string, patch: Partial<DailyState>): DailyState {
  const next = { ...getDailyState(date), ...patch }
  saveDailyState(next)
  return next
}