import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { PedalEntry } from '../../audio/types'
import { PEDAL_SPECS } from '../../audio/pedals/specs'

interface Props {
  entry: PedalEntry
  onToggleBypass: (id: string) => void
  onRemove: (id: string) => void
  onSetParam: (id: string, paramId: string, value: number) => void
  onSelect: (kind: string) => void
}

export function PedalCard({ entry, onToggleBypass, onRemove, onSetParam, onSelect }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: entry.id,
  })
  const spec = PEDAL_SPECS[entry.kind]
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onSelect(entry.kind)}
      className={`rounded-lg border border-zinc-300 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-800 ${
        entry.bypassed ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="드래그하여 순서 변경"
          className="cursor-grab px-1 text-zinc-400"
        >
          ⠿
        </button>
        <span className="flex-1 font-medium">{spec?.label ?? entry.kind}</span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onToggleBypass(entry.id)
          }}
          className="rounded border px-2 py-0.5 text-xs"
        >
          {entry.bypassed ? 'OFF' : 'ON'}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onRemove(entry.id)
          }}
          aria-label="페달 삭제"
          className="px-1 text-xs text-zinc-400"
        >
          ✕
        </button>
      </div>

      <div className="mt-2 space-y-1">
        {spec?.params.map((p) => {
          const value = entry.params[p.id] ?? p.default
          return (
            <label key={p.id} className="flex items-center gap-2 text-xs">
              <span className="w-16 text-zinc-500">{p.label}</span>
              <input
                type="range"
                min={p.min}
                max={p.max}
                step={p.step}
                value={value}
                onChange={(e) => onSetParam(entry.id, p.id, Number(e.target.value))}
                onClick={(e) => e.stopPropagation()}
                className="flex-1"
              />
              <span className="w-12 text-right tabular-nums text-zinc-500">
                {value.toFixed(2)}
                {p.unit ?? ''}
              </span>
            </label>
          )
        })}
      </div>
    </div>
  )
}
