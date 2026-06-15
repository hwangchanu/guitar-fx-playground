// npm install 시(prepare) git 훅 경로를 자동 설정한다 → 클론한 사람이 수동 설정
// 없이도 pre-commit/pre-push 하네스가 켜진다. git 레포가 아니거나 git이 없으면 조용히 통과.
import { execSync } from 'node:child_process'

try {
  execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' })
  execSync('git config core.hooksPath hooks', { stdio: 'ignore' })
  console.log('✓ git hooksPath → hooks/ (pre-commit·pre-push 하네스 활성화)')
} catch {
  // git 미설치 / 레포 아님 / 의존성으로 설치된 경우 — 무시
}
