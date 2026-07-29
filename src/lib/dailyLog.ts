import { appendDailyLogRow } from './sheets'
import { formatLogTimestamp } from './date'

export interface DailyLogRow {
  /** ISO date (YYYY-MM-DD) of the day this row is *about* — today for a normal review, or the
   * missed day for a catch-up review. saveDailyLog stamps this with the actual submission time
   * before it reaches the Sheet/backup, so callers should always pass the plain calendar date. */
  date: string
  mainTask: string
  mainTaskCompleted: boolean | null
  todosDone: string[]
  todosNotDone: string[]
  prayersDone: string[]
  prayersNotDone: string[]
  blockersNotes: string
  gratitude: string
}

const HISTORY_KEY = 'daily-tracker:dailyLogHistory'

function saveLocalBackup(row: DailyLogRow): void {
  const raw = localStorage.getItem(HISTORY_KEY)
  const history: DailyLogRow[] = raw ? JSON.parse(raw) : []
  history.push(row)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
}

/**
 * Always keeps a local backup first (so nothing is lost even if the network call fails or
 * Google isn't connected), then tries to append the same row to the real "Daily Tracker Log"
 * Google Sheet. Returns whether the Sheets write succeeded, so the caller can let the user know
 * if it only saved locally.
 *
 * The row's `date` is stamped with the actual submission clock time here — the one place both
 * the normal same-day path and the catch-up path go through — so the Sheet's Date column always
 * shows "which calendar day is this reviewing" (row.date, untouched) alongside "when was this
 * actually submitted" (now), letting multiple rows for one calendar day be told apart.
 */
export async function saveDailyLog(row: DailyLogRow): Promise<{ sheetSaved: boolean }> {
  const stamped: DailyLogRow = { ...row, date: formatLogTimestamp(row.date) }
  saveLocalBackup(stamped)
  const sheetSaved = await appendDailyLogRow(stamped)
  return { sheetSaved }
}
