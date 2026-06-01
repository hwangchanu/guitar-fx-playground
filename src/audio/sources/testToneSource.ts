// DEV 전용 스탠드인 음원: DI 루프 파일이 없을 때 신호 체인 배선을 귀로 검증하기 위함.
// 항상 도는 오실레이터를 게인으로 뮤트/언뮤트해 play/stop의 재시작 문제를 피한다.
// 주의: 이건 기타가 아니라 합성음이므로 "샘플드 기타" 원칙의 예외(개발용). 실제
// 1단계 음원은 createLoopSource로 교체한다.
import * as Tone from 'tone'
import type { Source } from './Source'

export function createTestToneSource(): Source {
  const osc = new Tone.Oscillator({ frequency: 110, type: 'sawtooth' }).start()
  const gain = new Tone.Gain(0) // 뮤트 상태로 시작
  osc.connect(gain)
  return {
    output: gain,
    play() {
      gain.gain.rampTo(0.15, 0.02)
    },
    stop() {
      gain.gain.rampTo(0, 0.02)
    },
    dispose() {
      osc.stop()
      osc.dispose()
      gain.dispose()
    },
  }
}
