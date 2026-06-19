import { describe, it, expect } from 'vitest'
import {
  chromaticReducer,
  initialChromatic,
  BPM_MIN_CHROMATIC,
  BPM_MAX_CHROMATIC
} from './chromaticReducer'
import type { ChromaticAnalysis } from '../../audio/chromatic/types'

const dummyAnalysis: ChromaticAnalysis = {
  notes: [],
  timing: {
    gridIntervalSec: 0.1875,
    deviationsMs: [],
    meanDeviationMs: 0,
    stdDeviationMs: 0,
    judgments: []
  },
  dynamics: {
    amplitudes: [],
    coefficientOfVariation: 0,
    outliers: []
  },
  overallScore: 95,
  summary: '훌륭해요!'
}

describe('chromaticReducer', () => {
  it('has correct initial state', () => {
    expect(initialChromatic.bpm).toBe(80)
    expect(initialChromatic.beats).toBe(4)
    expect(initialChromatic.subdivisions).toBe(4)
    expect(initialChromatic.countIn).toBe(1)
    expect(initialChromatic.phase).toBe('idle')
    expect(initialChromatic.analysis).toBeNull()
    expect(initialChromatic.fileName).toBeNull()
  })

  it('setBpm clamps and rounds', () => {
    expect(chromaticReducer(initialChromatic, { type: 'setBpm', value: 9999 }).bpm).toBe(BPM_MAX_CHROMATIC)
    expect(chromaticReducer(initialChromatic, { type: 'setBpm', value: 10 }).bpm).toBe(BPM_MIN_CHROMATIC)
    expect(chromaticReducer(initialChromatic, { type: 'setBpm', value: 120.6 }).bpm).toBe(121)
  })

  it('setBeats clamps value', () => {
    expect(chromaticReducer(initialChromatic, { type: 'setBeats', value: 2 }).beats).toBe(3) // min 3
    expect(chromaticReducer(initialChromatic, { type: 'setBeats', value: 5 }).beats).toBe(4) // max 4
    expect(chromaticReducer(initialChromatic, { type: 'setBeats', value: 3 }).beats).toBe(3)
  })

  it('setSubdivisions clamps to 1, 2, or 4', () => {
    expect(chromaticReducer(initialChromatic, { type: 'setSubdivisions', value: 0 }).subdivisions).toBe(1)
    expect(chromaticReducer(initialChromatic, { type: 'setSubdivisions', value: 1.5 }).subdivisions).toBe(2)
    expect(chromaticReducer(initialChromatic, { type: 'setSubdivisions', value: 3.5 }).subdivisions).toBe(4)
  })

  it('setCountIn clamps to [0, 4]', () => {
    expect(chromaticReducer(initialChromatic, { type: 'setCountIn', value: -1 }).countIn).toBe(0)
    expect(chromaticReducer(initialChromatic, { type: 'setCountIn', value: 5 }).countIn).toBe(4)
  })

  it('transitions phase to countIn, recording, analyzing, and result correctly', () => {
    // 1. Idle -> startCountIn -> countIn
    let state = chromaticReducer(initialChromatic, { type: 'startCountIn' })
    expect(state.phase).toBe('countIn')
    
    // 2. CountIn -> startRecording -> recording
    state = chromaticReducer(state, { type: 'startRecording' })
    expect(state.phase).toBe('recording')

    // 3. Recording -> startAnalysis -> analyzing
    state = chromaticReducer(state, { type: 'startAnalysis', fileName: 'test.mp3' })
    expect(state.phase).toBe('analyzing')
    expect(state.fileName).toBe('test.mp3')

    // 4. Analyzing -> setResult -> result
    state = chromaticReducer(state, { type: 'setResult', analysis: dummyAnalysis })
    expect(state.phase).toBe('result')
    expect(state.analysis).toEqual(dummyAnalysis)
  })

  it('resets to idle while keeping settings like bpm', () => {
    let state = chromaticReducer(initialChromatic, { type: 'setBpm', value: 120 })
    state = chromaticReducer(state, { type: 'startCountIn' })
    state = chromaticReducer(state, { type: 'setResult', analysis: dummyAnalysis })

    const resetState = chromaticReducer(state, { type: 'reset' })
    expect(resetState.phase).toBe('idle')
    expect(resetState.analysis).toBeNull()
    expect(resetState.bpm).toBe(120) // preserved
  })
})
