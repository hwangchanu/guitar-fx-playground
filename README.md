# Guitar FX Playground

기타 이펙터 초보자를 위한 웹 체험 사이트. 여러 페달을 드래그로 엮고 순서를
바꿔가며 소리 차이를 직접 듣고, 옆 패널 설명으로 "왜 그런지"를 배운다.

프로젝트 방향·아키텍처·원칙은 [CLAUDE.md](CLAUDE.md) 참조.

## 스택

Vite + React + TypeScript · Tone.js(오디오) · dnd-kit(드래그) · Tailwind CSS v4

## 개발

```bash
npm install
npm run dev      # 개발 서버 (HMR)
npm run build    # 타입체크 + 프로덕션 빌드
npm run preview  # 빌드 결과 미리보기
npm run lint     # ESLint
npm run review   # 현재 변경에 대한 AI 코드 리뷰
```

커밋 시 `hooks/pre-commit`이 스테이징된 변경을 AI로 리뷰해 출력한다(커밋은 막지
않는 권고용). 끄려면 `git config --unset core.hooksPath`.
