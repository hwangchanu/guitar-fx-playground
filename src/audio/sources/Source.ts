// 음원 모듈 계약. 엔진은 이 인터페이스만 알면 되고, 구현(루프/미디 등)은 교체 가능.
import type { ToneAudioNode } from 'tone'

export interface Source {
  readonly output: ToneAudioNode
  play(): void
  stop(): void
  dispose(): void
}
