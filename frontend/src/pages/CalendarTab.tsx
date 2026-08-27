import { useEffect, useMemo, useRef, useState } from 'react'
import { getTodayEvents, formatEventTime, type DayEvent } from '../lib/calendarDay'
import { isGoogleConnected } from '../lib/googleAuth'
import { todayISO } from '../lib/date'

const HOUR_HEIGHT = 56
const MIN_EVENT_HEIGHT = 22
// Percentage of the grid's width, not pixels: with .timed-event's fixed `right: 4px`, a small
// fixed-pixel offset barely uncovers the card underneath (a higher stackIndex, higher z-index
// card nearly fully hides the one below it). A percentage-based offset keeps both readable while
// still being simple sequential stacking, not true concurrent-column math.
const STACK_OFFSET_PERCENT = 26

function hourLabel(h: number): string {
  if (h === 0) return '12 AM'
  if (h === 12) return '12 PM'
  return h < 12 ? `${h} AM` : `${h - 12} PM`
}

/** Minutes from local midnight, clamped to the 0–1440 grid — a timed event that actually starts
 * or ends outside "today" (Google can return events that merely overlap the requested day) would
 * otherwise render off-grid or with a nonsensical height. */
function clampedMinutes(d: Date, startOfDay: Date): number {
  const diff = (d.getTime() - startOfDay.getTime()) / 60000
  return Math.min(Math.max(diff, 0), 24 * 60)
}

interface LaidOutEvent extends DayEvent {
  top: number
  height: number
  stackIndex: number
}

/** Rebecca explicitly wants simple overlap handling here, not a true side-by-side column layout:
 * events are laid out in start-time order, and each one that's still "inside" an earlier event
 * that hasn't ended yet gets nudged over by a fixed offset so both stay visible (cascaded, like
 * stacked cards) rather than computing exact concurrent-column widths. */
function layoutTimedEvents(events: DayEvent[], startOfDay: Date): LaidOutEvent[] {
  const sorted = [...events]
    .filter((e): e is DayEvent & { start: Date; end: Date } => !e.allDay && !!e.start && !!e.end)
    .sort((a, b) => a.start.getTime() - b.start.getTime())

  const active: { end: number; stackIndex: number }[] = []
  return sorted.map(e => {
    const startMin = clampedMinutes(e.start, startOfDay)
    const endMin = clampedMinutes(e.end, startOfDay)
    for (let i = active.length - 1; i >= 0; i--) {
      if (active[i].end <= startMin) active.splice(i, 1)
    }
    const usedIndexes = new Set(active.map(a => a.stackIndex))
    let stackIndex = 0
    while (usedIndexes.has(stackIndex)) stackIndex++
    active.push({ end: endMin, stackIndex })

    return {
      ...e,
      top: (startMin / 60) * HOUR_HEIGHT,
      height: Math.max(((endMin - startMin) / 60) * HOUR_HEIGHT, MIN_EVENT_HEIGHT),
      stackIndex,
    }
  })
}

export default function CalendarTab() {
  const today = todayISO()
  const [events, setEvents] = useState<DayEvent[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'not-connected' | 'error'>('loading')
  const [selected, setSelected] = useState<DayEvent | null>(null)
  const [now, setNow] = useState(() => new Date())
  const scrollRef = useRef<HTMLDivElement>(null)
  const scrolledRef = useRef(false)

  useEffect(() => {
    if (!isGoogleConnected()) {
      setStatus('not-connected')
      return
    }
    getTodayEvents(today)
      .then(result => {
        setEvents(result)
        setStatus('ready')
      })
      .catch(() => setStatus('error'))
  }, [today])

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const startOfDay = useMemo(() => new Date(`${today}T00:00:00`), [today])
  const allDayEvents = useMemo(() => events.filter(e => e.allDay), [events])
  const laidOutEvents = useMemo(() => layoutTimedEvents(events, startOfDay), [events, startOfDay])

  // Auto-scroll once, when the grid first has something to show — deliberately not re-run as
  // `now` ticks, or the grid would keep yanking itself back under her while she's scrolling.
  useEffect(() => {
    if (status !== 'ready' || scrolledRef.current || !scrollRef.current) return
    scrolledRef.current = true
    const mountTime = new Date()
    const earliestStart = laidOutEvents.length > 0 ? Math.min(...laidOutEvents.map(e => e.top)) : null
    const nowOffset = (clampedMinutes(mountTime, startOfDay) / 60) * HOUR_HEIGHT
    const target = earliestStart !== null ? Math.min(nowOffset, earliestStart) : nowOffset
    scrollRef.current.scrollTop = Math.max(target - HOUR_HEIGHT * 1.5, 0)
  }, [status, laidOutEvents, startOfDay])

  const nowOffsetPx = (clampedMinutes(now, startOfDay) / 60) * HOUR_HEIGHT

  return (
    <section className="tab-panel">
      <p className="tab-title">Calendar</p>

      {status === 'loading' && <p className="tab-caption">Loading your calendar…</p>}
      {status === 'not-connected' && (
        <p className="tab-caption">Connect Google in Settings to see today's calendar.</p>
      )}
      {status === 'error' && (
        <p className="tab-caption">Couldn't load your calendar — check your connection in Settings.</p>
      )}

      {status === 'ready' && (
        <div className="day-view">
          {allDayEvents.length > 0 && (
            <div className="allday-row">
              <span className="allday-row-label">All day</span>
              <div className="allday-events">
                {allDayEvents.map(e => (
                  <button key={e.id} className="allday-event" onClick={() => setSelected(e)}>
                    {e.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="hour-grid-scroll" ref={scrollRef}>
            <div className="hour-grid" style={{ height: HOUR_HEIGHT * 24 }}>
              {Array.from({ length: 24 }, (_, h) => (
                <div key={h} className="hour-row" style={{ top: h * HOUR_HEIGHT }}>
                  <span className="hour-label">{hourLabel(h)}</span>
                </div>
              ))}

              {laidOutEvents.map(e => (
                <button
                  key={e.id}
                  className="timed-event"
                  style={{
                    top: e.top,
                    height: e.height,
                    left: `${e.stackIndex * STACK_OFFSET_PERCENT}%`,
                    zIndex: 10 + e.stackIndex,
                  }}
                  onClick={() => setSelected(e)}
                >
                  <span className="timed-event-title">{e.title}</span>
                  {e.start && <span className="timed-event-time">{formatEventTime(e.start)}</span>}
                </button>
              ))}

              <div className="now-line" style={{ top: nowOffsetPx }}>
                <span className="now-dot" />
              </div>
            </div>
          </div>
        </div>
      )}

      {selected && (
        <div className="overlay">
          <div className="sheet">
            <h2>{selected.title}</h2>
            <p className="sub">
              {selected.allDay
                ? 'All day'
                : selected.start && selected.end
                  ? `${formatEventTime(selected.start)} – ${formatEventTime(selected.end)}`
                  : 'Time unavailable'}
            </p>
            {selected.location && (
              <div className="detected-task">
                <p className="label">Location</p>
                <p className="value">{selected.location}</p>
              </div>
            )}
            {selected.description && (
              <div className="detected-task">
                <p className="label">Description</p>
                <p className="value" style={{ whiteSpace: 'pre-wrap' }}>
                  {selected.description}
                </p>
              </div>
            )}
            <div className="sheet-actions">
              <button className="primary-btn" onClick={() => setSelected(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
