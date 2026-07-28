import { useEffect, useState } from 'react'
import { findMainTaskEvent } from '../lib/calendar'
import { todayISO } from '../lib/date'

interface MorningModalProps {
  onConfirm: (text: string, source: 'calendar' | 'manual') => void
}

export default function MorningModal({ onConfirm }: MorningModalProps) {
  const [detected, setDetected] = useState<string | null | 'loading'>('loading')
  const [manualText, setManualText] = useState('')
  const [forceManual, setForceManual] = useState(false)

  useEffect(() => {
    findMainTaskEvent(todayISO()).then(setDetected)
  }, [])

  const showManual = forceManual || detected === null

  return (
    <div className="overlay">
      <div className="sheet">
        <h2>Set today's main task</h2>
        {detected === 'loading' ? (
          <p className="sub">Checking your calendar…</p>
        ) : showManual ? (
          <>
            <p className="sub">No "Main Task" event on your calendar today — what's the one thing?</p>
            <input
              type="text"
              value={manualText}
              onChange={e => setManualText(e.target.value)}
              placeholder="e.g. Finish job applications"
            />
            <div className="sheet-actions">
              <button
                className="primary-btn"
                disabled={!manualText.trim()}
                onClick={() => onConfirm(manualText.trim(), 'manual')}
              >
                Set
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="sub">Found something on your calendar starting with "Main Task."</p>
            <div className="detected-task">
              <p className="label">Detected from calendar</p>
              <p className="value">{detected}</p>
            </div>
            <div className="sheet-actions">
              <button className="primary-btn" onClick={() => onConfirm(detected, 'calendar')}>
                Looks good
              </button>
              <button className="ghost-link" onClick={() => setForceManual(true)}>
                Set something else instead
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
