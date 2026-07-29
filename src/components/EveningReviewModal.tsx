import { useEffect, useState } from 'react'
import { getAllPrayerRequests, savePrayerRequest, isPrayerRelevantToday } from '../lib/prayer'
import {
  getTodayTodos,
  updateHabiticaTodo,
  completeHabiticaTask,
  uncompleteHabiticaTask,
  createHabiticaTodo,
} from '../lib/habitica'
import { todayISO } from '../lib/date'
import { isTodoRelevantOnHome } from '../lib/homeVisibility'
import { saveDailyLog } from '../lib/dailyLog'
import type { PrayerRequest, TodoItem, DailyState } from '../types'

interface EveningReviewModalProps {
  daily: DailyState
  onPersist: (patch: Partial<DailyState>) => void
  onClose: () => void
}

type Triage = 'next' | 'today' | 'done'

function addDays(dateISO: string, days: number): string {
  const d = new Date(`${dateISO}T00:00:00`)
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function EveningReviewModal({ daily, onPersist: persist, onClose }: EveningReviewModalProps) {
  const today = todayISO()
  const [prayers] = useState<PrayerRequest[]>(() =>
    getAllPrayerRequests().filter(p => isPrayerRelevantToday(p, today))
  )
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [todoTriage, setTodoTriage] = useState<Record<string, Triage>>({})
  const [prayerTriage, setPrayerTriage] = useState<Record<string, Triage>>({})
  const [saving, setSaving] = useState(false)
  const [sheetWarning, setSheetWarning] = useState(false)
  // Guards against re-applying triage (duplicate to-do creation, double date-bumping) if "Try
  // again" is clicked after the Sheets write specifically failed — only that part should retry.
  const [triageApplied, setTriageApplied] = useState(false)

  useEffect(() => {
    getTodayTodos()
      .then(list => setTodos(list.filter(t => isTodoRelevantOnHome(t, today))))
      .catch(() => setTodos([]))
  }, [today])

  const todoAccomplished = todos.filter(t => t.completed)
  const todoNeedsDecision = todos.filter(t => !t.completed && t.type === 'todo')
  const todoAuto = todos.filter(t => !t.completed && t.type === 'daily')

  const prayerAccomplished = prayers.filter(p => daily.completedPrayerIds.includes(p.id))
  const prayerNeedsDecision = prayers.filter(p => !daily.completedPrayerIds.includes(p.id) && p.type !== 'daily')
  const prayerAuto = prayers.filter(p => !daily.completedPrayerIds.includes(p.id) && p.type === 'daily')

  function markTodoDoneNow(item: TodoItem) {
    setTodos(prev => prev.map(t => (t.id === item.id ? { ...t, completed: true } : t)))
  }

  async function undoTodo(item: TodoItem) {
    setTodos(prev => prev.map(t => (t.id === item.id ? { ...t, completed: false } : t)))
    try {
      await uncompleteHabiticaTask(item.id)
    } catch {
      setTodos(prev => prev.map(t => (t.id === item.id ? { ...t, completed: true } : t)))
    }
  }

  function markPrayerDoneNow(id: string) {
    persist({ completedPrayerIds: [...daily.completedPrayerIds, id] })
  }

  function undoPrayer(id: string) {
    persist({ completedPrayerIds: daily.completedPrayerIds.filter(i => i !== id) })
  }

  async function handleSave() {
    setSaving(true)
    setSheetWarning(false)
    try {
      if (!triageApplied) {
        try {
          for (const item of todoNeedsDecision) {
            const choice = todoTriage[item.id] ?? 'next'
            if (choice === 'done') {
              await completeHabiticaTask(item.id)
            } else if (choice === 'next') {
              await updateHabiticaTodo(item.id, { date: addDays(today, 1) })
            }
          }

          for (const p of prayerNeedsDecision) {
            const choice = prayerTriage[p.id] ?? 'next'
            if (choice === 'done') {
              markPrayerDoneNow(p.id)
            } else if (choice === 'next' && p.type === 'date') {
              savePrayerRequest({ ...p, dateValue: addDays(p.dateValue || today, 1) })
            }
            // weekly 'next'/'today': no date to bump — it naturally reappears on its next matching weekday.
          }

          if (daily.mainTaskCompleted === false && daily.mainTaskText.trim()) {
            await createHabiticaTodo(daily.mainTaskText.trim(), addDays(today, 1))
          }

          setTriageApplied(true)
        } catch (err) {
          // A Habitica/prayer triage call failing (stale task id, network blip, etc.) used to
          // throw straight out of handleSave, which skipped saveDailyLog entirely — so "Save &
          // log day" would silently do nothing and no row would append. Triage is best-effort;
          // it must never block today's log from reaching the Sheet.
          console.error('[evening-review] triage step failed, continuing to log the day anyway', err)
        }
      }

      const { sheetSaved } = await saveDailyLog({
        date: today,
        mainTask: daily.mainTaskText,
        mainTaskCompleted: daily.mainTaskCompleted,
        todosDone: todoAccomplished.map(t => t.text),
        todosNotDone: todoNeedsDecision.filter(t => (todoTriage[t.id] ?? 'next') !== 'done').map(t => t.text),
        prayersDone: prayerAccomplished.map(p => p.name),
        prayersNotDone: prayerNeedsDecision.filter(p => (prayerTriage[p.id] ?? 'next') !== 'done').map(p => p.name),
        blockersNotes: daily.blockersNotes,
        gratitude: daily.gratitude,
      })

      persist({ eveningReviewDone: true })
      if (sheetSaved) {
        onClose()
      } else {
        // Everything else (Habitica triage, local backup) already succeeded — only the Sheets
        // write failed, so stay open and let her know rather than silently losing that part.
        setSheetWarning(true)
      }
    } catch (err) {
      // Anything else unexpected (e.g. saveDailyLog itself throwing) must still surface — this
      // used to escape uncaught, leaving the UI looking like the click did nothing while no row
      // was ever appended.
      console.error('[evening-review] save failed', err)
      setSheetWarning(true)
    } finally {
      setSaving(false)
    }
  }

  const triageLabel: Record<Triage, string> = { next: 'Next day', today: 'Today still', done: 'Done' }

  return (
    <div className="overlay">
      <div className="sheet">
        <h2>Evening review</h2>

        <p className="eyebrow">Today's intention</p>
        <div className="detected-task">
          <p className="value">{daily.mainTaskText || 'Not set'}</p>
        </div>
        <div className="yesno">
          <button aria-pressed={daily.mainTaskCompleted === true} onClick={() => persist({ mainTaskCompleted: true })}>
            Accomplished
          </button>
          <button aria-pressed={daily.mainTaskCompleted === false} onClick={() => persist({ mainTaskCompleted: false })}>
            Not yet
          </button>
        </div>

        <div className="review-block">
          <p className="eyebrow">
            To-Dos — {todoAccomplished.length} of {todos.length} done
          </p>
          <ul className="recap-list accomplished">
            {todoAccomplished.map(t => (
              <li key={t.id}>
                <span>{t.text}</span>
                <button type="button" className="undo-check" aria-label="Undo, mark not done" onClick={() => undoTodo(t)}>
                  ✓
                </button>
              </li>
            ))}
          </ul>
          <ul className="triage-list">
            {todoNeedsDecision.map(t => (
              <li key={t.id} className="triage-item">
                <div className="triage-name">{t.text}</div>
                <div className="triage">
                  {(['next', 'today', 'done'] as Triage[]).map(choice => (
                    <button
                      key={choice}
                      aria-pressed={(todoTriage[t.id] ?? 'next') === choice}
                      onClick={() => {
                        setTodoTriage(prev => ({ ...prev, [t.id]: choice }))
                        if (choice === 'done') markTodoDoneNow(t)
                      }}
                    >
                      {triageLabel[choice]}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
          {todoAuto.length > 0 && (
            <>
              <p className="auto-note">Dailies reset automatically — mark done if you got to it</p>
              <ul className="recap-list">
                {todoAuto.map(t => (
                  <li key={t.id}>
                    <span>{t.text}</span>
                    <button type="button" className="mark-done-btn" onClick={() => markTodoDoneNow(t)}>
                      Mark done
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="review-block">
          <p className="eyebrow">
            Prayer Requests — {prayerAccomplished.length} of {prayers.length} done
          </p>
          <ul className="recap-list accomplished">
            {prayerAccomplished.map(p => (
              <li key={p.id}>
                <span>{p.name}</span>
                <button
                  type="button"
                  className="undo-check"
                  aria-label="Undo, mark not done"
                  onClick={() => undoPrayer(p.id)}
                >
                  ✓
                </button>
              </li>
            ))}
          </ul>
          <ul className="triage-list">
            {prayerNeedsDecision.map(p => (
              <li key={p.id} className="triage-item">
                <div className="triage-name">{p.name}</div>
                <div className="triage">
                  {(['next', 'today', 'done'] as Triage[]).map(choice => (
                    <button
                      key={choice}
                      aria-pressed={(prayerTriage[p.id] ?? 'next') === choice}
                      onClick={() => {
                        setPrayerTriage(prev => ({ ...prev, [p.id]: choice }))
                        if (choice === 'done') markPrayerDoneNow(p.id)
                      }}
                    >
                      {triageLabel[choice]}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
          {prayerAuto.length > 0 && (
            <>
              <p className="auto-note">Recurs daily — mark done if you got to it</p>
              <ul className="recap-list">
                {prayerAuto.map(p => (
                  <li key={p.id}>
                    <span>{p.name}</span>
                    <button type="button" className="mark-done-btn" onClick={() => markPrayerDoneNow(p.id)}>
                      Mark done
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <p className="eyebrow">Anything take too long, or get blocked?</p>
        <textarea
          value={daily.blockersNotes}
          onChange={e => persist({ blockersNotes: e.target.value })}
          placeholder="Notes for your daily log..."
        />

        <p className="eyebrow">What are you grateful for today?</p>
        <textarea
          value={daily.gratitude}
          onChange={e => persist({ gratitude: e.target.value })}
          placeholder="A few things, big or small..."
        />

        {sheetWarning && (
          <p className="tab-caption">
            Saved locally, but couldn't reach Google Sheets — check your connection in Settings. Your to-dos and
            prayer requests were still updated correctly.
          </p>
        )}

        <div className="sheet-actions">
          <button className="primary-btn" disabled={saving} onClick={handleSave}>
            {saving ? 'Saving…' : sheetWarning ? 'Try again' : 'Save & log day'}
          </button>
          <button className="ghost-link" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
