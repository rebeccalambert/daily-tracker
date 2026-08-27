import { appendDailyLogRow } from './sheets'
import { formatLogTimestamp } from './date'
import { getItem, setItem, isDemoMode } from './storage'

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

const HISTORY_KEY = 'dailyLogHistory'

function saveLocalBackup(row: DailyLogRow): void {
  const history = getItem<DailyLogRow[]>(HISTORY_KEY, [])
  history.push(row)
  setItem(HISTORY_KEY, history)
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
  // Demo mode: local backup above already gives "Save & log day" its persisted, closable
  // success behavior — never reach appendDailyLogRow/getAccessToken/fetch.
  if (isDemoMode()) return { sheetSaved: true }
  const sheetSaved = await appendDailyLogRow(stamped)
  return { sheetSaved }
}
