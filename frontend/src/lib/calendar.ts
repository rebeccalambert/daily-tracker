/** Start-of-day/end-of-day ISO instants for a given local date, used as timeMin/timeMax across
 * every Calendar API call in this app (multi-calendar day view in calendarDay.ts) — kept in one
 * place so callers never drift apart on the definition of "today's bounds". */
export function dayBounds(dateISO: string): { timeMin: string; timeMax: string } {
  return {
    timeMin: new Date(`${dateISO}T00:00:00`).toISOString(),
    timeMax: new Date(`${dateISO}T23:59:59`).toISOString(),
  }
}
