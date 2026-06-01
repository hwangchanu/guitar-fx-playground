import { test, expect } from '@playwright/test'

// 스캐폴드 placeholder — 브라우저를 띄우지 않는다(아직 단언할 UI 없음).
// 앱 UI 생기면 실제 스모크로 교체:
//   - 페이지 로드 → Play 클릭 → window.__engine.context.state === 'running'
//   - 페달 reorder/bypass 시 체인 길이·순서 변화 단언
test('e2e harness scaffold (no browser yet)', () => {
  expect(true).toBe(true)
})
