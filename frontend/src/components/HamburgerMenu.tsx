import { useState } from 'react'

interface HamburgerMenuProps {
  onSelectSettings: () => void
}

export default function HamburgerMenu({ onSelectSettings }: HamburgerMenuProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="topbar-right">
      <span className="app-name">Daily</span>
      <button
        className="menu-btn"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Open menu"
        onClick={() => setOpen(o => !o)}
      >
        <span aria-hidden="true">☰</span>
      </button>
      {open && (
        <div className="menu-dropdown">
          <button
            className="menu-item"
            onClick={() => {
              setOpen(false)
              onSelectSettings()
            }}
          >
            Settings
          </button>
        </div>
      )}
    </div>
  )
}
