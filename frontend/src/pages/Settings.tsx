import { useState, type FormEvent } from 'react'
import { isDemoMode } from '../lib/storage'
import { loginToBackend, disconnectBackend, isBackendConnected } from '../lib/itemsApi'
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
  const [backendConnected, setBackendConnected] = useState(isBackendConnected())
  const [password, setPassword] = useState('')
  const [backendStatus, setBackendStatus] = useState<'idle' | 'connecting' | 'error'>('idle')

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
    setBackendConnected(isBackendConnected())
    setGoogleConnected(isGoogleConnected())
    setVisibility(getFeatureVisibility())
    setDemoModeState(isDemoMode())
    onDemoModeChanged?.()
  }

  async function handleBackendConnect(e: FormEvent) {
    e.preventDefault()
    setBackendStatus('connecting')
    const ok = await loginToBackend(password)
    if (ok) {
      setBackendConnected(true)
      setBackendStatus('idle')
      setPassword('')
      onConnectionsChanged?.()
    } else {
      setBackendStatus('error')
    }
  }

  function handleBackendDisconnect() {
    disconnectBackend()
    setBackendConnected(false)
    setBackendStatus('idle')
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
          Fills the app with realistic sample data to click through — completely isolated from your real data.
          Safe to turn on even with real data already on this device.
        </p>
        <button className="primary-btn" onClick={handleDemoModeToggle}>
          {demoMode ? 'Turn off Demo Mode' : 'Turn on Demo Mode'}
        </button>
      </div>

      <div className="settings-group">
        <h3>Daily API</h3>
        <div className="settings-status">
          <span className={`status-dot${backendConnected ? ' connected' : ''}`} />
          <span>{backendConnected ? 'Connected' : 'Not connected'}</span>
        </div>
        {backendConnected ? (
          <button onClick={handleBackendDisconnect}>Disconnect</button>
        ) : (
          <form onSubmit={handleBackendConnect}>
            <label>
              Password
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
            </label>
            <button type="submit" disabled={backendStatus === 'connecting' || !password}>
              {backendStatus === 'connecting' ? 'Connecting…' : 'Connect'}
            </button>
          </form>
        )}
        {backendStatus === 'error' && <p className="tab-caption">Wrong password, or the server didn't respond. Try again.</p>}
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
