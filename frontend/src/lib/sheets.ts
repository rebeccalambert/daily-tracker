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

/** URL of the actual spreadsheet this app has been appending rows to, or null if it hasn't
 * created/found one yet. Surfaced in Settings so it's unambiguous which document to check.
 * `getOrCreateSpreadsheetId` only creates a brand new "Daily Tracker Log" spreadsheet as a last
 * resort — it first tries the cached ID, then searches Drive for an existing one this app
 * already created — so in practice a duplicate should only ever appear once, the very first
 * time the app is ever used. */
export function getDailyLogSheetUrl(): string | null {
  const id = getStoredSheetId()
  return id ? `https://docs.google.com/spreadsheets/d/${id}/edit` : null
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

/**
 * Checks whether a cached spreadsheet ID still points at a real, reachable spreadsheet.
 * Only a 404 is treated as a definitive "this is gone, look elsewhere" signal — everything else
 * (401, 403, 5xx, or the fetch throwing on a network blip) is a transient failure of this check,
 * NOT evidence the spreadsheet no longer exists. Callers must not react to a transient failure by
 * creating a replacement or overwriting the cached ID; it should just make this attempt fail soft.
 */
async function checkCachedSpreadsheet(token: string, id: string): Promise<'ok' | 'not-found'> {
  const check = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${id}?fields=spreadsheetId`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (check.ok) return 'ok'
  if (check.status === 404) return 'not-found'
  await logFailure('check cached spreadsheet', check)
  throw new Error(`Could not verify cached spreadsheet, treating as transient: ${check.status}`)
}

/**
 * Searches Drive for a "Daily Tracker Log" spreadsheet this app has already created, so a second
 * device (or the same device after localStorage gets cleared/evicted) can find its way back to
 * the real spreadsheet instead of spinning up a duplicate. `drive.file`-scoped `files.list` calls
 * are automatically restricted server-side to files this app's OAuth client already has
 * per-file access to, so no broader Drive scope is needed for this search to work.
 * Throws on a request failure — a broken search should fail this attempt soft, not fall through
 * to creating a new spreadsheet (that would just recreate the duplicate-creation bug elsewhere).
 */
async function findExistingSpreadsheetInDrive(token: string): Promise<string | null> {
  const query = encodeURIComponent(`name='${SPREADSHEET_TITLE}' and trashed=false`)
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)&spaces=drive`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!res.ok) {
    await logFailure('search drive for existing spreadsheet', res)
    throw new Error(`Drive search for existing spreadsheet failed: ${res.status}`)
  }
  const data = (await res.json()) as { files?: { id: string; name: string }[] }
  return data.files && data.files.length > 0 ? data.files[0].id : null
}

/**
 * Resolves the spreadsheet to append to, in priority order, only escalating when the previous
 * step comes up empty:
 *  1. A locally cached ID, if it's still reachable.
 *  2. An existing "Daily Tracker Log" file already visible to this app in Drive (covers a second
 *     device, or this device after localStorage got cleared/evicted).
 *  3. A genuinely new spreadsheet — only when neither of the above found anything.
 * Any transient failure along the way (401/403/5xx/network error) propagates as a thrown error
 * rather than being treated as "gone" — `appendDailyLogRow`'s existing try/catch turns that into
 * a soft `false` return, and the cached ID (if any) is left untouched.
 */
async function getOrCreateSpreadsheetId(token: string): Promise<string> {
  const existing = getStoredSheetId()
  if (existing) {
    const status = await checkCachedSpreadsheet(token, existing)
    if (status === 'ok') return existing
    // status === 'not-found': confirmed gone (not just unreachable) — fall through to search/create.
  }

  const found = await findExistingSpreadsheetInDrive(token)
  if (found) {
    setItem(SHEET_ID_KEY, found)
    return found
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
