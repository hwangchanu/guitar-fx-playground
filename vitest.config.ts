import { defineConfig } from 'vitest/config'

// 엔진 레이어는 순수 TS(브라우저/AudioContext 비의존)이므로 node 환경.
// Web Audio 실제 동작은 Playwright 스모크(e2e)에서 검증한다.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
