import { getAccessToken } from './googleAuth'
import { dayBounds } from './calendar'
import { isDemoMode } from './storage'
import { buildDemoEvents } from './demoData'

export interface DayEvent {
  id: string
  title: string
  start: Date | null
  end: Date | null
  allDay: boolean
  location?: string
  description?: string
}

interface GCalDateTime {
  dateTime?: string
  date?: string
}

interface GCalEvent {
  id?: string
  summary?: string
  location?: string
  description?: string
  start?: GCalDateTime
  end?: GCalDateTime
}

interface CalendarListEntry {
  id?: string
  selected?: boolean
}

interface CalendarListResponse {
  items?: CalendarListEntry[]
}

interface EventsResponse {
  items?: GCalEvent[]
}

/** The calendars actually toggled on in her Google Calendar UI ("selected"), not just every
 * calendar she has access to — mirrors what she'd see if she opened Google Calendar directly.
 * Fails soft to an empty list: no connection, a network error, or a non-OK response all just
 * mean "show nothing" rather than crashing the app. */
async function fetchSelectedCalendarIds(token: string): Promise<string[]> {
  let res: Response
  try {
    res = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: { Authorization: `Bearer ${token}` },
    })
  } catch {
    return []
  }
  if (!res.ok) return []

  const data = (await res.json()) as CalendarListResponse
  return (data.items ?? [])
    .filter(c => c.selected === true)
    .map(c => c.id)
    .filter((id): id is string => !!id)
}

/** Today's raw events for a single calendar. calendarId must be URL-encoded — Google's real
 * calendar ids are frequently email-address-shaped and contain "@". Same fail-soft contract as
 * the rest of this app's Google integration: any failure here returns no events rather than
 * throwing, so one broken calendar can't take down the whole merged day view. */
async function fetchEventsForCalendar(token: string, calendarId: string, dateISO: string): Promise<GCalEvent[]> {
  const { timeMin, timeMax } = dayBounds(dateISO)
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
  })

  let res: Response
  try {
    res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
  } catch {
    return []
  }
  if (!res.ok) return []

  const data = (await res.json()) as EventsResponse
  return data.items ?? []
}

function parseGCalDate(d: GCalDateTime | undefined): Date | null {
  if (!d) return null
  const raw = d.dateTime ?? (d.date ? `${d.date}T00:00:00` : undefined)
  if (!raw) return null
  const parsed = new Date(raw)
  return isNaN(parsed.getTime()) ? null : parsed
}

function toDayEvent(e: GCalEvent, index: number): DayEvent {
  const allDay = !!e.start?.date && !e.start?.dateTime
  return {
    id: e.id ?? `event-${index}-${e.summary ?? ''}`,
    title: e.summary?.trim() || '(No title)',
    start: parseGCalDate(e.start),
    end: parseGCalDate(e.end),
    allDay,
    location: e.location?.trim() || undefined,
    description: e.description?.trim() || undefined,
  }
}

/** Today's events merged across every selected calendar, sorted all-day-first then by start
 * time. Deliberately flat and unlabeled by source calendar — Rebecca doesn't want per-calendar
 * distinction here, just one combined picture of the day. Never throws: not connected, a
 * calendarList failure, or a per-calendar events failure all resolve to an empty (or partial)
 * list rather than an error the caller has to guard against. */
export async function getTodayEvents(dateISO: string): Promise<DayEvent[]> {
  // Demo mode: two fixture events, times recomputed relative to "now" on every call (cheap —
  // not network-like, so recomputing per call is fine) — never reach getAccessToken/fetch.
  if (isDemoMode()) return buildDemoEvents()

  const token = await getAccessToken()
  if (!token) return []

  const calendarIds = await fetchSelectedCalendarIds(token)
  if (calendarIds.length === 0) return []

  const perCalendar = await Promise.all(calendarIds.map(id => fetchEventsForCalendar(token, id, dateISO)))
  const events = perCalendar.flat().map(toDayEvent)

  return events.sort((a, b) => {
    if (a.allDay !== b.allDay) return a.allDay ? -1 : 1
    const aTime = a.start?.getTime() ?? 0
    const bTime = b.start?.getTime() ?? 0
    return aTime - bTime
  })
}

export function formatEventTime(d: Date): string {
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}
