import { getAccessToken } from './googleAuth'
import { getItem, setItem } from './storage'
import type { DailyLogRow } from './dailyLog'

const SHEET_ID_KEY = 'googleSheetId'
const SPREADSHEET_TITLE = 'Daily Tracker Log'
const TAB_TITLE = 'Daily Log'
const HEADERS = [
  'Date',
  'Main Task',
  'Main Task Completed',
  'To-Dos Done',
  'To-Dos Not Done',
  'Prayer Requests Done',
  'Prayer Requests Not Done',
  'Blockers / Notes',
  'Gratitude',
]

function getStoredSheetId(): string | null {
  return getItem<string | null>(SHEET_ID_KEY, null)
}

async function logFailure(label: string, res: Response): Promise<void> {
  const body = await res.text().catch(() => '<unreadable>')
  console.error(`[sheets] ${label} failed: ${res.status} ${res.statusText}`, body)
}

async function createSpreadsheet(token: string): Promise<string> {
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      properties: { title: SPREADSHEET_TITLE },
      sheets: [{ properties: { title: TAB_TITLE } }],
    }),
  })
  if (!createRes.ok) {
    await logFailure('create spreadsheet', createRes)
    throw new Error(`Failed to create spreadsheet: ${createRes.status}`)
  }
  const created = (await createRes.json()) as { spreadsheetId: string }

  const headerRange = encodeURIComponent(`${TAB_TITLE}!A1:I1`)
  const headerRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${created.spreadsheetId}/values/${headerRange}?valueInputOption=RAW`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [HEADERS] }),
    }
  )
  if (!headerRes.ok) await logFailure('write header row', headerRes)

  return created.spreadsheetId
}

async function getOrCreateSpreadsheetId(token: string): Promise<string> {
  const existing = getStoredSheetId()
  if (existing) {
    const check = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${existing}?fields=spreadsheetId`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (check.ok) return existing
    // Falls through to create a new one if the stored ID is no longer reachable
    // (e.g. deleted, or a transient error — a known simplification, not retried).
  }
  const newId = await createSpreadsheet(token)
  setItem(SHEET_ID_KEY, newId)
  return newId
}

/** Appends one row to the dedicated "Daily Tracker Log" spreadsheet (created on first use, in the account's Drive root). Returns false if Google isn't connected or the request fails — caller should keep a local backup regardless. */
export async function appendDailyLogRow(row: DailyLogRow): Promise<boolean> {
  const token = await getAccessToken()
  if (!token) return false

  try {
    const sheetId = await getOrCreateSpreadsheetId(token)
    const values = [
      [
        row.date,
        row.mainTask,
        row.mainTaskCompleted === null ? '' : row.mainTaskCompleted ? 'Yes' : 'No',
        row.todosDone.join(', '),
        row.todosNotDone.join(', '),
        row.prayersDone.join(', '),
        row.prayersNotDone.join(', '),
        row.blockersNotes,
        row.gratitude,
      ],
    ]
    const appendRange = encodeURIComponent(`${TAB_TITLE}!A:I`)
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${appendRange}:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values }),
      }
    )
    if (!res.ok) await logFailure('append row', res)
    return res.ok
  } catch (err) {
    console.error('[sheets] appendDailyLogRow threw', err)
    return false
  }
}
