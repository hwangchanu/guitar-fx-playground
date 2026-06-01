// 순수 헬퍼: 상태로부터 실제 신호 경로에 들어갈 페달 id를 순서대로 계산한다.
// Tone 비의존 → vitest 단위 테스트 대상.
import type { PedalboardState } from '../types'

/** 바이패스되지 않은 페달의 id를, 페달보드에 놓인 순서대로 반환. */
export function computeChain(state: PedalboardState): string[] {
  return state.pedals.filter((p) => !p.bypassed).map((p) => p.id)
}
