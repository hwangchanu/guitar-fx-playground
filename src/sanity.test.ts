import { describe, it, expect } from 'vitest'

// 하네스 가동 확인용 placeholder. 엔진 구현 시 computeChain/registry/reducer
// 단위 테스트로 대체·확장한다.
describe('harness sanity', () => {
  it('runs unit tests', () => {
    expect(1 + 1).toBe(2)
  })
})
