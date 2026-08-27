import { getItem, setItem, isDemoMode } from './storage'
import type { TodoItem } from '../types'

const BASE_URL = 'https://habitica.com/api/v3'
const DEMO_TODOS_KEY = 'demoTodos'

export function getDemoTodos(): TodoItem[] {
  return getItem<TodoItem[]>(DEMO_TODOS_KEY, [])
}

export function setDemoTodos(todos: TodoItem[]): void {
  setItem(DEMO_TODOS_KEY, todos)
}

export interface HabiticaCredentials {
  userId: string
  apiToken: string
}

interface HabiticaRawTask {
  id: string
  text: string
  type: 'habit' | 'daily' | 'todo' | 'reward'
  notes?: string
  date?: string | null
  completed: boolean
  isDue?: boolean
}

export function getHabiticaCredentials(): HabiticaCredentials | null {
  const creds = getItem<HabiticaCredentials | null>('habiticaCredentials', null)
  return creds && creds.userId && creds.apiToken ? creds : null
}

function authHeaders(creds: HabiticaCredentials): HeadersInit {
  return {
    'x-api-user': creds.userId,
    'x-api-key': creds.apiToken,
    'x-client': `${creds.userId}-daily-tracker-personal-app`,
    'Content-Type': 'application/json'
  }
}

export async function getHabiticaTasks(): Promise<HabiticaRawTask[]> {
  // Safety net: every real caller below already short-circuits on demo mode itself, so this
  // should be unreachable in demo mode — but guard it directly too, since it's the function that
  // actually calls fetch.
  if (isDemoMode()) throw new Error('getHabiticaTasks must not be called in demo mode')
  const creds = getHabiticaCredentials()
  if (!creds) throw new Error('Habitica not connected')
  const res = await fetch(`${BASE_URL}/tasks/user`, { headers: authHeaders(creds) })
  if (!res.ok) throw new Error(`Habitica request failed: ${res.status}`)
  const body = await res.json()
  return body.data
}

export async function scoreHabiticaTask(taskId: string, direction: 'up' | 'down') {
  if (isDemoMode()) throw new Error('scoreHabiticaTask must not be called in demo mode')
  const creds = getHabiticaCredentials()
  if (!creds) throw new Error('Habitica not connected')
  const res = await fetch(`${BASE_URL}/tasks/${taskId}/score/${direction}`, {
    method: 'POST',
    headers: authHeaders(creds)
  })
  if (!res.ok) throw new Error(`Habitica score failed: ${res.status}`)
  const body = await res.json()
  return body.data
}

function toTodoItem(raw: HabiticaRawTask): TodoItem {
  return {
    id: raw.id,
    text: raw.text,
    type: raw.type === 'daily' ? 'daily' : 'todo',
    dueDate: raw.date ? raw.date.slice(0, 10) : undefined,
    notes: raw.notes || undefined,
    completed: raw.completed,
  }
}

/** Dailies due today + all todos (undated ones included — the UI sorts undated todos into a Backlog view). Habits are intentionally excluded. */
export async function getTodayTodos(): Promise<TodoItem[]> {
  if (isDemoMode()) return getDemoTodos()
  const raw = await getHabiticaTasks()
  return raw
    .filter(t => t.type === 'daily' || t.type === 'todo')
    .filter(t => t.type !== 'daily' || t.isDue)
    .map(toTodoItem)
}

export async function completeHabiticaTask(taskId: string): Promise<void> {
  if (isDemoMode()) {
    setDemoTodos(getDemoTodos().map(t => (t.id === taskId ? { ...t, completed: true } : t)))
    return
  }
  await scoreHabiticaTask(taskId, 'up')
}

export async function uncompleteHabiticaTask(taskId: string): Promise<void> {
  if (isDemoMode()) {
    setDemoTodos(getDemoTodos().map(t => (t.id === taskId ? { ...t, completed: false } : t)))
    return
  }
  await scoreHabiticaTask(taskId, 'down')
}

export async function createHabiticaTodo(text: string, dueDate?: string, notes?: string): Promise<TodoItem> {
  if (isDemoMode()) {
    const item: TodoItem = { id: `demo-todo-${Date.now()}`, text, type: 'todo', dueDate, notes, completed: false }
    setDemoTodos([...getDemoTodos(), item])
    return item
  }
  const creds = getHabiticaCredentials()
  if (!creds) throw new Error('Habitica not connected')
  const res = await fetch(`${BASE_URL}/tasks/user`, {
    method: 'POST',
    headers: authHeaders(creds),
    body: JSON.stringify({ text, type: 'todo', date: dueDate, notes }),
  })
  if (!res.ok) throw new Error(`Habitica create failed: ${res.status}`)
  const body = await res.json()
  return toTodoItem(body.data)
}

export async function updateHabiticaTodo(
  taskId: string,
  updates: { text?: string; notes?: string; date?: string | null }
): Promise<TodoItem> {
  if (isDemoMode()) {
    const todos = getDemoTodos()
    const idx = todos.findIndex(t => t.id === taskId)
    if (idx === -1) throw new Error('Demo todo not found')
    const updated: TodoItem = {
      ...todos[idx],
      text: updates.text ?? todos[idx].text,
      notes: updates.notes ?? todos[idx].notes,
      dueDate: updates.date === undefined ? todos[idx].dueDate : updates.date ?? undefined,
    }
    const next = [...todos]
    next[idx] = updated
    setDemoTodos(next)
    return updated
  }
  const creds = getHabiticaCredentials()
  if (!creds) throw new Error('Habitica not connected')
  const res = await fetch(`${BASE_URL}/tasks/${taskId}`, {
    method: 'PUT',
    headers: authHeaders(creds),
    body: JSON.stringify(updates),
  })
  if (!res.ok) throw new Error(`Habitica update failed: ${res.status}`)
  const body = await res.json()
  return toTodoItem(body.data)
}
