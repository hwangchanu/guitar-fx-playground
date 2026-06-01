import { useEffect, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'

// 회전 노브 (0–100). 세로 드래그로 값 조절. 실제 파라미터 범위 매핑은 PedalCard가 한다.
interface KnobProps {
  label: string
  value: number // 0–100
  onChange: (value: number) => void
  disabled?: boolean
}

export function Knob({ label, value, onChange, disabled = false }: KnobProps) {
  const [isDragging, setIsDragging] = useState(false)
  const startY = useRef(0)
  const startValue = useRef(0)

  // 드래그 중에만 전역 마우스 리스너를 단다. (Figma 원본은 useState로 잘못 달려 있었음)
  useEffect(() => {
    if (!isDragging) return
    const move = (e: MouseEvent) => {
      const delta = startY.current - e.clientY // 위로 끌면 증가
      const next = Math.min(100, Math.max(0, startValue.current + delta))
      onChange(Math.round(next))
    }
    const up = () => setIsDragging(false)
    document.addEventListener('mousemove', move)
    document.addEventListener('mouseup', up)
    return () => {
      document.removeEventListener('mousemove', move)
      document.removeEventListener('mouseup', up)
    }
  }, [isDragging, onChange])

  const onMouseDown = (e: ReactMouseEvent) => {
    if (disabled) return
    e.preventDefault()
    e.stopPropagation() // 카드 선택/드래그로 전파 방지
    startY.current = e.clientY
    startValue.current = value
    setIsDragging(true)
  }

  const rotation = (value / 100) * 270 - 135 // -135° ~ +135°

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        onMouseDown={onMouseDown}
        style={{ userSelect: 'none' }}
        className={`relative flex h-12 w-12 items-center justify-center rounded-full border-2 border-zinc-700 bg-gradient-to-br from-zinc-800 to-zinc-900 shadow-inner ${
          disabled ? 'opacity-50' : 'cursor-ns-resize'
        } ${isDragging ? 'ring-2 ring-amber-500/50' : ''}`}
      >
        {/* 눈금 */}
        <div className="pointer-events-none absolute inset-0">
          {Array.from({ length: 11 }).map((_, i) => {
            const angle = -135 + (i * 270) / 10
            return (
              <div
                key={i}
                className="absolute left-1/2 top-1/2 h-0.5 w-1 bg-zinc-600"
                style={{
                  transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-20px)`,
                  transformOrigin: 'center',
                }}
              />
            )
          })}
        </div>
        {/* 인디케이터 */}
        <div
          className="absolute inset-2 rounded-full border border-zinc-600 bg-gradient-to-br from-zinc-700 to-zinc-800 shadow-lg transition-transform"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          <div className="absolute left-1/2 top-1 h-2 w-1 -translate-x-1/2 rounded-full bg-amber-400 shadow-[0_0_4px_rgba(251,191,36,0.8)]" />
        </div>
      </div>
      <div className="text-xs font-medium uppercase tracking-wide text-zinc-400">{label}</div>
      <div className="font-mono text-xs tabular-nums text-amber-400">{Math.round(value)}%</div>
    </div>
  )
}
