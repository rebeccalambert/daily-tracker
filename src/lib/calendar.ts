import { getAccessToken } from './googleAuth'

interface CalendarEvent {
  summary?: string
}

interface CalendarEventsResponse {
  items?: CalendarEvent[]
}

// Matches a leading "Main Task", plus any separator after it (colon, dash, en/em dash, whitespace) —
// covers "Main Task: X", "Main Task - X", "Main Task — X", and "Main Task X".
const MAIN_TASK_PREFIX = /^main task[\s:\-–—]*/i

function stripMainTaskPrefix(summary: string): string {
  return summary.replace(MAIN_TASK_PREFIX, '').trim()
}

/** Looks for today's calendar event whose title starts with "Main Task" (case-insensitive). Returns null if Google isn't connected, the request fails, or nothing matches — the morning modal falls back to manual entry in every one of those cases. */
export async function findMainTaskEvent(dateISO: string): Promise<string | null> {
  const token = await getAccessToken()
  if (!token) return null

  const timeMin = new Date(`${dateISO}T00:00:00`).toISOString()
  const timeMax = new Date(`${dateISO}T23:59:59`).toISOString()
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
  })

  let res: Response
  try {
    res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  } catch {
    return null
  }
  if (!res.ok) return null

  const data = (await res.json()) as CalendarEventsResponse
  const match = (data.items ?? []).find(e => (e.summary ?? '').toLowerCase().startsWith('main task'))
  return match?.summary ? stripMainTaskPrefix(match.summary) : null
}
