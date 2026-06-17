import { describe, it, expect } from 'vitest'
import {
  bandLevels,
  recommendEq,
  addEqGains,
  TONE_TARGETS,
  EQ_LOW_HZ,
  EQ_HIGH_HZ,
  type BandLevels,
} from './eqAdvisor'

const SR = 48000

// 주어진 규칙으로 bin별 dB 스펙트럼을 만든다. freq = (i/n)*nyquist.
function makeDb(n: number, dbAt: (freq: number) => number): Float32Array {
  const db = new Float32Array(n)
  const nyquist = SR / 2
  for (let i = 0; i < n; i++) db[i] = dbAt((i / n) * nyquist)
  return db
}

const target = (id: string) => TONE_TARGETS.find((t) => t.id === id)!
const isHalfStep = (v: number) => Number.isInteger(v * 2)

describe('bandLevels', () => {
  it('reports the loud band as the highest level', () => {
    const lowHeavy = bandLevels(makeDb(240, (f) => (f < EQ_LOW_HZ ? 0 : -100)), SR)
    expect(lowHeavy.low).toBeGreaterThan(lowHeavy.mid)
    expect(lowHeavy.low).toBeGreaterThan(lowHeavy.high)

    const highHeavy = bandLevels(makeDb(240, (f) => (f >= EQ_HIGH_HZ ? 0 : -100)), SR)
    expect(highHeavy.high).toBeGreaterThan(highHeavy.low)
    expect(highHeavy.high).toBeGreaterThan(highHeavy.mid)
  })

  it('treats a flat spectrum as balanced across bands (bandwidth-normalized)', () => {
    const flat = bandLevels(makeDb(240, () => -20), SR)
    expect(Math.abs(flat.low - flat.mid)).toBeLessThan(0.01)
    expect(Math.abs(flat.mid - flat.high)).toBeLessThan(0.01)
  })

  it('floors empty bands instead of producing NaN/-Infinity', () => {
    // 모든 bin이 무음(-Infinity) → 유한한 바닥값
    const silent = bandLevels(makeDb(240, () => -Infinity), SR)
    expect(Number.isFinite(silent.low)).toBe(true)
    expect(Number.isFinite(silent.mid)).toBe(true)
    expect(Number.isFinite(silent.high)).toBe(true)
  })
})

describe('recommendEq', () => {
  it('moves a balanced tone toward the target balance', () => {
    const balanced = { low: -20, mid: -20, high: -20 }
    const bright = recommendEq(balanced, target('bright')) // balance {-3,0,3}
    expect(bright.high).toBeGreaterThan(0)
    expect(bright.low).toBeLessThan(0)

    const warm = recommendEq(balanced, target('warm')) // balance {4,1,-5}
    expect(warm.low).toBeGreaterThan(0)
    expect(warm.high).toBeLessThan(0)
  })

  it('recommends ~no change when the tone already matches the target balance', () => {
    const t = target('warm') // {4,1,-5}
    const current = { low: -10 + 4, mid: -10 + 1, high: -10 - 5 } // mean -10, same relative balance
    const rec = recommendEq(current, t)
    expect(Math.abs(rec.low)).toBeLessThanOrEqual(0.5)
    expect(Math.abs(rec.mid)).toBeLessThanOrEqual(0.5)
    expect(Math.abs(rec.high)).toBeLessThanOrEqual(0.5)
  })

  it('ignores overall loudness (only balance matters)', () => {
    const t = target('scooped')
    const quiet = recommendEq({ low: -40, mid: -40, high: -40 }, t)
    const loud = recommendEq({ low: 0, mid: 0, high: 0 }, t)
    expect(loud).toEqual(quiet)
  })

  it('clamps to the EQ range and snaps to 0.5 dB steps', () => {
    const rec = recommendEq({ low: 100, mid: -100, high: 0 }, target('warm'))
    for (const v of [rec.low, rec.mid, rec.high]) {
      expect(v).toBeGreaterThanOrEqual(-12)
      expect(v).toBeLessThanOrEqual(12)
      expect(isHalfStep(v)).toBe(true)
    }
  })

  it('reduces the balance gap on each apply (under a non-ideal coupled EQ model)', () => {
    // EQ3 밴드는 크로스오버에서 겹쳐 1:1이 아니다 — 인접 대역에 누설하는 대표 결합 모델로 검증.
    // 정확히 0 수렴을 단언하지 않고, 적용할수록 목표와의 차이가 줄어드는지만(방향) 본다.
    const applyCoupled = (cur: BandLevels, g: BandLevels): BandLevels => ({
      low: cur.low + 0.85 * g.low + 0.1 * g.mid,
      mid: cur.mid + 0.1 * g.low + 0.85 * g.mid + 0.1 * g.high,
      high: cur.high + 0.1 * g.mid + 0.85 * g.high,
    })
    const rel = (b: BandLevels) => {
      const m = (b.low + b.mid + b.high) / 3
      return { low: b.low - m, mid: b.mid - m, high: b.high - m }
    }
    const gap = (levels: BandLevels, t: ReturnType<typeof target>) => {
      const r = rel(levels)
      const tb = rel(t.balance)
      return Math.hypot(r.low - tb.low, r.mid - tb.mid, r.high - tb.high)
    }
    const t = target('scooped')
    let cur: BandLevels = { low: -20, mid: -20, high: -20 }
    const e0 = gap(cur, t)
    cur = applyCoupled(cur, recommendEq(cur, t))
    const e1 = gap(cur, t)
    cur = applyCoupled(cur, recommendEq(cur, t))
    const e2 = gap(cur, t)
    expect(e1).toBeLessThan(e0)
    expect(e2).toBeLessThan(e1)
  })

  it('addEqGains adds deltas and snaps to the EQ grid (clamped to range)', () => {
    expect(addEqGains({ low: 2, mid: 0, high: -1 }, { low: 1.5, mid: 0, high: -0.5 })).toEqual({
      low: 3.5,
      mid: 0,
      high: -1.5,
    })
    const r = addEqGains({ low: 10, mid: -10, high: 0 }, { low: 6, mid: -6, high: 0.3 })
    expect(r.low).toBe(12) // 16 → clamp 12
    expect(r.mid).toBe(-12) // -16 → clamp -12
    expect(r.high).toBe(0.5) // 0.3 → snap 0.5
  })
})

describe('TONE_TARGETS', () => {
  it('are relative balances (mean zero) so only band balance is encoded', () => {
    for (const t of TONE_TARGETS) {
      expect(t.balance.low + t.balance.mid + t.balance.high).toBe(0)
    }
  })

  it('have unique ids and non-empty labels/hints', () => {
    const ids = new Set(TONE_TARGETS.map((t) => t.id))
    expect(ids.size).toBe(TONE_TARGETS.length)
    for (const t of TONE_TARGETS) {
      expect(t.label.length).toBeGreaterThan(0)
      expect(t.hint.length).toBeGreaterThan(0)
    }
  })
})
