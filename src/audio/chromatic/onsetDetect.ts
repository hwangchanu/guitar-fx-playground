// src/audio/chromatic/onsetDetect.ts
// 에너지 기반 온셋 감지 (순수 TS — Tone 비의존, vitest 대상).
// PCM 샘플에서 에너지가 급격히 상승하는 지점(피킹 순간)을 찾는다.

export interface OnsetOptions {
  sampleRate: number
  /** 에너지 계산 윈도우 크기 (샘플 수). 기본 1024. */
  windowSize?: number
  /** 홉 크기 (샘플 수). 기본 512. */
  hopSize?: number
  /** 에너지 상승 임계 배율. 직전 프레임 에너지 × threshold를 넘으면 온셋. 기본 3.0. */
  threshold?: number
  /** 두 온셋 사이 최소 간격 (초). 이중 감지 방지. 기본 0.05. */
  minIntervalSec?: number
}

/** PCM 샘플에서 온셋 시간(초) 배열을 반환. */
export function detectOnsets(samples: Float32Array, options: OnsetOptions): number[] {
  const sampleRate = options.sampleRate;
  const windowSize = options.windowSize ?? 1024;
  const hopSize = options.hopSize ?? 512;
  const threshold = options.threshold ?? 3.0;
  const minIntervalSec = options.minIntervalSec ?? 0.05;

  if (samples.length < windowSize) {
    return [];
  }

  const numFrames = Math.floor((samples.length - windowSize) / hopSize) + 1;
  const energies = new Float32Array(numFrames);

  // 1. 각 프레임의 RMS 에너지 계산
  for (let f = 0; f < numFrames; f++) {
    const start = f * hopSize;
    let sumSq = 0;
    for (let i = 0; i < windowSize; i++) {
      const val = samples[start + i];
      sumSq += val * val;
    }
    energies[f] = Math.sqrt(sumSq / windowSize);
  }

  const onsets: number[] = [];
  let lastOnsetSec = -minIntervalSec;

  // 2. 에너지의 급격한 증가 감지 (온셋)
  for (let f = 1; f < numFrames; f++) {
    const prevEnergy = energies[f - 1];
    const currEnergy = energies[f];

    // 직전 에너지가 극도로 작은 무음일 때, 노이즈 플로어를 기준으로 잡음
    const baseline = Math.max(prevEnergy, 0.002);

    // 에너지가 임계 배율 이상 증가하고, 절대적인 에너지 크기가 최소 노이즈 기준(0.005)을 넘을 때
    if (currEnergy > baseline * threshold && currEnergy > 0.005) {
      const timeSec = (f * hopSize) / sampleRate;
      if (timeSec - lastOnsetSec >= minIntervalSec) {
        onsets.push(timeSec);
        lastOnsetSec = timeSec;
      }
    }
  }

  return onsets;
}
