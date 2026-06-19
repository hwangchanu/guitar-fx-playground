// src/audio/chromatic/types.ts
// 크로매틱 분석 공유 타입 (순수 TS — Tone 비의존).

/** 감지된 단일 노트(피킹). */
export interface DetectedNote {
  /** 온셋 시간 (초, 녹음 시작 기준). */
  timeSec: number
  /** 추정 주파수 (Hz). 피치 추적 실패 시 null. */
  pitchHz: number | null
  /** MIDI 노트 번호 (반올림). pitchHz가 null이면 null. */
  midiNote: number | null
  /** 노트 이름 (예: "E2", "F#3"). pitchHz가 null이면 null. */
  noteName: string | null
  /** 피크 진폭 (0..1). */
  peakAmplitude: number
  /** RMS 레벨 (dB). */
  rmsDb: number
}

/** 타이밍 분석 결과. */
export interface TimingResult {
  /** 이상적 그리드 간격 (초). = 60 / bpm / subdivisions. */
  gridIntervalSec: number
  /** 각 노트의 그리드 대비 편차 (ms). 양수 = 늦음, 음수 = 빠름. */
  deviationsMs: number[]
  /** 평균 편차 (ms). 양수면 전체적으로 드래깅. */
  meanDeviationMs: number
  /** 편차의 표준편차 (ms). 높을수록 불안정. */
  stdDeviationMs: number
  /** 각 노트의 판정. */
  judgments: ('perfect' | 'good' | 'early' | 'late' | 'miss')[]
}

/** 다이내믹 분석 결과. */
export interface DynamicsResult {
  /** 각 노트의 피크 진폭 (0..1). */
  amplitudes: number[]
  /** 진폭의 변동계수 (CV = stdDev / mean, 0..∞). 낮을수록 균일. */
  coefficientOfVariation: number
  /** 진폭이 평균에서 크게 벗어난 노트의 인덱스와 방향. */
  outliers: { index: number; direction: 'loud' | 'quiet' }[]
}

/** 전체 분석 결과. */
export interface ChromaticAnalysis {
  notes: DetectedNote[]
  timing: TimingResult
  dynamics: DynamicsResult
  /** 전체 점수 (0–100). 타이밍 60%, 다이내믹 40% 가중. */
  overallScore: number
  /** 자연어 요약 (한국어). */
  summary: string
}
