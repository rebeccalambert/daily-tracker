import { getItem, setItem } from './storage'

/** Every feature that can be individually hidden from Settings. Add new keys here (and to
 * DEFAULT_VISIBILITY below) to plug a future feature (e.g. photo/meal log) into the same toggle
 * system without touching the read/write functions themselves. */
export type FeatureKey = 'prayer' | 'todos' | 'calendar'

const KEY = 'featureVisibility'

const DEFAULT_VISIBILITY: Record<FeatureKey, boolean> = {
  prayer: true,
  todos: true,
  calendar: true,
}

/** Merges over DEFAULT_VISIBILITY rather than trusting getItem's fallback alone — same reasoning
 * as getDailyState: a stored blob from before a new FeatureKey existed is still valid JSON, so
 * without this merge a newly-added feature would resolve to `undefined` (falsy, but not `true`)
 * for anyone with an already-saved settings blob, instead of defaulting to visible. */
export function getFeatureVisibility(): Record<FeatureKey, boolean> {
  return { ...DEFAULT_VISIBILITY, ...getItem<Partial<Record<FeatureKey, boolean>>>(KEY, {}) }
}

export function setFeatureVisibility(key: FeatureKey, value: boolean): void {
  setItem(KEY, { ...getFeatureVisibility(), [key]: value })
}

export function isFeatureVisible(key: FeatureKey): boolean {
  return getFeatureVisibility()[key]
}
