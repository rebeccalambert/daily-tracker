// import { getTodayEvents, formatEventTime, type DayEvent } from '../lib/calendarDay'
// import { isGoogleConnected } from '../lib/googleAuth'
import type { DailyState } from '../types'

interface HomeProps {
  daily: DailyState
}

export default function Home({ daily }: HomeProps) {
  return (
    <section className="tab-panel">
      <p className="eyebrow">Main Task</p>
      <div className="main-task-card">
        <p className="main-task-text">{daily.mainTaskText || 'Not set yet'}</p>
      </div>

      {/* TODO: read-only Calendar widget — Ticket 7 */}

      <div className="section">
        <p className="section-header">To-Dos</p>
        {/* TODO: wire to real backend Item API — Ticket 8 */}
      </div>
    </section>
  )
}
