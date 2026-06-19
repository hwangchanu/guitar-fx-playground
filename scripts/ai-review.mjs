// AI 코드 리뷰 헬퍼 (단일 출처).
// 관련 diff를 모아 헤드리스 Claude 세션에 넘기고, 리뷰는 CLAUDE.md의
// "코드 리뷰 기준" 섹션을 따르게 한다. diff 수집과 프롬프트가 여기 한 곳에만 있어
// npm 스크립트와 pre-commit 훅이 동일한 동작을 공유한다.
//
// 사용법:
//   node scripts/ai-review.mjs            # 수동: 커밋 안 된 모든 변경 + 신규 파일
//   node scripts/ai-review.mjs --staged   # pre-commit: 스테이징된 변경만 (권고용)
//   node scripts/ai-review.mjs --staged --with-failures
//       # 하네스가 blocking 체크 실패 로그를 stdin으로 넘겨주면, 리뷰와 함께
//       # 그 실패의 원인·위치·수정안을 해설한다.
import { execSync, spawnSync } from 'node:child_process'
import { readFileSync, existsSync, writeFileSync, unlinkSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const staged = process.argv.includes('--staged')
const withFailures = process.argv.includes('--with-failures')

// 실패 로그는 --with-failures일 때만 stdin에서 읽는다(없을 때 읽으면 hang되므로).
let failureLog = ''
if (withFailures) {
  try {
    failureLog = readFileSync(0, 'utf8') // fd 0 = stdin
  } catch {
    failureLog = ''
  }
}

const sh = (cmd) => {
  try {
    return execSync(cmd, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  } catch {
    return ''
  }
}
const ok = (cmd, args) => spawnSync(cmd, args, { stdio: 'ignore' }).status === 0

// Antigravity CLI (agy) 존재 여부 및 실행 방식 결정 (Windows에서 WSL agy 호출 지원)
const agyPath = '/home/chano/.local/bin/agy'
let agyCmd = ''
let useWsl = false

if (process.platform === 'win32') {
  if (ok('where', ['agy'])) {
    agyCmd = 'agy'
  } else if (ok('wsl', ['test', '-x', agyPath])) {
    agyCmd = agyPath
    useWsl = true
  }
} else {
  if (existsSync(agyPath)) {
    agyCmd = agyPath
  } else if (ok('which', ['agy'])) {
    agyCmd = 'agy'
  }
}

if (!agyCmd) {
  console.log('Antigravity CLI (agy)가 설치되어 있지 않아 리뷰를 건너뜁니다.')
  process.exit(0)
}

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
    let buf
    try {
      buf = readFileSync(f)
    } catch {
      continue
    }
    // 바이너리(오디오 샘플·이미지 등)는 건너뛴다 — utf8 디코딩은 throw하지 않고
    // 깨진 문자로 통째로 덤프되므로 NUL 바이트 유무로 명시적으로 감지한다.
    if (buf.includes(0)) continue
    diff += `\n\n===== NEW FILE: ${f} =====\n${buf.toString('utf8')}`
  }
}

if (!diff.trim() && !failureLog.trim()) {
  console.log('리뷰할 변경 사항이 없습니다.')
  process.exit(0)
}

let prompt =
  "Review this diff strictly following the '코드 리뷰 기준' section of " +
  'CLAUDE.md (its checklist, output format, and behavior rules).'

let input = ''
if (failureLog.trim()) {
  // blocking 체크가 실패한 상태 — 로그를 함께 주고 원인 해설을 요청한다.
  input += `===== FAILED CHECK LOGS =====\n${failureLog}\n\n`
  prompt +=
    ' Additionally, one or more deterministic checks FAILED — their logs are' +
    ' included above the diff. For each failure, diagnose the root cause,' +
    ' point to the exact file:line, and suggest a concrete fix (in Korean).'
}
input += `===== DIFF =====\n${diff || '(스테이징된 변경 없음)'}`

let cmd = agyCmd
let args = ['-p', prompt, '--model', 'Gemini 3.5 Flash (High)', '--dangerously-skip-permissions']

let tmpFile = null

if (useWsl) {
  // 1. diff 길이가 Windows의 커맨드라인 길이 제한(32KB)을 넘을 수 있으므로 파일로 전달
  const fullPrompt = prompt + '\n' + input
  tmpFile = path.join(os.tmpdir(), `agy-prompt-${Date.now()}.txt`)
  writeFileSync(tmpFile, fullPrompt)
  
  // Windows 경로를 WSL 경로로 변환 (예: C:\... -> /mnt/c/...)
  const wslTmpFile = tmpFile.replace(/^[a-zA-Z]:/, (match) => `/mnt/${match[0].toLowerCase()}`).replace(/\\/g, '/')
  const safeWslTmpFile = "'" + wslTmpFile.replace(/'/g, "'\\''") + "'"

  // 2. Antigravity Lab의 non-TTY 우회 방식 적용 (가짜 PTY 생성 + 무프롬프트 + 타임아웃)
  const innerCmd = `${agyCmd} -p "$(cat ${safeWslTmpFile})" --model "Gemini 3.5 Flash (High)" --dangerously-skip-permissions < /dev/null`
  
  cmd = 'wsl'
  args = [
    'timeout', '--signal=TERM', '--kill-after=15', '600',
    'script', '-qec', innerCmd, '/dev/null'
  ]
  input = '' // 표준 입력 대신 파일로 넘겼으므로 비움
}

const res = spawnSync(cmd, args, {
  input,
  stdio: ['pipe', 'inherit', 'inherit'],
})

if (tmpFile) {
  try { unlinkSync(tmpFile) } catch (e) {}
}

// 권고용(staged)에서는 리뷰 결과와 무관하게 항상 성공으로 빠져 커밋을 막지 않는다.
if (staged) process.exit(0)

// 수동 모드: spawn 자체가 실패하면(status === null) 조용히 "성공"하지 않고 표면화.
if (res.error) {
  console.error(`리뷰 실행 실패: ${res.error.message}`)
  process.exit(1)
}
process.exit(res.status ?? 1)
