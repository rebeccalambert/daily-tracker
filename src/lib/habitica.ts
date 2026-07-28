import { getItem } from './storage'
import type { TodoItem } from '../types'

const BASE_URL = 'https://habitica.com/api/v3'

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
  const creds = getHabiticaCredentials()
  if (!creds) throw new Error('Habitica not connected')
  const res = await fetch(`${BASE_URL}/tasks/user`, { headers: authHeaders(creds) })
  if (!res.ok) throw new Error(`Habitica request failed: ${res.status}`)
  const body = await res.json()
  return body.data
}

export async function scoreHabiticaTask(taskId: string, direction: 'up' | 'down') {
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
  const raw = await getHabiticaTasks()
  return raw
    .filter(t => t.type === 'daily' || t.type === 'todo')
    .filter(t => t.type !== 'daily' || t.isDue)
    .map(toTodoItem)
}

export async function completeHabiticaTask(taskId: string): Promise<void> {
  await scoreHabiticaTask(taskId, 'up')
}

export async function uncompleteHabiticaTask(taskId: string): Promise<void> {
  await scoreHabiticaTask(taskId, 'down')
}

export async function createHabiticaTodo(text: string, dueDate?: string, notes?: string): Promise<TodoItem> {
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
