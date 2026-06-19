import { describe, it, expect } from 'vitest'
import { detectOnsets } from './onsetDetect'

const SR = 44100

describe('detectOnsets', () => {
  it('returns an empty array for pure silence', () => {
    const samples = new Float32Array(SR * 2) // 2 seconds of silence
    const onsets = detectOnsets(samples, { sampleRate: SR })
    expect(onsets.length).toBe(0)
  })

  it('detects correct number of onsets at correct positions for periodic bursts', () => {
    const samples = new Float32Array(Math.floor(SR * 1.5)) // 1.5 seconds
    
    // Add bursts of 440Hz sine wave at 0.3s and 0.9s
    const burst1Start = Math.floor(0.3 * SR)
    const burst2Start = Math.floor(0.9 * SR)
    const burstLen = 256

    for (let i = 0; i < burstLen; i++) {
      samples[burst1Start + i] = Math.sin(2 * Math.PI * 440 * i / SR) * 0.8
      samples[burst2Start + i] = Math.sin(2 * Math.PI * 440 * i / SR) * 0.8
    }

    const onsets = detectOnsets(samples, { sampleRate: SR, threshold: 3.0 })
    expect(onsets.length).toBe(2)
    
    // Expect first onset near 0.3s (within 30ms margin)
    expect(Math.abs(onsets[0] - 0.3)).toBeLessThan(0.03)
    // Expect second onset near 0.9s (within 30ms margin)
    expect(Math.abs(onsets[1] - 0.9)).toBeLessThan(0.03)
  })

  it('rejects double-triggers within minIntervalSec', () => {
    const samples = new Float32Array(SR * 1) // 1 second
    
    // Add two bursts very close to each other (0.3s and 0.4s)
    const burst1Start = Math.floor(0.3 * SR)
    const burst2Start = Math.floor(0.4 * SR)
    const burstLen = 256

    for (let i = 0; i < burstLen; i++) {
      samples[burst1Start + i] = Math.sin(2 * Math.PI * 440 * i / SR) * 0.8
      samples[burst2Start + i] = Math.sin(2 * Math.PI * 440 * i / SR) * 0.8
    }

    // Set minIntervalSec to 0.2s, which is greater than the 0.1s interval between bursts
    const onsets = detectOnsets(samples, {
      sampleRate: SR,
      minIntervalSec: 0.2,
      threshold: 3.0
    })

    expect(onsets.length).toBe(1)
    expect(Math.abs(onsets[0] - 0.3)).toBeLessThan(0.03)
  })

  it('ignores weak picking when threshold is high', () => {
    const samples = new Float32Array(SR * 1) // 1 second
    
    // Add a very weak burst at 0.4s (amplitude 0.03)
    const burstStart = Math.floor(0.4 * SR)
    const burstLen = 256

    for (let i = 0; i < burstLen; i++) {
      samples[burstStart + i] = Math.sin(2 * Math.PI * 440 * i / SR) * 0.03
    }

    // Set threshold very high (e.g. 15.0)
    const onsets = detectOnsets(samples, {
      sampleRate: SR,
      threshold: 15.0
    })

    expect(onsets.length).toBe(0)
  })
})
