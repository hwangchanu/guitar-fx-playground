import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, X } from 'lucide-react'
import type { PedalEntry } from '../../audio/types'
import { PEDAL_SPECS } from '../../audio/pedals/specs'
import { Knob } from './Knob'

const COLOR: Record<string, string> = {
  overdrive: 'from-orange-900/40 to-orange-950/40 border-orange-800/50',
  delay: 'from-blue-900/40 to-blue-950/40 border-blue-800/50',
  reverb: 'from-purple-900/40 to-purple-950/40 border-purple-800/50',
}

interface Props {
  entry: PedalEntry
  isSelected: boolean
  onSelect: (id: string) => void
  onRemove: (id: string) => void
  onToggleBypass: (id: string) => void
  onSetParam: (id: string, paramId: string, value: number) => void
}

export function PedalCard({ entry, isSelected, onSelect, onRemove, onToggleBypass, onSetParam }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: entry.id,
  })
  const spec = PEDAL_SPECS[entry.kind]
  const style = { transform: CSS.Transform.toString(transform), transition }
  const enabled = !entry.bypassed

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onSelect(entry.id)}
      className={`relative flex min-w-[200px] cursor-pointer flex-col items-center gap-4 rounded-xl border-2 bg-gradient-to-br p-6 shadow-2xl transition-all ${
        COLOR[entry.kind] ?? 'from-zinc-800 to-zinc-900 border-zinc-700'
      } ${isSelected ? 'scale-105 ring-2 ring-amber-500' : ''} ${enabled ? '' : 'opacity-40'} ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      {/* 드래그 핸들 (여기서만 드래그 시작) */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="드래그하여 순서 변경"
        onClick={(e) => e.stopPropagation()}
        className="absolute left-2 top-2 cursor-grab text-zinc-500 hover:text-zinc-300 active:cursor-grabbing"
      >
        <GripVertical className="h-5 w-5" />
      </button>

      {/* 삭제 */}
      <button
        type="button"
        aria-label="페달 삭제"
        onClick={(e) => {
          e.stopPropagation()
          onRemove(entry.id)
        }}
        className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded text-zinc-500 hover:bg-red-950/30 hover:text-red-400"
      >
        <X className="h-4 w-4" />
      </button>

      <h3 className="pt-4 text-lg font-bold uppercase tracking-wider text-zinc-100">
        {spec?.label ?? entry.kind}
      </h3>

      {/* 노브 (실제 범위 ↔ 0–100% 매핑) */}
      <div className="flex items-start justify-center gap-6">
        {spec?.params.map((p) => {
          const real = entry.params[p.id] ?? p.default
          const pct = ((real - p.min) / (p.max - p.min)) * 100
          return (
            <Knob
              key={p.id}
              label={p.label}
              value={pct}
              disabled={!enabled}
              onChange={(v) => onSetParam(entry.id, p.id, p.min + (v / 100) * (p.max - p.min))}
            />
          )
        })}
      </div>

      {/* 풋스위치 (바이패스 토글) */}
      <button
        type="button"
        aria-label={enabled ? '끄기' : '켜기'}
        onClick={(e) => {
          e.stopPropagation()
          onToggleBypass(entry.id)
        }}
        className={`relative mt-2 h-14 w-14 rounded-full border-4 shadow-lg transition-all ${
          enabled
            ? 'border-amber-600 bg-amber-500 shadow-amber-500/50 hover:bg-amber-400'
            : 'border-zinc-600 bg-zinc-700 shadow-zinc-900 hover:bg-zinc-600'
        }`}
      >
        <div className={`absolute inset-2 rounded-full ${enabled ? 'bg-amber-300' : 'bg-zinc-600'}`} />
      </button>
    </div>
  )
}
