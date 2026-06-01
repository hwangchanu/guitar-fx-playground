// 오디오 엔진 공유 타입 (순수 TS — Tone 비의존).

/** 페달 파라미터(노브) 사양. UI가 이걸로 슬라이더를 자동 렌더한다. */
export interface ParamSpec {
  id: string
  label: string
  min: number
  max: number
  step: number
  default: number
  unit?: string
}

/** 페달의 정적 메타데이터 (Tone 노드 생성과 분리 — 리듀서/UI가 안전하게 import). */
export interface PedalSpec {
  kind: string
  label: string
  params: ParamSpec[]
}

/** 페달보드 상태의 한 항목 = 페달 인스턴스 1개. 직렬화 가능(나중에 URL 공유). */
export interface PedalEntry {
  id: string
  kind: string
  bypassed: boolean
  params: Record<string, number>
}

/** 페달보드 전체 상태 = UI의 단일 출처. 엔진은 이걸 받아 reconcile한다. */
export interface PedalboardState {
  pedals: PedalEntry[]
}
