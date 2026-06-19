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

  // 4. 타이밍 분석 (그리드 매핑)
  const gridIntervalSec = 60 / bpm / subdivisions;
  const totalDurationSec = samples.length / sampleRate;
  const maxOnsetGrid = onsetTimes.length > 0
    ? Math.round(onsetTimes[onsetTimes.length - 1] / gridIntervalSec)
    : 0;
  const totalGrids = Math.max(
    maxOnsetGrid + 1,
    Math.floor(totalDurationSec / gridIntervalSec)
  );

  const deviationsMs: number[] = [];
  const judgments: ('perfect' | 'good' | 'early' | 'late' | 'miss')[] = [];

  // 각 그리드 인덱스에 매핑되는 가장 가까운 온셋 인덱스 찾기 (1대1 매핑)
  const gridToOnset = new Map<number, number>();
  const onsetToGrid = new Map<number, number>();

  for (let i = 0; i < onsetTimes.length; i++) {
    const timeSec = onsetTimes[i];
    const gridIndex = Math.round(timeSec / gridIntervalSec);

    // 너무 먼 곳(반 칸 이상)에 매핑되는 것을 차단할 수도 있으나,
    // 일단 가장 가까운 그리드로 매핑하고 나중에 판단
    const currentMapped = gridToOnset.get(gridIndex);
    if (currentMapped === undefined) {
      gridToOnset.set(gridIndex, i);
      onsetToGrid.set(i, gridIndex);
    } else {
      const currentMappedTime = onsetTimes[currentMapped];
      const currentDiff = Math.abs(currentMappedTime - gridIndex * gridIntervalSec);
      const newDiff = Math.abs(timeSec - gridIndex * gridIntervalSec);
      if (newDiff < currentDiff) {
        gridToOnset.set(gridIndex, i);
        onsetToGrid.set(i, gridIndex);
        onsetToGrid.delete(currentMapped);
      }
    }
  }

  let mappedDeviationsSum = 0;
  let mappedDeviationsCount = 0;
  const validDeviations: number[] = [];

  for (let g = 0; g < totalGrids; g++) {
    const onsetIdx = gridToOnset.get(g);
    if (onsetIdx !== undefined) {
      const onsetSec = onsetTimes[onsetIdx];
      const devMs = (onsetSec - g * gridIntervalSec) * 1000;
      deviationsMs.push(devMs);
      validDeviations.push(devMs);
      mappedDeviationsSum += devMs;
      mappedDeviationsCount++;

      const absDev = Math.abs(devMs);
      if (absDev <= 15) {
        judgments.push('perfect');
      } else if (absDev <= 30) {
        judgments.push('good');
      } else if (devMs > 30) {
        judgments.push('late');
      } else {
        judgments.push('early');
      }
    } else {
      // 해당 그리드에 매핑된 피킹이 없는 경우
      deviationsMs.push(0);
      judgments.push('miss');
    }
  }

  // 통계 계산
  const meanDeviationMs = mappedDeviationsCount > 0 ? mappedDeviationsSum / mappedDeviationsCount : 0;
  let sumSqDiff = 0;
  for (const dev of validDeviations) {
    const diff = dev - meanDeviationMs;
    sumSqDiff += diff * diff;
  }
  const stdDeviationMs = mappedDeviationsCount > 0 ? Math.sqrt(sumSqDiff / mappedDeviationsCount) : 0;

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
