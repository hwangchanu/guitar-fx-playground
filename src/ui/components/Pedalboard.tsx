import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { PedalEntry } from '../../audio/types'
import { PedalCard } from './PedalCard'

interface Props {
  pedals: PedalEntry[]
  onReorder: (from: number, to: number) => void
  onToggleBypass: (id: string) => void
  onRemove: (id: string) => void
  onSetParam: (id: string, paramId: string, value: number) => void
  onSelect: (kind: string) => void
}

export function Pedalboard(props: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  )
  const ids = props.pedals.map((p) => p.id)

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const from = ids.indexOf(String(active.id))
    const to = ids.indexOf(String(over.id))
    if (from !== -1 && to !== -1) props.onReorder(from, to)
  }

  if (props.pedals.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        페달을 추가해보세요. 순서를 바꿔가며 소리를 비교해보세요.
      </p>
    )
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {props.pedals.map((p) => (
            <PedalCard
              key={p.id}
              entry={p}
              onToggleBypass={props.onToggleBypass}
              onRemove={props.onRemove}
              onSetParam={props.onSetParam}
              onSelect={props.onSelect}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
