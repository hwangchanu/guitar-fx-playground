// src/audio/chromatic/analyzer.ts
// 크로매틱 연습 분석 오케스트레이터 (순수 TS).
// onsetDetect → pitchTrack → dynamics를 순차 실행하고 종합 결과를 만든다.

import type { ChromaticAnalysis, DetectedNote, TimingResult } from './types'
import { detectOnsets } from './onsetDetect'
import { estimatePitch, hzToMidi, midiToName } from './pitchTrack'
import { analyzeDynamics } from './dynamics'

export interface AnalyzerOptions {
  sampleRate: number
  bpm: number
  /** 1박당 노트 수. 1 = 4분음표, 2 = 8분음표, 4 = 16분음표. 기본 4. */
  subdivisions: number
}

/**
 * 모든 온셋이 그리드에 가장 잘 맞는 시간 오프셋(초)을 찾는다.
 * firstOnset ± halfGrid 범위를 5ms 스텝으로 탐색, SSE(편차 제곱합) 최소 지점 반환.
 */
function findBestOffset(
  onsetTimes: number[],
  gridInterval: number,
): number {
  if (onsetTimes.length === 0) return 0;

  const first = onsetTimes[0];
  const halfGrid = gridInterval / 2;
  const stepSec = 0.005; // 5ms

  let bestOffset = first;
  let bestSSE = Infinity;

  for (let candidate = first - halfGrid;
       candidate <= first + halfGrid;
       candidate += stepSec) {
    let sse = 0;
    for (const t of onsetTimes) {
      const shifted = t - candidate;
      const nearest = Math.round(shifted / gridInterval) * gridInterval;
      const diff = shifted - nearest;
      sse += diff * diff;
    }
    if (sse < bestSSE) {
      bestSSE = sse;
      bestOffset = candidate;
    }
  }
  return bestOffset;
}

export function analyzeChromatic(
  samples: Float32Array,
  options: AnalyzerOptions,
): ChromaticAnalysis {
  const sampleRate = options.sampleRate;
  const bpm = options.bpm;
  const subdivisions = options.subdivisions;

  // 1. 온셋 감지
  const onsetTimes = detectOnsets(samples, { sampleRate });

  // 2. 각 온셋에 대해 피킹 정보(피치, 노트 이름, 진폭, RMS DB 등) 수집
  const notes: DetectedNote[] = [];
  const windowLen = Math.floor(0.05 * sampleRate); // 피크 측정용 윈도우

  for (let i = 0; i < onsetTimes.length; i++) {
    const timeSec = onsetTimes[i];
    const startSample = Math.floor(timeSec * sampleRate);

    // 피치 추정
    const pitchEstimate = estimatePitch(samples, startSample, { sampleRate });
    let pitchHz: number | null = null;
    let midiNote: number | null = null;
    let noteName: string | null = null;

    if (pitchEstimate) {
      pitchHz = pitchEstimate.hz;
      midiNote = hzToMidi(pitchHz);
      noteName = midiToName(midiNote);
    }

    // 피크 진폭
    let peakAmplitude = 0;
    let sumSq = 0;
    const endIdx = Math.min(startSample + windowLen, samples.length);
    const count = endIdx - startSample;

    for (let j = startSample; j < endIdx; j++) {
      const val = samples[j];
      const absVal = Math.abs(val);
      if (absVal > peakAmplitude) {
        peakAmplitude = absVal;
      }
      sumSq += val * val;
    }

    const rms = Math.sqrt(sumSq / (count || 1));
    const rmsDb = rms > 0 ? 20 * Math.log10(rms) : -120;

    notes.push({
      timeSec,
      pitchHz,
      midiNote,
      noteName,
      peakAmplitude,
      rmsDb
    });
  }

  // 3. 다이내믹 분석
  const dynamics = analyzeDynamics(samples, onsetTimes, { sampleRate });

  // 4. 타이밍 분석 (글로벌 오프셋 정렬 + 연주 구간 한정)
  const gridIntervalSec = 60 / bpm / subdivisions;

  // 4-a. 최적 오프셋 산출
  const offsetSec = findBestOffset(onsetTimes, gridIntervalSec);

  // 4-b. 온셋을 보정된 좌표계로 변환 → 그리드 매핑
  const gridToOnset = new Map<number, number>();

  for (let i = 0; i < onsetTimes.length; i++) {
    const shifted = onsetTimes[i] - offsetSec;
    const gridIndex = Math.round(shifted / gridIntervalSec);
    const newDiff = Math.abs(shifted - gridIndex * gridIntervalSec);

    const existing = gridToOnset.get(gridIndex);
    if (existing === undefined) {
      gridToOnset.set(gridIndex, i);
    } else {
      const existingDiff = Math.abs(
        onsetTimes[existing] - offsetSec - gridIndex * gridIntervalSec
      );
      if (newDiff < existingDiff) {
        gridToOnset.set(gridIndex, i);
      }
    }
  }

  // 4-c. 평가 범위를 연주 구간으로 한정 (첫 매핑 ~ 마지막 매핑)
  const mappedGrids = [...gridToOnset.keys()].sort((a, b) => a - b);
  const startGrid = mappedGrids.length > 0 ? mappedGrids[0] : 0;
  const endGrid   = mappedGrids.length > 0 ? mappedGrids[mappedGrids.length - 1] : 0;

  // 4-d. 각 그리드의 편차 & 판정
  const deviationsMs: number[] = [];
  const judgments: ('perfect' | 'good' | 'early' | 'late' | 'miss')[] = [];
  const validDeviations: number[] = [];

  for (let g = startGrid; g <= endGrid; g++) {
    const onsetIdx = gridToOnset.get(g);
    if (onsetIdx !== undefined) {
      const shifted = onsetTimes[onsetIdx] - offsetSec;
      const devMs = (shifted - g * gridIntervalSec) * 1000;
      deviationsMs.push(devMs);
      validDeviations.push(devMs);

      const absDev = Math.abs(devMs);
      if (absDev <= 15)       judgments.push('perfect');
      else if (absDev <= 30)  judgments.push('good');
      else if (devMs > 30)    judgments.push('late');
      else                    judgments.push('early');
    } else {
      deviationsMs.push(0);
      judgments.push('miss');
    }
  }

  // 통계 계산
  let mappedDeviationsSum = 0;
  for (const d of validDeviations) mappedDeviationsSum += d;
  const mappedDeviationsCount = validDeviations.length;
  const meanDeviationMs = mappedDeviationsCount > 0
    ? mappedDeviationsSum / mappedDeviationsCount : 0;
  let sumSqDiff = 0;
  for (const d of validDeviations) {
    const diff = d - meanDeviationMs;
    sumSqDiff += diff * diff;
  }
  const stdDeviationMs = mappedDeviationsCount > 0
    ? Math.sqrt(sumSqDiff / mappedDeviationsCount) : 0;

  const timing: TimingResult = {
    gridIntervalSec,
    deviationsMs,
    meanDeviationMs,
    stdDeviationMs,
    judgments
  };

  // 5. 점수 계산
  // 타이밍 점수 (가중치: perfect=100, good=70, early/late=30, miss=0)
  let timingScoreSum = 0;
  for (const judgment of judgments) {
    if (judgment === 'perfect') timingScoreSum += 100;
    else if (judgment === 'good') timingScoreSum += 70;
    else if (judgment === 'early' || judgment === 'late') timingScoreSum += 30;
  }
  const timingScore = judgments.length > 0 ? timingScoreSum / judgments.length : 0;

  // 다이내믹 점수: CV가 낮을수록 높음 (CV 0 = 100점, CV 0.5 이상 = 0점)
  const dynamicsScore = Math.max(0, 100 - dynamics.coefficientOfVariation * 200);

  // 종합 점수 = 타이밍 60% + 다이내믹 40%
  const overallScore = Math.round(timingScore * 0.6 + dynamicsScore * 0.4);

  // 6. 자연어 요약 생성 (한국어)
  let summary = '';
  if (overallScore >= 90) {
    summary += '훌륭한 연주입니다! 박자와 다이내믹 모두 매우 안정적입니다.';
  } else if (overallScore >= 70) {
    summary += '전체적으로 좋은 연주입니다. 박자 편차와 다이내믹 균일성을 조금 더 가다듬어 보세요.';
  } else if (overallScore >= 50) {
    summary += '기본적인 리듬은 유지하고 있으나, 박자가 흐트러지거나 음량이 일정하지 않은 구간이 있습니다. 템포를 조금 낮춰 천천히 연습해 보세요.';
  } else {
    summary += '박자와 음량의 변동이 큽니다. 메트로놈 소리에 맞춰 더 낮은 템포에서 크로매틱 연습을 반복하는 데 집중해 보세요.';
  }

  // 박자 쏠림 피드백
  if (mappedDeviationsCount > 0) {
    if (meanDeviationMs > 12) {
      summary += ` 박자가 전체적으로 약간 밀리는(late) 경향이 있습니다 (평균 편차: +${Math.round(meanDeviationMs)}ms).`;
    } else if (meanDeviationMs < -12) {
      summary += ` 박자가 전체적으로 약간 빨라지는(early) 경향이 있습니다 (평균 편차: ${Math.round(meanDeviationMs)}ms).`;
    }
  }

  // 다이내믹 변동 피드백
  if (dynamics.coefficientOfVariation > 0.25) {
    summary += ` 음량 편차(변동계수: ${dynamics.coefficientOfVariation.toFixed(2)})가 다소 높은 편입니다. 각 피킹의 강도를 더 고르게 만들어 보세요.`;
  }
  if (dynamics.outliers.length > 0) {
    const outlierIndices = dynamics.outliers.map(o => o.index + 1);
    const countToShow = Math.min(3, outlierIndices.length);
    const indicesStr = outlierIndices.slice(0, countToShow).join('번째, ') + (outlierIndices.length > countToShow ? '번째 등' : '번째');
    summary += ` 특히 ${indicesStr} 음이 평균 볼륨에서 크게 벗어났습니다.`;
  }

  return {
    notes,
    timing,
    dynamics,
    overallScore,
    summary
  };
}
