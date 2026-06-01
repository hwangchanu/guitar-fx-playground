import { describe, it, expect } from 'vitest'
import { pedalboardReducer, createPedal, initialPedalboard } from './pedalboardReducer'

describe('pedalboardReducer', () => {
  it('adds a pedal with default params', () => {
    const s = pedalboardReducer(initialPedalboard, { type: 'add', kind: 'overdrive' })
    expect(s.pedals).toHaveLength(1)
    expect(s.pedals[0]?.kind).toBe('overdrive')
    expect(s.pedals[0]?.params.drive).toBe(0.4)
    expect(s.pedals[0]?.bypassed).toBe(false)
  })

  it('removes a pedal by id', () => {
    const added = pedalboardReducer(initialPedalboard, { type: 'add', kind: 'delay' })
    const id = added.pedals[0]!.id
    const s = pedalboardReducer(added, { type: 'remove', id })
    expect(s.pedals).toHaveLength(0)
  })

  it('reorders pedals', () => {
    let s = initialPedalboard
    s = pedalboardReducer(s, { type: 'add', kind: 'overdrive' })
    s = pedalboardReducer(s, { type: 'add', kind: 'delay' })
    s = pedalboardReducer(s, { type: 'add', kind: 'reverb' })
    const kinds = (st: typeof s) => st.pedals.map((p) => p.kind)
    expect(kinds(s)).toEqual(['overdrive', 'delay', 'reverb'])
    s = pedalboardReducer(s, { type: 'reorder', from: 2, to: 0 })
    expect(kinds(s)).toEqual(['reverb', 'overdrive', 'delay'])
  })

  it('toggles bypass', () => {
    const added = pedalboardReducer(initialPedalboard, { type: 'add', kind: 'reverb' })
    const id = added.pedals[0]!.id
    const s = pedalboardReducer(added, { type: 'toggleBypass', id })
    expect(s.pedals[0]?.bypassed).toBe(true)
  })

  it('sets a param', () => {
    const added = pedalboardReducer(initialPedalboard, { type: 'add', kind: 'overdrive' })
    const id = added.pedals[0]!.id
    const s = pedalboardReducer(added, { type: 'setParam', id, paramId: 'drive', value: 0.9 })
    expect(s.pedals[0]?.params.drive).toBe(0.9)
  })

  it('createPedal throws on unknown kind', () => {
    expect(() => createPedal('nope')).toThrow()
  })
})
