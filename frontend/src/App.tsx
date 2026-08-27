import { useEffect, useState } from 'react'
import Home from './pages/Home'
import PrayerTab from './pages/PrayerTab'
import TodosTab from './pages/TodosTab'
import CalendarTab from './pages/CalendarTab'
import Settings from './pages/Settings'
import HamburgerMenu from './components/HamburgerMenu'
import MorningModal from './components/MorningModal'
import EveningReviewModal from './components/EveningReviewModal'
import { getHabiticaCredentials } from './lib/habitica'
import { getDailyState, updateDailyState, getLastLoggedDate } from './lib/dailyState'
import { getFeatureVisibility } from './lib/featureVisibility'
import { todayISO, addDays } from './lib/date'
import type { DailyState } from './types'
import './App.css'

type Tab = 'home' | 'prayer' | 'todos' | 'settings' | 'calendar'

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
  // Non-null while showing a catch-up evening review (a gap was detected on load) — the ISO
  // date of the missed day being reviewed. Kept separate from `daily`/`today` on purpose: the
  // catch-up review reads/writes the missed day's own DailyState (so marking it
  // eveningReviewDone doesn't falsely mark *today's* review done too, which would stop today's
  // own 5pm auto-trigger from ever firing).
  const [catchupDate, setCatchupDate] = useState<string | null>(null)
  const [catchupDaily, setCatchupDaily] = useState<DailyState | null>(null)
  const [visibility, setVisibility] = useState(() => getFeatureVisibility())

  function persistDaily(patch: Partial<DailyState>) {
    setDaily(updateDailyState(today, patch))
  }

  function persistCatchup(patch: Partial<DailyState>) {
    if (!catchupDate) return
    setCatchupDaily(updateDailyState(catchupDate, patch))
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

    // Gap detection: compare today to the last day that actually finished a Sheets append (not
    // just the last day the app was opened). `null` means never logged anything yet (first-ever
    // use) — that must NOT be treated as a gap. Only a last-logged day strictly before yesterday
    // means at least one full day was skipped with no evening review completed.
    const lastLogged = getLastLoggedDate()
    const yesterday = addDays(today, -1)
    if (lastLogged && lastLogged < yesterday) {
      const missedDay = addDays(lastLogged, 1)
      setCatchupDate(missedDay)
      setCatchupDaily(getDailyState(missedDay))
      setShowEvening(true)
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

  function handleDemoModeChanged() {
    // Demo Mode just flipped, which switched which storage namespace every getItem/setItem call
    // reads from underneath us — re-read everything this component cached in state (the same
    // things a fresh mount would read), and clear any in-flight modal state so nothing from the
    // previous namespace lingers on screen.
    setDaily(getDailyState(today))
    setVisibility(getFeatureVisibility())
    setShowMorning(false)
    setShowEvening(false)
    setCatchupDate(null)
    setCatchupDaily(null)
    setTab('home')
  }

  function handleVisibilityChanged() {
    const next = getFeatureVisibility()
    setVisibility(next)
    // If she just hid the feature whose tab she's currently viewing (e.g. hides Prayer while on
    // the Prayer tab), that tab has no menu/tabbar entry to get back to it — bounce to Home
    // rather than leaving her stranded on now-inaccessible content.
    const tabFeature: Partial<Record<Tab, keyof typeof next>> = {
      prayer: 'prayer',
      todos: 'todos',
      calendar: 'calendar',
    }
    const feature = tabFeature[tab]
    if (feature && !next[feature]) {
      setTab('home')
    }
  }

  function handleMorningConfirm(text: string, source: 'calendar' | 'manual') {
    persistDaily({ mainTaskText: text, mainTaskSource: source })
    setShowMorning(false)
  }

  function handleEveningClose() {
    setShowEvening(false)
    if (catchupDate) {
      // Catch-up review just closed (saved or dismissed) — chain straight into today's normal
      // flow instead of dropping back to Home. `daily` (today's state) was never touched by the
      // catch-up review, so mainTaskSource is still unset and this opens MorningModal with no
      // extra tap needed. If she dismissed without saving, the gap simply reappears next launch
      // since lastLoggedDate wasn't advanced.
      setCatchupDate(null)
      setCatchupDaily(null)
      checkDailyPrompts()
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <span className="date">{formattedToday()}</span>
        <HamburgerMenu
          onSelectSettings={() => setTab('settings')}
          onSelectPrayer={() => setTab('prayer')}
          onSelectCalendar={() => setTab('calendar')}
          showPrayer={visibility.prayer}
          showCalendar={visibility.calendar}
        />
      </header>

      <main className="content">
        {tab === 'home' && (
          <Home daily={daily} onPersist={persistDaily} onEndDay={() => setShowEvening(true)} visibility={visibility} />
        )}
        {tab === 'prayer' && <PrayerTab />}
        {tab === 'todos' && <TodosTab />}
        {tab === 'calendar' && <CalendarTab />}
        {tab === 'settings' && (
          <Settings
            onConnectionsChanged={handleConnectionsChanged}
            onVisibilityChanged={handleVisibilityChanged}
            onDemoModeChanged={handleDemoModeChanged}
          />
        )}
      </main>

      <nav className="tabbar">
        <button className={`tab-btn${tab === 'home' ? ' active' : ''}`} onClick={() => setTab('home')}>
          Home
        </button>
        {visibility.todos && (
          <button className={`tab-btn${tab === 'todos' ? ' active' : ''}`} onClick={() => setTab('todos')}>
            To-Dos
          </button>
        )}
      </nav>

      {showMorning && <MorningModal onConfirm={handleMorningConfirm} />}
      {showEvening &&
        (catchupDate ? (
          <EveningReviewModal
            daily={catchupDaily ?? getDailyState(catchupDate)}
            onPersist={persistCatchup}
            reviewDate={catchupDate}
            onClose={handleEveningClose}
            visibility={visibility}
          />
        ) : (
          <EveningReviewModal daily={daily} onPersist={persistDaily} onClose={handleEveningClose} visibility={visibility} />
        ))}
    </div>
  )
}

export default App
