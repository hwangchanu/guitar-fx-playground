import { useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, KeyboardEvent as ReactKeyboardEvent } from 'react'

// 회전 노브 (0–100). 세로 드래그(포인터: 마우스/터치/펜) + 키보드로 조절. 실제 파라미터
// 범위 매핑은 PedalCard가 한다. step은 퍼센트 단위 증분(키보드/스냅).
interface KnobProps {
  label: string
  value: number // 0–100
  onChange: (value: number) => void
  step?: number // 퍼센트 증분 (기본 1)
  disabled?: boolean
}

export function Knob({ label, value, onChange, step = 1, disabled = false }: KnobProps) {
  const [dragging, setDragging] = useState(false)
  const startY = useRef(0)
  const startValue = useRef(0)

  const clampSnap = (v: number) =>
    Math.min(100, Math.max(0, Math.round(v / step) * step))

  // 포인터 캡처를 쓰므로 move/up 이벤트가 요소로 계속 들어온다(전역 리스너 불필요).
  const onPointerDown = (e: ReactPointerEvent) => {
    if (disabled) return
    e.preventDefault()
    e.stopPropagation() // 카드 선택/드래그로 전파 방지
    e.currentTarget.setPointerCapture(e.pointerId)
    startY.current = e.clientY
    startValue.current = value
    setDragging(true)
  }
  const onPointerMove = (e: ReactPointerEvent) => {
    if (!dragging) return
    const delta = startY.current - e.clientY // 위로 끌면 증가
    onChange(clampSnap(startValue.current + delta))
  }
  const onPointerUp = (e: ReactPointerEvent) => {
    if (!dragging) return
    e.currentTarget.releasePointerCapture(e.pointerId)
    setDragging(false)
  }

  const onKeyDown = (e: ReactKeyboardEvent) => {
    if (disabled) return
    let next: number | null = null
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') next = value + step
    else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') next = value - step
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = 100
    if (next === null) return
    e.preventDefault()
    onChange(Math.min(100, Math.max(0, next)))
  }

  const rotation = (value / 100) * 270 - 135 // -135° ~ +135°

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        role="slider"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value)}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onKeyDown={onKeyDown}
        style={{ userSelect: 'none', touchAction: 'none' }}
        className={`relative flex h-12 w-12 items-center justify-center rounded-full border-2 border-zinc-700 bg-gradient-to-br from-zinc-800 to-zinc-900 shadow-inner outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
          disabled ? 'opacity-50' : 'cursor-ns-resize'
        } ${dragging ? 'ring-2 ring-amber-500/50' : ''}`}
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
          className="pointer-events-none absolute inset-2 rounded-full border border-zinc-600 bg-gradient-to-br from-zinc-700 to-zinc-800 shadow-lg transition-transform"
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
