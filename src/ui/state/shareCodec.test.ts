import { describe, it, expect } from 'vitest'
import { encodeShare, decodeShare } from './shareCodec'
import { createPedal, initialPedalboard } from './pedalboardReducer'
import { initialSequencer } from './sequencerReducer'
import { emptyCells, defaultCells, SEQ_ROWS, SEQ_STEPS } from '../../audio/sequence/config'
import type { PedalboardState, PedalEntry } from '../../audio/types'

// id는 디코드 시 새로 생성되므로 비교에서 제외한다.
const stripIds = (b: PedalboardState) =>
  b.pedals.map(({ id: _id, ...rest }) => rest) // eslint-disable-line @typescript-eslint/no-unused-vars

// 임의 페이로드를 토큰으로 만드는 테스트용 헬퍼(음성 케이스 위조).
const forge = (obj: unknown) =>
  btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(obj))))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

describe('shareCodec round-trip', () => {
  it('round-trips an empty board + default sequence', () => {
    const token = encodeShare(initialPedalboard, initialSequencer)
    const out = decodeShare(token)
    expect(out).not.toBeNull()
    expect(out!.board.pedals).toEqual([])
    expect(out!.seq).toEqual(initialSequencer)
  })

  it('round-trips pedals with custom params and bypass (ids regenerated)', () => {
    const od = createPedal('overdrive')
    od.params.drive = 0.8
    od.bypassed = true
    const delay = createPedal('delay')
    delay.params.feedback = 0.7
    delay.params.mix = 0.6
    const board: PedalboardState = { pedals: [od, delay] }

    const out = decodeShare(encodeShare(board, initialSequencer))
    expect(out).not.toBeNull()
    expect(stripIds(out!.board)).toEqual(stripIds(board))
    // id는 새로 생성됨(원본과 달라야 함)
    expect(out!.board.pedals[0]!.id).not.toBe(od.id)
  })

  it('preserves chain order', () => {
    const board: PedalboardState = {
      pedals: [createPedal('reverb'), createPedal('eq'), createPedal('compressor')],
    }
    const out = decodeShare(encodeShare(board, initialSequencer))
    expect(out!.board.pedals.map((p) => p.kind)).toEqual(['reverb', 'eq', 'compressor'])
  })

  it('round-trips a custom grid + bpm', () => {
    const cells = emptyCells()
    cells[0]![0] = true
    cells[SEQ_ROWS.length - 1]![SEQ_STEPS - 1] = true
    cells[3]![7] = true
    const seq = { bpm: 142, cells }
    const out = decodeShare(encodeShare(initialPedalboard, seq))
    expect(out!.seq).toEqual(seq)
  })

  it('round-trips a fully cleared grid (all off, not default riff)', () => {
    const seq = { bpm: 100, cells: emptyCells() }
    const out = decodeShare(encodeShare(initialPedalboard, seq))
    expect(out!.seq.cells).toEqual(emptyCells())
  })
})

describe('shareCodec defensive decode (untrusted input)', () => {
  it('returns null for empty / garbage / non-base64 tokens', () => {
    expect(decodeShare('')).toBeNull()
    expect(decodeShare('!!!not-base64!!!')).toBeNull()
    expect(decodeShare(forge('a plain string, not an object'))).toBeNull()
    expect(decodeShare(forge(42))).toBeNull()
  })

  it('returns null for an unsupported version', () => {
    expect(decodeShare(forge({ v: 999, p: [], s: { bpm: 100, c: [] } }))).toBeNull()
  })

  it('drops unknown pedal kinds but keeps valid ones', () => {
    const token = forge({
      v: 1,
      p: [{ k: 'overdrive' }, { k: 'nonexistent' }, { k: 'eq' }, { notK: true }],
      s: { bpm: 100, c: [] },
    })
    const out = decodeShare(token)
    expect(out!.board.pedals.map((p) => p.kind)).toEqual(['overdrive', 'eq'])
  })

  it('clamps out-of-range params to the spec range', () => {
    const token = forge({
      v: 1,
      p: [{ k: 'overdrive', prm: { drive: 999 } }, { k: 'eq', prm: { low: -999 } }],
      s: { bpm: 100, c: [] },
    })
    const out = decodeShare(token)
    expect(out!.board.pedals[0]!.params.drive).toBe(1) // overdrive.drive max
    expect(out!.board.pedals[1]!.params.low).toBe(-12) // eq.low min
  })

  it('ignores unknown param ids, keeping defaults', () => {
    const def = createPedal('overdrive')
    const token = forge({ v: 1, p: [{ k: 'overdrive', prm: { bogus: 5 } }], s: { bpm: 100, c: [] } })
    const out = decodeShare(token)
    expect(out!.board.pedals[0]!.params).toEqual(def.params)
  })

  it('clamps bpm and falls back to default riff when cells are malformed', () => {
    const out = decodeShare(forge({ v: 1, p: [], s: { bpm: 99999, c: 'nope' } }))
    expect(out!.seq.bpm).toBe(200) // BPM_MAX
    expect(out!.seq.cells).toEqual(defaultCells())
  })

  it('caps the number of pedals (100 → 64, token still under length limit)', () => {
    const many = Array.from({ length: 100 }, () => ({ k: 'overdrive' }))
    const out = decodeShare(forge({ v: 1, p: many, s: { bpm: 100, c: [] } }))
    expect(out!.board.pedals).toHaveLength(64)
  })

  it('survives a too-short cells array (missing rows stay empty)', () => {
    const token = forge({ v: 1, p: [], s: { bpm: 120, c: [1] } }) // only row 0, step 0
    const out = decodeShare(token)
    expect(out!.seq.cells[0]![0]).toBe(true)
    expect(out!.seq.cells[1]!.every((c) => c === false)).toBe(true)
  })

  it('decodes an empty cells array to a silent grid (not the default riff)', () => {
    const out = decodeShare(forge({ v: 1, p: [], s: { bpm: 100, c: [] } }))
    expect(out!.seq.cells).toEqual(emptyCells())
  })

  it('rejects negative/non-integer step masks (encoder never emits them)', () => {
    // -1 would sign-extend to "all steps on"; 1.9 would set step 0 — both must be ignored.
    const out = decodeShare(forge({ v: 1, p: [], s: { bpm: 100, c: [-1, 1.9, 65535] } }))
    expect(out!.seq.cells[0]!.every((c) => c === false)).toBe(true) // -1 rejected
    expect(out!.seq.cells[1]!.every((c) => c === false)).toBe(true) // 1.9 rejected
    expect(out!.seq.cells[2]!.every((c) => c === true)).toBe(true) // 65535 = all 16 on (valid)
  })

  it('returns null for an over-length token (pre-decode guard)', () => {
    expect(decodeShare('A'.repeat(9000))).toBeNull()
  })
})

describe('createPedal guard', () => {
  it('produces a valid entry whose params survive a round-trip', () => {
    const entry: PedalEntry = createPedal('filter')
    const out = decodeShare(encodeShare({ pedals: [entry] }, initialSequencer))
    expect(out!.board.pedals[0]!.params).toEqual(entry.params)
  })
})
