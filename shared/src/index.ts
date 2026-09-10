// The Item model — one definition imported by both the Express API
// (backend/) and the React frontend (frontend/). See ITEM_MODEL_SPEC.md at
// the repo root for the full field-by-field reasoning. Zero-build package:
// both sides import this .ts source directly (Vite and tsx both handle that
// natively), so there's no dist/ to keep in sync.

export type ItemType = 'todo' | 'prayer' // 'prayer' is being retired — see Ticket 6
export type Recurrence = 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly'

export interface Item {
  id: string
  type: ItemType
  recurrence: Recurrence
  text: string
  notes: string | null
  completed: boolean
  completedAt: string | null // ISO date
  dueDate: string | null // 'once' only
  weekday: string | null // 'weekly' only
  dayOfMonth: number | null // 'monthly' or 'yearly'
  month: number | null // 'yearly' only
  sortIndex: number
  createdAt: string
  updatedAt: string
}

// Fields a client may set when creating an item — everything except what
// the server owns (id, completed/completedAt, timestamps).
export type NewItem = Pick<Item, 'type' | 'recurrence' | 'text'> &
  Partial<Pick<Item, 'notes' | 'dueDate' | 'weekday' | 'dayOfMonth' | 'month' | 'sortIndex'>>

// Any subset of fields a client may PATCH.
export type ItemPatch = Partial<
  Pick<Item, 'text' | 'notes' | 'completed' | 'dueDate' | 'weekday' | 'dayOfMonth' | 'month' | 'sortIndex'>
>

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const

export const RECURRENCES: Recurrence[] = ['once', 'daily', 'weekly', 'monthly', 'yearly']
