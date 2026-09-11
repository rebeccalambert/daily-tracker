import { useEffect, useMemo, useState } from 'react'
// import { getTodayEvents, formatEventTime, type DayEvent } from '../lib/calendarDay'
// import { isGoogleConnected } from '../lib/googleAuth'
import { getItems, updateItem } from '../lib/itemsApi'
import { todayISO, formatOnceDue } from '../lib/date'
import type { Item } from '@daily-tracker/shared'
import type { DailyState } from '../types'

interface HomeProps {
  daily: DailyState
}

function isTodoVisibleOnHome(item: Item, today: string): boolean {
  if (item.completed) return item.completedAt === today
  if (item.recurrence === 'once') return !!item.dueDate && item.dueDate <= today
  return true
}


export default function Home({ daily }: HomeProps) {
  const today = todayISO()
  const [todos, setTodos] = useState<Item[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    getItems('todo')
      .then(result => {
        setTodos(result)
        setStatus('ready')
      })
      .catch(() => setStatus('error'))
  }, [])

  // Pending first (by manual sortIndex), done-today sunk to the bottom - see ITEM_MODEL_SPEC.md
  // "The done today display rule".
  const homeTodos = useMemo(() => {
    const visible = todos.filter(item => isTodoVisibleOnHome(item, today)).sort((a, b) => a.sortIndex - b.sortIndex)
    return [...visible.filter(i => !i.completed), ...visible.filter(i => i.completed)]
  }, [todos, today])

  async function toggleTodo(item: Item) {
    setTodos(prev => prev.map(i => (i.id === item.id ? { ...i, completed: !i.completed } : i)))
    try {
      await updateItem(item.id, { completed: !item.completed })
    } catch {
      setTodos(prev => prev.map(i => (i.id === item.id ? { ...i, completed: item.completed } : i)))
    }
  }

  return (
    <section className="tab-panel">
      <p className="eyebrow">Main Task</p>
      <div className="main-task-card">
        <p className="main-task-text">{daily.mainTaskText || 'Not set yet'}</p>
      </div>

      {/* TODO: read-only Calendar widget — Ticket 9 */}

      <div className="section">
        <p className="section-header">To-Dos</p>
        {status === 'loading' && <p className="tab-caption">Loading…</p>}
        {status === 'error' && <p className="tab-caption">Couldn't load to-dos.</p>}
        {status === 'ready' && homeTodos.length === 0 && <p className="tab-caption">Nothing due today.</p>}
        {status === 'ready' && homeTodos.length > 0 && (
          <ul className="todo-list">
            {homeTodos.map(item => {
              const due = formatOnceDue(item.dueDate, today)
              return (
                <li key={item.id} className={`todo-item${item.completed ? ' done' : ''}`}>
                  <input
                    type="checkbox"
                    id={`home-todo-${item.id}`}
                    checked={item.completed}
                    onChange={() => toggleTodo(item)}
                  />
                  <label htmlFor={`home-todo-${item.id}`}>
                    {item.text}
                    {due.overdue && <span className="due overdue">{due.text}</span>}
                  </label>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
