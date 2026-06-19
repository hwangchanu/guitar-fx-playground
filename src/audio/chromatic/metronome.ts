// src/audio/chromatic/metronome.ts
// 메트로놈 엔진. 크로매틱 연습용 클릭 트랙 재생.
// Tone.Loop로 정밀한 오디오 스케줄링. Transport.bpm을 건드리지 않고
// Loop의 interval을 초 단위(number)로 직접 설정하여 독립적으로 작동.

import * as Tone from 'tone'

export interface MetronomeConfig {
  bpm: number          // 40–240
  beats: number        // 박자 수 (기본 4 = 4/4)
  countIn: number      // 카운트인 마디 수 (기본 1)
}

export interface Metronome {
  /** 카운트인 후 본 재생 시작. onCountInEnd 콜백으로 카운트인 완료를 알린다. */
  start(onCountInEnd: () => void): Promise<void>
  stop(): void
  setBpm(bpm: number): void
  setBeats(beats: number): void
  setCountIn(bars: number): void
  /** 현재 재생 중 박자 위치 (0-based). 정지 시 -1. UI 플레이헤드용. */
  getCurrentBeat(): number
  isPlaying(): boolean
  dispose(): void
}

export function createMetronome(config: MetronomeConfig): Metronome {
  let bpm = config.bpm
  let beats = config.beats
  let countIn = config.countIn

  let currentBeat = -1
  let playing = false
  let totalClicks = 0
  let countInEndCalled = false
  let onCountInEndCallback: (() => void) | null = null

  // 클릭 소리용 짧은 사인파 Synth 생성
  const synth = new Tone.Synth({
    oscillator: { type: 'sine' },
    envelope: {
      attack: 0.001,
      decay: 0.05,
      sustain: 0,
      release: 0.01,
    },
  }).toDestination()

  // Loop의 interval을 초 단위(number)로 설정 (Transport.bpm 영향 받지 않음)
  const loop = new Tone.Loop((time) => {
    // 880Hz 균일 피치 클릭
    synth.triggerAttackRelease(880, '0.02', time)

    totalClicks++
    const totalCountInClicks = countIn * beats

    if (totalClicks > totalCountInClicks) {
      // 본 재생 단계 (카운트인 끝)
      const practiceClicks = totalClicks - totalCountInClicks - 1
      const beat = practiceClicks % beats

      Tone.getDraw().schedule(() => {
        if (playing) {
          currentBeat = beat
        }
      }, time)

      if (!countInEndCalled && onCountInEndCallback) {
        countInEndCalled = true
        Tone.getDraw().schedule(() => {
          onCountInEndCallback?.()
        }, time)
      }
    } else {
      // 카운트인 단계 클릭: 남은 카운트인 클릭 수를 음수로 반환 (예: -4, -3, -2, -1)
      const countdown = -(totalCountInClicks - totalClicks + 1)
      Tone.getDraw().schedule(() => {
        if (playing) {
          currentBeat = countdown
        }
      }, time)
    }
  }, 60 / bpm)

  return {
    async start(onCountInEnd) {
      await Tone.start()
      playing = true
      totalClicks = 0
      countInEndCalled = false
      onCountInEndCallback = onCountInEnd
      currentBeat = -1

      loop.interval = 60 / bpm
      loop.start(0)
      
      // Tone.Loop를 작동시키려면 Transport가 시작 상태여야 함
      Tone.getTransport().start()
    },
    stop() {
      playing = false
      loop.stop()
      Tone.getTransport().stop()
      currentBeat = -1
      totalClicks = 0
      countInEndCalled = false
      onCountInEndCallback = null
    },
    setBpm(newBpm) {
      bpm = newBpm
      loop.interval = 60 / bpm
    },
    setBeats(newBeats) {
      beats = newBeats
    },
    setCountIn(bars) {
      countIn = bars
    },
    getCurrentBeat() {
      return currentBeat
    },
    isPlaying() {
      return playing
    },
    dispose() {
      playing = false
      loop.dispose()
      synth.dispose()
      currentBeat = -1
    }
  }
}
