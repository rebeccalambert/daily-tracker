import { useEffect, useMemo, useState } from 'react'
import { getTodayEvents, formatEventTime, type DayEvent } from '../lib/calendarDay'
import { isGoogleConnected } from '../lib/googleAuth'
import { getItems, updateItem } from '../lib/itemsApi'
import { todayISO, formatOnceDue } from '../lib/date'
import SortableList from '../components/SortableList'
import type { Item } from '@daily-tracker/shared'
import type { DailyState } from '../types'

interface HomeProps {
  daily: DailyState
}

// Home only ever shows what's still pending - a completed item disappears from Home the moment
// it's checked off, and only becomes visible (and un-checkable) again from the To-Dos tab's
// Completed Today section.
function isPendingOnHome(item: Item, today: string): boolean {
  if (item.completed) return false
  if (item.recurrence === 'once') return !!item.dueDate && item.dueDate <= today
  return true
}

export default function Home({ daily }: HomeProps) {
  const today = todayISO()
  const [todos, setTodos] = useState<Item[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [events, setEvents] = useState<DayEvent[]>([])
  const [eventsStatus, setEventsStatus] = useState<'loading' | 'ready' | 'not-connected' | 'error'>('loading')
  const [now, setNow] = useState(() => new Date())

  function refresh() {
    getItems('todo')
      .then(result => {
        setTodos(result)
        setStatus('ready')
      })
      .catch(() => setStatus('error'))
  }

  useEffect(refresh, [])

  useEffect(() => {
    if (!isGoogleConnected()) {
      setEventsStatus('not-connected')
      return
    }
    getTodayEvents(today)
      .then(result => {
        setEvents(result)
        setEventsStatus('ready')
      })
      .catch(() => setEventsStatus('error'))
  }, [today])

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  // Timed events only — an all-day event is never "happening right now"
  const timedEvents = useMemo(() => events.filter(e => !e.allDay && e.start && e.end), [events])
  const currentEvent = useMemo(
    () => timedEvents.find(e => e.start! <= now && now <= e.end!) ?? null,
    [timedEvents, now]
  )
  // timedEvents is sorted ascending by start 
  const nextEvent = useMemo(() => timedEvents.find(e => e.start! > now) ?? null, [timedEvents, now])

  const pending = useMemo(
    () => todos.filter(item => isPendingOnHome(item, today)).sort((a, b) => a.sortIndex - b.sortIndex),
    [todos, today]
  )

  async function toggleTodo(item: Item) {
    setTodos(prev => prev.map(i => (i.id === item.id ? { ...i, completed: !i.completed } : i)))
    try {
      await updateItem(item.id, { completed: !item.completed })
    } catch {
      setTodos(prev => prev.map(i => (i.id === item.id ? { ...i, completed: item.completed } : i)))
    }
  }

  async function handleReorder(newOrder: Item[]) {
    const nextSortIndex = new Map(newOrder.map((item, index) => [item.id, index]))
    const changed = newOrder.filter(item => item.sortIndex !== nextSortIndex.get(item.id))
    if (changed.length === 0) return

    setTodos(prev => prev.map(i => (nextSortIndex.has(i.id) ? { ...i, sortIndex: nextSortIndex.get(i.id)! } : i)))
    try {
      await Promise.all(changed.map(item => updateItem(item.id, { sortIndex: nextSortIndex.get(item.id) })))
    } catch {
      refresh() // multiple items may have changed - resync with the server
    }
  }

  function renderRow(item: Item) {
    const due = formatOnceDue(item.dueDate, today)
    return (
      <>
        <span className="drag-handle" aria-hidden="true">
          ⠿
        </span>
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
      </>
    )
  }

  return (
    <section className="tab-panel">
      <p className="eyebrow">Main Task</p>
      <div className="main-task-card">
        <p className="main-task-text">{daily.mainTaskText || 'Not set yet'}</p>
      </div>

      {eventsStatus === 'loading' && <p className="tab-caption">Loading calendar…</p>}
      {eventsStatus === 'error' && <p className="tab-caption">Couldn't load your calendar.</p>}
      {eventsStatus === 'ready' && (
        <div className="calendar-widget">
          <p className="section-header">Calendar</p>
          {currentEvent && (
            <div className="event-card">
              <p className="eyebrow">Happening now</p>
              <p className="event-title">{currentEvent.title}</p>
              <p className="event-time">
                {formatEventTime(currentEvent.start!)}–{formatEventTime(currentEvent.end!)}
              </p>
            </div>
          )}
          {nextEvent ? (
            <p className="upcoming-line">
              <span className="upcoming-label">{currentEvent ? 'Next' : 'Upcoming'}</span>
              {nextEvent.title} · {formatEventTime(nextEvent.start!)}
            </p>
          ) : (
            !currentEvent && <p className="tab-caption">Nothing else on your calendar today.</p>
          )}
        </div>
      )}

      <div className="section">
        <p className="section-header">To-Dos</p>
        {status === 'loading' && <p className="tab-caption">Loading…</p>}
        {status === 'error' && <p className="tab-caption">Couldn't load to-dos.</p>}
        {status === 'ready' && pending.length === 0 && <p className="tab-caption">All done!</p>}
        {status === 'ready' && pending.length > 0 && (
          <SortableList
            items={pending}
            onReorder={handleReorder}
            className="todo-list"
            itemClassName="todo-item"
            renderItem={renderRow}
          />
        )}
      </div>
    </section>
  )
}
