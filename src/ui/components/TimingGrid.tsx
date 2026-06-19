import { useEffect, useRef } from 'react'
import type { TimingResult } from '../../audio/chromatic/types'

interface Props {
  timing: TimingResult
}

const W = 600
const H = 200

export function TimingGrid({ timing }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    ctx.clearRect(0, 0, W, H)

    const deviations = timing.deviationsMs
    const judgments = timing.judgments
    const n = judgments.length

    const paddingX = 50
    const paddingY = 30
    const drawableW = W - 2 * paddingX
    const drawableH = H - 2 * paddingY
    const centerY = H / 2

    // 1. 배경 가로 기준선 그리기
    // 0ms 기준선 (중앙선)
    ctx.lineWidth = 1.5
    ctx.strokeStyle = '#3f3f46' // zinc-700
    ctx.beginPath()
    ctx.moveTo(paddingX, centerY)
    ctx.lineTo(W - paddingX, centerY)
    ctx.stroke()

    // 텍스트 라벨 (ms 기준선)
    ctx.fillStyle = '#71717a' // zinc-500
    ctx.font = '10px font-mono, monospace'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'

    const msLines = [30, 15, -15, -30]
    ctx.lineWidth = 1
    ctx.strokeStyle = '#27272a' // zinc-800
    ctx.setLineDash([4, 4]) // 점선 설정

    for (const ms of msLines) {
      const y = centerY - (ms / 60) * (drawableH / 2)
      
      // 선 그리기
      ctx.beginPath()
      ctx.moveTo(paddingX, y)
      ctx.lineTo(W - paddingX, y)
      ctx.stroke()

      // 라벨 텍스트
      const label = ms > 0 ? `+${ms}ms` : `${ms}ms`
      ctx.fillText(label, paddingX - 8, y)
    }
    
    // 0ms 중앙 라벨
    ctx.fillText('0ms', paddingX - 8, centerY)
    ctx.setLineDash([]) // 점선 해제

    if (n === 0) {
      // 데이터가 없는 경우 안내문구
      ctx.fillStyle = '#71717a'
      ctx.font = '12px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('감지된 연주 데이터가 없습니다.', W / 2, H / 2)
      return
    }

    // 2. 각 그리드 지점의 수직 점선과 노트 렌더링
    for (let i = 0; i < n; i++) {
      const x = n > 1 
        ? paddingX + (i / (n - 1)) * drawableW 
        : W / 2

      const dev = deviations[i]
      const judgment = judgments[i]

      // 수직 점선 그리기 (그리드 라인)
      ctx.lineWidth = 0.5
      ctx.strokeStyle = '#18181b' // zinc-900에 가까운 아주 어두운 회색
      ctx.setLineDash([2, 4])
      ctx.beginPath()
      ctx.moveTo(x, paddingY)
      ctx.lineTo(x, H - paddingY)
      ctx.stroke()
      ctx.setLineDash([])

      // Y 위치 계산: 최대 ±60ms 클램프
      const clampedDev = Math.min(60, Math.max(-60, dev))
      const y = centerY - (clampedDev / 60) * (drawableH / 2)

      if (judgment === 'miss') {
        // miss 판정: 회색 X 표시
        ctx.strokeStyle = '#71717a' // zinc-500
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(x - 5, centerY - 5)
        ctx.lineTo(x + 5, centerY + 5)
        ctx.moveTo(x + 5, centerY - 5)
        ctx.lineTo(x - 5, centerY + 5)
        ctx.stroke()
      } else {
        // 다른 판정: 원 점
        let color = '#fb7185' // early/late: rose-400
        if (judgment === 'perfect') {
          color = '#a3e635' // lime-400
        } else if (judgment === 'good') {
          color = '#fbbf24' // amber-400
        }

        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(x, y, 5, 0, 2 * Math.PI)
        ctx.fill()

        // 검정색 테두리
        ctx.strokeStyle = '#09090b' // zinc-950
        ctx.lineWidth = 1.5
        ctx.stroke()
      }

      // X축 아래에 인덱스 라벨 표시 (4비트 단위 등으로 간소화)
      if (n <= 16 || i % 4 === 0 || i === n - 1) {
        ctx.fillStyle = '#52525b' // zinc-600
        ctx.font = '9px font-mono, monospace'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.fillText((i + 1).toString(), x, H - paddingY + 6)
      }
    }

    // 축 상단/하단 텍스트 안내 (Late / Early)
    ctx.fillStyle = '#a1a1aa' // zinc-450
    ctx.font = '9px sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'bottom'
    ctx.fillText('늦음 (Late)', paddingX, paddingY - 10)

    ctx.textBaseline = 'top'
    ctx.fillText('빠름 (Early)', paddingX, H - paddingY + 18)
    
  }, [timing])

  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
      <div className="overflow-x-auto w-full flex justify-center">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="max-w-full"
          role="img"
          aria-label="타이밍 그리드 분석 차트"
        />
      </div>
      <div className="flex flex-wrap gap-4 text-xs justify-center text-zinc-400 pt-2 border-t border-zinc-900 w-full">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-[#a3e635] border border-zinc-900" />
          <span>Perfect (±15ms)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-[#fbbf24] border border-zinc-900" />
          <span>Good (±30ms)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-[#fb7185] border border-zinc-900" />
          <span>Early/Late (&gt;30ms)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 flex items-center justify-center font-bold text-zinc-500 font-mono text-[10px]">×</div>
          <span>Miss (놓침)</span>
        </div>
      </div>
    </div>
  )
}
