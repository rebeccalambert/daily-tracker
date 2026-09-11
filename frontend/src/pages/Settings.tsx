import { useState, type SubmitEvent } from 'react';
import { loginToBackend, disconnectBackend, isBackendConnected } from '../lib/itemsApi';
import { connectGoogle, disconnectGoogle, isGoogleConnected } from '../lib/googleAuth';

interface SettingsProps {
  onConnectionsChanged?: () => void
}

export default function Settings({ onConnectionsChanged }: SettingsProps) {
  const [backendConnected, setBackendConnected] = useState(isBackendConnected())
  const [password, setPassword] = useState('')
  const [backendStatus, setBackendStatus] = useState<'idle' | 'connecting' | 'error'>('idle')

  const [googleConnected, setGoogleConnected] = useState(isGoogleConnected())
  const [googleStatus, setGoogleStatus] = useState<'idle' | 'connecting' | 'error'>('idle')

  async function handleBackendConnect(e: SubmitEvent) {
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

      <div className={`settings-group demo-mode-group$`}>
        <h3>Demo Mode</h3>
        <p className="tab-caption">
          Coming soon: fills the app with sample data
        </p>
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
        <h3>Google Calendar</h3>
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
