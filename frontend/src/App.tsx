import { useEffect, useState } from 'react'
import Home from './pages/Home'
import TodosTab from './pages/TodosTab'
import CalendarTab from './pages/CalendarTab'
import Settings from './pages/Settings'
import HamburgerMenu from './components/HamburgerMenu'
import MorningModal from './components/MorningModal'
import { isBackendConnected } from './lib/itemsApi'
import { getDailyState, updateDailyState } from './lib/dailyState'
import { todayISO, addDays } from './lib/date'
import type { DailyState } from './types'
import './App.css'

type Tab = 'home' | 'todos' | 'settings' | 'calendar'

function formattedToday(): string {
  return new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

function App() {
  const today = todayISO()
  const [tab, setTab] = useState<Tab>('home')
  const [showMorning, setShowMorning] = useState(false)
  // Single source of truth for today's state — Home and the modals both read/write through
  // this rather than each independently touching storage, since a modal renders on top of
  // Home (not instead of it) and Home would otherwise show stale data after a modal action.
  const [daily, setDaily] = useState<DailyState>(() => getDailyState(today))
  // Non-null while showing a catch-up evening review (a gap was detected on load) — the ISO
  // date of the missed day being reviewed. Kept separate from `daily`/`today` on purpose: the
  // catch-up review reads/writes the missed day's own DailyState (so marking it
  // eveningReviewDone doesn't falsely mark *today's* review done too, which would stop today's
  // own 5pm auto-trigger from ever firing).

  function persistDaily(patch: Partial<DailyState>) {
    setDaily(updateDailyState(today, patch))
  }

  function checkDailyPrompts() {
    if (!daily.mainTaskSource) {
      setShowMorning(true)
    }
  }

  useEffect(() => {
    // Connection guard: without the backend connected there's nothing meaningful to show on Home
    // yet. TODO: A Google connectedness check belongs here too, once real OAuth exists — see Settings.)
    if (!isBackendConnected()) {
      setTab('settings')
      return
    }

    checkDailyPrompts()
    // Only meant to run once on load — deliberately not re-running when `daily` changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleConnectionsChanged() {
    // The backend connecting mid-session (see Settings) means the guard above already ran and
    // gave up — re-check now instead of making the user reload the page.
    if (isBackendConnected()) {
      setTab('home')
      checkDailyPrompts()
    }
  }

  function handleMorningConfirm(text: string, source: 'calendar' | 'manual') {
    persistDaily({ mainTaskText: text, mainTaskSource: source })
    setShowMorning(false)
  }

  return (
    <div className="app">
      <header className="topbar">
        <span className="date">{formattedToday()}</span>
        <HamburgerMenu
          onSelectSettings={() => setTab('settings')}
          onSelectCalendar={() => setTab('calendar')}
        />
      </header>

      <main className="content">
        {tab === 'home' && (
          <Home daily={daily} onPersist={persistDaily} />
        )}
        {tab === 'todos' && <TodosTab />}
        {tab === 'calendar' && <CalendarTab />}
        {tab === 'settings' && (
          <Settings
            onConnectionsChanged={handleConnectionsChanged}
          />
        )}
      </main>

      <nav className="tabbar">
        <button className={`tab-btn${tab === 'home' ? ' active' : ''}`} onClick={() => setTab('home')}>
          Home
        </button>
        
        <button className={`tab-btn${tab === 'todos' ? ' active' : ''}`} onClick={() => setTab('todos')}>
          To-Dos
        </button>
        
      </nav>

      {showMorning && <MorningModal onConfirm={handleMorningConfirm} />}
    </div>
  )
}

export default App
