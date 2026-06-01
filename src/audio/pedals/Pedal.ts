// 페달 런타임 계약. `import type`라 Tone를 런타임에 로드하지 않는다(타입만 사용).
import type { ToneAudioNode } from 'tone'

/** 생성된 페달 1개의 런타임 핸들. Tone 이펙트는 보통 input===output. */
export interface PedalInstance {
  readonly input: ToneAudioNode
  readonly output: ToneAudioNode
  setParam(id: string, value: number): void
  dispose(): void
}

/** kind에 대응하는 Tone 노드를 만드는 팩토리. */
export type PedalFactory = () => PedalInstance
