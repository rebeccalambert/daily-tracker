import { useEffect, useMemo, useState } from 'react'
import TodoDropdown from '../components/TodoDropdown'
import { todayISO } from '../lib/date'
// import { getTodayEvents, formatEventTime, type DayEvent } from '../lib/calendarDay'
// import { isGoogleConnected } from '../lib/googleAuth'
import type { DailyState, TodoItem } from '../types'

interface HomeProps {
  daily: DailyState
  onPersist: (patch: Partial<DailyState>) => void
}

export default function Home({ daily, onPersist: persist }: HomeProps) {
  const today = todayISO()
  const [todos, setTodos] = useState<TodoItem[]>([])
  // const [events, setEvents] = useState<DayEvent[]>([])
  // const [eventsStatus, setEventsStatus] = useState<'loading' | 'ready' | 'not-connected' | 'error'>('loading')
  // // Ticks every minute so "current"/"next" event stay accurate across a long-lived Home mount
  // // (evenings when a meeting ends, a new one starts) without needing a full page reload.
  // const [now, setNow] = useState(() => new Date())

  const homeTodos = useMemo(() => todos.filter(t => {
    if (t.type === 'daily') return true
    return !!t.dueDate && t.dueDate <= today
  }
 ), [todos, today])

  // useEffect(() => {
  //   if (!isGoogleConnected()) {
  //     setEventsStatus('not-connected')
  //     return
  //   }
  //   getTodayEvents(today)
  //     .then(result => {
  //       setEvents(result)
  //       setEventsStatus('ready')
  //     })
  //     .catch(() => setEventsStatus('error'))
  // }, [today])

  // useEffect(() => {
  //   const id = setInterval(() => setNow(new Date()), 60_000)
  //   return () => clearInterval(id)
  // }, [])

  // Timed events only — an all-day event is never "happening right now" in the sense this
  // widget means, per product decision.
  // const timedEvents = useMemo(() => events.filter(e => !e.allDay && e.start && e.end), [events])
  // const currentEvent = useMemo(
  //   () => timedEvents.find(e => e.start! <= now && now <= e.end!) ?? null,
  //   [timedEvents, now]
  // )
  // timedEvents is sorted ascending by start (see getTodayEvents), so the first event starting
  // after "now" is automatically the one right after currentEvent, if any.
  // const nextEvent = useMemo(() => timedEvents.find(e => e.start! > now) ?? null, [timedEvents, now])

  async function toggleTodo(item: TodoItem) {
    // setTodos(prev => prev.map(t => (t.id === item.id ? { ...t, completed: !t.completed } : t)))
    // try {

    // } catch {
    //   setTodos(prev => prev.map(t => (t.id === item.id ? { ...t, completed: item.completed } : t)))
    // }
  }

  return (
    <section className="tab-panel">
      <p className="eyebrow">Main Task</p>
      <div className="main-task-card">
        <p className="main-task-text">{daily.mainTaskText || 'Not set yet'}</p>
      </div>

        {/* TODO: setup calendar           */}
        {/* {(eventsStatus === 'ready') ? (
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
        ) : (
          <p className="tab-caption">Connect Google in Settings to see today's calendar here.</p>
        )} */}

  
      <TodoDropdown
        todos={homeTodos}
        order={daily.homeTodoOrder}
        open={daily.homeTodoOpen}
        onToggleOpen={() => persist({ homeTodoOpen: !daily.homeTodoOpen })}
        onToggle={toggleTodo}
        onReorder={newOrder => persist({ homeTodoOrder: newOrder })}
      />
    </section>
  )
}
