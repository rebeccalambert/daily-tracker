import type { DailyState, PrayerRequest, TodoItem } from '../types'
import type { DayEvent } from './calendarDay'
import { addDays } from './date'

export const DEMO_MAIN_TASK = 'Finish job applications'

const DEMO_PRAYER_ID_FAMILY = 'demo-prayer-family'
const DEMO_PRAYER_ID_JOB_SEARCH = 'demo-prayer-job-search'
const DEMO_PRAYER_ID_HEALING = 'demo-prayer-healing'
const DEMO_PRAYER_ID_TRIP = 'demo-prayer-trip'
const DEMO_PRAYER_ID_WISDOM = 'demo-prayer-wisdom'

/** Static, portfolio-appropriate prayer fixture — a believable mix of daily/weekly/date types. */
export function buildDemoPrayerRequests(): PrayerRequest[] {
  return [
    { id: DEMO_PRAYER_ID_FAMILY, name: 'Family near and far', type: 'daily' },
    { id: DEMO_PRAYER_ID_JOB_SEARCH, name: 'Peace during the job search', type: 'daily' },
    { id: DEMO_PRAYER_ID_HEALING, name: "A friend's recovery", type: 'weekly', weekday: 'Wednesday' },
    { id: DEMO_PRAYER_ID_WISDOM, name: 'Wisdom for a big decision', type: 'weekly', weekday: 'Sunday' },
    { id: DEMO_PRAYER_ID_TRIP, name: 'Safe travel for a friend', type: 'date', dateValue: '2026-08-02' },
  ]
}

/** Ids marked as already checked off today, for buildDemoDailyState's completedPrayerIds. */
const DEMO_PRAYERS_DONE_TODAY = [DEMO_PRAYER_ID_FAMILY]

/** Static, believable Habitica-shaped todos — completed, due today, overdue, and one undated
 * backlog item. Due dates are computed relative to `todayISO` (passed in at activation time)
 * rather than hardcoded, so the demo never looks stale depending on when it's turned on. */
export function buildDemoTodos(todayISO: string): TodoItem[] {
  return [
    { id: 'demo-todo-resume', text: 'Tailor resume for open roles', type: 'todo', completed: true, dueDate: addDays(todayISO, -2) },
    { id: 'demo-todo-portfolio', text: 'Polish portfolio site', type: 'todo', completed: true, dueDate: addDays(todayISO, -1) },
    { id: 'demo-todo-followup', text: 'Send follow-up email to recruiter', type: 'todo', completed: false, dueDate: todayISO },
    { id: 'demo-todo-cover-letter', text: 'Draft cover letter for referral role', type: 'todo', completed: false, dueDate: addDays(todayISO, -3) },
    { id: 'demo-todo-networking', text: 'Reach out to a former coworker', type: 'todo', completed: false },
  ]
}

/** One "happening now" and one "upcoming" event, anchored to `new Date()` at call time — cheap
 * to recompute, and keeps the demo looking current no matter when it's activated. */
export function buildDemoEvents(): DayEvent[] {
  const now = Date.now()
  const minutes = (n: number) => n * 60 * 1000

  return [
    {
      id: 'demo-event-now',
      title: 'Portfolio review call',
      start: new Date(now - minutes(15)),
      end: new Date(now + minutes(15)),
      allDay: false,
      description: 'Walking through recent project work',
    },
    {
      id: 'demo-event-upcoming',
      title: 'Mock interview practice',
      start: new Date(now + minutes(180)),
      end: new Date(now + minutes(240)),
      allDay: false,
    },
  ]
}

/** Today's seeded DailyState — `mainTaskSource` is set so the Morning modal doesn't pop up. */
export function buildDemoDailyState(dateISO: string): DailyState {
  return {
    date: dateISO,
    mainTaskText: DEMO_MAIN_TASK,
    mainTaskSource: 'manual',
    mainTaskCompleted: null,
    completedPrayerIds: DEMO_PRAYERS_DONE_TODAY,
    homeTodoOrder: [],
    homePrayerOrder: [],
    blockersNotes: '',
    gratitude: '',
    eveningReviewDone: false,
    homePrayerOpen: true,
    homeTodoOpen: true,
  }
}
