import { useEffect, useRef, useState } from 'react'
import { Wand2, Check } from 'lucide-react'
import {
  bandLevels,
  recommendEq,
  TONE_TARGETS,
  type BandGains,
  type ToneTarget,
} from '../../audio/analysis/eqAdvisor'

// EQ 추천 패널: 목표 톤(프리셋)을 고르고 "분석"하면 현재 출력 스펙트럼을 측정해 EQ 3밴드
// 조정량을 추천한다. 측정·추천 계산은 순수 audio/analysis/eqAdvisor, 신호는 엔진 게터로만.
interface Props {
  getSpectrum: () => Float32Array | null
  getSampleRate: () => number
  playing: boolean
  hasEq: boolean
  onApply: (rec: BandGains) => void
}

const FRAMES = 40 // ~0.7s 누적해 LTAS 근사 — 순간 스펙트럼은 흔들려 신뢰할 수 없다.
const fmt = (v: number) => (v > 0 ? `+${v.toFixed(1)}` : v < 0 ? v.toFixed(1) : '0')

export function EqAdvisor({ getSpectrum, getSampleRate, playing, hasEq, onApply }: Props) {
  const [targetId, setTargetId] = useState<string | null>(null)
  const [rec, setRec] = useState<BandGains | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const rafRef = useRef(0)
  const runningRef = useRef(false) // 동시 실행/재진입 방지(disabled 버튼 + 동기 중복 클릭 대비)
  const playingRef = useRef(playing) // step 클로저가 최신 재생 상태를 읽도록

  const selected: ToneTarget | undefined = TONE_TARGETS.find((t) => t.id === targetId)
  // 정지 중엔 추천을 숨긴다(상태를 effect에서 비우지 않고 파생값으로 — set-state-in-effect 회피).
  const visibleRec = playing ? rec : null

  useEffect(() => {
    playingRef.current = playing
  }, [playing])

  // 언마운트 시 rAF 정리.
  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  // 현재 출력 스펙트럼을 ~FRAMES 프레임 누적(LTAS 근사)해 추천을 만든다.
  const analyze = () => {
    if (!playing || !selected || runningRef.current) return
    const sel = selected // 클로저에 타깃 고정(누적 중 타깃이 바뀌어도 일관)
    const sr = getSampleRate()
    let sumE: Float64Array | null = null
    let frames = 0
    let ticks = 0
    const MAX_TICKS = FRAMES * 6 // 데이터가 안 와도 반드시 종료(무한 rAF 방지)
    runningRef.current = true
    setAnalyzing(true)
    setRec(null)
    const finish = (result: BandGains | null) => {
      runningRef.current = false
      cancelAnimationFrame(rafRef.current)
      if (result) setRec(result)
      setAnalyzing(false)
    }
    const step = () => {
      if (!playingRef.current) {
        finish(null) // 재생이 멈추면 중단 — 무음 프레임 누적/헛수고 방지
        return
      }
      const db = getSpectrum()
      if (db && db.length) {
        if (!sumE) sumE = new Float64Array(db.length)
        if (sumE.length === db.length) {
          for (let i = 0; i < db.length; i++) sumE[i] += Math.pow(10, db[i] / 10) // 에너지 누적
          frames++ // 실제 누적한 프레임만 카운트(평균 편향 방지)
        }
      }
      ticks++
      if (frames < FRAMES && ticks < MAX_TICKS) {
        rafRef.current = requestAnimationFrame(step)
        return
      }
      if (!sumE || frames === 0) {
        finish(null)
        return
      }
      const avgDb = new Float32Array(sumE.length)
      for (let i = 0; i < sumE.length; i++) avgDb[i] = 10 * Math.log10(sumE[i] / frames)
      finish(recommendEq(bandLevels(avgDb, sr), sel))
    }
    rafRef.current = requestAnimationFrame(step)
  }

  return (
    <div className="space-y-3">
      {/* 결과를 스크린리더에 알림(시각 표시와 별개). */}
      <span role="status" aria-live="polite" className="sr-only">
        {visibleRec
          ? `추천 EQ: Low ${fmt(visibleRec.low)}, Mid ${fmt(visibleRec.mid)}, High ${fmt(visibleRec.high)} dB`
          : analyzing
            ? '분석 중'
            : ''}
      </span>

      <div role="group" aria-label="목표 톤" className="flex flex-wrap gap-2">
        {TONE_TARGETS.map((t) => (
          <button
            key={t.id}
            type="button"
            disabled={analyzing}
            onClick={() => {
              setTargetId(t.id)
              setRec(null)
            }}
            aria-pressed={targetId === t.id}
            className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              targetId === t.id
                ? 'border-lime-500 bg-lime-950/50 text-lime-300'
                : 'border-zinc-700 text-zinc-300 hover:bg-zinc-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {selected && <p className="text-[11px] text-zinc-500">{selected.hint}</p>}

      <button
        type="button"
        onClick={analyze}
        disabled={!playing || !selected || analyzing}
        className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-lime-600 text-sm font-medium text-white transition-colors hover:bg-lime-700 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
      >
        <Wand2 className="h-4 w-4" />
        {analyzing ? '분석 중…' : '현재 톤 분석'}
      </button>

      {!playing && (
        <p className="text-[11px] text-zinc-600">재생을 시작하면 현재 톤을 분석할 수 있어요.</p>
      )}
      {playing && !selected && <p className="text-[11px] text-zinc-600">목표 톤을 먼저 고르세요.</p>}

      {visibleRec && (
        <div className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-950 p-3">
          <p className="text-xs text-zinc-400">추천 EQ 조정</p>
          <dl className="grid grid-cols-3 gap-2 text-center text-sm">
            {([
              ['Low', visibleRec.low],
              ['Mid', visibleRec.mid],
              ['High', visibleRec.high],
            ] as const).map(([label, v]) => (
              <div key={label}>
                <dt className="text-xs text-zinc-500">{label}</dt>
                <dd className={v > 0 ? 'text-lime-400' : v < 0 ? 'text-sky-400' : 'text-zinc-400'}>
                  {fmt(v)} <span className="text-[10px] text-zinc-600">dB</span>
                </dd>
              </div>
            ))}
          </dl>
          <button
            type="button"
            onClick={() => onApply(visibleRec)}
            className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-lime-700 text-sm font-medium text-lime-300 transition-colors hover:bg-lime-950/50"
          >
            <Check className="h-4 w-4" />
            {hasEq ? 'EQ 페달에 적용' : 'EQ 페달 추가하고 적용'}
          </button>
          <p className="text-[10px] text-zinc-600">적용 후 다시 분석하면 더 정밀해집니다.</p>
        </div>
      )}
    </div>
  )
}
