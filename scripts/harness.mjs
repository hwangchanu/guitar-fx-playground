// 테스트/품질 체크 하네스 (단일 출처).
// 선언적 체크 레지스트리를 단계(stage)별로 실행한다.
// - blocking 체크가 하나라도 실패하면 비정상 종료(커밋/푸시 차단).
// - AI 리뷰는 advisory(차단 안 함). blocking 체크가 실패하면 그 체크의 출력 로그를
//   받아 코드리뷰와 함께 실패 원인을 해설한다.
//
// 체크 추가 = 아래 CHECKS 배열에 항목 한 줄. (페달 레지스트리와 동일 패턴)
//
// 사용법:
//   node scripts/harness.mjs --stage pre-commit   # 빠른 게이트 (훅이 호출)
//   node scripts/harness.mjs --stage pre-push      # + build + e2e
//   node scripts/harness.mjs --stage ci            # 전체
import { spawn, spawnSync } from 'node:child_process'

const WIN = process.platform === 'win32'
const ANSI = new RegExp(String.fromCharCode(27) + '\\[[0-9;]*m', 'g')
const stripAnsi = (s) => s.replace(ANSI, '')

const argIdx = process.argv.indexOf('--stage')
const stage = argIdx >= 0 ? process.argv[argIdx + 1] : 'ci'

// 명령 실행: 출력을 화면에 그대로 보여주면서(tee) 동시에 캡처한다.
function run(cmd, args) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { shell: WIN }) // Windows에서 npx 해석
    let output = ''
    const tee = (src, dst) =>
      src?.on('data', (chunk) => {
        dst.write(chunk) // 실시간 표시
        output += chunk // 캡처
      })
    tee(child.stdout, process.stdout)
    tee(child.stderr, process.stderr)
    child.on('error', (err) => {
      process.stderr.write(`실행 실패: ${cmd} — ${err.message}\n`)
      resolve({ code: 1, output: `${output}\n실행 실패: ${err.message}` })
    })
    child.on('close', (code) => resolve({ code: code ?? 1, output }))
  })
}

// AI 리뷰(advisory): staged diff를 CLAUDE.md 기준으로 리뷰. blocking 실패 로그가
// 있으면 ai-review.mjs에 stdin으로 넘겨 리뷰와 함께 원인을 해설하게 한다.
function runAiReview(failures) {
  const hasFailures = failures.length > 0
  const args = ['scripts/ai-review.mjs', '--staged']
  if (hasFailures) args.push('--with-failures')
  const input = hasFailures
    ? failures.map((f) => `# 실패한 체크: ${f.label}\n${f.output}`).join('\n\n')
    : undefined
  const res = spawnSync('node', args, {
    input,
    stdio: [hasFailures ? 'pipe' : 'ignore', 'inherit', 'inherit'],
  })
  return res.status ?? 0 // advisory — 종료코드는 게이팅에 반영 안 됨
}

// blocking: 실패 시 커밋/푸시 차단. advisory(false): 출력만.
// stages: 이 체크가 도는 단계. (AI 리뷰는 stage 내에서 항상 마지막에 두어
//          앞선 blocking 실패 로그를 받을 수 있게 한다)
const CHECKS = [
  { id: 'typecheck', label: 'TypeScript', blocking: true,
    stages: ['pre-commit', 'pre-push', 'ci'], run: () => run('npx', ['tsc', '-b']) },
  { id: 'lint', label: 'ESLint', blocking: true,
    stages: ['pre-commit', 'pre-push', 'ci'], run: () => run('npx', ['eslint', '.']) },
  { id: 'unit', label: 'Unit (vitest)', blocking: true,
    stages: ['pre-commit', 'pre-push', 'ci'], run: () => run('npx', ['vitest', 'run']) },
  { id: 'ai-review', label: 'AI review', blocking: false,
    stages: ['pre-commit'], run: (ctx) => runAiReview(ctx.failures) },
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
const ctx = { failures: [] } // 지금까지 실패한 blocking 체크 {label, output}
const results = []
for (const c of selected) {
  console.log(`\n──── ${c.label}${c.blocking ? '' : ' (advisory)'} ────`)
  const r = await c.run(ctx)
  const code = typeof r === 'number' ? r : r.code
  const output = typeof r === 'number' ? '' : (r.output ?? '')
  const passed = code === 0
  results.push({ label: c.label, blocking: c.blocking, passed, code })
  if (c.blocking && !passed) {
    ctx.failures.push({ label: c.label, output: stripAnsi(output) })
  }
}

console.log('\n════ 요약 ════')
for (const r of results) {
  const mark = r.passed ? '✓' : r.blocking ? '✗' : '⚠'
  const note = r.passed ? '' : r.blocking ? ` (exit ${r.code})` : ` (exit ${r.code}, 권고 — 무시)`
  console.log(`${mark} ${r.label}${note}`)
}

const blockingFailed = results.some((r) => r.blocking && !r.passed)
console.log(blockingFailed ? '\n❌ blocking 체크 실패 — 중단합니다.' : '\n✅ 통과.')
process.exit(blockingFailed ? 1 : 0)
