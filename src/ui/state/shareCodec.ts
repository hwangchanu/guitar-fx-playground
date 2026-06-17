// 페달보드 + 시퀀스 상태를 URL 토큰으로 직렬화/역직렬화 (순수 — Tone/React 비의존, vitest 대상).
// CLAUDE.md "페달보드 공유는 서버 대신 체인 상태를 URL에 인코딩" 원칙의 구현.
//
// 설계 원칙:
// - 출처 검증: 토큰은 신뢰할 수 없는 입력(남이 만든 URL)이다. 디코드는 레지스트리(PEDAL_SPECS)와
//   시퀀스 설정 기준으로 검증해 미지 페달/파라미터는 버리고, 값은 스펙 범위로 clamp하며, 깨진
//   토큰엔 null을 돌려 호출측이 기본값으로 폴백하게 한다(절대 throw하지 않음).
// - 확장성: 페달 추가 시 이 파일은 무수정 — kind/param은 레지스트리에서 동적으로 읽는다.
// - 컴팩트: 기본값과 같은 파라미터는 생략(=짧은 URL, 스펙 변경에 강함), cells는 행별 비트마스크.
// - 버전(v): 포맷이 바뀌면 v를 올린다. 모르는 버전 토큰 → null(안전 폴백).
import type { PedalboardState, PedalEntry } from '../../audio/types'
import { PEDAL_SPECS } from '../../audio/pedals/specs'
import { createPedal } from './pedalboardReducer'
import { initialSequencer, type SequencerState } from './sequencerReducer'
import {
  SEQ_ROWS,
  SEQ_STEPS,
  BPM_MIN,
  BPM_MAX,
  emptyCells,
  defaultCells,
} from '../../audio/sequence/config'

const V = 1 // 토큰 포맷 버전
const MAX_PEDALS = 64 // 비정상적으로 많은 페달 방어 상한
const MAX_TOKEN_LEN = 8192 // 토큰 길이 상한(정상 토큰은 수 KB 미만) — 디코드 전 메모리/CPU 폭주 방어

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))
const round = (v: number) => Math.round(v * 1e4) / 1e4 // URL 길이 절약(소수 4자리)

// ── 직렬화 페이로드(짧은 키) ───────────────────────────────────────────────
// { v, p: [{ k, b?, prm? }], s: { bpm, c: [rowBitmask…] } }
//   p[i].k   = 페달 kind, b=1 이면 바이패스, prm = 기본값과 다른 파라미터만
//   s.c[row] = 해당 행에서 켜진 스텝의 비트마스크(step → 1<<step)

function encodePedal(p: PedalEntry): { k: string; b?: 1; prm?: Record<string, number> } {
  const out: { k: string; b?: 1; prm?: Record<string, number> } = { k: p.kind }
  if (p.bypassed) out.b = 1
  const spec = PEDAL_SPECS[p.kind]
  if (spec) {
    const prm: Record<string, number> = {}
    for (const ps of spec.params) {
      const v = p.params[ps.id]
      if (typeof v !== 'number' || !Number.isFinite(v)) continue
      const rv = round(v)
      if (rv !== ps.default) prm[ps.id] = rv // 반올림 후 비교 — 기본값과 같으면 생략(URL 최소화)
    }
    if (Object.keys(prm).length) out.prm = prm
  }
  return out
}

function decodePedal(raw: unknown): PedalEntry | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const kind = o.k
  if (typeof kind !== 'string') return null
  const spec = PEDAL_SPECS[kind]
  if (!spec) return null // 미지 페달은 버린다
  const entry = createPedal(kind) // 기본 파라미터 + 새 id
  entry.bypassed = o.b === 1
  const prm = o.prm
  if (prm && typeof prm === 'object') {
    const pp = prm as Record<string, unknown>
    for (const ps of spec.params) {
      const v = pp[ps.id]
      if (typeof v === 'number' && Number.isFinite(v)) entry.params[ps.id] = clamp(v, ps.min, ps.max)
    }
  }
  return entry
}

function encodeSeq(seq: SequencerState): { bpm: number; c: number[] } {
  const c = seq.cells.map((row) => {
    let mask = 0
    for (let step = 0; step < SEQ_STEPS; step++) if (row[step]) mask |= 1 << step
    return mask
  })
  return { bpm: seq.bpm, c }
}

function decodeSeq(raw: unknown): SequencerState {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const bpmRaw = o.bpm
  const bpm =
    typeof bpmRaw === 'number' && Number.isFinite(bpmRaw)
      ? clamp(Math.round(bpmRaw), BPM_MIN, BPM_MAX)
      : initialSequencer.bpm
  let cells: boolean[][]
  if (Array.isArray(o.c)) {
    cells = emptyCells()
    for (let r = 0; r < SEQ_ROWS.length; r++) {
      const mask = o.c[r]
      // 인코더는 [0, 65535] 정수만 만든다. 음수(-1은 부호확장으로 전 스텝이 켜짐)·소수는 거부.
      if (typeof mask === 'number' && Number.isInteger(mask) && mask >= 0) {
        for (let step = 0; step < SEQ_STEPS; step++) if ((mask >> step) & 1) cells[r]![step] = true
      }
    }
  } else {
    cells = defaultCells() // 시퀀스 정보가 깨졌으면 들리는 기본 리프로 폴백
  }
  return { bpm, cells }
}

// ── base64url (UTF-8 안전) ────────────────────────────────────────────────
function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlToBytes(token: string): Uint8Array {
  const b64 = token.replace(/-/g, '+').replace(/_/g, '/')
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4))
  const bin = atob(b64 + pad)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

/** 현재 페달보드 + 시퀀스를 URL-safe 토큰으로 인코딩한다. */
export function encodeShare(board: PedalboardState, seq: SequencerState): string {
  const payload = { v: V, p: board.pedals.map(encodePedal), s: encodeSeq(seq) }
  return bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload)))
}

/**
 * 토큰을 검증·복원한다. 토큰이 비었거나/깨졌거나/버전이 다르면 null(호출측이 기본값 사용).
 * 토큰이 유효하면 항상 완전한 {board, seq}를 돌려준다(누락 부분은 기본값으로 채움).
 */
export function decodeShare(token: string): { board: PedalboardState; seq: SequencerState } | null {
  if (!token || token.length > MAX_TOKEN_LEN) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(new TextDecoder().decode(base64UrlToBytes(token)))
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== 'object') return null
  const payload = parsed as Record<string, unknown>
  if (payload.v !== V) return null
  const rawPedals = Array.isArray(payload.p) ? payload.p.slice(0, MAX_PEDALS) : []
  const pedals = rawPedals
    .map(decodePedal)
    .filter((p: PedalEntry | null): p is PedalEntry => p !== null)
  return { board: { pedals }, seq: decodeSeq(payload.s) }
}
