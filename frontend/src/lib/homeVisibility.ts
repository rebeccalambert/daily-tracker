import type { TodoItem } from '../types'

/** Home shows dailies always, plus todos due today or overdue. Future/undated todos live only in the To-Dos tab. */
export function isTodoRelevantOnHome(item: TodoItem, today: string): boolean {
  if (item.type === 'daily') return true
  return !!item.dueDate && item.dueDate <= today
}
