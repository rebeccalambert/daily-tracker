import { useEffect, useMemo, useState } from 'react'
import PrayerDropdown from '../components/PrayerDropdown'
import TodoDropdown from '../components/TodoDropdown'
import { getAllPrayerRequests, isPrayerRelevantToday } from '../lib/prayer'
import { getTodayTodos, completeHabiticaTask, uncompleteHabiticaTask, getHabiticaCredentials } from '../lib/habitica'
import { isTodoRelevantOnHome } from '../lib/homeVisibility'
import { todayISO } from '../lib/date'
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

      <PrayerDropdown
        prayers={prayers}
        completedIds={daily.completedPrayerIds}
        order={daily.homePrayerOrder}
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
