import { describe, it, expect } from 'vitest'
import {
  analyzeSpectrum,
  describeTone,
  crestFactor,
  describeSaturation,
} from './features'

// 48kHz, 8 bins → bin 폭 = 24000/8 = 3000Hz. bin0=0, bin1=3000, ... (i/n)*nyquist 기준.
const SR = 48000

describe('analyzeSpectrum', () => {
  it('puts energy in the high band when high bins are loud', () => {
    const db = new Float32Array(8).fill(-Infinity)
    db[6] = 0 // (6/8)*24000 = 18000Hz → high
    const f = analyzeSpectrum(db, SR)
    expect(f.high).toBeGreaterThan(f.low)
    expect(f.high).toBeGreaterThan(f.mid)
    expect(f.centroidHz).toBeGreaterThan(2000)
  })

  it('puts energy in the low band when low bins are loud', () => {
    const db = new Float32Array(8).fill(-Infinity)
    db[0] = 0 // 0Hz → low
    const f = analyzeSpectrum(db, SR)
    expect(f.low).toBe(1)
    expect(f.centroidHz).toBe(0)
  })

  it('returns zeros for silence (-Infinity everywhere)', () => {
    const f = analyzeSpectrum(new Float32Array(8).fill(-Infinity), SR)
    expect(f).toEqual({ centroidHz: 0, low: 0, mid: 0, high: 0 })
  })
})

describe('describeTone', () => {
  it('labels brightness by centroid', () => {
    expect(describeTone({ centroidHz: 3000, low: 0, mid: 0, high: 1 }).brightness).toBe('밝음')
    expect(describeTone({ centroidHz: 800, low: 1, mid: 0, high: 0 }).brightness).toBe('어두움')
  })
  it('labels balance by dominant band', () => {
    expect(describeTone({ centroidHz: 500, low: 0.7, mid: 0.2, high: 0.1 }).balance).toContain('저역')
    expect(describeTone({ centroidHz: 0, low: 0, mid: 0, high: 0 }).balance).toBe('—')
  })
})

describe('crestFactor / describeSaturation', () => {
  it('constant signal has crest ~1 (heavily flattened)', () => {
    const w = new Float32Array(64).fill(0.5)
    expect(crestFactor(w)).toBeCloseTo(1, 5)
    expect(describeSaturation(crestFactor(w))).toContain('왜곡')
  })
  it('a sparse spike has a high crest factor', () => {
    const w = new Float32Array(64) // mostly 0
    w[0] = 1
    expect(crestFactor(w)).toBeGreaterThan(4)
    expect(describeSaturation(crestFactor(w))).toContain('깨끗')
  })
  it('describes 0 as unknown', () => {
    expect(describeSaturation(0)).toBe('—')
  })
})
