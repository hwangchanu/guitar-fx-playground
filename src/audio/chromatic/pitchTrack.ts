// src/audio/chromatic/pitchTrack.ts
// Autocorrelation 기반 피치 추적 (순수 TS — Tone 비의존, vitest 대상).
// 온셋 직후의 짧은 윈도우에서 기본 주파수를 추정한다.

export interface PitchOptions {
  sampleRate: number
  /** 분석 윈도우 크기 (샘플 수). 기본 2048. 저음(E2=82Hz)을 잡으려면 최소 ~1200 샘플 필요. */
  windowSize?: number
  /** 온셋 이후 분석 시작까지의 오프셋 (샘플 수). 어택 트랜지언트를 건너뛰기 위해. 기본 256. */
  offsetSamples?: number
  /** 추정 주파수 허용 범위 (Hz). [minHz, maxHz]. 기본 [60, 1400] (E2~F6). */
  freqRange?: [number, number]
}

export interface PitchEstimate {
  hz: number      // 추정 주파수
  confidence: number  // 0..1. 자기상관 피크의 뚜렷함.
}

/**
 * samples의 startSample 지점에서 피치를 추정한다.
 * confidence가 낮으면 null (노이즈/무조음).
 */
export function estimatePitch(
  samples: Float32Array,
  startSample: number,
  options: PitchOptions,
): PitchEstimate | null {
  const sampleRate = options.sampleRate;
  const windowSize = options.windowSize ?? 2048;
  const offsetSamples = options.offsetSamples ?? 256;
  const [minHz, maxHz] = options.freqRange ?? [60, 1400];

  const offsetStart = startSample + offsetSamples;
  if (offsetStart >= samples.length) {
    return null;
  }

  const actualWindowSize = Math.min(windowSize, samples.length - offsetStart);
  if (actualWindowSize < 128) {
    return null;
  }

  // 1. 신호의 에너지 r0 계산
  let r0 = 0;
  for (let i = 0; i < actualWindowSize; i++) {
    const val = samples[offsetStart + i];
    r0 += val * val;
  }

  if (r0 < 1e-4) {
    return null; // 신호가 너무 약함
  }

  // lag(tau) 범위 계산
  const minTau = Math.max(1, Math.floor(sampleRate / maxHz));
  const maxTau = Math.min(actualWindowSize - 2, Math.ceil(sampleRate / minHz));

  if (minTau >= maxTau) {
    return null;
  }

  // 2. 각 lag(tau)에 대해 자기상관 r(tau) 계산
  // r 배열 크기는 maxTau + 2 로 지정하여 넉넉히 확보
  const r = new Float32Array(maxTau + 2);
  for (let tau = minTau - 1; tau <= maxTau + 1; tau++) {
    let sum = 0;
    // 경계 초과 방지
    const limit = actualWindowSize - tau;
    for (let i = 0; i < limit; i++) {
      sum += samples[offsetStart + i] * samples[offsetStart + i + tau];
    }
    r[tau] = sum;
  }

  // 3. 피크 찾기 (Local Maxima)
  const peaks: { tau: number; val: number }[] = [];
  for (let tau = minTau; tau <= maxTau; tau++) {
    if (r[tau] > r[tau - 1] && r[tau] > r[tau + 1]) {
      peaks.push({ tau, val: r[tau] });
    }
  }

  if (peaks.length === 0) {
    return null;
  }

  // 최댓값 피크 찾기
  let maxPeakVal = -Infinity;
  for (const p of peaks) {
    if (p.val > maxPeakVal) {
      maxPeakVal = p.val;
    }
  }

  // 전체 최대 피크의 90% 이상 강도를 지닌 첫 번째 피크(가장 작은 tau) 선택
  const thresholdVal = maxPeakVal * 0.9;
  const bestPeak = peaks.find(p => p.val >= thresholdVal);
  if (!bestPeak) {
    return null;
  }

  const bestTau = bestPeak.tau;
  
  // 4. 포물선 보간 (Parabolic Interpolation)
  const alpha = r[bestTau - 1];
  const beta = r[bestTau];
  const gamma = r[bestTau + 1];
  
  const denom = alpha - 2 * beta + gamma;
  const p = denom !== 0 ? 0.5 * (alpha - gamma) / denom : 0;
  const interpolatedTau = bestTau + p;

  const hz = sampleRate / interpolatedTau;
  
  // confidence는 r(tau) 피크 값 / r(0)
  const confidence = beta / r0;

  if (confidence < 0.5 || hz < minHz || hz > maxHz) {
    return null;
  }

  return { hz, confidence };
}

/** Hz → MIDI 노트 번호 (반올림). */
export function hzToMidi(hz: number): number {
  return Math.round(12 * Math.log2(hz / 440) + 69);
}

/** MIDI 노트 번호 → 노트 이름 (예: 60 → "C4"). */
export function midiToName(midi: number): string {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const noteIndex = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return notes[noteIndex] + octave;
}

/** Hz → cent 편차 (가장 가까운 반음 기준, -50..+50). */
export function hzToCentDeviation(hz: number): number {
  const midi = hzToMidi(hz);
  const targetHz = 440 * Math.pow(2, (midi - 69) / 12);
  const deviation = 1200 * Math.log2(hz / targetHz);
  return deviation;
}
