import { describe, it, expect } from 'vitest'
import { analyzeDynamics } from './dynamics'

const SR = 44100

function generateSignalWithBursts(burstAmps: number[], intervalSec: number): { samples: Float32Array, onsets: number[] } {
  const numBursts = burstAmps.length
  const burstLen = Math.floor(0.01 * SR) // 10ms burst
  const intervalSamples = Math.floor(intervalSec * SR)
  const totalSamples = numBursts * intervalSamples + 2000
  const samples = new Float32Array(totalSamples)
  const onsets: number[] = []

  for (let i = 0; i < numBursts; i++) {
    const start = i * intervalSamples + 100
    onsets.push(start / SR)
    const amp = burstAmps[i]
    for (let j = 0; j < burstLen; j++) {
      samples[start + j] = Math.sin(2 * Math.PI * 440 * j / SR) * amp
    }
  }

  return { samples, onsets }
}

describe('dynamics', () => {
  it('returns low CV and no outliers for uniform bursts', () => {
    const { samples, onsets } = generateSignalWithBursts([0.5, 0.5, 0.5, 0.5], 0.2)
    const result = analyzeDynamics(samples, onsets, { sampleRate: SR, peakWindowSec: 0.02 })

    expect(result.amplitudes.length).toBe(4)
    for (const amp of result.amplitudes) {
      expect(Math.abs(amp - 0.5)).toBeLessThan(0.05)
    }
    expect(result.coefficientOfVariation).toBeLessThan(0.01)
    expect(result.outliers.length).toBe(0)
  })

  it('detects a loud outlier when one burst is much stronger', () => {
    // 3 normal bursts (0.3), 1 loud burst (0.9), 1 normal burst (0.3)
    const { samples, onsets } = generateSignalWithBursts([0.3, 0.3, 0.9, 0.3, 0.3], 0.2)
    const result = analyzeDynamics(samples, onsets, { sampleRate: SR, peakWindowSec: 0.02, outlierSigma: 1.0 })

    expect(result.coefficientOfVariation).toBeGreaterThan(0.2)
    expect(result.outliers.length).toBe(1)
    expect(result.outliers[0]).toEqual({ index: 2, direction: 'loud' })
  })

  it('returns empty results when onset array is empty', () => {
    const samples = new Float32Array(1000)
    const result = analyzeDynamics(samples, [], { sampleRate: SR })
    
    expect(result).toEqual({
      amplitudes: [],
      coefficientOfVariation: 0,
      outliers: []
    })
  })
})
