import { useEffect, useRef, useState } from 'react'
import {
  analyzeSpectrum,
  describeTone,
  crestFactor,
  describeSaturation,
} from '../../audio/analysis/features'

// 출력 신호 톤 분석: 스펙트럼 막대(시각) + 톤 readout(밝기·대역·새츄레이션).
// 순수 프레젠테이션 — 분석 계산은 audio/analysis/features(순수), 신호는 엔진 게터로만.
interface Props {
  getSpectrum: () => Float32Array | null
  getWaveform: () => Float32Array | null
  getSampleRate: () => number
  playing: boolean
}

const W = 600
const H = 80
const BINS = 128 // 앞쪽 bin(저~중역, ~3kHz)만 보여줘야 막대가 읽기 좋음

interface Readout {
  brightness: string
  balance: string
  saturation: string
}

export function ToneAnalysis({ getSpectrum, getWaveform, getSampleRate, playing }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [readout, setReadout] = useState<Readout | null>(null)

  // 스펙트럼 막대 — 재생 중에만 rAF.
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    if (!playing) {
      ctx.clearRect(0, 0, W, H)
      return
    }
    let raf = 0
    const draw = () => {
      raf = requestAnimationFrame(draw)
      const db = getSpectrum()
      ctx.clearRect(0, 0, W, H)
      if (!db || db.length === 0) return
      const bins = Math.min(db.length, BINS)
      const bw = W / bins
      ctx.fillStyle = '#22d3ee' // cyan-400 (파형=앰버와 구분)
      for (let i = 0; i < bins; i++) {
        const v = Math.max(0, Math.min(1, (db[i] + 100) / 100)) // dB(-100..0) → 0..1
        const h = v * H
        ctx.fillRect(i * bw, H - h, Math.max(1, bw - 1), h)
      }
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [getSpectrum, playing])

  // 톤 readout — 재생 중 0.4초마다(지터 방지). setState는 interval 콜백(비동기)에서만.
  useEffect(() => {
    if (!playing) return
    const compute = () => {
      const db = getSpectrum()
      const wave = getWaveform()
      if (!db || !wave) return
      const tone = describeTone(analyzeSpectrum(db, getSampleRate()))
      setReadout({
        brightness: tone.brightness,
        balance: tone.balance,
        saturation: describeSaturation(crestFactor(wave)),
      })
    }
    const id = setInterval(compute, 400)
    return () => clearInterval(id)
  }, [getSpectrum, getWaveform, getSampleRate, playing])

  // 정지 중엔 직전 readout 대신 '—' 표시(상태를 effect에서 동기로 비우지 않음).
  const r = playing ? readout : null

  return (
    <div className="space-y-3">
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="h-20 w-full rounded-lg border border-zinc-800 bg-zinc-950"
        role="img"
        aria-label="출력 스펙트럼"
      />
      <dl className="grid grid-cols-3 gap-2 text-center text-xs">
        <div>
          <dt className="text-zinc-500">밝기</dt>
          <dd className="mt-0.5 text-zinc-200">{r?.brightness ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">대역</dt>
          <dd className="mt-0.5 text-zinc-200">{r?.balance ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">새츄레이션</dt>
          <dd className="mt-0.5 text-zinc-200">{r?.saturation ?? '—'}</dd>
        </div>
      </dl>
      <p className="text-[10px] text-zinc-600">재생 중 출력 신호 기준 · 새츄레이션은 근사치</p>
    </div>
  )
}
