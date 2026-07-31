import { setDemoMode, setItem } from './storage'
import { todayISO } from './date'
import { saveDailyState } from './dailyState'
import { savePrayerRequest } from './prayer'
import { setFeatureVisibility, type FeatureKey } from './featureVisibility'
import { setDemoTodos } from './habitica'
import { buildDemoDailyState, buildDemoPrayerRequests, buildDemoTodos } from './demoData'
import type { HabiticaCredentials } from './habitica'

const ALL_FEATURES: FeatureKey[] = ['prayer', 'todos', 'calendar']

/** Switches storage into the demo namespace, then seeds it with the static fixture: today's
 * DailyState, demo prayer requests, demo todos, and fake-but-shape-valid Habitica/Google
 * "connected" markers (only ever read for their truthy connected-checks — see habitica.ts's
 * getHabiticaTasks/scoreHabiticaTask and googleAuth.ts's getAccessToken, which refuse to use them
 * for a real request). Order matters: setDemoMode(true) must run first so every setItem below
 * lands in the demo namespace, not the real one. */
export function enableDemoMode(): void {
  setDemoMode(true)

  const today = todayISO()
  saveDailyState(buildDemoDailyState(today))
  buildDemoPrayerRequests().forEach(savePrayerRequest)
  setDemoTodos(buildDemoTodos(today))

  const demoCredentials: HabiticaCredentials = { userId: 'demo', apiToken: 'demo' }
  setItem('habiticaCredentials', demoCredentials)
  setItem('googleToken', { accessToken: 'demo-google-token', expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000 })
  ALL_FEATURES.forEach(key => setFeatureVisibility(key, true))
}

/** Switches storage back to the real namespace. The demo-namespaced data is left in place —
 * it's harmless and fully isolated, so there's nothing to clean up before the real view is
 * showing again. */
export function disableDemoMode(): void {
  setDemoMode(false)
}
