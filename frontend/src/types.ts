export type PrayerType = 'daily' | 'weekly' | 'date'

export interface PrayerRequest {
  id: string
  name: string
  type: PrayerType
  /** Only meaningful for type 'weekly', e.g. "Tuesday". */
  weekday?: string
  /** For 'date': the single day it displays. For 'daily'/'weekly': an optional expiry after which it stops displaying. */
  dateValue?: string
  note?: string
}

export type TodoType = 'daily' | 'todo'

export interface TodoItem {
  id: string
  text: string
  type: TodoType
  /** ISO date. Only meaningful for type 'todo' — dailies recur via Habitica's own schedule. */
  dueDate?: string
  notes?: string
  completed: boolean
}

export interface DailyState {
  date: string
  mainTaskText: string
  mainTaskSource: 'calendar' | 'manual' | null
  mainTaskCompleted: boolean | null
  /** Prayer request ids checked off today. Todo completion lives in Habitica directly. */
  completedPrayerIds: string[]
  homeTodoOrder: string[]
  homePrayerOrder: string[]
  blockersNotes: string
  gratitude: string
  eveningReviewDone: boolean
  /** Whether the Home screen's Prayer Request / To-Dos accordions are expanded — persisted so
   * switching tabs and coming back doesn't collapse a section the user had open. */
  homePrayerOpen: boolean
  homeTodoOpen: boolean
}

export function emptyDailyState(date: string): DailyState {
  return {
    date,
    mainTaskText: '',
    mainTaskSource: null,
    mainTaskCompleted: null,
    completedPrayerIds: [],
    homeTodoOrder: [],
    homePrayerOrder: [],
    blockersNotes: '',
    gratitude: '',
    eveningReviewDone: false,
    homePrayerOpen: false,
    homeTodoOpen: false,
  }
}
