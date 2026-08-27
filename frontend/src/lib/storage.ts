const PREFIX = 'daily-tracker:'
const DEMO_MODE_KEY = `${PREFIX}__demoMode`

/**
 * Whether Demo Mode is active. Backed by its own fixed, always-real key (never itself
 * demo-prefixed) so it's readable/writable regardless of which namespace is currently active —
 * every other key in this file switches namespace based on this flag.
 */
export function isDemoMode(): boolean {
  return localStorage.getItem(DEMO_MODE_KEY) === 'true'
}

export function setDemoMode(on: boolean): void {
  if (on) localStorage.setItem(DEMO_MODE_KEY, 'true')
  else localStorage.removeItem(DEMO_MODE_KEY)
}

function effectivePrefix(): string {
  return isDemoMode() ? `${PREFIX}demo:` : PREFIX
}

export function getItem<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(effectivePrefix() + key)
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function setItem<T>(key: string, value: T): void {
  localStorage.setItem(effectivePrefix() + key, JSON.stringify(value))
}

export function removeItem(key: string): void {
  localStorage.removeItem(effectivePrefix() + key)
}
