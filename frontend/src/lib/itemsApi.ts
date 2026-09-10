import { getItem, setItem, removeItem, isDemoMode } from './storage'
import type { Item, ItemType, NewItem, ItemPatch } from '@daily-tracker/shared'

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'https://daily-tracker-d7su.onrender.com'
const TOKEN_KEY = 'backendAuthToken'
const DEMO_ITEMS_KEY = 'demoItems'

// Minimal seed data so the new recurrence-aware To-Dos UI has something to
// show in Demo Mode before Ticket 9 does the real fixture rewrite for the
// new Item shape (the old demoData.ts fixtures are shaped for the retired
// Habitica TodoItem type, not this one — deliberately not reused here).
function seedDemoItems(): Item[] {
  const now = new Date().toISOString()
  const today = now.slice(0, 10)
  return [
    {
      id: 'demo-item-1', type: 'todo', recurrence: 'once', text: 'Follow up with recruiter',
      notes: null, completed: false, completedAt: null, dueDate: today,
      weekday: null, dayOfMonth: null, month: null, sortIndex: 0, createdAt: now, updatedAt: now,
    },
    {
      id: 'demo-item-2', type: 'todo', recurrence: 'daily', text: 'Read for 20 minutes',
      notes: null, completed: false, completedAt: null, dueDate: null,
      weekday: null, dayOfMonth: null, month: null, sortIndex: 1, createdAt: now, updatedAt: now,
    },
    {
      id: 'demo-item-3', type: 'todo', recurrence: 'weekly', text: 'Water the plants',
      notes: null, completed: false, completedAt: null, dueDate: null,
      weekday: 'Monday', dayOfMonth: null, month: null, sortIndex: 2, createdAt: now, updatedAt: now,
    },
    {
      id: 'demo-item-4', type: 'todo', recurrence: 'monthly', text: 'Pay rent',
      notes: null, completed: false, completedAt: null, dueDate: null,
      weekday: null, dayOfMonth: 1, month: null, sortIndex: 3, createdAt: now, updatedAt: now,
    },
  ]
}

function getDemoItems(): Item[] {
  return getItem<Item[]>(DEMO_ITEMS_KEY, seedDemoItems())
}

function setDemoItems(items: Item[]): void {
  setItem(DEMO_ITEMS_KEY, items)
}

export function getBackendToken(): string | null {
  return getItem<string | null>(TOKEN_KEY, null)
}

export function isBackendConnected(): boolean {
  return !!getBackendToken()
}

export async function loginToBackend(password: string): Promise<boolean> {
  if (isDemoMode()) return true // nothing to authenticate against in demo mode
  try {
    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (!res.ok) return false
    const body = await res.json()
    if (!body.token) return false
    setItem(TOKEN_KEY, body.token)
    return true
  } catch {
    return false
  }
}

export function disconnectBackend(): void {
  removeItem(TOKEN_KEY)
}

function authHeaders(): HeadersInit {
  const token = getBackendToken()
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export async function getItems(type: ItemType = 'todo'): Promise<Item[]> {
  if (isDemoMode()) return getDemoItems().filter(i => i.type === type)
  const token = getBackendToken()
  if (!token) throw new Error('Backend not connected')
  const res = await fetch(`${API_BASE}/items?type=${type}`, { headers: authHeaders() })
  if (!res.ok) throw new Error(`Failed to load items: ${res.status}`)
  return res.json()
}

export async function createItem(input: NewItem): Promise<Item> {
  if (isDemoMode()) {
    const now = new Date().toISOString()
    const item: Item = {
      id: `demo-item-${Date.now()}`,
      notes: null, completed: false, completedAt: null, dueDate: null,
      weekday: null, dayOfMonth: null, month: null, sortIndex: 0,
      createdAt: now, updatedAt: now,
      ...input,
    }
    setDemoItems([...getDemoItems(), item])
    return item
  }
  const token = getBackendToken()
  if (!token) throw new Error('Backend not connected')
  const res = await fetch(`${API_BASE}/items`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new Error(`Failed to create item: ${res.status}`)
  return res.json()
}

export async function updateItem(id: string, patch: ItemPatch): Promise<Item> {
  if (isDemoMode()) {
    const items = getDemoItems()
    const idx = items.findIndex(i => i.id === id)
    if (idx === -1) throw new Error('Demo item not found')
    const updated: Item = {
      ...items[idx],
      ...patch,
      // Mirror the backend's own auto-stamp behavior (see backend/src/routes/items.ts)
      // so Demo Mode's "done today" behavior matches the real API.
      completedAt: patch.completed === true ? new Date().toISOString().slice(0, 10) : items[idx].completedAt,
    }
    const next = [...items]
    next[idx] = updated
    setDemoItems(next)
    return updated
  }
  const token = getBackendToken()
  if (!token) throw new Error('Backend not connected')
  const res = await fetch(`${API_BASE}/items/${id}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(patch),
  })
  if (!res.ok) throw new Error(`Failed to update item: ${res.status}`)
  return res.json()
}

export async function deleteItem(id: string): Promise<void> {
  if (isDemoMode()) {
    setDemoItems(getDemoItems().filter(i => i.id !== id))
    return
  }
  const token = getBackendToken()
  if (!token) throw new Error('Backend not connected')
  const res = await fetch(`${API_BASE}/items/${id}`, { method: 'DELETE', headers: authHeaders() })
  if (!res.ok) throw new Error(`Failed to delete item: ${res.status}`)
}
