import { getItem, setItem } from './storage'
import type { PrayerRequest } from '../types'
import { weekdayName } from './date'

const KEY = 'prayerRequests'

export function getAllPrayerRequests(): PrayerRequest[] {
  return getItem<PrayerRequest[]>(KEY, [])
}

export function savePrayerRequest(request: PrayerRequest): void {
  const all = getAllPrayerRequests()
  const idx = all.findIndex(p => p.id === request.id)
  if (idx >= 0) {
    all[idx] = request
  } else {
    all.push(request)
  }
  setItem(KEY, all)
}

export function deletePrayerRequest(id: string): void {
  setItem(KEY, getAllPrayerRequests().filter(p => p.id !== id))
}

/** Whether a prayer request should appear on Home today: daily always (until its optional end date), weekly on its day (until its optional end date), specific-date only on that day. */
export function isPrayerRelevantToday(p: PrayerRequest, today: string): boolean {
  if (p.type === 'daily') {
    return !p.dateValue || p.dateValue >= today
  }
  if (p.type === 'weekly') {
    if (p.dateValue && p.dateValue < today) return false
    return p.weekday === weekdayName(today)
  }
  return p.dateValue === today
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function nextOccurrenceOfWeekday(weekday: string, today: string): string {
  const targetIdx = WEEKDAYS.indexOf(weekday)
  const todayDate = new Date(`${today}T00:00:00`)
  let diff = targetIdx - todayDate.getDay()
  if (diff < 0) diff += 7
  const next = new Date(todayDate)
  next.setDate(next.getDate() + diff)
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`
}

/** For the Prayer tab's "by date" sort: daily counts as today, weekly resolves to its next occurrence, specific-date uses its date. */
export function effectivePrayerSortDate(p: PrayerRequest, today: string): string {
  if (p.type === 'daily') return today
  if (p.type === 'weekly') return nextOccurrenceOfWeekday(p.weekday || 'Sunday', today)
  return p.dateValue || '9999-12-31'
}
