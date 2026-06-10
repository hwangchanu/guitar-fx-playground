// 샘플드 클린 일렉기타 음원(고정 리프 버전, 대체 모듈). 기본 앱은 sequencerSource를 쓴다.
// Sampler 생성은 guitarSampler 헬퍼와 공유. (CLAUDE.md 원칙: 미디/시퀀스 음원은 샘플드 기타)
import * as Tone from 'tone'
import type { Source } from './Source'
import { createGuitarSampler } from './guitarSampler'

// 데모용 짧은 리프(8분음표). 개방현 위주라 보간 없이도 깨끗하게 난다.
const RIFF = ['E2', 'E2', 'G3', 'E2', 'A2', 'E2', 'B3', 'G3']

export function createSamplerSource(): Source {
  let loaded = false
  let wantPlay = false
  let disposed = false

  // 현재 이 음원이 전역 트랜스포트의 유일한 사용자라 BPM을 직접 설정한다.
  // (다른 시퀀서와 공존하게 되면 소유권을 재고할 것)
  const transport = Tone.getTransport()
  transport.bpm.value = 100

  const sampler = createGuitarSampler(() => {
    if (disposed) return // 로드 전에 dispose됐으면 좀비 start 방지
    loaded = true
    // 샘플 로드 전에 Play를 눌렀다면, 로드 완료 시 곧바로 시작(무음 방지).
    if (wantPlay) transport.start()
  })

  const seq = new Tone.Sequence(
    (time, note) => {
      sampler.triggerAttackRelease(note, '8n', time)
    },
    RIFF,
    '8n',
  )
  seq.start(0)

  return {
    output: sampler,
    play() {
      if (loaded) transport.start()
      else wantPlay = true // 로드되면 onload에서 시작
    },
    stop() {
      wantPlay = false
      transport.stop()
    },
    dispose() {
      // play()가 시작한 전역 트랜스포트를 되돌리고, 지연 start도 막는다.
      disposed = true
      wantPlay = false
      transport.stop()
      seq.dispose()
      sampler.dispose()
    },
  }
}
