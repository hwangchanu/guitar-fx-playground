import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable'
import type { PedalEntry } from '../../audio/types'
import { PedalCard } from './PedalCard'

interface Props {
  pedals: PedalEntry[]
  selectedId: string | null
  onReorder: (from: number, to: number) => void
  onSelect: (id: string) => void
  onRemove: (id: string) => void
  onToggleBypass: (id: string) => void
  onSetParam: (id: string, paramId: string, value: number) => void
}

function Cable() {
  return (
    <div className="relative h-1 w-8 flex-shrink-0 rounded-full bg-amber-900/50">
      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-900/50 to-amber-700/50" />
    </div>
  )
}

function Jack({ label }: { label: string }) {
  return (
    <div className="flex flex-shrink-0 flex-col items-center gap-2">
      <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-zinc-700 bg-zinc-800">
        <div className="h-4 w-4 rounded-full bg-zinc-600" />
      </div>
      <div className="text-xs uppercase text-zinc-500">{label}</div>
    </div>
  )
}

export function Pedalboard(props: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))
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
      <div className="flex h-full flex-col items-center justify-center space-y-4 py-16 text-center">
        <div className="mb-2 text-6xl">🎸</div>
        <h2 className="text-xl font-semibold text-zinc-300">페달보드가 비어 있어요</h2>
        <p className="max-w-md text-zinc-500">
          위에서 페달을 추가해 신호 체인을 만들고, 순서를 바꿔가며 톤이 어떻게 달라지는지
          들어보세요.
        </p>
      </div>
    )
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={horizontalListSortingStrategy}>
        <div className="flex items-center gap-8 overflow-x-auto pb-4">
          <Jack label="Input" />
          <Cable />
          {props.pedals.map((p, i) => (
            <div key={p.id} className="flex items-center gap-8">
              <PedalCard
                entry={p}
                isSelected={p.id === props.selectedId}
                onSelect={props.onSelect}
                onRemove={props.onRemove}
                onToggleBypass={props.onToggleBypass}
                onSetParam={props.onSetParam}
              />
              {i < props.pedals.length - 1 && <Cable />}
            </div>
          ))}
          <Cable />
          <Jack label="Output" />
        </div>
      </SortableContext>
    </DndContext>
  )
}
