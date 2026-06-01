import { describe, it, expect } from 'vitest'
import { computeChain } from './computeChain'
import type { PedalboardState } from '../types'

const entry = (id: string, bypassed = false) => ({
  id,
  kind: 'overdrive',
  bypassed,
  params: {},
})

describe('computeChain', () => {
  it('returns ids in board order', () => {
    const state: PedalboardState = { pedals: [entry('a'), entry('b'), entry('c')] }
    expect(computeChain(state)).toEqual(['a', 'b', 'c'])
  })

  it('excludes bypassed pedals', () => {
    const state: PedalboardState = {
      pedals: [entry('a'), entry('b', true), entry('c')],
    }
    expect(computeChain(state)).toEqual(['a', 'c'])
  })

  it('returns empty for empty or all-bypassed boards', () => {
    expect(computeChain({ pedals: [] })).toEqual([])
    expect(computeChain({ pedals: [entry('a', true)] })).toEqual([])
  })
})
