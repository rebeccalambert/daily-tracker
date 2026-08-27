import SortableList from './SortableList'
import type { TodoItem } from '../types'
import { formatDue, todayISO } from '../lib/date'

interface TodoDropdownProps {
  todos: TodoItem[]
  order: string[]
  open: boolean
  onToggleOpen: () => void
  onToggle: (item: TodoItem) => void
  onReorder: (newOrder: string[]) => void
}

export default function TodoDropdown({ todos, order, open, onToggleOpen, onToggle, onReorder }: TodoDropdownProps) {
  const today = todayISO()

  const byId = new Map(todos.map(t => [t.id, t]))
  const orderedIds = order.filter(id => byId.has(id))
  const missingIds = todos.map(t => t.id).filter(id => !orderedIds.includes(id))
  const fullOrder = [...orderedIds, ...missingIds]
  const notDone = fullOrder.filter(id => !byId.get(id)!.completed)
  const done = fullOrder.filter(id => byId.get(id)!.completed)
  const display = [...notDone, ...done].map(id => byId.get(id)).filter((t): t is TodoItem => !!t)

  return (
    <div className="section" data-open={open}>
      <button className="section-header" aria-expanded={open} onClick={onToggleOpen}>
        To-Dos <span className="chevron">›</span>
      </button>
      {open && (
        <div className="section-body">
          <SortableList
            items={display}
            onReorder={newItems => onReorder(newItems.map(t => t.id))}
            className="todo-list"
            renderItem={item => {
              const due = item.type === 'todo' ? formatDue(item.dueDate, today) : { text: 'Daily', overdue: false }
              return (
                <div className={`todo-item${item.completed ? ' done' : ''}`}>
                  <span className="drag-handle" aria-hidden="true">⠿</span>
                  <input
                    type="checkbox"
                    id={`td-${item.id}`}
                    checked={item.completed}
                    onChange={() => onToggle(item)}
                  />
                  <label htmlFor={`td-${item.id}`}>
                    {item.text} <span className={`due${due.overdue ? ' overdue' : ''}`}>{due.text}</span>
                    {item.notes && <span className="note">{item.notes}</span>}
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
