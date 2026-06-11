import { useEffect, useRef } from 'react'

// 출력 신호 파형(오실로스코프). 엔진의 파형 탭을 매 프레임 읽어 캔버스에 그린다.
// 순수 프레젠테이션 — 엔진이 제공하는 getWaveform만 호출한다.
interface Props {
  getWaveform: () => Float32Array | null
}

const W = 600
const H = 120
const SMOOTH = 0.5 // 모양 평활(0~1). 클수록 빠르게 반응.
const TARGET = 0.85 // 자동 게인 목표 진폭(캔버스 높이 대비)
const MAX_GAIN = 8 // 무음 구간에서 노이즈 증폭 방지 상한

export function Oscilloscope({ getWaveform }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const displayRef = useRef<Float32Array | null>(null) // 프레임 간 유지되는 평활 버퍼
  const gainRef = useRef(1) // 부드럽게 변하는 자동 게인

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    let raf = 0
    const draw = () => {
      raf = requestAnimationFrame(draw)
      const data = getWaveform()
      ctx.clearRect(0, 0, W, H)
      ctx.lineWidth = 2
      ctx.strokeStyle = '#fbbf24' // amber-400
      ctx.beginPath()
      if (data && data.length > 1) {
        const n = data.length
        const half = n >> 1
        // 1) 라이징 제로크로싱 트리거 — 시작점을 맞춰 파형이 가로로 안 흐른다.
        let trigger = 0
        for (let i = 1; i < half; i++) {
          if (data[i - 1] < 0 && data[i] >= 0) {
            trigger = i
            break
          }
        }
        // 2) 가벼운 지수 평활 + 표시 진폭(피크) 측정
        let disp = displayRef.current
        if (!disp || disp.length !== half) {
          disp = new Float32Array(half)
          displayRef.current = disp
        }
        let peak = 0
        for (let i = 0; i < half; i++) {
          disp[i] += (data[trigger + i] - disp[i]) * SMOOTH
          const a = Math.abs(disp[i])
          if (a > peak) peak = a
        }
        // 3) 자동 게인 — 파형이 항상 캔버스를 채우게(진폭이 작아도 크게 보임). 게인은
        //    천천히 변해 펌핑을 막는다. 클리핑의 "모양"은 그대로 보존된다.
        const targetGain = peak > 0.001 ? Math.min(MAX_GAIN, TARGET / peak) : gainRef.current
        gainRef.current += (targetGain - gainRef.current) * 0.1
        const gain = gainRef.current
        for (let i = 0; i < half; i++) {
          const x = (i / (half - 1)) * W
          const y = (0.5 - disp[i] * gain * 0.5) * H // -1..1 → 아래..위 (캔버스가 초과분 클립)
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
      } else {
        ctx.moveTo(0, H / 2) // 신호 없으면 중앙선
        ctx.lineTo(W, H / 2)
      }
      ctx.stroke()
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [getWaveform])

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      className="h-20 w-full rounded-lg border border-zinc-800 bg-zinc-950"
      role="img"
      aria-label="출력 신호 파형"
    />
  )
}
