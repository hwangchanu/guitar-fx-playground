# CLAUDE.md

## 프로젝트

기타 이펙터 초보자를 위한 웹 체험 사이트. 사용자가 여러 페달을 드래그로 자유롭게
엮고, 순서를 바꿔가며 소리 차이를 직접 듣고, 옆 패널의 설명으로 "왜 그런지"를
배우는 교육용 플레이그라운드.

## 핵심 원칙 (어기면 프로젝트가 무너지는 것들)

- **오디오 엔진 레이어와 UI 레이어를 분리한다.**
  - 오디오 엔진 = Tone.js 그래프를 만들고 관리하는 순수 TS 모듈(음원 모듈, 페달
    노드, 체인 순서, 바이패스). React 의존성 없음.
  - UI 레이어 = React 컴포넌트(주로 Figma 디자인 기반). 얇은 hook/store로 엔진을
    호출만 한다.
  - 이유: Figma로 UI를 새로 뽑거나 재디자인해도 오디오 로직은 건드리지 않기 위함.
- **오디오 그래프 구조는 항상 [음원 모듈] → [페달 체인] → [출력].**
  음원과 페달 체인은 분리(decouple)한다. 음원은 갈아끼우는 모듈일 뿐이고,
  페달 체인/UI/설명 로직은 음원 종류와 무관하게 동작해야 한다.
- **미디/시퀀스 음원은 반드시 샘플드 클린 일렉기타(Tone.Sampler 등)를 쓴다.**
  오실레이터 신스 금지 — 디스토션을 걸면 기타가 아니라 전자음이 난다.
- **실시간 기타 입력(getUserMedia)을 기본 경로로 만들지 않는다.** (지연 문제)
  기본 음원은 프리셋 루프/샘플. 실시간 입력은 인터페이스 보유자용 옵션. 크로매틱 연습 탭에서 getUserMedia는 녹음 전용 옵션으로만 사용하며, 실시간 오디오 처리 경로로 연결하지 않고 녹음 완료 후 오프라인으로 분석한다.
- **타깃은 이펙터 "초보자".** 기본 경험은 원클릭으로 즉시 소리가 나야 한다.
  미디 찍기 등 복잡한 기능은 옵션 깊이로만 얹는다.
- **설명 패널은 핵심 기능이다.** 페달별 설명 + "체인 순서가 왜 중요한가"가
  이 사이트의 차별점. 장식 취급 금지.

## 아키텍처

- **백엔드 없음. 순수 프론트엔드(정적 SPA).** 모든 오디오 처리는 Web Audio API로
  브라우저에서 수행. 콘텐츠(페달 정의·설명)는 레포 내 정적 데이터(JSON/MDX).
- 페달보드 공유는 서버 대신 체인 상태를 URL에 인코딩하는 방식으로.
- BE는 회원가입/서버 저장/결제 같은 기능이 실제로 필요해질 때만 도입(그때도 우선
  Supabase/Firebase 같은 BaaS 고려). 지금은 도입 안 함.

## 기술 스택

- 빌드/프레임워크: **Vite + React + TypeScript**
- 오디오: **Tone.js** (Web Audio 추상화)
- 페달 드래그/순서변경: **dnd-kit**
- 스타일: **Tailwind CSS** (Figma→코드 변환 친화)
- 상태관리: 작게 시작, 필요해지면 **Zustand**
- 배포: 정적 호스팅 (Vercel / Netlify / Cloudflare Pages)
- 페달 = Web Audio 기본 노드 매핑 (WaveShaper=드라이브, Delay, Convolver=리버브,
  Biquad=EQ/와우, DynamicsCompressor=컴프 등)

## 개발 단계

- **1단계 (현재):** 프리셋 리프 재생 → 페달 체인(오버드라이브/딜레이/리버브)
  → 드래그 순서변경 + 바이패스 + 설명 패널. ← 컨셉 검증이 목표.
- **검증 게이트:** "순서 바꾸기 + 듣기 + 설명 읽기" 루프가 실제로 먹히는지 확인한
  뒤에 2단계로 진행.
- **2단계 (검증 후):** "미디 찍기" 모드를 옵션으로 추가. 음원 모듈만 시퀀서+샘플러로
  교체하고, 페달 체인은 그대로 재사용.
- **3단계:** 크로매틱 연습 탭. 자체 메트로놈(Tone.Loop) + 브라우저 마이크 녹음(MediaRecorder) / 파일 업로드 + 오프라인 분석(타이밍·피치·다이내믹) 오케스트레이터.

## Figma 워크플로우

- 실제 UI는 Figma로 디자인 후 React 컴포넌트로 옮긴다.
- UI를 재생성/재디자인할 때 오디오 엔진 레이어는 절대 건드리지 않는다(위 원칙).

## 명령어

- `npm run dev` — 개발 서버 (HMR)
- `npm run build` — 타입체크 + 프로덕션 빌드 (`tsc -b && vite build`)
- `npm run preview` — 빌드 결과 로컬 미리보기
- `npm run lint` — ESLint
- `npm run test` — 단위 테스트 (vitest, 1회 실행) / `npm run test:watch` — 워치
- `npm run e2e` — Playwright 스모크 테스트
- `npm run check` — 체크 하네스 전체 실행 (CI 단계)
- `npm run review` — 현재 변경(diff)을 코드 리뷰 기준으로 헤드리스 리뷰

## 폴더 구조 (시작 시점)

- `src/` — React 앱. (오디오 엔진 레이어와 UI 컴포넌트를 하위 폴더로 분리 예정)
  - `src/audio/chromatic/` — 크로매틱 연습 탭의 오디오 엔진 (메트로놈, 녹음, 분석). 분석 모듈은 순수 TS
  - 단위 테스트는 `src/**/*.test.ts`로 co-locate
- `public/` — 정적 자산 (DI 루프/기타 샘플 등은 여기 또는 CDN)
- `e2e/` — Playwright 스모크 테스트 (`*.spec.ts`)
- `hooks/` — git 훅. `pre-commit`·`pre-push`가 체크 하네스를 호출
- `scripts/` — 개발용 스크립트
  - `harness.mjs` — 체크 하네스(레지스트리 + 러너, 단일 출처)
  - `ai-review.mjs` — 코드 리뷰 diff 수집 + 실행 (하네스의 advisory 체크)
- `vitest.config.ts` / `playwright.config.ts` — 테스트 설정
- 스타일: Tailwind CSS v4 (`@tailwindcss/vite` 플러그인, `src/index.css`에서
  `@import "tailwindcss";`)
- 주요 의존성: `tone`(오디오), `@dnd-kit/*`(페달 드래그·순서변경)

## 테스트 / 체크 하네스

품질 체크는 `scripts/harness.mjs`의 **선언적 레지스트리**(`CHECKS` 배열)에 모여 있다.
각 체크 = `{ id, label, run, blocking, stages }`. **체크 추가 = 항목 한 줄**(페달
레지스트리와 동일 패턴).

- 단계(stage)별 실행: `node scripts/harness.mjs --stage <pre-commit|pre-push|ci>`
- 게이팅(하이브리드): `blocking: true` 체크가 하나라도 실패하면 비정상 종료(커밋/푸시
  차단). `blocking: false`(예: AI 리뷰)는 출력만 하고 종료코드에 반영하지 않음.
- 실패 해설: 하네스는 각 체크 출력을 화면에 보여주며 동시에 캡처(tee)한다. blocking
  체크가 실패하면 그 로그를 AI 리뷰 단계(stage 내 마지막)에 stdin으로 넘겨, AI가
  코드리뷰와 함께 **실패 원인·`파일:줄`·수정안**을 해설한다. 초록불이면 넘길 로그가
  없어 순수 코드리뷰만 한다. (해설은 여전히 advisory — 차단은 결정적 체크가 한다)

| 체크 | blocking | pre-commit | pre-push / ci |
| ------ | :--: | :--: | :--: |
| typecheck (`tsc -b`) | ✅ | ✅ | ✅ |
| lint (`eslint`) | ✅ | ✅ | ✅ |
| unit (`vitest`) | ✅ | ✅ | ✅ |
| ai-review | ❌(권고) | ✅ | — |
| build (`vite build`) | ✅ | — | ✅ |
| e2e (`playwright`) | ✅ | — | ✅ |

빠른 체크는 커밋마다(`hooks/pre-commit`), 느린 build·e2e는 푸시 때(`hooks/pre-push`).
끄기: `git config --unset core.hooksPath`.

GitHub에서도 `.github/workflows/ci.yml`이 push/PR마다 `--stage ci`(typecheck·lint·
unit·build·e2e)를 깨끗한 환경에서 실행한다 — 로컬 훅(우회 가능)과 달리 우회 불가 게이트.

**테스트 대상 분리**: vitest는 순수 TS만(엔진의 `computeChain`/registry/reducer 등,
AudioContext 비의존). Tone.js 실제 동작은 Playwright 스모크에서 `window.__engine`
그래프 상태로 검증한다(실제 소리는 단언하지 않음).

## 코드 리뷰 기준

이 섹션은 코드 리뷰의 **단일 출처(single source of truth)** 다. `npm run review`와
`hooks/pre-commit`의 프롬프트는 모두 "이 섹션대로 리뷰하라"고만 지시하므로, 리뷰
방식을 바꾸려면 여기만 수정하면 된다.

리뷰 시 이 프로젝트 맥락에서 다음을 우선 확인한다:

- **레이어 분리** — 오디오 엔진 레이어와 UI 레이어가 섞이지 않았는가. UI 컴포넌트가
  Tone.js를 직접 만지지 않고 엔진 API/훅을 통해서만 접근하는가.
- **확장성** — 새 페달/음원을 추가할 때 기존 코드 수정 없이 모듈만 추가하면 되는
  구조인가. 하드코딩·강결합·스위치문 분기 남발이 없는가.
- **Tone.js 노드 수명** — 오디오 노드가 React 렌더마다 재생성되지 않는가
  (ref/엔진 인스턴스로 보존). 노드 dispose 누수 없는가.
- **음원 규칙** — 미디/시퀀스 음원이 신스가 아닌 샘플드 기타를 쓰는가 (핵심 원칙 참조).
- 일반: 타입 안정성, 죽은 코드, 에러 처리, 접근성(키보드/aria) 누락.

### 출력 형식 / 행동

- 변경된 부분(diff)에만 집중한다. 바뀌지 않은 코드는 재리뷰하지 않는다.
- 심각도로 묶어서 출력: **[blocker]** 반드시 수정 / **[consider]** 고려할 만함 /
  **[nit]** 사소함.
- 각 항목은 `파일:줄` + 문제 한 줄 + 수정 제안 한 줄.
- 포매팅·스타일 잔소리는 하지 않는다 (ESLint가 담당). 실제 문제만 짚는다.
- 회의적으로 보되 간결하게. 진짜 문제가 없으면 그냥 `LGTM` 한 단어로.

### 리뷰 실행 방법

- 수동: `npm run review` — 현재 변경(diff)을 위 기준으로 헤드리스 리뷰.
- 자동(advisory): 커밋 시 체크 하네스가 AI 리뷰를 advisory 체크로 실행한다(출력만,
  커밋 차단 안 함). 하네스 전반은 "테스트 / 체크 하네스" 섹션 참조.

## 용어

- DI: 이펙트 안 거친 깨끗한(드라이) 기타 신호
- 체인(chain): 페달을 잇는 신호 경로. 순서가 소리를 바꾼다.
- 바이패스(bypass): 특정 페달을 신호 경로에서 잠시 끄는 것
