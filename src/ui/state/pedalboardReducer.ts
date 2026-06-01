// 페달보드 상태 리듀서 (순수 — Tone 비의존, vitest 대상).
// PEDAL_SPECS(순수 메타)만 import하므로 node 환경에서 안전하게 테스트된다.
import type { PedalboardState, PedalEntry } from '../../audio/types'
import { PEDAL_SPECS } from '../../audio/pedals/specs'

export type PedalboardAction =
  | { type: 'add'; kind: string }
  | { type: 'remove'; id: string }
  | { type: 'reorder'; from: number; to: number }
  | { type: 'toggleBypass'; id: string }
  | { type: 'setParam'; id: string; paramId: string; value: number }

export const initialPedalboard: PedalboardState = { pedals: [] }

/** kind의 기본 파라미터로 새 페달 항목을 만든다. */
export function createPedal(kind: string): PedalEntry {
  const spec = PEDAL_SPECS[kind]
  if (!spec) throw new Error(`Unknown pedal kind: ${kind}`)
  const params: Record<string, number> = {}
  for (const p of spec.params) params[p.id] = p.default
  return { id: crypto.randomUUID(), kind, bypassed: false, params }
}

export function pedalboardReducer(
  state: PedalboardState,
  action: PedalboardAction,
): PedalboardState {
  switch (action.type) {
    case 'add':
      return { pedals: [...state.pedals, createPedal(action.kind)] }
    case 'remove':
      return { pedals: state.pedals.filter((p) => p.id !== action.id) }
    case 'reorder': {
      const pedals = [...state.pedals]
      const [moved] = pedals.splice(action.from, 1)
      if (moved) pedals.splice(action.to, 0, moved)
      return { pedals }
    }
    case 'toggleBypass':
      return {
        pedals: state.pedals.map((p) =>
          p.id === action.id ? { ...p, bypassed: !p.bypassed } : p,
        ),
      }
    case 'setParam':
      return {
        pedals: state.pedals.map((p) =>
          p.id === action.id
            ? { ...p, params: { ...p.params, [action.paramId]: action.value } }
            : p,
        ),
      }
    default:
      return state
  }
}
