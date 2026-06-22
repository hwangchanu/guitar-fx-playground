import { describe, it, expect } from 'vitest'
import { analyzeChromatic } from './analyzer'

const SR = 44100

// Helper to generate a signal with sine wave bursts at specified timing
function generateChromaticSignal(
  noteTimesSec: number[],
  totalDurationSec: number
): Float32Array {
  const totalSamples = Math.floor(totalDurationSec * SR)
  const samples = new Float32Array(totalSamples)
  const burstLen = 256

  for (const t of noteTimesSec) {
    const startSample = Math.floor(t * SR)
    if (startSample + burstLen > totalSamples) continue

    for (let j = 0; j < burstLen; j++) {
      // 440Hz sine wave to trigger onset and pitch tracker
      samples[startSample + j] = Math.sin(2 * Math.PI * 440 * j / SR) * 0.8
    }
  }

  return samples
}

describe('analyzeChromatic', () => {
  it('handles accurate playing with leading and trailing silence without generating false misses', () => {
    // BPM 120, Subdivisions 2 -> gridInterval = 0.25s
    // 4 notes played at: 1.0s, 1.25s, 1.50s, 1.75s
    // Total file length 4.0s (leading silence 1s, trailing silence 2.25s)
    const noteTimes = [1.0, 1.25, 1.50, 1.75]
    const samples = generateChromaticSignal(noteTimes, 4.0)

    const result = analyzeChromatic(samples, {
      sampleRate: SR,
      bpm: 120,
      subdivisions: 2,
    })

    // Should detect 4 notes
    expect(result.notes.length).toBe(4)

    // The grid should only cover the playing range: startGrid to endGrid
    // Grid indices for times [1.0, 1.25, 1.50, 1.75] should map to 4 consecutive grids.
    // Total grids must be exactly 4 (no pre-silence or post-silence grids).
    expect(result.timing.judgments.length).toBe(4)

    // All judgments should be 'perfect' (or at least no misses) since they align perfectly
    const misses = result.timing.judgments.filter(j => j === 'miss')
    expect(misses.length).toBe(0)
    
    for (const j of result.timing.judgments) {
      expect(['perfect', 'good']).toContain(j)
    }
  })

  it('handles only leading silence and limits evaluation grids', () => {
    // 2.0s leading silence, then 4 notes at 2.0s, 2.25s, 2.50s, 2.75s. Total duration 3.0s.
    const noteTimes = [2.0, 2.25, 2.50, 2.75]
    const samples = generateChromaticSignal(noteTimes, 3.0)

    const result = analyzeChromatic(samples, {
      sampleRate: SR,
      bpm: 120,
      subdivisions: 2,
    })

    expect(result.notes.length).toBe(4)
    expect(result.timing.judgments.length).toBe(4)
    expect(result.timing.judgments.filter(j => j === 'miss').length).toBe(0)
  })

  it('handles absolute silence gracefully (no onsets) returning empty metrics', () => {
    const samples = new Float32Array(SR * 2) // 2.0s silence
    const result = analyzeChromatic(samples, {
      sampleRate: SR,
      bpm: 120,
      subdivisions: 2,
    })

    expect(result.notes.length).toBe(0)
    // 0 onsets -> mappedGrids is empty -> startGrid=0, endGrid=0 -> totalGrids = 1
    // And that 1 grid has no onset mapped -> it becomes a single 'miss' or 0 grids depending on implementation.
    // In our code:
    // const startGrid = mappedGrids.length > 0 ? mappedGrids[0] : 0;
    // const endGrid   = mappedGrids.length > 0 ? mappedGrids[mappedGrids.length - 1] : 0;
    // const totalGrids = endGrid - startGrid + 1; // 0 - 0 + 1 = 1 grid.
    // It is fine to have 1 grid as miss or 0, key is no crash.
    expect(result.timing.judgments.length).toBe(1)
    expect(result.timing.judgments[0]).toBe('miss')
  })

  it('aligns timing via global offset even when the first note is slightly off', () => {
    // BPM 120, Subdivisions 2 -> gridInterval = 250ms
    // First note is early by 40ms: 0.96s (instead of 1.0s)
    // Other notes are perfect: 1.25s, 1.50s, 1.75s
    // Global offset optimization should find a compromise offset (e.g. ~0.99s),
    // shifting the coordinates such that the 40ms error is distributed:
    // Shifted times: [0.96 - 0.99 = -30ms, 1.25 - 0.99 = 260ms (10ms early), 1.50 - 0.99 = 510ms (10ms early), 1.75 - 0.99 = 760ms (10ms early)]
    // Map to grid 0, 1, 2, 3:
    // grid 0: shifted -30ms, grid 0 -> dev is -30ms (good or early)
    // grid 1: shifted 260ms (0.26s), grid 1 -> dev is 10ms (perfect)
    // grid 2: shifted 510ms (0.51s), grid 2 -> dev is 10ms (perfect)
    // grid 3: shifted 760ms (0.76s), grid 3 -> dev is 10ms (perfect)
    // This results in NO misses and mostly perfect judgments, rather than mapping the first note
    // to a different grid or skewing everything by 40ms.
    const noteTimes = [0.96, 1.25, 1.50, 1.75]
    const samples = generateChromaticSignal(noteTimes, 3.0)

    const result = analyzeChromatic(samples, {
      sampleRate: SR,
      bpm: 120,
      subdivisions: 2,
    })

    expect(result.notes.length).toBe(4)
    expect(result.timing.judgments.length).toBe(4)
    
    // Check that there are no misses
    const misses = result.timing.judgments.filter(j => j === 'miss')
    expect(misses.length).toBe(0)

    // Check that we have a high score because the global alignment corrected the grid start
    expect(result.overallScore).toBeGreaterThan(80)
  })
})
