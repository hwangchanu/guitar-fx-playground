import { describe, it, expect } from 'vitest'
import {
  estimatePitch,
  hzToMidi,
  midiToName,
  hzToCentDeviation
} from './pitchTrack'

const SR = 44100

function generateSineWave(hz: number, sampleRate: number, durationSamples: number): Float32Array {
  const arr = new Float32Array(durationSamples)
  for (let i = 0; i < durationSamples; i++) {
    arr[i] = Math.sin(2 * Math.PI * hz * i / sampleRate)
  }
  return arr
}

describe('pitchTrack', () => {
  it('estimates 440Hz sine wave pitch with high confidence', () => {
    const samples = generateSineWave(440, SR, 4000)
    const result = estimatePitch(samples, 0, { sampleRate: SR, offsetSamples: 0 })
    
    expect(result).not.toBeNull()
    if (result) {
      expect(Math.abs(result.hz - 440)).toBeLessThan(5)
      expect(result.confidence).toBeGreaterThan(0.8)
    }
  })

  it('estimates low 82.41Hz (E2) pitch accurately', () => {
    // low pitch needs larger window size to capture enough cycles.
    // 82.41Hz has period of ~535 samples at 44.1kHz.
    const samples = generateSineWave(82.41, SR, 5000)
    const result = estimatePitch(samples, 0, {
      sampleRate: SR,
      offsetSamples: 0,
      windowSize: 3000
    })

    expect(result).not.toBeNull()
    if (result) {
      expect(Math.abs(result.hz - 82.41)).toBeLessThan(3)
    }
  })

  it('returns null for silence', () => {
    const samples = new Float32Array(4000)
    const result = estimatePitch(samples, 0, { sampleRate: SR })
    expect(result).toBeNull()
  })

  it('converts hz to midi and midi to note name correctly', () => {
    expect(hzToMidi(440)).toBe(69)
    expect(midiToName(69)).toBe('A4')
    expect(hzToMidi(261.63)).toBe(60) // C4
    expect(midiToName(60)).toBe('C4')
    expect(hzToMidi(82.41)).toBe(40) // E2
    expect(midiToName(40)).toBe('E2')
  })

  it('calculates cent deviations correctly', () => {
    expect(hzToCentDeviation(440)).toBeCloseTo(0, 2)
    
    // A#4 is 466.16Hz. So 466.16Hz has deviation close to 0 cent for A#4 (midi 70)
    expect(hzToCentDeviation(466.16)).toBeCloseTo(0, 1)

    // A4+50 cents is 440 * 2^(50/1200) = 452.89Hz
    const dev = hzToCentDeviation(452.89)
    // Should be close to +50 or -50 depending on closest note.
    // 452.89 is halfway between A4(440) and A#4(466.16).
    // Closest note: 452.89 is closer to 440. 452.89 / 440 is 1.029, log2 is 0.0416 * 1200 = 50 cents.
    expect(Math.abs(dev)).toBeCloseTo(50, 1)
  })
})
