import { useState } from 'react'
import SortableList from './SortableList'
import type { PrayerRequest } from '../types'

interface PrayerDropdownProps {
  prayers: PrayerRequest[]
  completedIds: string[]
  order: string[]
  onToggle: (id: string) => void
  onReorder: (newOrder: string[]) => void
}

export default function PrayerDropdown({ prayers, completedIds, order, onToggle, onReorder }: PrayerDropdownProps) {
  const [open, setOpen] = useState(false)

  const byId = new Map(prayers.map(p => [p.id, p]))
  const orderedIds = order.filter(id => byId.has(id))
  const missingIds = prayers.map(p => p.id).filter(id => !orderedIds.includes(id))
  const fullOrder = [...orderedIds, ...missingIds]
  const notDone = fullOrder.filter(id => !completedIds.includes(id))
  const done = fullOrder.filter(id => completedIds.includes(id))
  const display = [...notDone, ...done].map(id => byId.get(id)).filter((p): p is PrayerRequest => !!p)

  return (
    <div className="section" data-open={open}>
      <button className="section-header" aria-expanded={open} onClick={() => setOpen(o => !o)}>
        Prayer Request <span className="chevron">›</span>
      </button>
      {open && (
        <div className="section-body">
          <SortableList
            items={display}
            onReorder={newItems => onReorder(newItems.map(p => p.id))}
            className="prayer-list"
            renderItem={p => {
              const isDone = completedIds.includes(p.id)
              const tag = p.type === 'daily' ? 'Daily' : p.type === 'weekly' ? `Every ${p.weekday?.slice(0, 3)}` : 'Today'
              return (
                <div className={`prayer-item${isDone ? ' done' : ''}`}>
                  <span className="drag-handle" aria-hidden="true">⠿</span>
                  <input
                    type="checkbox"
                    id={`ph-${p.id}`}
                    checked={isDone}
                    onChange={() => onToggle(p.id)}
                  />
                  <label htmlFor={`ph-${p.id}`}>
                    <span className="name">{p.name}</span>
                    <span className="tag">{tag}</span>
                    {p.note && <span className="note">{p.note}</span>}
                  </label>
                </div>
              )
            }}
          />
        </div>
      )}
    </div>
  )
}
