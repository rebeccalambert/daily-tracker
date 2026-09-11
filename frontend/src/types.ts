export interface DailyState {
  date: string
  mainTaskText: string
  mainTaskSource: 'calendar' | 'manual' | null
  mainTaskCompleted: boolean | null
  homeTodoOrder: string[]
  homeTodoOpen: boolean
}

export function emptyDailyState(date: string): DailyState {
  return {
    date,
    mainTaskText: '',
    mainTaskSource: null,
    mainTaskCompleted: null,
    homeTodoOrder: [],
    homeTodoOpen: false,
  }
}
