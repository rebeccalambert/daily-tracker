import { useEffect, useMemo, useState, type FormEvent, type MouseEvent } from 'react'
import {
  getTodayTodos,
  createHabiticaTodo,
  updateHabiticaTodo,
  completeHabiticaTask,
  uncompleteHabiticaTask,
  getHabiticaCredentials,
} from '../lib/habitica'
import { effectiveSortDate, formatDue, todayISO } from '../lib/date'
import type { TodoItem } from '../types'

interface FormState {
  name: string
  date: string
  note: string
}

function emptyForm(): FormState {
  return { name: '', date: '', note: '' }
}

export default function TodosTab() {
  const today = todayISO()
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'not-connected' | 'error'>('loading')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [backlogOpen, setBacklogOpen] = useState(false)

  function refresh() {
    if (!getHabiticaCredentials()) {
      setStatus('not-connected')
      return
    }
    getTodayTodos()
      .then(result => {
        setTodos(result)
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

  function openEdit(item: TodoItem, e: MouseEvent) {
    e.preventDefault()
    if (item.type !== 'todo') return
    setEditingId(item.id)
    setForm({ name: item.text, date: item.dueDate || '', note: item.notes || '' })
    setShowForm(true)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const name = form.name.trim()
    if (!name) return
    const dueDate = form.date || undefined
    const notes = form.note.trim() || undefined
    try {
      if (editingId) {
        await updateHabiticaTodo(editingId, { text: name, date: dueDate ?? null, notes })
      } else {
        await createHabiticaTodo(name, dueDate, notes)
      }
      refresh()
    } catch {
      setStatus('error')
    }
    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm())
  }

  async function toggleDone(item: TodoItem) {
    setTodos(prev => prev.map(t => (t.id === item.id ? { ...t, completed: !t.completed } : t)))
    try {
      if (item.completed) {
        await uncompleteHabiticaTask(item.id)
      } else {
        await completeHabiticaTask(item.id)
      }
    } catch {
      setTodos(prev => prev.map(t => (t.id === item.id ? { ...t, completed: item.completed } : t)))
    }
  }

  // Memoized (and computed before the early returns below, so hook order stays consistent
  // across renders) so typing in the add/edit form doesn't re-filter/re-sort every keystroke.
  const backlog = useMemo(() => todos.filter(t => t.type === 'todo' && !t.dueDate), [todos])
  const sorted = useMemo(
    () =>
      todos
        .filter(t => t.type === 'daily' || !!t.dueDate)
        .slice()
        .sort((a, b) => (effectiveSortDate(a, today) || '').localeCompare(effectiveSortDate(b, today) || '')),
    [todos, today]
  )

  if (status === 'not-connected') {
    return (
      <section className="tab-panel">
        <p className="tab-title">To-Dos</p>
        <p className="tab-caption">Connect Habitica in Settings to see your to-dos here.</p>
      </section>
    )
  }

  if (status === 'error') {
    return (
      <section className="tab-panel">
        <p className="tab-title">To-Dos</p>
        <p className="tab-caption">Couldn't load Habitica to-dos — check your connection in Settings.</p>
      </section>
    )
  }

  return (
    <section className="tab-panel">
      <p className="tab-title">To-Dos</p>
      <p className="tab-caption">Synced from Habitica — dailies and tasks due today. Habits excluded for now.</p>
      <button className="add-btn" onClick={openNew}>
        + Add to-do
      </button>

      {showForm && (
        <form className="add-form" onSubmit={handleSubmit}>
          <label className="field-label">
            Name
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Follow up with recruiter"
            />
          </label>
          <label className="field-label">
            Due date (optional)
            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          </label>
          <label className="field-label">
            Notes (optional)
            <textarea
              rows={2}
              value={form.note}
              onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
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
              <ul className="todo-list">
                {backlog.map(item => (
                  <li key={item.id} className={`todo-item${item.completed ? ' done' : ''}`}>
                    <input
                      type="checkbox"
                      id={`bl-${item.id}`}
                      checked={item.completed}
                      onChange={() => toggleDone(item)}
                    />
                    <label htmlFor={`bl-${item.id}`} className="editable-label" onClick={e => openEdit(item, e)}>
                      {item.text}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <p className="group-label">By due date</p>
      <ul className="todo-list">
        {sorted.map(item => {
          const due = item.type === 'todo' ? formatDue(item.dueDate, today) : { text: 'Daily', overdue: false }
          return (
            <li key={item.id} className={`todo-item${item.completed ? ' done' : ''}`}>
              <input type="checkbox" id={`ts-${item.id}`} checked={item.completed} onChange={() => toggleDone(item)} />
              <label
                htmlFor={`ts-${item.id}`}
                className={item.type === 'todo' ? 'editable-label' : undefined}
                onClick={item.type === 'todo' ? e => openEdit(item, e) : undefined}
              >
                {item.text} <span className={`due${due.overdue ? ' overdue' : ''}`}>{due.text}</span>
                {item.notes && <span className="note">{item.notes}</span>}
              </label>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
