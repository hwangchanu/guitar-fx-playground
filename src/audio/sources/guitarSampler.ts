// 샘플드 클린 일렉기타 Sampler 생성 (공유 헬퍼). 음원이 같은 샘플 셋을 쓰므로 한 곳에
// 둔다(현재 sequencerSource가 사용). 샘플 출처: FreePats clean electric guitar (CC0).
import * as Tone from 'tone'

// 매핑된 음 사이는 Sampler가 피치 시프트로 보간한다. 6음 = 표준 튜닝 개방현.
const URLS: Record<string, string> = {
  E2: 'E2.ogg',
  A2: 'A2.ogg',
  D3: 'D3.ogg',
  G3: 'G3.ogg',
  B3: 'B3.ogg',
  E4: 'E4.ogg',
}

export function createGuitarSampler(onload?: () => void): Tone.Sampler {
  return new Tone.Sampler({
    urls: URLS,
    baseUrl: '/audio/guitar/',
    release: 1,
    onload,
  })
}
