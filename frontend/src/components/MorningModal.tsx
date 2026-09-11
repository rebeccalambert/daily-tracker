import { useState } from 'react'

interface MorningModalProps {
  onConfirm: (text: string) => void
}

export default function MorningModal({ onConfirm }: MorningModalProps) {
  const [text, setText] = useState('')

  return (
    <div className="overlay">
      <div className="sheet">
        <h2>Set today's main task</h2>
        <p className="sub">What's the one thing?</p>
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="e.g. Finish job applications"
        />
        <div className="sheet-actions">
          <button className="primary-btn" disabled={!text.trim()} onClick={() => onConfirm(text.trim())}>
            Set
          </button>
        </div>
      </div>
    </div>
  )
}
