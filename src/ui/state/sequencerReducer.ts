// 스텝 시퀀서 상태 리듀서 (순수 — Tone 비의존, vitest 대상). pedalboardReducer 패턴 미러.
import { defaultCells, emptyCells } from '../../audio/sequence/config'

export const BPM_MIN = 50
export const BPM_MAX = 200

export interface SequencerState {
  bpm: number
  cells: boolean[][] // cells[row][step]
}

export type SequencerAction =
  | { type: 'toggleCell'; row: number; step: number }
  | { type: 'clear' }
  | { type: 'loadDefault' }
  | { type: 'setBpm'; value: number }

export const initialSequencer: SequencerState = { bpm: 100, cells: defaultCells() }

const clampBpm = (v: number) => Math.min(BPM_MAX, Math.max(BPM_MIN, Math.round(v)))

export function sequencerReducer(
  state: SequencerState,
  action: SequencerAction,
): SequencerState {
  switch (action.type) {
    case 'toggleCell':
      return {
        ...state,
        cells: state.cells.map((rowCells, r) =>
          r === action.row
            ? rowCells.map((on, s) => (s === action.step ? !on : on))
            : rowCells,
        ),
      }
    case 'clear':
      return { ...state, cells: emptyCells() }
    case 'loadDefault':
      return { ...state, cells: defaultCells() }
    case 'setBpm':
      return { ...state, bpm: clampBpm(action.value) }
    default:
      return state
  }
}
