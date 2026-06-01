// 샘플드 클린 일렉기타 음원: Tone.Sampler에 진짜 기타 DI 샘플(개방현 6음)을 싣고
// 짧은 리프를 루프 재생한다. (CLAUDE.md 원칙: 미디/시퀀스 음원은 신스가 아닌 샘플드
// 기타) 샘플 출처: FreePats clean electric guitar (CC0). public/audio/guitar/ 참조.
import * as Tone from 'tone'
import type { Source } from './Source'

// 매핑된 음 사이는 Sampler가 피치 시프트로 보간한다. 6음 = 표준 튜닝 개방현.
const URLS: Record<string, string> = {
  E2: 'E2.ogg',
  A2: 'A2.ogg',
  D3: 'D3.ogg',
  G3: 'G3.ogg',
  B3: 'B3.ogg',
  E4: 'E4.ogg',
}

// 데모용 짧은 리프(8분음표). 개방현 위주라 보간 없이도 깨끗하게 난다.
const RIFF = ['E2', 'E2', 'G3', 'E2', 'A2', 'E2', 'B3', 'G3']

export function createSamplerSource(): Source {
  const sampler = new Tone.Sampler({
    urls: URLS,
    baseUrl: '/audio/guitar/',
    release: 1,
  })

  const transport = Tone.getTransport()
  transport.bpm.value = 100

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
      transport.start()
    },
    stop() {
      transport.stop()
    },
    dispose() {
      seq.dispose()
      sampler.dispose()
    },
  }
}
