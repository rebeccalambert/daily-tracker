import { useEffect, useRef, useState } from 'react'

interface HamburgerMenuProps {
  onSelectSettings: () => void
  onSelectPrayer: () => void
  onSelectCalendar: () => void
  showPrayer: boolean
  showCalendar: boolean
}

export default function HamburgerMenu({
  onSelectSettings,
  onSelectPrayer,
  onSelectCalendar,
  showPrayer,
  showCalendar,
}: HamburgerMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('click', onDocClick)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('click', onDocClick)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  return (
    <div className="topbar-right" ref={ref}>
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
          {showPrayer && (
            <button
              className="menu-item"
              onClick={() => {
                setOpen(false)
                onSelectPrayer()
              }}
            >
              Prayer Requests
            </button>
          )}
          {showCalendar && (
            <button
              className="menu-item"
              onClick={() => {
                setOpen(false)
                onSelectCalendar()
              }}
            >
              Calendar
            </button>
          )}
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
