// 페달 사양(순수 메타데이터) — Tone 비의존이라 리듀서/UI/테스트가 안전하게 import.
// 새 페달 추가: 여기에 spec 한 덩이 + factories.ts에 팩토리 한 줄 + content/pedals.ts에 설명.
import type { PedalSpec } from '../types'

export const PEDAL_SPECS: Record<string, PedalSpec> = {
  overdrive: {
    kind: 'overdrive',
    label: 'Overdrive',
    params: [
      { id: 'drive', label: 'Drive', min: 0, max: 1, step: 0.01, default: 0.4 },
      { id: 'mix', label: 'Mix', min: 0, max: 1, step: 0.01, default: 1 },
    ],
  },
  delay: {
    kind: 'delay',
    label: 'Delay',
    params: [
      { id: 'time', label: 'Time', min: 0.01, max: 1, step: 0.01, default: 0.25, unit: 's' },
      { id: 'feedback', label: 'Feedback', min: 0, max: 0.9, step: 0.01, default: 0.35 },
      { id: 'mix', label: 'Mix', min: 0, max: 1, step: 0.01, default: 0.4 },
    ],
  },
  reverb: {
    kind: 'reverb',
    label: 'Reverb',
    params: [
      { id: 'decay', label: 'Decay', min: 0.1, max: 8, step: 0.1, default: 2, unit: 's' },
      { id: 'mix', label: 'Mix', min: 0, max: 1, step: 0.01, default: 0.4 },
    ],
  },
  compressor: {
    kind: 'compressor',
    label: 'Compressor',
    params: [
      { id: 'threshold', label: 'Thresh', min: -60, max: 0, step: 1, default: -24, unit: 'dB' },
      { id: 'ratio', label: 'Ratio', min: 1, max: 20, step: 1, default: 4 },
    ],
  },
  chorus: {
    kind: 'chorus',
    label: 'Chorus',
    params: [
      { id: 'rate', label: 'Rate', min: 0.1, max: 8, step: 0.1, default: 1.5, unit: 'Hz' },
      { id: 'depth', label: 'Depth', min: 0, max: 1, step: 0.01, default: 0.7 },
      { id: 'mix', label: 'Mix', min: 0, max: 1, step: 0.01, default: 0.5 },
    ],
  },
  filter: {
    kind: 'filter',
    label: 'Filter',
    params: [
      { id: 'frequency', label: 'Freq', min: 100, max: 6000, step: 10, default: 1200, unit: 'Hz' },
      { id: 'resonance', label: 'Reso', min: 0, max: 12, step: 0.1, default: 1 },
    ],
  },
}

export const PEDAL_KINDS = Object.keys(PEDAL_SPECS)
