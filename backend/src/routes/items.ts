import { Router } from 'express'
import { prisma } from '../prisma.js'
import { applyCycleReset, chicagoToday, todayAsStoredDate } from '../lib/recurrence.js'

export const itemsRouter = Router()

const VALID_TYPES = ['todo', 'prayer']
const VALID_RECURRENCES = ['once', 'daily', 'weekly', 'monthly', 'yearly']

// Fields a client is allowed to set via PATCH. Raw/dumb pass-through, with
// one exception: completing an item (completed -> true) always gets its
// completedAt server-stamped below, overriding whatever's in the body — the
// recurrence engine's cycle-reset depends on completedAt being trustworthy.
// completedAt otherwise stays independently PATCHable (e.g. manual data
// fixes) when completed isn't being set to true in the same request.
const PATCHABLE_FIELDS = [
  'type',
  'recurrence',
  'text',
  'notes',
  'completed',
  'completedAt',
  'dueDate',
  'weekday',
  'dayOfMonth',
  'month',
  'sortIndex',
] as const

const DATE_FIELDS = new Set(['dueDate', 'completedAt'])

// GET /items?type=todo|prayer — list, with the lazy cycle-reset applied.
itemsRouter.get('/', async (req, res) => {
  const { type } = req.query

  if (type !== undefined && (typeof type !== 'string' || !VALID_TYPES.includes(type))) {
    return res.status(400).json({ error: `type must be one of: ${VALID_TYPES.join(', ')}` })
  }

  const items = await prisma.item.findMany({
    where: type ? { type } : undefined,
    orderBy: { sortIndex: 'asc' },
  })

  // Full list, unfiltered — every item regardless of due date or cycle
  // state (see ITEM_MODEL_SPEC.md "Home vs. the full list"). Only the
  // completed flag gets recomputed per item; nothing is hidden or written
  // back to the database.
  const today = chicagoToday()
  res.json(items.map((item) => applyCycleReset(item, today)))
})

// POST /items — create. Only the fields that make sense for every item are
// required; recurrence-specific fields (weekday, dayOfMonth, month, dueDate)
// are accepted as-is with no cross-field validation yet.
itemsRouter.post('/', async (req, res) => {
  const body = req.body ?? {}
  const { type, recurrence, text, notes, dueDate, weekday, dayOfMonth, month, sortIndex } = body

  if (!VALID_TYPES.includes(type)) {
    return res.status(400).json({ error: `type must be one of: ${VALID_TYPES.join(', ')}` })
  }
  if (!VALID_RECURRENCES.includes(recurrence)) {
    return res.status(400).json({ error: `recurrence must be one of: ${VALID_RECURRENCES.join(', ')}` })
  }
  if (typeof text !== 'string' || text.trim() === '') {
    return res.status(400).json({ error: 'text is required' })
  }

  const item = await prisma.item.create({
    data: {
      type,
      recurrence,
      text,
      notes: notes ?? null,
      dueDate: dueDate ? new Date(dueDate) : null,
      weekday: weekday ?? null,
      dayOfMonth: typeof dayOfMonth === 'number' ? dayOfMonth : null,
      month: typeof month === 'number' ? month : null,
      sortIndex: typeof sortIndex === 'number' ? sortIndex : 0,
    },
  })
  res.status(201).json(item)
})

// PATCH /items/:id — partial update. Whatever allowed fields are present in
// the body get set, verbatim. No defaulting, no side effects.
itemsRouter.patch('/:id', async (req, res) => {
  const { id } = req.params
  const body = req.body ?? {}
  const data: Record<string, unknown> = {}

  for (const key of PATCHABLE_FIELDS) {
    if (key in body) {
      data[key] = DATE_FIELDS.has(key) && body[key] ? new Date(body[key]) : body[key]
    }
  }

  // Completing an item always stamps completedAt server-side (Chicago
  // calendar date), regardless of what the client sent for it — this is
  // the value the recurrence engine's cycle-reset keys off of.
  if (data.completed === true) {
    data.completedAt = todayAsStoredDate()
  }

  if (Object.keys(data).length === 0) {
    return res.status(400).json({ error: 'No updatable fields provided' })
  }
  if ('type' in data && !VALID_TYPES.includes(data.type as string)) {
    return res.status(400).json({ error: `type must be one of: ${VALID_TYPES.join(', ')}` })
  }
  if ('recurrence' in data && !VALID_RECURRENCES.includes(data.recurrence as string)) {
    return res.status(400).json({ error: `recurrence must be one of: ${VALID_RECURRENCES.join(', ')}` })
  }

  try {
    const item = await prisma.item.update({ where: { id }, data })
    res.json(item)
  } catch (err: any) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Item not found' })
    }
    throw err
  }
})

// DELETE /items/:id — removes outright, distinct from marking done.
itemsRouter.delete('/:id', async (req, res) => {
  const { id } = req.params
  try {
    await prisma.item.delete({ where: { id } })
    res.status(204).send()
  } catch (err: any) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Item not found' })
    }
    throw err
  }
})
