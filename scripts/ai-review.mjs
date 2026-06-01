// AI 코드 리뷰 헬퍼 (단일 출처).
// 관련 diff를 모아 헤드리스 Claude 세션에 넘기고, 리뷰는 CLAUDE.md의
// "코드 리뷰 기준" 섹션을 따르게 한다. diff 수집과 프롬프트가 여기 한 곳에만 있어
// npm 스크립트와 pre-commit 훅이 동일한 동작을 공유한다.
//
// 사용법:
//   node scripts/ai-review.mjs            # 수동: 커밋 안 된 모든 변경 + 신규 파일
//   node scripts/ai-review.mjs --staged   # pre-commit: 스테이징된 변경만 (권고용)
import { execSync, spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const staged = process.argv.includes('--staged')

const sh = (cmd) => {
  try {
    return execSync(cmd, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  } catch {
    return ''
  }
}
const ok = (cmd, args) => spawnSync(cmd, args, { stdio: 'ignore' }).status === 0

// Claude CLI가 없으면 조용히 통과 (훅이 커밋을 막지 않도록).
const whichCmd = process.platform === 'win32' ? 'where' : 'which'
if (!ok(whichCmd, ['claude'])) process.exit(0)

let diff
if (staged) {
  diff = sh('git diff --cached')
} else {
  const hasHead = ok('git', ['rev-parse', '--verify', 'HEAD'])
  diff = sh(hasHead ? 'git diff HEAD' : 'git diff')
  // 추적되지 않은 신규 파일 포함 — 이 프로젝트의 기본 확장 방식이 "새 모듈 파일
  // 추가"라, git diff만으로는 새 페달/음원 파일이 리뷰에서 누락된다.
  const untracked = sh('git ls-files --others --exclude-standard')
    .split('\n')
    .filter(Boolean)
  for (const f of untracked) {
    let body
    try {
      body = readFileSync(f, 'utf8')
    } catch {
      continue // 바이너리 등 텍스트로 못 읽는 파일은 건너뜀
    }
    diff += `\n\n===== NEW FILE: ${f} =====\n${body}`
  }
}

if (!diff.trim()) {
  console.log('리뷰할 변경 사항이 없습니다.')
  process.exit(0)
}

const prompt =
  "Review this diff strictly following the '코드 리뷰 기준' section of " +
  'CLAUDE.md (its checklist, output format, and behavior rules).'

const res = spawnSync('claude', ['-p', prompt], {
  input: diff,
  stdio: ['pipe', 'inherit', 'inherit'],
})

// 권고용(staged)에서는 리뷰 결과와 무관하게 항상 성공으로 빠져 커밋을 막지 않는다.
process.exit(staged ? 0 : res.status ?? 0)
