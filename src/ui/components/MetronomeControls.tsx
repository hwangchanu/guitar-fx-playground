import { useEffect, useState } from 'react'
import { Loader2, Music, Square, RotateCcw } from 'lucide-react'
import type { ChromaticPhase } from '../state/chromaticReducer'

interface Props {
  bpm: number
  beats: number
  subdivisions: number
  countIn: number
  phase: ChromaticPhase
  canRecordAudio: boolean
  onStartSession: () => void
  onStopSession: () => void
  onSetBpm: (value: number) => void
  onSetBeats: (value: number) => void
  onSetSubdivisions: (value: number) => void
  onSetCountIn: (value: number) => void
  onReset: () => void
  getCurrentBeat: () => number
}

export function MetronomeControls({
  bpm,
  beats,
  subdivisions,
  countIn,
  phase,
  canRecordAudio,
  onStartSession,
  onStopSession,
  onSetBpm,
  onSetBeats,
  onSetSubdivisions,
  onSetCountIn,
  onReset,
  getCurrentBeat,
}: Props) {
  const [playBeat, setPlayBeat] = useState(-1)
  const [elapsedTime, setElapsedTime] = useState(0)

  // 1. 플레이헤드 (메트로놈 박자) 감지
  useEffect(() => {
    let raf = 0
    let last = -2
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const b = getCurrentBeat()
      if (b !== last) {
        last = b
        setPlayBeat(b)
      }
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [getCurrentBeat])

  // 2. 녹음 시간 타이머
  useEffect(() => {
    if (phase !== 'recording') {
      return
    }
    const startTime = Date.now()
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000))
    }, 200)
    return () => clearInterval(interval)
  }, [phase])

  const displayedTime = phase === 'recording' ? elapsedTime : 0

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  // 박자 1개 클릭에 대해 활성 표시
  const isBeatActive = (beatIndex: number) => {
    if (phase === 'countIn') return false
    return playBeat === beatIndex
  }

  return (
    <div className="space-y-6 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-teal-400">
          <Music className="h-4 w-4" />
          크로매틱 메트로놈 & 컨트롤
        </h3>
        {phase === 'result' && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1 rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            초기화
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* BPM 설정 */}
        <div className="space-y-2">
          <span className="text-xs text-zinc-400 block">템포 (BPM)</span>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={40}
              max={240}
              value={bpm}
              disabled={phase !== 'idle' && phase !== 'result'}
              onChange={(e) => onSetBpm(Number(e.target.value))}
              className="flex-1 accent-teal-500 disabled:opacity-50"
            />
            <span className="w-8 text-right font-mono text-sm font-bold text-teal-400">{bpm}</span>
          </div>
        </div>

        {/* 박자 설정 */}
        <div className="space-y-2">
          <span className="text-xs text-zinc-400 block">박자 (Time Signature)</span>
          <div className="flex gap-2">
            {[3, 4].map((b) => (
              <button
                key={b}
                type="button"
                disabled={phase !== 'idle' && phase !== 'result'}
                onClick={() => onSetBeats(b)}
                aria-pressed={beats === b}
                className={`flex-1 rounded-md py-1.5 text-xs font-semibold border transition-colors ${
                  beats === b
                    ? 'border-teal-500 bg-teal-500/10 text-teal-400'
                    : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
                } disabled:opacity-50`}
              >
                {b}/4 박자
              </button>
            ))}
          </div>
        </div>

        {/* 음표 세분 설정 */}
        <div className="space-y-2">
          <span className="text-xs text-zinc-400 block">음표 세분화 (Subdivisions)</span>
          <div className="flex gap-1">
            {[
              { label: '♩ (4분)', val: 1 },
              { label: '♪ (8분)', val: 2 },
              { label: '♬ (16분)', val: 4 },
            ].map(({ label, val }) => (
              <button
                key={val}
                type="button"
                disabled={phase !== 'idle' && phase !== 'result'}
                onClick={() => onSetSubdivisions(val)}
                aria-pressed={subdivisions === val}
                className={`flex-1 rounded-md py-1.5 text-[10px] font-semibold border transition-colors ${
                  subdivisions === val
                    ? 'border-teal-500 bg-teal-500/10 text-teal-400'
                    : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
                } disabled:opacity-50`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 카운트인 마디 설정 */}
        <div className="space-y-2">
          <span className="text-xs text-zinc-400 block">카운트인 마디 수 (Count-In)</span>
          <div className="flex gap-1">
            {[0, 1, 2, 4].map((c) => (
              <button
                key={c}
                type="button"
                disabled={phase !== 'idle' && phase !== 'result'}
                onClick={() => onSetCountIn(c)}
                aria-pressed={countIn === c}
                className={`flex-1 rounded-md py-1.5 text-xs font-semibold border transition-colors ${
                  countIn === c
                    ? 'border-teal-500 bg-teal-500/10 text-teal-400'
                    : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
                } disabled:opacity-50`}
              >
                {c === 0 ? '없음' : `${c}마디`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 메트로놈 LED 비주얼라이저 (플레이중일 때 표시) */}
      {(phase === 'countIn' || phase === 'recording') && (
        <div className="flex justify-center items-center gap-4 py-4 bg-zinc-950/40 rounded-xl border border-zinc-800/50">
          {phase === 'countIn' && playBeat < 0 ? (
            <div className="text-center">
              <span className="text-xs text-zinc-500 block mb-1">준비 하세요...</span>
              <span className="text-3xl font-black font-mono text-orange-500 animate-pulse">
                {Math.abs(playBeat)}
              </span>
            </div>
          ) : (
            <div className="flex gap-3">
              {Array.from({ length: beats }).map((_, i) => (
                <div
                  key={i}
                  className={`h-4 w-4 rounded-full transition-all duration-75 ${
                    isBeatActive(i)
                      ? 'bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.8)] scale-110'
                      : 'bg-zinc-800 border border-zinc-700'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* 액션 버튼 */}
      <div className="flex justify-center pt-2">
        {phase === 'idle' && (
          <button
            type="button"
            onClick={onStartSession}
            disabled={!canRecordAudio}
            className={`w-full sm:w-64 flex items-center justify-center gap-2 rounded-xl py-3 px-6 text-sm font-bold transition-all shadow-md ${
              canRecordAudio
                ? 'bg-rose-600 hover:bg-rose-500 text-white hover:shadow-rose-600/20 hover:scale-[1.02]'
                : 'bg-zinc-800 border border-zinc-700 text-zinc-500 cursor-not-allowed'
            }`}
          >
            <div className="h-2.5 w-2.5 rounded-full bg-white animate-pulse" />
            {canRecordAudio ? '실시간 녹음 연습 시작' : '마이크 불가 (업로드 모드 전용)'}
          </button>
        )}

        {phase === 'countIn' && (
          <button
            type="button"
            onClick={onStopSession}
            className="w-full sm:w-64 flex items-center justify-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-500 py-3 px-6 text-sm font-bold text-white hover:scale-[1.02] transition-all"
          >
            <Square className="h-4 w-4 fill-white" />
            카운트다운 중지
          </button>
        )}

        {phase === 'recording' && (
          <button
            type="button"
            onClick={onStopSession}
            className="w-full sm:w-64 flex items-center justify-center gap-2 rounded-xl bg-zinc-100 hover:bg-white py-3 px-6 text-sm font-bold text-zinc-950 hover:scale-[1.02] shadow-[0_0_15px_rgba(255,255,255,0.15)] transition-all"
          >
            <Square className="h-4 w-4 fill-zinc-950" />
            연습 완료 & 분석 시작 ({formatTime(displayedTime)})
          </button>
        )}

        {phase === 'analyzing' && (
          <div className="w-full sm:w-64 flex items-center justify-center gap-2 rounded-xl bg-teal-950/40 border border-teal-800/40 py-3 px-6 text-sm font-bold text-teal-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            오디오 연주 분석 중...
          </div>
        )}

        {phase === 'result' && (
          <button
            type="button"
            onClick={onReset}
            className="w-full sm:w-64 flex items-center justify-center gap-2 rounded-xl bg-teal-600 hover:bg-teal-500 py-3 px-6 text-sm font-bold text-white hover:scale-[1.02] transition-all"
          >
            <RotateCcw className="h-4 w-4" />
            다시 연습하기
          </button>
        )}
      </div>
    </div>
  )
}
