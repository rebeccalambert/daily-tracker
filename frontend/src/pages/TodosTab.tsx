import { useEffect, useMemo, useState, type FormEvent, type MouseEvent } from 'react'
import { getItems, createItem, updateItem, isBackendConnected } from '../lib/itemsApi'
import { todayISO, formatShortDate } from '../lib/date'
import { WEEKDAYS, type Item, type Recurrence } from '@daily-tracker/shared'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function ordinal(n: number): string {
  const suffixes = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return `${n}${suffixes[(v - 20) % 10] ?? suffixes[v] ?? suffixes[0]}`
}

/** Human label for an item's cadence — everything but 'once', which is shown via its due date instead. */
function describeCadence(item: Item): string {
  switch (item.recurrence) {
    case 'daily':
      return 'Daily'
    case 'weekly':
      return `Weekly · ${item.weekday}`
    case 'monthly':
      return `Monthly · ${ordinal(item.dayOfMonth ?? 1)}`
    case 'yearly':
      return `Yearly · ${MONTHS[(item.month ?? 1) - 1]} ${ordinal(item.dayOfMonth ?? 1)}`
    default:
      return ''
  }
}

interface DueInfo {
  text: string
  overdue: boolean
}

function formatOnceDue(dueDate: string | null, today: string): DueInfo {
  if (!dueDate) return { text: '', overdue: false }
  if (dueDate === today) return { text: 'Due today', overdue: false }
  if (dueDate < today) return { text: `Overdue · ${formatShortDate(dueDate)}`, overdue: true }
  return { text: `Due ${formatShortDate(dueDate)}`, overdue: false }
}

interface FormState {
  text: string
  recurrence: Recurrence
  dueDate: string
  weekday: string
  dayOfMonth: string
  month: string
  notes: string
}

function emptyForm(): FormState {
  return { text: '', recurrence: 'once', dueDate: '', weekday: 'Monday', dayOfMonth: '1', month: '1', notes: '' }
}

function formToItem(form: FormState) {
  const text = form.text.trim()
  const notes = form.notes.trim() || undefined
  switch (form.recurrence) {
    case 'once':
      return { text, notes, dueDate: form.dueDate || undefined }
    case 'daily':
      return { text, notes }
    case 'weekly':
      return { text, notes, weekday: form.weekday }
    case 'monthly':
      return { text, notes, dayOfMonth: Number(form.dayOfMonth) }
    case 'yearly':
      return { text, notes, month: Number(form.month), dayOfMonth: Number(form.dayOfMonth) }
  }
}

function itemToForm(item: Item): FormState {
  return {
    text: item.text,
    recurrence: item.recurrence,
    dueDate: item.dueDate ?? '',
    weekday: item.weekday ?? 'Monday',
    dayOfMonth: String(item.dayOfMonth ?? 1),
    month: String(item.month ?? 1),
    notes: item.notes ?? '',
  }
}

export default function TodosTab() {
  const today = todayISO()
  const [items, setItems] = useState<Item[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'not-connected' | 'error'>('loading')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [backlogOpen, setBacklogOpen] = useState(false)

  function refresh() {
    if (!isBackendConnected()) {
      setStatus('not-connected')
      return
    }
    getItems('todo')
      .then(result => {
        setItems(result)
        setStatus('ready')
      })
      .catch(() => setStatus('error'))
  }

  useEffect(refresh, [])

  function openNew() {
    setEditingId(null)
    setForm(emptyForm())
    setShowForm(true)
  }

  function openEdit(item: Item, e: MouseEvent) {
    e.preventDefault()
    setEditingId(item.id)
    setForm(itemToForm(item))
    setShowForm(true)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.text.trim()) return
    try {
      if (editingId) {
        await updateItem(editingId, formToItem(form))
      } else {
        await createItem({ type: 'todo', recurrence: form.recurrence, ...formToItem(form) })
      }
      refresh()
    } catch {
      setStatus('error')
    }
    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm())
  }

  async function toggleDone(item: Item) {
    setItems(prev => prev.map(i => (i.id === item.id ? { ...i, completed: !i.completed } : i)))
    try {
      await updateItem(item.id, { completed: !item.completed })
    } catch {
      setItems(prev => prev.map(i => (i.id === item.id ? { ...i, completed: item.completed } : i)))
    }
  }

  // Memoized (and computed before the early returns below, so hook order stays consistent across
  // renders) so typing in the add/edit form doesn't re-filter/re-sort every keystroke.
  const backlog = useMemo(() => items.filter(i => i.recurrence === 'once' && !i.dueDate), [items])
  const dated = useMemo(
    () =>
      items
        .filter(i => i.recurrence === 'once' && !!i.dueDate)
        .slice()
        .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? '')),
    [items]
  )
  const byRecurrence = useMemo(() => {
    const group = (r: Recurrence) =>
      items
        .filter(i => i.recurrence === r)
        .slice()
        .sort((a, b) => a.text.localeCompare(b.text))
    return { daily: group('daily'), weekly: group('weekly'), monthly: group('monthly'), yearly: group('yearly') }
  }, [items])

  if (status === 'not-connected') {
    return (
      <section className="tab-panel">
        <p className="tab-title">To-Dos</p>
        <p className="tab-caption">Connect the Daily API in Settings to see your to-dos here.</p>
      </section>
    )
  }

  if (status === 'error') {
    return (
      <section className="tab-panel">
        <p className="tab-title">To-Dos</p>
        <p className="tab-caption">Couldn't load to-dos — check your connection in Settings.</p>
      </section>
    )
  }

  function renderItem(item: Item, dueOverride?: DueInfo) {
    const due = dueOverride ?? { text: describeCadence(item), overdue: false }
    return (
      <li key={item.id} className={`todo-item${item.completed ? ' done' : ''}`}>
        <input type="checkbox" id={`ts-${item.id}`} checked={item.completed} onChange={() => toggleDone(item)} />
        <label htmlFor={`ts-${item.id}`} className="editable-label" onClick={e => openEdit(item, e)}>
          {item.text} <span className={`due${due.overdue ? ' overdue' : ''}`}>{due.text}</span>
          {item.notes && <span className="note">{item.notes}</span>}
        </label>
      </li>
    )
  }

  return (
    <section className="tab-panel">
      <p className="tab-title">To-Dos</p>
      <p className="tab-caption">Once, daily, weekly, monthly, or yearly — pick whatever fits.</p>
      <button className="add-btn" onClick={openNew}>
        + Add to-do
      </button>

      {showForm && (
        <form className="add-form" onSubmit={handleSubmit}>
          <label className="field-label">
            Name
            <input
              value={form.text}
              onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
              placeholder="e.g. Follow up with recruiter"
            />
          </label>

          <label className="field-label">
            Repeats
            <select
              value={form.recurrence}
              onChange={e => setForm(f => ({ ...f, recurrence: e.target.value as Recurrence }))}
            >
              <option value="once">Once</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </label>

          {form.recurrence === 'once' && (
            <label className="field-label">
              Due date (optional)
              <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
            </label>
          )}

          {form.recurrence === 'weekly' && (
            <label className="field-label">
              Which day
              <select value={form.weekday} onChange={e => setForm(f => ({ ...f, weekday: e.target.value }))}>
                {WEEKDAYS.map(w => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </label>
          )}

          {form.recurrence === 'monthly' && (
            <label className="field-label">
              Day of month
              <input
                type="number"
                min={1}
                max={31}
                value={form.dayOfMonth}
                onChange={e => setForm(f => ({ ...f, dayOfMonth: e.target.value }))}
              />
            </label>
          )}

          {form.recurrence === 'yearly' && (
            <>
              <label className="field-label">
                Month
                <select value={form.month} onChange={e => setForm(f => ({ ...f, month: e.target.value }))}>
                  {MONTHS.map((m, idx) => (
                    <option key={m} value={idx + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-label">
                Day
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={form.dayOfMonth}
                  onChange={e => setForm(f => ({ ...f, dayOfMonth: e.target.value }))}
                />
              </label>
            </>
          )}

          <label className="field-label">
            Notes (optional)
            <textarea
              rows={2}
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Any extra detail for this task"
            />
          </label>
          <button type="submit" className="primary-btn">
            Save
          </button>
        </form>
      )}

      {backlog.length > 0 && (
        <div className="section" data-open={backlogOpen}>
          <button className="section-header" aria-expanded={backlogOpen} onClick={() => setBacklogOpen(o => !o)}>
            Backlog <span className="chevron">›</span>
          </button>
          {backlogOpen && (
            <div className="section-body">
              <ul className="todo-list">{backlog.map(item => renderItem(item, { text: '', overdue: false }))}</ul>
            </div>
          )}
        </div>
      )}

      {dated.length > 0 && (
        <>
          <p className="group-label">Due dates</p>
          <ul className="todo-list">{dated.map(item => renderItem(item, formatOnceDue(item.dueDate, today)))}</ul>
        </>
      )}

      {byRecurrence.daily.length > 0 && (
        <>
          <p className="group-label">Daily</p>
          <ul className="todo-list">{byRecurrence.daily.map(item => renderItem(item))}</ul>
        </>
      )}

      {byRecurrence.weekly.length > 0 && (
        <>
          <p className="group-label">Weekly</p>
          <ul className="todo-list">{byRecurrence.weekly.map(item => renderItem(item))}</ul>
        </>
      )}

      {byRecurrence.monthly.length > 0 && (
        <>
          <p className="group-label">Monthly</p>
          <ul className="todo-list">{byRecurrence.monthly.map(item => renderItem(item))}</ul>
        </>
      )}

      {byRecurrence.yearly.length > 0 && (
        <>
          <p className="group-label">Yearly</p>
          <ul className="todo-list">{byRecurrence.yearly.map(item => renderItem(item))}</ul>
        </>
      )}
    </section>
  )
}
