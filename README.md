# 🎸 Guitar FX Playground

[![CI](https://github.com/hwangchanu/guitar-fx-playground/actions/workflows/ci.yml/badge.svg)](https://github.com/hwangchanu/guitar-fx-playground/actions/workflows/ci.yml)

기타 이펙터 **초보자**와 **연습생**을 위한 웹 체험 및 트레이닝 플레이그라운드. 
여러 이펙터 페달을 드래그로 자유롭게 엮어 소리 차이를 듣고 작동 방식을 배우는 것은 물론, 메트로놈에 맞춰 크로매틱을 연습하고 정밀 피치·타이밍·다이내믹스 분석 리포트를 받아볼 수 있습니다.

🔗 **라이브 데모 → <https://guitar-fx-playground.vercel.app>**

> 앰프도 기타도 없이 브라우저에서 바로. 진짜 클린 일렉기타 샘플(CC0)에 페달을 걸고, 나의 연주를 녹음하여 분석해보세요.

---

## ✨ 핵심 기능

### 🎛️ 이펙터 페달보드 (Pedalboard)
- **페달 7종 완비** — Overdrive · Delay · Reverb · Compressor · Chorus · Filter · EQ (3밴드)
- **드래그로 순서 변경 & 바이패스** — `dnd-kit` 기반의 직관적인 UI로 "체인 순서가 소리를 바꾼다"는 직관을 직접 체험.
- **EQ 어드바이저** — 현재 사운드의 톤 프로파일을 실시간 분석하고, 목표로 하는 음색(따뜻함/밝음/스쿱드/미드)에 맞춤화된 EQ 노브 보정값 추천 및 원클릭 적용.
- **실시간 오디오 시각화** — 오실로스코프(출력 파형) + 주파수 스펙트럼 분석 그래프 + 톤 리드아웃(밝기, 대역, 새츄레이션) 정보 제공.
- **URL 공유 시스템** — 활성화된 페달, 파라미터 값, 시퀀스 등 보드의 모든 상태를 URL 해시로 압축 인코딩하여 서버 없이도 완벽한 링크 공유 지원.

### 🎹 미디 시퀀서 (MIDI Sequencer)
- **펜타토닉 스텝 시퀀서** — 간단히 마우스 클릭만으로 매력적인 기타 리프를 작성하고 오디오 엔진으로 재생.
- **리얼 DI 샘플 기반 재생** — 합성 신시사이저 소리가 아닌 펜더 일렉기타의 다이렉트(DI) 샘플(CC0)을 가상 악기(Sampler)로 탑재하여 디스토션을 먹였을 때 가장 실제 일렉기타다운 현실적인 반응을 구현.

### 🎯 크로매틱 연습 & 연주 분석 (Chromatic Practice)
- **자체 고정밀 메트로놈** — Tone.js의 스케줄러(`Tone.Loop`)를 활용해 지터(Jitter) 없이 칼같이 맞아떨어지는 템포(BPM)를 유지하고 메트로놈 비트 시각화 지원.
- **연습 오디오 녹음 및 파일 업로드** — 마이크(`MediaRecorder` API)를 통한 내 실물 기타의 녹음 뿐만 아니라 기존 녹음된 오디오 파일(WAV, MP3 등) 업로드 분석을 지원.
- **오프라인 연주 분석 엔진 (Offline Analysis)** — 실시간 피치 검출의 지연(Latency) 및 모니터링 피드백(하울링) 문제를 방지하기 위해 **오프라인 사후 분석 아키텍처** 채택.
  - **피치 분석 (Pitch Tracking)**: YIN/AMDF 기반 알고리즘을 사용해 크로매틱 음계를 정확히 짚었는지 편차 시각화.
  - **타이밍 및 어택 분석 (Onset Detection)**: 메트로놈 클릭 순간과 피킹 어택 간의 정밀한 타이밍 오차 분석 및 타임라인 그리드 뷰 제공.
  - **다이내믹스 균일도 분석 (Dynamics Analysis)**: 각 노트의 피크 볼륨을 추적하여 고르고 일관된 피킹 힘을 유도.

---

## 🧱 시스템 아키텍처 & 설계 원칙

1. **오디오 엔진(Pure TS) ↔ UI 레이어(React)의 철저한 관심사 분리**
   - 모든 Tone.js 오디오 그래프 구조와 로직은 React 의존성이 없는 순수 TypeScript 클래스/모듈로 설계.
   - UI는 상태 저장소(Store)와 React 훅을 통해서만 엔진 API에 간접적으로 접근하여 UI 테마나 디자인이 대대적으로 개편되더라도 핵심 오디오 기능에 영향이 없도록 설계.
2. **사후 오프라인 분석 파이프라인**
   - 실시간 튜너나 입력 분석에서 마이크 신호를 다이렉트로 스피커에 송출하는 것을 제한하고, 녹음된 버퍼를 로컬 브라우저 단에서 고속 연산 처리하여 지연 및 하울링 노이즈를 근본적으로 해방.
3. **무상태(Stateless) & 서버리스(Serverless) 지향**
   - 회원가입이나 데이터베이스 등의 리액티브 서버 환경을 배제하고, 로컬 오디오 버퍼 가공 및 URL을 활용한 플레이트 정보의 양방향 직렬화(URL Hash Encoding)를 통해 완벽한 정적 배포 유지.

---

## 🛠 기술 스택

- **Vite** & **React** (v19) & **TypeScript**
- **Tone.js** & **Web Audio API** (오디오 합성, 가공, 렌더링)
- **dnd-kit** (페달보드 드래그 앤 드롭 정렬)
- **Tailwind CSS v4** (현대적이고 감각적인 UI/UX 스타일링)

---

## 🚀 개발 및 빌드 명령어

```bash
npm install        # prepare 훅이 로컬 git hooksPath를 자동으로 설정
npm run dev        # 로컬 HMR 개발 서버 기동
npm run build      # 타입 검사 + 프로덕션 빌드
npm run preview    # 빌드된 배포 아티팩트의 로컬 미리보기
npm run lint       # ESLint 정적 분석 실행
npm run test       # 단위 테스트 실행 (Vitest)
npm run e2e        # Playwright를 사용한 E2E 스모크 테스트
npm run check      # CI 체크 하네스 전체 실행 (Typecheck · Lint · Unit · Build · E2E)
npm run review     # 로컬 git diff 기반 AI 코드 리뷰 실행
```

---

## ✅ 품질 제어 (CI/CD & Git Hooks)

프로젝트는 `scripts/harness.mjs`에 등록된 선언적 레지스트리에 의해 모든 품질 검사를 수행합니다.

- **Git Hooks**:
  - `pre-commit` 단계: `typecheck`, `lint`, `unit test` 및 `ai-review(advisory)` 실행.
  - `pre-push` 단계: 전체 `build`, `e2e` 테스트 실행.
- **GitHub Actions**: 
  - 리포지토리 푸시 또는 PR 시 `.github/workflows/ci.yml`이 실행되어 원격 환경에서 전체 체크 하네스 테스트를 보증.
- **AI 코드 리뷰**: 
  - AI 리뷰는 권고(advisory, `blocking: false`) 단계입니다. 만약 선행되는 필수 빌드나 테스트가 실패하면, 하네스는 실패 로그를 AI 리뷰 프롬프트의 표준 입력(stdin)으로 주입해 AI가 소스 코드 분석과 함께 구체적인 **실패 원인 설명 및 수정안**을 가이드하도록 자동화되어 있습니다.

---

## 🙏 크레딧 및 참조

- **기타 다이렉트 샘플**: [FreePats — Clean Electric Guitar](https://freepats.zenvoid.org/ElectricGuitar/clean-electric-guitar.html), CC0 1.0 (Public Domain). Fender 일렉트릭 기타 Direct Input(DI) 레코딩 사운드.
