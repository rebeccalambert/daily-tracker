import { appendDailyLogRow } from './sheets'

export interface DailyLogRow {
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
 */
export async function saveDailyLog(row: DailyLogRow): Promise<{ sheetSaved: boolean }> {
  saveLocalBackup(row)
  const sheetSaved = await appendDailyLogRow(row)
  return { sheetSaved }
}
