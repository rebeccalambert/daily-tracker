export interface DailyState {
  date: string
  mainTaskText: string
  mainTaskCompleted: boolean | null
  homeTodoOrder: string[]
  homeTodoOpen: boolean
}

export function emptyDailyState(date: string): DailyState {
  return {
    date,
    mainTaskText: '',
    mainTaskCompleted: null,
    homeTodoOrder: [],
    homeTodoOpen: false,
  }
}
