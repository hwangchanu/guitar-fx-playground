import { Fragment, useEffect, useState } from 'react'
import { Eraser, RotateCcw } from 'lucide-react'
import { SEQ_ROWS, SEQ_STEPS, BPM_MIN, BPM_MAX } from '../../audio/sequence/config'

interface Props {
  cells: boolean[][]
  bpm: number
  onToggle: (row: number, step: number) => void
  onClear: () => void
  onLoadDefault: () => void
  onSetBpm: (value: number) => void
  getStep: () => number // 재생 중 현재 스텝(-1=정지). 플레이헤드 표시용.
}

export function StepSequencer({
  cells,
  bpm,
  onToggle,
  onClear,
  onLoadDefault,
  onSetBpm,
  getStep,
}: Props) {
  // 플레이헤드: rAF로 현재 스텝을 읽되 값이 바뀔 때만 setState(불필요한 리렌더 방지).
  const [playStep, setPlayStep] = useState(-1)
  useEffect(() => {
    let raf = 0
    let last = -1
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const s = getStep()
      if (s !== last) {
        last = s
        setPlayStep(s)
      }
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [getStep])

  return (
    <div className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">미디 찍기</h3>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-zinc-400">
            BPM
            <input
              type="range"
              min={BPM_MIN}
              max={BPM_MAX}
              value={bpm}
              onChange={(e) => onSetBpm(Number(e.target.value))}
              className="w-28"
            />
            <span className="w-8 text-right font-mono tabular-nums text-amber-400">{bpm}</span>
          </label>
          <button
            type="button"
            onClick={onLoadDefault}
            className="inline-flex items-center gap-1 rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            기본 리프
          </button>
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1 rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
          >
            <Eraser className="h-3.5 w-3.5" />
            지우기
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div
          className="inline-grid gap-1"
          style={{ gridTemplateColumns: `auto repeat(${SEQ_STEPS}, minmax(0, 1.25rem))` }}
        >
          {SEQ_ROWS.map((note, row) => (
            <Fragment key={note}>
              <div className="pr-2 text-right font-mono text-[10px] leading-5 text-zinc-500">
                {note}
              </div>
              {Array.from({ length: SEQ_STEPS }).map((_, step) => {
                const on = cells[row]?.[step] ?? false
                const beat = step % 4 === 0
                const isHead = step === playStep
                return (
                  <button
                    key={step}
                    type="button"
                    onClick={() => onToggle(row, step)}
                    aria-pressed={on}
                    aria-current={isHead ? 'step' : undefined}
                    aria-label={`${note} 스텝 ${step + 1}`}
                    className={`h-5 rounded-sm border transition-colors ${
                      on
                        ? 'border-amber-400 bg-amber-500'
                        : beat
                          ? 'border-zinc-700 bg-zinc-800'
                          : 'border-zinc-800 bg-zinc-900'
                    } ${isHead ? 'ring-2 ring-amber-300' : ''} hover:border-amber-500`}
                  />
                )
              })}
            </Fragment>
          ))}
        </div>
      </div>

      <p className="text-xs text-zinc-500">
        칸을 눌러 음을 찍어보세요. E 마이너 펜타토닉이라 아무렇게나 찍어도 어울립니다.
        페달·순서를 바꿔가며 함께 들어보세요.
      </p>
    </div>
  )
}
