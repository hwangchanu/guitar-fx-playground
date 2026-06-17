import { useEffect, useState } from 'react'
import { Plus, Music, Link2, Check } from 'lucide-react'
import { useEngine } from './ui/hooks/useEngine'
import { PEDAL_SPECS, PEDAL_KINDS } from './audio/pedals/specs'
import { TransportControls } from './ui/components/TransportControls'
import { Pedalboard } from './ui/components/Pedalboard'
import { ExplanationPanel } from './ui/components/ExplanationPanel'
import { StepSequencer } from './ui/components/StepSequencer'
import { Oscilloscope } from './ui/components/Oscilloscope'
import { ToneAnalysis } from './ui/components/ToneAnalysis'
import { pedalAccent } from './ui/pedalTheme'

function App() {
  const engine = useEngine()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [midiMode, setMidiMode] = useState(false)
  const [copied, setCopied] = useState(false)
  const selectedKind = engine.state.pedals.find((p) => p.id === selectedId)?.kind ?? null

  const handleRemove = (id: string) => {
    engine.removePedal(id)
    setSelectedId((cur) => (cur === id ? null : cur))
  }

  const handleShare = async () => {
    const url = engine.shareUrl()
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      // 클립보드 불가(비보안 컨텍스트 등) → 수동 복사용 프롬프트로 폴백
      window.prompt('이 링크를 복사하세요', url)
    }
  }

  // '복사됨' 배지를 2초 후 자동 해제. effect로 처리해 재클릭·언마운트 시 타이머를 정리한다.
  useEffect(() => {
    if (!copied) return
    const id = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(id)
  }, [copied])

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
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleShare}
              title="페달보드 + 시퀀스를 URL로 공유"
              aria-label="공유 링크 복사"
              className="inline-flex h-10 items-center gap-2 rounded-md bg-zinc-800 px-4 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-700"
            >
              {copied ? (
                <Check className="h-4 w-4 text-emerald-400" />
              ) : (
                <Link2 className="h-4 w-4" />
              )}
              {copied ? '복사됨' : '공유'}
            </button>
            {/* 복사 결과를 스크린리더에 알림(버튼 라벨 변경만으론 안정적으로 읽히지 않음). */}
            <span role="status" aria-live="polite" className="sr-only">
              {copied ? '공유 링크가 복사됨' : ''}
            </span>
            <button
              type="button"
              onClick={() => setMidiMode((m) => !m)}
              aria-pressed={midiMode}
              className={`inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-medium transition-colors ${
                midiMode
                  ? 'bg-amber-600 text-white hover:bg-amber-700'
                  : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
              }`}
            >
              <Music className="h-4 w-4" />
              찍기
            </button>
            <TransportControls playing={engine.playing} onPlay={engine.play} onStop={engine.stop} />
          </div>
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
                    pedalAccent(kind).chip
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

            {midiMode && (
              <StepSequencer
                cells={engine.sequencer.cells}
                bpm={engine.sequencer.bpm}
                onToggle={engine.sequencer.toggleCell}
                onClear={engine.sequencer.clear}
                onLoadDefault={engine.sequencer.loadDefault}
                onSetBpm={engine.sequencer.setBpm}
                getStep={engine.sequencer.getStep}
              />
            )}
          </div>

          {/* 우측: 출력 파형 + 설명 패널 */}
          <div className="flex flex-col gap-6 lg:w-[350px]">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-zinc-400">
                출력 파형
              </h2>
              <Oscilloscope getWaveform={engine.getWaveform} playing={engine.playing} />
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-zinc-400">
                톤 분석
              </h2>
              <ToneAnalysis
                getSpectrum={engine.getSpectrum}
                getWaveform={engine.getWaveform}
                getSampleRate={engine.getSampleRate}
                playing={engine.playing}
              />
            </div>
            <div className="min-h-[400px] rounded-2xl border border-zinc-800 bg-zinc-900/50">
              <ExplanationPanel kind={selectedKind} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
