import { useMemo, useState, type FormEvent, type MouseEvent } from 'react'
import { getAllPrayerRequests, savePrayerRequest, effectivePrayerSortDate } from '../lib/prayer'
import { todayISO } from '../lib/date'
import { getDailyState, updateDailyState } from '../lib/dailyState'
import type { PrayerRequest, PrayerType } from '../types'

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

interface FormState {
  name: string
  type: PrayerType
  weekday: string
  dateValue: string
  note: string
}

function emptyForm(): FormState {
  return { name: '', type: 'weekly', weekday: 'Sunday', dateValue: '', note: '' }
}

export default function PrayerTab() {
  const today = todayISO()
  const [prayers, setPrayers] = useState<PrayerRequest[]>(() => getAllPrayerRequests())
  const [daily, setDaily] = useState(() => getDailyState(today))
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())

  function openNew() {
    setEditingId(null)
    setForm(emptyForm())
    setShowForm(true)
  }

  function openEdit(p: PrayerRequest, e: MouseEvent) {
    e.preventDefault()
    setEditingId(p.id)
    setForm({
      name: p.name,
      type: p.type,
      weekday: p.weekday || 'Sunday',
      dateValue: p.dateValue || '',
      note: p.note || '',
    })
    setShowForm(true)
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    const request: PrayerRequest = {
      id: editingId ?? `prayer-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: form.name.trim(),
      type: form.type,
      weekday: form.type === 'weekly' ? form.weekday : undefined,
      dateValue: form.dateValue || undefined,
      note: form.note.trim() || undefined,
    }
    savePrayerRequest(request)
    setPrayers(getAllPrayerRequests())
    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm())
  }

  function toggleDone(id: string) {
    const isDone = daily.completedPrayerIds.includes(id)
    const next = isDone ? daily.completedPrayerIds.filter(i => i !== id) : [...daily.completedPrayerIds, id]
    setDaily(updateDailyState(today, { completedPrayerIds: next }))
  }

  // Memoized so typing in the add/edit form (a re-render on every keystroke) doesn't re-sort
  // the whole list each time — only actually needed when the prayer list itself changes.
  const sorted = useMemo(
    () =>
      prayers
        .slice()
        .sort((a, b) => effectivePrayerSortDate(a, today).localeCompare(effectivePrayerSortDate(b, today))),
    [prayers, today]
  )

  return (
    <section className="tab-panel">
      <p className="tab-title">Prayer Requests</p>
      <p className="tab-caption">Home base for everything shown in the Home dropdown.</p>
      <button className="add-btn" onClick={openNew}>
        + Add prayer request
      </button>

      {showForm && (
        <form className="add-form" onSubmit={handleSubmit}>
          <label className="field-label">
            Name
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Mom's health"
            />
          </label>
          <div className="radio-row">
            <label>
              <input
                type="radio"
                checked={form.type === 'daily'}
                onChange={() => setForm(f => ({ ...f, type: 'daily' }))}
              />{' '}
              Daily
            </label>
            <label>
              <input
                type="radio"
                checked={form.type === 'weekly'}
                onChange={() => setForm(f => ({ ...f, type: 'weekly' }))}
              />{' '}
              Weekly
            </label>
            <label>
              <input
                type="radio"
                checked={form.type === 'date'}
                onChange={() => setForm(f => ({ ...f, type: 'date' }))}
              />{' '}
              Specific date
            </label>
          </div>
          {form.type === 'weekly' && (
            <label className="field-label">
              Day of week
              <select value={form.weekday} onChange={e => setForm(f => ({ ...f, weekday: e.target.value }))}>
                {WEEKDAYS.map(d => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </label>
          )}
          <label className="field-label">
            {form.type === 'date' ? 'Date' : 'End date (optional)'}
            <input
              type="date"
              value={form.dateValue}
              onChange={e => setForm(f => ({ ...f, dateValue: e.target.value }))}
            />
          </label>
          <label className="field-label">
            Note (optional)
            <textarea
              rows={2}
              value={form.note}
              onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              placeholder="Any detail to remember"
            />
          </label>
          <button type="submit" className="primary-btn">
            Save
          </button>
        </form>
      )}

      <p className="group-label">By date</p>
      <ul className="prayer-list">
        {sorted.map(p => {
          const isDone = daily.completedPrayerIds.includes(p.id)
          const tag = p.type === 'daily' ? 'Daily' : p.type === 'weekly' ? `Every ${p.weekday?.slice(0, 3)}` : p.dateValue
          return (
            <li key={p.id} className={`prayer-item${isDone ? ' done' : ''}`}>
              <input type="checkbox" id={`pt-${p.id}`} checked={isDone} onChange={() => toggleDone(p.id)} />
              <label htmlFor={`pt-${p.id}`} className="editable-label" onClick={e => openEdit(p, e)}>
                <span className="name">{p.name}</span>
                <span className="tag">{tag}</span>
                {p.note && <span className="note">{p.note}</span>}
              </label>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
