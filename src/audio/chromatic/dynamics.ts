// src/audio/chromatic/dynamics.ts
// 다이내믹 분석 (순수 TS — Tone 비의존, vitest 대상).
// 각 노트의 피크 진폭을 측정해 균일성을 평가한다.

import type { DynamicsResult } from './types'

export interface DynamicsOptions {
  sampleRate: number
  /** 각 온셋 후 피크를 측정할 윈도우 (초). 기본 0.05. */
  peakWindowSec?: number
  /** 이상치(outlier) 판정 기준 — 평균에서 이 배수의 표준편차 이상 벗어나면. 기본 1.5. */
  outlierSigma?: number
}

/**
 * onsetTimes(초)에서 시작하는 각 노트의 피크 진폭을 측정하고 균일성을 평가한다.
 */
export function analyzeDynamics(
  samples: Float32Array,
  onsetTimes: number[],
  options: DynamicsOptions,
): DynamicsResult {
  const sampleRate = options.sampleRate;
  const peakWindowSec = options.peakWindowSec ?? 0.05;
  const outlierSigma = options.outlierSigma ?? 1.5;

  if (onsetTimes.length === 0) {
    return {
      amplitudes: [],
      coefficientOfVariation: 0,
      outliers: []
    };
  }

  const windowLen = Math.floor(peakWindowSec * sampleRate);
  const amplitudes: number[] = [];

  // 1. 각 온셋 후 peakWindowSec 동안의 절대값 피크 진폭 측정
  for (const timeSec of onsetTimes) {
    const startSample = Math.floor(timeSec * sampleRate);
    let maxAbs = 0;
    for (let i = 0; i < windowLen; i++) {
      const idx = startSample + i;
      if (idx < samples.length) {
        const absVal = Math.abs(samples[idx]);
        if (absVal > maxAbs) {
          maxAbs = absVal;
        }
      }
    }
    amplitudes.push(maxAbs);
  }

  // 2. 통계 계산 (평균, 표준편차, 변동계수)
  const n = amplitudes.length;
  let sum = 0;
  for (const amp of amplitudes) {
    sum += amp;
  }
  const mean = sum / n;

  if (mean < 1e-4) {
    return {
      amplitudes,
      coefficientOfVariation: 0,
      outliers: []
    };
  }

  let sumSqDiff = 0;
  for (const amp of amplitudes) {
    const diff = amp - mean;
    sumSqDiff += diff * diff;
  }
  const variance = sumSqDiff / n;
  const stdDev = Math.sqrt(variance);
  const coefficientOfVariation = stdDev / mean;

  // 3. 이상치(outliers) 식별
  const outliers: { index: number; direction: 'loud' | 'quiet' }[] = [];
  const upperThreshold = mean + outlierSigma * stdDev;
  const lowerThreshold = mean - outlierSigma * stdDev;

  // 표준편차가 너무 작으면 이상치 판정을 건너뛴다 (모두 균일한 경우)
  if (stdDev > 0.001) {
    for (let i = 0; i < n; i++) {
      const amp = amplitudes[i];
      if (amp > upperThreshold) {
        outliers.push({ index: i, direction: 'loud' });
      } else if (amp < lowerThreshold) {
        outliers.push({ index: i, direction: 'quiet' });
      }
    }
  }

  return {
    amplitudes,
    coefficientOfVariation,
    outliers
  };
}
