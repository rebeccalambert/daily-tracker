import { useRef, type ReactNode } from 'react'

interface SortableListProps<T extends { id: string }> {
  items: T[]
  onReorder: (newItems: T[]) => void
  renderItem: (item: T) => ReactNode
  className?: string
  itemClassName?: string
}

/** Native HTML5 drag-and-drop reordering. Dropping an item swaps it to the target's position. */
export default function SortableList<T extends { id: string }>({
  items,
  onReorder,
  renderItem,
  className,
  itemClassName,
}: SortableListProps<T>) {
  const draggedId = useRef<string | null>(null)

  function handleDrop(overId: string) {
    const id = draggedId.current
    draggedId.current = null
    if (!id || id === overId) return
    const fromIndex = items.findIndex(i => i.id === id)
    const toIndex = items.findIndex(i => i.id === overId)
    if (fromIndex === -1 || toIndex === -1) return
    const next = items.slice()
    const [moved] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, moved)
    onReorder(next)
  }

  return (
    <ul className={className}>
      {items.map(item => (
        <li
          key={item.id}
          className={itemClassName}
          draggable
          onDragStart={() => {
            draggedId.current = item.id
          }}
          onDragOver={e => e.preventDefault()}
          onDrop={() => handleDrop(item.id)}
        >
          {renderItem(item)}
        </li>
      ))}
    </ul>
  )
}
