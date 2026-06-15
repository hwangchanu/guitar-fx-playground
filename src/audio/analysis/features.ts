// 출력 신호 톤 분석 (순수 TS — Tone 비의존, vitest 대상).
// 엔진이 떠준 FFT(dB 배열)·파형에서 특징을 뽑고, 사람이 읽을 라벨로 기술한다.
// 측정·규칙은 모두 여기(결정적), UI는 결과만 표시한다.

export interface ToneFeatures {
  centroidHz: number // 스펙트럴 센트로이드(밝기 지표, Hz)
  low: number // 저역 에너지 비율 0..1 (<250Hz)
  mid: number // 중역 0..1 (250~2000Hz)
  high: number // 고역 0..1 (>2000Hz)
}

/**
 * Tone.FFT.getValue() (bin별 dB, 0..나이퀴스트 균등; 무음 bin은 -Infinity)에서 특징 추출.
 * dB→선형 진폭→에너지로 환산해 대역 비율과 센트로이드를 구한다.
 */
export function analyzeSpectrum(db: Float32Array, sampleRate: number): ToneFeatures {
  const n = db.length
  const nyquist = sampleRate / 2
  let low = 0
  let mid = 0
  let high = 0
  let total = 0
  let weighted = 0
  for (let i = 0; i < n; i++) {
    const energy = Math.pow(10, db[i] / 20) ** 2 // dB → 선형 → 에너지
    if (!Number.isFinite(energy) || energy === 0) continue
    const freq = (i / n) * nyquist
    total += energy
    weighted += freq * energy
    if (freq < 250) low += energy
    else if (freq < 2000) mid += energy
    else high += energy
  }
  if (total <= 0) return { centroidHz: 0, low: 0, mid: 0, high: 0 }
  return { centroidHz: weighted / total, low: low / total, mid: mid / total, high: high / total }
}

export interface ToneReadout {
  brightness: string
  balance: string
}

export function describeTone(f: ToneFeatures): ToneReadout {
  const brightness =
    f.centroidHz <= 0 ? '—' : f.centroidHz > 2500 ? '밝음' : f.centroidHz > 1200 ? '중간' : '어두움'
  const max = Math.max(f.low, f.mid, f.high)
  const balance =
    max <= 0
      ? '—'
      : f.low === max
        ? '저역 중심 (두툼)'
        : f.mid === max
          ? '중역 중심'
          : '고역 중심 (쨍함)'
  return { brightness, balance }
}

/** 크레스트 팩터(피크/RMS). 높을수록 다이내믹, 낮을수록 다듬어짐/왜곡(거칠기 근사). */
export function crestFactor(wave: Float32Array): number {
  let peak = 0
  let sumSq = 0
  for (let i = 0; i < wave.length; i++) {
    const a = Math.abs(wave[i])
    if (a > peak) peak = a
    sumSq += wave[i] * wave[i]
  }
  const rms = Math.sqrt(sumSq / wave.length)
  return rms > 0 ? peak / rms : 0
}

export function describeSaturation(crest: number): string {
  if (crest <= 0) return '—'
  if (crest > 4) return '깨끗함 (다이내믹 살아있음)'
  if (crest > 2.5) return '약간 다듬어짐'
  return '강하게 다듬어짐 / 왜곡'
}
