import { getItem, setItem, removeItem } from './storage'
import type { Item, ItemType, NewItem, ItemPatch } from '@daily-tracker/shared'

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'https://daily-tracker-d7su.onrender.com'
const TOKEN_KEY = 'backendAuthToken'


export function getBackendToken(): string | null {
  return getItem<string | null>(TOKEN_KEY, null)
}

export function isBackendConnected(): boolean {
  return !!getBackendToken()
}

export async function loginToBackend(password: string): Promise<boolean> {
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
  const token = getBackendToken()
  if (!token) throw new Error('Backend not connected')
  const res = await fetch(`${API_BASE}/items?type=${type}`, { headers: authHeaders() })
  if (!res.ok) throw new Error(`Failed to load items: ${res.status}`)
  return res.json()
}

export async function createItem(input: NewItem): Promise<Item> {
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
  const token = getBackendToken()
  if (!token) throw new Error('Backend not connected')
  const res = await fetch(`${API_BASE}/items/${id}`, { method: 'DELETE', headers: authHeaders() })
  if (!res.ok) throw new Error(`Failed to delete item: ${res.status}`)
}
