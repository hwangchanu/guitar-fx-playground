// 테스트/품질 체크 하네스 (단일 출처).
// 선언적 체크 레지스트리를 단계(stage)별로 실행하고, blocking 체크가 하나라도
// 실패하면 비정상 종료한다(advisory 실패는 종료코드에 반영하지 않음).
//
// 체크 추가 = 아래 CHECKS 배열에 항목 한 줄. (페달 레지스트리와 동일 패턴)
//
// 사용법:
//   node scripts/harness.mjs --stage pre-commit   # 빠른 게이트 (훅이 호출)
//   node scripts/harness.mjs --stage pre-push      # + build + e2e
//   node scripts/harness.mjs --stage ci            # 전체
import { spawnSync } from 'node:child_process'

const argIdx = process.argv.indexOf('--stage')
const stage = argIdx >= 0 ? process.argv[argIdx + 1] : 'ci'

const run = (cmd, args) => {
  const res = spawnSync(cmd, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32', // Windows에서 npx/node 해석
  })
  // spawn 자체 실패(명령 미존재 등, status === null)는 조용히 넘기지 않고 표면화.
  if (res.error) console.error(`실행 실패: ${cmd} — ${res.error.message}`)
  return res.status ?? 1
}

// blocking: 실패 시 커밋/푸시 차단. advisory(false): 출력만 하고 통과.
// stages: 이 체크가 도는 단계 집합.
const CHECKS = [
  { id: 'typecheck', label: 'TypeScript', blocking: true,
    stages: ['pre-commit', 'pre-push', 'ci'], run: () => run('npx', ['tsc', '-b']) },
  { id: 'lint', label: 'ESLint', blocking: true,
    stages: ['pre-commit', 'pre-push', 'ci'], run: () => run('npx', ['eslint', '.']) },
  { id: 'unit', label: 'Unit (vitest)', blocking: true,
    stages: ['pre-commit', 'pre-push', 'ci'], run: () => run('npx', ['vitest', 'run']) },
  { id: 'ai-review', label: 'AI review', blocking: false,
    stages: ['pre-commit'], run: () => run('node', ['scripts/ai-review.mjs', '--staged']) },
  { id: 'build', label: 'Build', blocking: true,
    stages: ['pre-push', 'ci'], run: () => run('npx', ['vite', 'build']) },
  { id: 'e2e', label: 'E2E (playwright)', blocking: true,
    stages: ['pre-push', 'ci'], run: () => run('npx', ['playwright', 'test']) },
]

const selected = CHECKS.filter((c) => c.stages.includes(stage))
if (selected.length === 0) {
  console.log(`알 수 없는 단계 "${stage}". (pre-commit | pre-push | ci)`)
  process.exit(1)
}

console.log(`\n▶ stage: ${stage} — ${selected.length}개 체크 실행\n`)
const results = []
for (const c of selected) {
  console.log(`\n──── ${c.label}${c.blocking ? '' : ' (advisory)'} ────`)
  const code = c.run()
  results.push({ ...c, passed: code === 0, code })
}

console.log('\n════ 요약 ════')
for (const r of results) {
  const mark = r.passed ? '✓' : r.blocking ? '✗' : '⚠'
  const note = r.passed ? '' : r.blocking ? ` (exit ${r.code})` : ` (exit ${r.code}, 권고 — 무시)`
  console.log(`${mark} ${r.label}${note}`)
}

const blockingFailed = results.some((r) => r.blocking && !r.passed)
if (blockingFailed) console.log('\n❌ blocking 체크 실패 — 중단합니다.')
else console.log('\n✅ 통과.')
process.exit(blockingFailed ? 1 : 0)
