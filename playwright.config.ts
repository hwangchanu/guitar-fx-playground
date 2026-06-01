import { defineConfig } from '@playwright/test'

// 스캐폴드 단계. 앱 UI가 생기면 webServer(예: `npm run preview`)와 baseURL을
// 활성화하고, 실제 스모크(앱 로드 → Play → 오디오 그래프 상태 단언)를 추가한다.
// 그 시점에 `npx playwright install chromium`으로 브라우저 바이너리를 받는다.
export default defineConfig({
  testDir: './e2e',
  // webServer: { command: 'npm run preview', url: 'http://localhost:4173', reuseExistingServer: true },
  // use: { baseURL: 'http://localhost:4173' },
})
