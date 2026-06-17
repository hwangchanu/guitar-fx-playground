// EQ 어드바이저 (순수 TS — Tone 비의존, vitest 대상).
// 현재 출력 스펙트럼을 측정해, 사용자가 고른 "톤 타깃"으로 가기 위한 EQ 3밴드 조정량을 추천한다.
// 레퍼런스 mp3 불필요 — 타깃은 프리셋 곡선이다(초보자 진입장벽 0, 즉시 데모 가능).
// 측정·추천 규칙은 모두 여기(결정적), UI는 표시·적용만 한다. (features.ts와 같은 분리 패턴)

// 대역 경계는 Tone.EQ3 크로스오버(low<400, 400~2500, >2500)에 맞춘다 — 추천이 EQ 페달
// 밴드와 1:1로 대응되어, 적용하면 측정한 그 대역이 실제로 움직인다.
export const EQ_LOW_HZ = 400
export const EQ_HIGH_HZ = 2500

// EQ 페달 밴드 게인 범위/스텝 (specs.ts의 eq와 일치).
const EQ_MIN = -12
const EQ_MAX = 12
const EQ_STEP = 0.5
const FLOOR_DB = -120 // 무음 대역의 바닥값

export interface BandLevels {
  low: number
  mid: number
  high: number
}

/** 밴드별 게인/조정량(dB). 구조는 BandLevels와 같지만 "측정 레벨"이 아니라 "조정량"임을 명시. */
export type BandGains = BandLevels

export interface ToneTarget {
  id: string
  label: string
  hint: string
  /** 목표 톤의 상대 밸런스(dB, 평균 0). 절대 음량이 아니라 대역 간 균형만 나타낸다. */
  balance: BandLevels
}

// 프리셋 톤 타깃. balance는 평균 0(대역 균형) — 추천은 "현재 균형 → 이 균형"의 차이로 계산.
export const TONE_TARGETS: ToneTarget[] = [
  {
    id: 'warm',
    label: '따뜻하게',
    hint: '저역을 살리고 고역을 부드럽게 — 재즈·블루스 클린 느낌',
    balance: { low: 4, mid: 1, high: -5 },
  },
  {
    id: 'bright',
    label: '밝게',
    hint: '고역을 띄워 선명하게 — 펑크 커팅·아르페지오',
    balance: { low: -3, mid: 0, high: 3 },
  },
  {
    id: 'scooped',
    label: '스쿱드',
    hint: '중역을 파고 양 끝을 강조 — 메탈 리듬',
    balance: { low: 4, mid: -6, high: 2 },
  },
  {
    id: 'mid',
    label: '미드 강조',
    hint: '중역을 밀어 솔로가 묻히지 않게 — 리드·록',
    balance: { low: -2, mid: 5, high: -3 },
  },
]

function toDb(energySum: number, count: number): number {
  if (count <= 0 || energySum <= 0) return FLOOR_DB
  return 10 * Math.log10(energySum / count)
}

/**
 * Tone.FFT.getValue() (bin별 dB, 0..나이퀴스트 균등)에서 EQ3 크로스오버 기준 3밴드의
 * 평균 레벨(dB)을 구한다. 대역 폭이 달라도 공정하게 비교되도록 bin당 평균 에너지를 쓴다.
 */
export function bandLevels(db: Float32Array, sampleRate: number): BandLevels {
  const n = db.length
  const nyquist = sampleRate / 2
  let eL = 0
  let eM = 0
  let eH = 0
  let cL = 0
  let cM = 0
  let cH = 0
  for (let i = 0; i < n; i++) {
    const energy = Math.pow(10, db[i] / 20) ** 2 // dB → 선형 진폭 → 에너지 (features.ts와 동일)
    if (!Number.isFinite(energy)) continue
    const freq = (i / n) * nyquist
    if (freq < EQ_LOW_HZ) {
      eL += energy
      cL++
    } else if (freq < EQ_HIGH_HZ) {
      eM += energy
      cM++
    } else {
      eH += energy
      cH++
    }
  }
  return { low: toDb(eL, cL), mid: toDb(eM, cM), high: toDb(eH, cH) }
}

const snap = (v: number): number => {
  const clamped = Math.min(EQ_MAX, Math.max(EQ_MIN, v))
  return Math.round(clamped / EQ_STEP) * EQ_STEP
}

/**
 * 현재 톤을 타깃 밸런스로 옮기기 위한 EQ 밴드 조정량(dB)을 추천한다. EQ 범위로 clamp + 스텝 스냅.
 * 절대 음량은 무시하고 대역 "균형"만 비교한다(둘 다 평균 0으로 중심화).
 *
 * 한 번에 정확히 맞지는 않는다 — Tone.EQ3 밴드는 크로스오버에서 겹쳐 게인이 인접 대역에
 * 새기 때문(1:1 아님). 대신 방향이 맞아 적용→재분석을 반복하면 차이가 점진적으로 줄어든다
 * ("분석↔조작" 학습 루프). 또 한 밴드가 ±12dB 레일에 clamp되면 합이 0이 아니게 되어 약간의
 * 음량 변화가 생길 수 있으나(드문 극단), 다음 분석에서 재중심화되어 보정된다.
 */
export function recommendEq(current: BandLevels, target: ToneTarget): BandGains {
  const curMean = (current.low + current.mid + current.high) / 3
  const tMean = (target.balance.low + target.balance.mid + target.balance.high) / 3
  return {
    low: snap(target.balance.low - tMean - (current.low - curMean)),
    mid: snap(target.balance.mid - tMean - (current.mid - curMean)),
    high: snap(target.balance.high - tMean - (current.high - curMean)),
  }
}

/** 현재 EQ 밴드 게인에 추천 조정량을 가산하고 EQ 그리드(범위·스텝)로 스냅한다. (UI 적용 단계용) */
export function addEqGains(current: BandGains, delta: BandGains): BandGains {
  return {
    low: snap(current.low + delta.low),
    mid: snap(current.mid + delta.mid),
    high: snap(current.high + delta.high),
  }
}
