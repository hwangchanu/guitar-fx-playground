import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useEngine } from './ui/hooks/useEngine'
import { PEDAL_SPECS, PEDAL_KINDS } from './audio/pedals/specs'
import { TransportControls } from './ui/components/TransportControls'
import { Pedalboard } from './ui/components/Pedalboard'
import { ExplanationPanel } from './ui/components/ExplanationPanel'

const CHIP_COLOR: Record<string, string> = {
  overdrive: 'text-orange-400 border-orange-800 hover:bg-orange-950/50 hover:border-orange-500',
  delay: 'text-blue-400 border-blue-800 hover:bg-blue-950/50 hover:border-blue-500',
  reverb: 'text-purple-400 border-purple-800 hover:bg-purple-950/50 hover:border-purple-500',
}

function App() {
  const engine = useEngine()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selectedKind = engine.state.pedals.find((p) => p.id === selectedId)?.kind ?? null

  const handleRemove = (id: string) => {
    engine.removePedal(id)
    setSelectedId((cur) => (cur === id ? null : cur))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div>
            <h1 className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-2xl font-bold text-transparent">
              Guitar FX Playground
            </h1>
            <p className="text-xs text-zinc-500">클린 일렉기타 리프 · FreePats CC0</p>
          </div>
          <TransportControls playing={engine.playing} onPlay={engine.play} onStop={engine.stop} />
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col gap-8 lg:flex-row">
          {/* 페달보드 영역 */}
          <div className="flex-1 space-y-6">
            <div className="flex flex-wrap gap-3">
              {PEDAL_KINDS.map((kind) => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => setSelectedId(engine.addPedal(kind))}
                  className={`inline-flex cursor-pointer items-center gap-1 rounded-md border px-4 py-2 text-sm font-medium ${
                    CHIP_COLOR[kind] ?? 'text-zinc-300 border-zinc-700 hover:bg-zinc-800'
                  }`}
                >
                  <Plus className="h-4 w-4" />
                  {PEDAL_SPECS[kind]?.label ?? kind}
                </button>
              ))}
            </div>

            <div className="min-h-[400px] rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8">
              <Pedalboard
                pedals={engine.state.pedals}
                selectedId={selectedId}
                onReorder={engine.reorder}
                onSelect={setSelectedId}
                onRemove={handleRemove}
                onToggleBypass={engine.toggleBypass}
                onSetParam={engine.setParam}
              />

              {engine.playing && (
                <div className="mt-4 flex items-center gap-2 text-amber-400">
                  <div className="flex gap-1">
                    <div className="h-4 w-1 animate-pulse rounded-full bg-amber-400" />
                    <div
                      className="h-4 w-1 animate-pulse rounded-full bg-amber-400"
                      style={{ animationDelay: '0.1s' }}
                    />
                    <div
                      className="h-4 w-1 animate-pulse rounded-full bg-amber-400"
                      style={{ animationDelay: '0.2s' }}
                    />
                  </div>
                  <span className="text-sm">Signal flowing…</span>
                </div>
              )}
            </div>
          </div>

          {/* 설명 패널 */}
          <div className="min-h-[400px] rounded-2xl border border-zinc-800 bg-zinc-900/50 lg:w-[350px]">
            <ExplanationPanel kind={selectedKind} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
