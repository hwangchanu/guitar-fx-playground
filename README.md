# 🎸 Guitar FX Playground

[![CI](https://github.com/hwangchanu/guitar-fx-playground/actions/workflows/ci.yml/badge.svg)](https://github.com/hwangchanu/guitar-fx-playground/actions/workflows/ci.yml)

기타 이펙터 **초보자**를 위한 웹 체험 사이트. 여러 페달을 드래그로 자유롭게 엮고, 순서를
바꿔가며 소리 차이를 직접 듣고, 옆 패널 설명으로 **"왜 그런지"** 를 배운다.

🔗 **라이브 데모 → <https://guitar-fx-playground.vercel.app>**

> 앰프도 기타도 없이 브라우저에서 바로. 진짜 클린 일렉기타 샘플(CC0)에 페달을 걸어보세요.

## ✨ 기능

- 🎛️ **페달 7종** — Overdrive · Delay · Reverb · Compressor · Chorus · Filter · EQ(3밴드)
- 🔀 **드래그로 순서 변경 · 바이패스** — "체인 순서가 소리를 바꾼다"를 직접 체험
- 📖 **설명 패널** — 페달별 효과 + 순서가 왜 중요한가 + "파형에서 볼 점"
- 🎹 **미디 찍기 모드** — 펜타토닉 스텝 시퀀서로 직접 리프를 찍어 연주 (재생 플레이헤드)
- 📈 **실시간 시각화·분석** — 출력 파형(오실로스코프) + 스펙트럼 + 톤 readout(밝기·대역·새츄레이션)
- 🔗 **URL 공유** — 페달 체인 + 시퀀스를 링크 하나로 공유 (서버 없이 상태를 URL 해시에 인코딩)

## 🧱 구조

- **백엔드 없음 · 순수 정적 SPA.** 모든 오디오 처리는 Web Audio(Tone.js)로 브라우저에서 수행.
- **오디오 엔진 레이어(순수 TS) ↔ UI 레이어(React) 분리.** 구조는 항상 `[음원] → [페달 체인] →
  [출력]`, 음원·페달은 교체 가능한 모듈(레지스트리). UI는 엔진 훅으로만 접근.
- 자세한 아키텍처·원칙은 [CLAUDE.md](CLAUDE.md).

## 🛠 스택

Vite · React · TypeScript · **Tone.js**(오디오) · **dnd-kit**(드래그) · Tailwind CSS v4

## 🚀 개발

```bash
npm install        # prepare 훅이 git hooksPath를 자동 설정
npm run dev        # 개발 서버 (HMR)
npm run build      # 타입체크 + 프로덕션 빌드
npm run preview    # 빌드 결과 미리보기
npm run lint       # ESLint
npm run test       # 단위 테스트 (vitest)
npm run e2e        # Playwright 스모크
npm run check      # 전체 체크 하네스 (CI와 동일)
npm run review     # 현재 변경에 대한 AI 코드 리뷰
```

## ✅ 품질 (테스트 하네스)

`scripts/harness.mjs`의 선언적 레지스트리로 typecheck · lint · unit · build · e2e를 단계별로
실행한다. 커밋(`pre-commit`) · 푸시(`pre-push`) · CI에서 게이트하고, **AI 리뷰는 advisory**
(실패 시 로그를 받아 원인까지 해설). 자세히는 CLAUDE.md "테스트 / 체크 하네스" 섹션.

## 🙏 크레딧

- 기타 샘플(`public/audio/guitar/`): [FreePats — Clean Electric Guitar](https://freepats.zenvoid.org/ElectricGuitar/clean-electric-guitar.html), CC0 1.0 (퍼블릭 도메인). 펜더 일렉기타 다이렉트(DI) 녹음.
