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
