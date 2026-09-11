export type TodoType = 'daily' | 'todo'

export interface TodoItem {
  id: string
  text: string
  type: TodoType
  dueDate?: string
  notes?: string
  completed: boolean
}

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
