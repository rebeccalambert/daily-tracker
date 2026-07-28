import { useEffect, useState } from 'react'
import Home from './pages/Home'
import PrayerTab from './pages/PrayerTab'
import TodosTab from './pages/TodosTab'
import Settings from './pages/Settings'
import HamburgerMenu from './components/HamburgerMenu'
import MorningModal from './components/MorningModal'
import EveningReviewModal from './components/EveningReviewModal'
import { getHabiticaCredentials } from './lib/habitica'
import { getDailyState, updateDailyState } from './lib/dailyState'
import { todayISO } from './lib/date'
import type { DailyState } from './types'
import './App.css'

type Tab = 'home' | 'prayer' | 'todos' | 'settings'

function formattedToday(): string {
  return new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

function App() {
  const today = todayISO()
  const [tab, setTab] = useState<Tab>('home')
  const [showMorning, setShowMorning] = useState(false)
  const [showEvening, setShowEvening] = useState(false)
  // Single source of truth for today's state — Home and the modals both read/write through
  // this rather than each independently touching storage, since a modal renders on top of
  // Home (not instead of it) and Home would otherwise show stale data after a modal action.
  const [daily, setDaily] = useState<DailyState>(() => getDailyState(today))

  function persistDaily(patch: Partial<DailyState>) {
    setDaily(updateDailyState(today, patch))
  }

  function checkDailyPrompts() {
    if (!daily.mainTaskSource) {
      setShowMorning(true)
    } else if (new Date().getHours() >= 17 && !daily.eveningReviewDone) {
      setShowEvening(true)
    }
  }

  useEffect(() => {
    // Connection guard: without Habitica connected there's nothing meaningful to show on Home yet.
    // (A Google connectedness check belongs here too, once real OAuth exists — see Settings.)
    if (!getHabiticaCredentials()) {
      setTab('settings')
      return
    }
    checkDailyPrompts()
    // Only meant to run once on load — deliberately not re-running when `daily` changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleConnectionsChanged() {
    // Habitica connecting mid-session (see Settings) means the guard above already ran and
    // gave up — re-check now instead of making the user reload the page.
    if (getHabiticaCredentials()) {
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
        <HamburgerMenu onSelectSettings={() => setTab('settings')} />
      </header>

      <main className="content">
        {tab === 'home' && <Home daily={daily} onPersist={persistDaily} onEndDay={() => setShowEvening(true)} />}
        {tab === 'prayer' && <PrayerTab />}
        {tab === 'todos' && <TodosTab />}
        {tab === 'settings' && <Settings onConnectionsChanged={handleConnectionsChanged} />}
      </main>

      <nav className="tabbar">
        <button className={`tab-btn${tab === 'home' ? ' active' : ''}`} onClick={() => setTab('home')}>
          Home
        </button>
        <button className={`tab-btn${tab === 'prayer' ? ' active' : ''}`} onClick={() => setTab('prayer')}>
          Prayer
        </button>
        <button className={`tab-btn${tab === 'todos' ? ' active' : ''}`} onClick={() => setTab('todos')}>
          To-Dos
        </button>
      </nav>

      {showMorning && <MorningModal onConfirm={handleMorningConfirm} />}
      {showEvening && <EveningReviewModal daily={daily} onPersist={persistDaily} onClose={() => setShowEvening(false)} />}
    </div>
  )
}

export default App
