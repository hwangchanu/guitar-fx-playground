// 스텝 시퀀서 설정 (순수 데이터 — Tone 비의존). 소스·리듀서·UI가 공유한다.
// specs.ts처럼 오디오-도메인 데이터를 UI가 import하는 패턴.

/** 한 마디 = 16스텝(16분음표). 고정 길이라 Tone.Sequence 길이가 불변 → 노드 재생성 회피. */
export const SEQ_STEPS = 16

/**
 * 그리드 행(피치). 위→아래 = 높은음→낮은음. E 마이너 펜타토닉이라 아무렇게나 찍어도
 * 어울린다(초보자 타깃). 기본 리프 음(E2/A2/G3/B3) 포함. Sampler가 매핑 음 사이를 보간.
 */
export const SEQ_ROWS = ['B3', 'G3', 'E3', 'D3', 'B2', 'A2', 'G2', 'E2'] as const

/** 빈 그리드 (모든 칸 off). */
export function emptyCells(): boolean[][] {
  return SEQ_ROWS.map(() => Array<boolean>(SEQ_STEPS).fill(false))
}

// 기본 리프: [스텝, 음]. 8분음표 리프를 16스텝(짝수 칸)에 배치.
const DEFAULT_RIFF: ReadonlyArray<readonly [number, string]> = [
  [0, 'E2'],
  [2, 'E2'],
  [4, 'G3'],
  [6, 'E2'],
  [8, 'A2'],
  [10, 'E2'],
  [12, 'B3'],
  [14, 'G3'],
]

/** 기본 리프를 그리드로. */
export function defaultCells(): boolean[][] {
  const cells = emptyCells()
  for (const [step, note] of DEFAULT_RIFF) {
    const row = SEQ_ROWS.indexOf(note as (typeof SEQ_ROWS)[number])
    if (row !== -1 && step < SEQ_STEPS) cells[row]![step] = true
  }
  return cells
}

/** 해당 스텝에서 켜진 칸들의 음 이름 목록 (순수, 테스트 대상). */
export function activeNotesAt(cells: boolean[][], step: number): string[] {
  const notes: string[] = []
  for (let row = 0; row < SEQ_ROWS.length; row++) {
    if (cells[row]?.[step]) notes.push(SEQ_ROWS[row]!)
  }
  return notes
}
