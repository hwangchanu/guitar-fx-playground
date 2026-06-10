import { describe, it, expect } from 'vitest'
import { sequencerReducer, initialSequencer } from './sequencerReducer'
import {
  SEQ_ROWS,
  SEQ_STEPS,
  activeNotesAt,
  emptyCells,
  BPM_MIN,
  BPM_MAX,
} from '../../audio/sequence/config'

describe('sequencerReducer', () => {
  it('default pattern is the preset riff (non-empty, correct dimensions)', () => {
    expect(initialSequencer.cells).toHaveLength(SEQ_ROWS.length)
    expect(initialSequencer.cells[0]).toHaveLength(SEQ_STEPS)
    const anyOn = initialSequencer.cells.some((row) => row.some(Boolean))
    expect(anyOn).toBe(true)
  })

  it('toggleCell flips a single cell immutably', () => {
    const before = initialSequencer.cells[1]?.[3] ?? false
    const s = sequencerReducer(initialSequencer, { type: 'toggleCell', row: 1, step: 3 })
    expect(s.cells[1]?.[3]).toBe(!before)
    expect(s).not.toBe(initialSequencer)
    expect(initialSequencer.cells[1]?.[3] ?? false).toBe(before) // 원본 불변
  })

  it('clear empties the grid', () => {
    const s = sequencerReducer(initialSequencer, { type: 'clear' })
    expect(s.cells.every((row) => row.every((c) => c === false))).toBe(true)
  })

  it('loadDefault restores the preset after clear', () => {
    const cleared = sequencerReducer(initialSequencer, { type: 'clear' })
    const restored = sequencerReducer(cleared, { type: 'loadDefault' })
    expect(restored.cells).toEqual(initialSequencer.cells)
  })

  it('setBpm clamps to [BPM_MIN, BPM_MAX] and rounds', () => {
    expect(sequencerReducer(initialSequencer, { type: 'setBpm', value: 9999 }).bpm).toBe(BPM_MAX)
    expect(sequencerReducer(initialSequencer, { type: 'setBpm', value: 1 }).bpm).toBe(BPM_MIN)
    expect(sequencerReducer(initialSequencer, { type: 'setBpm', value: 120.7 }).bpm).toBe(121)
  })
})

describe('activeNotesAt', () => {
  it('returns the note names of active cells in a column', () => {
    const cells = emptyCells()
    cells[0]![2] = true // 최상단 행 = SEQ_ROWS[0]
    cells[SEQ_ROWS.length - 1]![2] = true // 최하단 행
    expect(activeNotesAt(cells, 2)).toEqual([SEQ_ROWS[0], SEQ_ROWS[SEQ_ROWS.length - 1]])
    expect(activeNotesAt(cells, 0)).toEqual([])
  })
})
