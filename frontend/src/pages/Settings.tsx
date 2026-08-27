import { useState } from 'react'
import { getItem, setItem, isDemoMode } from '../lib/storage'
import type { HabiticaCredentials } from '../lib/habitica'
import { connectGoogle, disconnectGoogle, isGoogleConnected } from '../lib/googleAuth'
import { getDailyLogSheetUrl } from '../lib/sheets'
import { getFeatureVisibility, setFeatureVisibility, type FeatureKey } from '../lib/featureVisibility'
import { enableDemoMode, disableDemoMode } from '../lib/demoMode'

interface SettingsProps {
  /** Called after a save — lets the app re-run its "does today need a morning/evening prompt" check, since that only runs once on load otherwise. */
  onConnectionsChanged?: () => void
  /** Called after a feature toggle — lets the app re-read visibility so Home/menu/tabbar update immediately instead of only on next reload. */
  onVisibilityChanged?: () => void
  /** Called after Demo Mode is toggled on or off — lets the app re-read everything (today's
   * state, visibility, connections) from whichever storage namespace is now active, so Home/
   * tabbar/menu all reflect the switch immediately with no reload needed. */
  onDemoModeChanged?: () => void
}

const FEATURE_LABELS: Record<FeatureKey, string> = {
  prayer: 'Prayer Requests',
  todos: 'To-Dos',
  calendar: 'Calendar',
}

export default function Settings({ onConnectionsChanged, onVisibilityChanged, onDemoModeChanged }: SettingsProps) {
  const saved = getItem<HabiticaCredentials>('habiticaCredentials', { userId: '', apiToken: '' })
  const [userId, setUserId] = useState(saved.userId)
  const [apiToken, setApiToken] = useState(saved.apiToken)
  const [savedMessage, setSavedMessage] = useState(false)
  const habiticaConnected = !!(saved.userId && saved.apiToken)

  const [googleConnected, setGoogleConnected] = useState(isGoogleConnected())
  const [googleStatus, setGoogleStatus] = useState<'idle' | 'connecting' | 'error'>('idle')
  const sheetUrl = getDailyLogSheetUrl()

  const [visibility, setVisibility] = useState(getFeatureVisibility())
  const [demoMode, setDemoModeState] = useState(isDemoMode())

  function handleVisibilityToggle(key: FeatureKey, value: boolean) {
    setFeatureVisibility(key, value)
    setVisibility(getFeatureVisibility())
    onVisibilityChanged?.()
  }

  function handleDemoModeToggle() {
    if (demoMode) {
      disableDemoMode()
    } else {
      enableDemoMode()
    }
    // The storage namespace just switched — re-read everything this component itself caches in
    // state, the same way it already would on a fresh mount.
    const nextSaved = getItem<HabiticaCredentials>('habiticaCredentials', { userId: '', apiToken: '' })
    setUserId(nextSaved.userId)
    setApiToken(nextSaved.apiToken)
    setGoogleConnected(isGoogleConnected())
    setVisibility(getFeatureVisibility())
    setDemoModeState(isDemoMode())
    onDemoModeChanged?.()
  }

  function handleSave() {
    setItem('habiticaCredentials', { userId, apiToken })
    setSavedMessage(true)
    setTimeout(() => setSavedMessage(false), 1500)
    onConnectionsChanged?.()
  }

  async function handleGoogleConnect() {
    setGoogleStatus('connecting')
    const ok = await connectGoogle()
    if (ok) {
      setGoogleConnected(true)
      setGoogleStatus('idle')
      onConnectionsChanged?.()
    } else {
      setGoogleStatus('error')
    }
  }

  function handleGoogleDisconnect() {
    disconnectGoogle()
    setGoogleConnected(false)
    setGoogleStatus('idle')
  }

  return (
    <section className="settings">
      <p className="tab-title">Settings</p>
      <p className="tab-caption">Manage your connections.</p>

      <div className={`settings-group demo-mode-group${demoMode ? ' demo-mode-on' : ''}`}>
        <h3>Demo Mode</h3>
        <div className="settings-status">
          <span className={`status-dot${demoMode ? ' connected' : ''}`} />
          <span>{demoMode ? 'On — showing sample data' : 'Off — showing your real data'}</span>
        </div>
        <p className="tab-caption">
          Fills the app with realistic sample data to click through — completely isolated from your real Habitica,
          Google, and prayer data. Safe to turn on even with real data already on this device.
        </p>
        <button className="primary-btn" onClick={handleDemoModeToggle}>
          {demoMode ? 'Turn off Demo Mode' : 'Turn on Demo Mode'}
        </button>
      </div>

      <div className="settings-group">
        <h3>Habitica</h3>
        <div className="settings-status">
          <span className={`status-dot${habiticaConnected ? ' connected' : ''}`} />
          <span>{habiticaConnected ? 'Connected' : 'Not connected'}</span>
        </div>
        <label>
          User ID
          <input
            value={userId}
            onChange={e => setUserId(e.target.value)}
            placeholder="from habitica.com/user/settings/api"
          />
        </label>
        <label>
          API Token
          <input type="password" value={apiToken} onChange={e => setApiToken(e.target.value)} />
        </label>
        <button onClick={handleSave}>Save</button>
        {savedMessage && <span className="saved-hint">Saved</span>}
      </div>

      <div className="settings-group">
        <h3>Google — Calendar, Sheets</h3>
        <div className="settings-status">
          <span className={`status-dot${googleConnected ? ' connected' : ''}`} />
          <span>{googleConnected ? 'Connected' : 'Not connected'}</span>
        </div>
        {googleConnected ? (
          <button onClick={handleGoogleDisconnect}>Disconnect Google Account</button>
        ) : (
          <button onClick={handleGoogleConnect} disabled={googleStatus === 'connecting'}>
            {googleStatus === 'connecting' ? 'Connecting…' : 'Connect Google Account'}
          </button>
        )}
        {googleStatus === 'error' && (
          <p className="tab-caption">Couldn't connect — closed the popup, or something went wrong. Try again.</p>
        )}
        {googleConnected && sheetUrl && (
          <a className="tab-caption" href={sheetUrl} target="_blank" rel="noreferrer">
            Open Daily Tracker Log in Google Sheets ↗
          </a>
        )}
      </div>

      <div className="settings-group">
        <h3>Features</h3>
        <p className="tab-caption">Turn a feature off to hide it everywhere without losing its data.</p>
        {(Object.keys(FEATURE_LABELS) as FeatureKey[]).map(key => (
          <label key={key} className="feature-toggle">
            <input
              type="checkbox"
              checked={visibility[key]}
              onChange={e => handleVisibilityToggle(key, e.target.checked)}
            />
            {FEATURE_LABELS[key]}
          </label>
        ))}
      </div>
    </section>
  )
}
