// src/ui/state/chromaticReducer.ts
// 크로매틱 연습 탭 상태 리듀서 (순수 — Tone 비의존, vitest 대상).
import type { ChromaticAnalysis } from '../../audio/chromatic/types'

export type ChromaticPhase =
  | 'idle'         // 초기: 설정 중
  | 'countIn'      // 카운트인 재생 중
  | 'recording'    // 녹음 중
  | 'analyzing'    // 분석 중
  | 'result'       // 결과 표시

export interface ChromaticState {
  bpm: number          // 40–240
  beats: number        // 1 마디의 박자 수 (3 또는 4)
  subdivisions: number // 1박당 노트 수 (1, 2, 4)
  countIn: number      // 카운트인 마디 수 (0–4)
  phase: ChromaticPhase
  analysis: ChromaticAnalysis | null
  /** 파일 업로드로 분석 중인 파일 이름 (null이면 라이브 녹음). */
  fileName: string | null
}

export type ChromaticAction =
  | { type: 'setBpm'; value: number }
  | { type: 'setBeats'; value: number }
  | { type: 'setSubdivisions'; value: number }
  | { type: 'setCountIn'; value: number }
  | { type: 'startCountIn' }
  | { type: 'startRecording' }
  | { type: 'stopRecording' }
  | { type: 'startAnalysis'; fileName?: string }
  | { type: 'setResult'; analysis: ChromaticAnalysis }
  | { type: 'reset' }

export const BPM_MIN_CHROMATIC = 40
export const BPM_MAX_CHROMATIC = 240

export const initialChromatic: ChromaticState = {
  bpm: 80,
  beats: 4,
  subdivisions: 4,
  countIn: 1,
  phase: 'idle',
  analysis: null,
  fileName: null,
}

const clampBpm = (v: number) => Math.min(BPM_MAX_CHROMATIC, Math.max(BPM_MIN_CHROMATIC, Math.round(v)))
const clampBeats = (v: number) => Math.min(4, Math.max(3, Math.round(v))) // 3 or 4
const clampSubdivisions = (v: number) => {
  if (v <= 1) return 1
  if (v <= 2) return 2
  return 4
}
const clampCountIn = (v: number) => Math.min(4, Math.max(0, Math.round(v)))

export function chromaticReducer(
  state: ChromaticState,
  action: ChromaticAction,
): ChromaticState {
  switch (action.type) {
    case 'setBpm':
      return { ...state, bpm: clampBpm(action.value) }
    case 'setBeats':
      return { ...state, beats: clampBeats(action.value) }
    case 'setSubdivisions':
      return { ...state, subdivisions: clampSubdivisions(action.value) }
    case 'setCountIn':
      return { ...state, countIn: clampCountIn(action.value) }
    case 'startCountIn':
      return { ...state, phase: 'countIn', analysis: null, fileName: null }
    case 'startRecording':
      return { ...state, phase: 'recording' }
    case 'stopRecording':
      return { ...state, phase: 'idle' }
    case 'startAnalysis':
      return { ...state, phase: 'analyzing', fileName: action.fileName ?? null }
    case 'setResult':
      return { ...state, phase: 'result', analysis: action.analysis }
    case 'reset':
      return {
        ...state,
        phase: 'idle',
        analysis: null,
        fileName: null
      }
    default:
      return state
  }
}
