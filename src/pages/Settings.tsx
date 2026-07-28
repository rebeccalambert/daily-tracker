import { useState } from 'react'
import { getItem, setItem } from '../lib/storage'
import type { HabiticaCredentials } from '../lib/habitica'
import { connectGoogle, disconnectGoogle, isGoogleConnected } from '../lib/googleAuth'

interface SettingsProps {
  /** Called after a save — lets the app re-run its "does today need a morning/evening prompt" check, since that only runs once on load otherwise. */
  onConnectionsChanged?: () => void
}

export default function Settings({ onConnectionsChanged }: SettingsProps) {
  const saved = getItem<HabiticaCredentials>('habiticaCredentials', { userId: '', apiToken: '' })
  const [userId, setUserId] = useState(saved.userId)
  const [apiToken, setApiToken] = useState(saved.apiToken)
  const [savedMessage, setSavedMessage] = useState(false)
  const habiticaConnected = !!(saved.userId && saved.apiToken)

  const [googleConnected, setGoogleConnected] = useState(isGoogleConnected())
  const [googleStatus, setGoogleStatus] = useState<'idle' | 'connecting' | 'error'>('idle')

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
      </div>
    </section>
  )
}
