import { useEffect, useMemo, useState } from 'react'
import PrayerDropdown from '../components/PrayerDropdown'
import TodoDropdown from '../components/TodoDropdown'
import { getAllPrayerRequests, isPrayerRelevantToday } from '../lib/prayer'
import { getTodayTodos, completeHabiticaTask, uncompleteHabiticaTask, getHabiticaCredentials } from '../lib/habitica'
import { isTodoRelevantOnHome } from '../lib/homeVisibility'
import { todayISO } from '../lib/date'
import { getTodayEvents, formatEventTime, type DayEvent } from '../lib/calendarDay'
import { isGoogleConnected } from '../lib/googleAuth'
import type { DailyState, TodoItem } from '../types'

interface HomeProps {
  daily: DailyState
  onPersist: (patch: Partial<DailyState>) => void
  onEndDay: () => void
}

export default function Home({ daily, onPersist: persist, onEndDay }: HomeProps) {
  const today = todayISO()
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [todosStatus, setTodosStatus] = useState<'loading' | 'ready' | 'not-connected' | 'error'>('loading')
  const [events, setEvents] = useState<DayEvent[]>([])
  const [eventsStatus, setEventsStatus] = useState<'loading' | 'ready' | 'not-connected' | 'error'>('loading')
  // Ticks every minute so "current"/"next" event stay accurate across a long-lived Home mount
  // (evenings when a meeting ends, a new one starts) without needing a full page reload.
  const [now, setNow] = useState(() => new Date())

  // Reading + parsing localStorage on every render (Home re-renders on every checkbox toggle
  // and drag reorder) is wasted work — prayer requests only change via the Prayer tab, a
  // separate mount, so it's safe to compute this once per Home mount instead.
  const prayers = useMemo(() => getAllPrayerRequests().filter(p => isPrayerRelevantToday(p, today)), [today])
  const homeTodos = useMemo(() => todos.filter(t => isTodoRelevantOnHome(t, today)), [todos, today])

  useEffect(() => {
    if (!getHabiticaCredentials()) {
      setTodosStatus('not-connected')
      return
    }
    getTodayTodos()
      .then(result => {
        setTodos(result)
        setTodosStatus('ready')
      })
      .catch(() => setTodosStatus('error'))
  }, [])

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

  // Timed events only — an all-day event is never "happening right now" in the sense this
  // widget means, per product decision.
  const timedEvents = useMemo(() => events.filter(e => !e.allDay && e.start && e.end), [events])
  const currentEvent = useMemo(
    () => timedEvents.find(e => e.start! <= now && now <= e.end!) ?? null,
    [timedEvents, now]
  )
  // timedEvents is sorted ascending by start (see getTodayEvents), so the first event starting
  // after "now" is automatically the one right after currentEvent, if any.
  const nextEvent = useMemo(() => timedEvents.find(e => e.start! > now) ?? null, [timedEvents, now])

  function togglePrayer(id: string) {
    const isDone = daily.completedPrayerIds.includes(id)
    const next = isDone ? daily.completedPrayerIds.filter(i => i !== id) : [...daily.completedPrayerIds, id]
    persist({ completedPrayerIds: next })
  }

  async function toggleTodo(item: TodoItem) {
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

  return (
    <section className="tab-panel">
      <p className="eyebrow">Main Task</p>
      <div className="main-task-card">
        <p className="main-task-text">{daily.mainTaskText || 'Not set yet'}</p>
      </div>

      {eventsStatus === 'not-connected' ? (
        <p className="tab-caption">Connect Google in Settings to see today's calendar here.</p>
      ) : eventsStatus === 'error' ? (
        <p className="tab-caption">Couldn't load your calendar — check your connection in Settings.</p>
      ) : eventsStatus === 'ready' ? (
        <div className="calendar-widget">
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
      ) : null}

      <PrayerDropdown
        prayers={prayers}
        completedIds={daily.completedPrayerIds}
        order={daily.homePrayerOrder}
        open={daily.homePrayerOpen}
        onToggleOpen={() => persist({ homePrayerOpen: !daily.homePrayerOpen })}
        onToggle={togglePrayer}
        onReorder={newOrder => persist({ homePrayerOrder: newOrder })}
      />

      {todosStatus === 'not-connected' ? (
        <p className="tab-caption">Connect Habitica in Settings to see your to-dos here.</p>
      ) : todosStatus === 'error' ? (
        <p className="tab-caption">Couldn't load Habitica to-dos — check your connection in Settings.</p>
      ) : (
        <TodoDropdown
          todos={homeTodos}
          order={daily.homeTodoOrder}
          open={daily.homeTodoOpen}
          onToggleOpen={() => persist({ homeTodoOpen: !daily.homeTodoOpen })}
          onToggle={toggleTodo}
          onReorder={newOrder => persist({ homeTodoOrder: newOrder })}
        />
      )}

      <button className="end-day-link" onClick={onEndDay}>
        End day →
      </button>
    </section>
  )
}
