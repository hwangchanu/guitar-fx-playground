// 최소 검증용 UI (throwaway). Figma 디자인 후 교체 예정 — 오디오 엔진/훅은 불변.
import { useState } from 'react'
import { useEngine } from './ui/hooks/useEngine'
import { PEDAL_SPECS, PEDAL_KINDS } from './audio/pedals/specs'
import { TransportControls } from './ui/components/TransportControls'
import { Pedalboard } from './ui/components/Pedalboard'
import { ExplanationPanel } from './ui/components/ExplanationPanel'

function App() {
  const engine = useEngine()
  const [selected, setSelected] = useState<string | null>(null)

  return (
    <main className="mx-auto min-h-screen max-w-4xl p-6 text-zinc-800 dark:text-zinc-100">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Guitar FX Playground</h1>
          <p className="text-sm text-zinc-500">
            페달을 엮고 순서를 바꿔가며 소리를 비교해보세요. (클린 일렉기타 리프 · FreePats CC0)
          </p>
        </div>
        <TransportControls playing={engine.playing} onPlay={engine.play} onStop={engine.stop} />
      </header>

      <div className="grid gap-6 md:grid-cols-[1fr_18rem]">
        <section>
          <div className="mb-3 flex flex-wrap gap-2">
            {PEDAL_KINDS.map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => {
                  engine.addPedal(kind)
                  setSelected(kind)
                }}
                className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700"
              >
                + {PEDAL_SPECS[kind]?.label ?? kind}
              </button>
            ))}
          </div>
          <Pedalboard
            pedals={engine.state.pedals}
            onReorder={engine.reorder}
            onToggleBypass={engine.toggleBypass}
            onRemove={engine.removePedal}
            onSetParam={engine.setParam}
            onSelect={setSelected}
          />
        </section>

        <aside className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <ExplanationPanel kind={selected} />
        </aside>
      </div>
    </main>
  )
}

export default App
