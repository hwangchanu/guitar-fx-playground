// 페달별 UI 액센트(프레젠테이션). 오디오 spec과 분리한다 — 색은 UI 관심사라
// 오디오 레이어(audio/)에 두면 레이어 분리 원칙 위반. 액센트를 주려면 여기 한 곳만
// 추가하면 되고, 없으면 중립 회색으로 graceful fallback 한다.
export interface PedalAccent {
  card: string // 스톰박스 카드 그라데이션/테두리
  chip: string // "추가" 칩 텍스트/테두리/hover
}

const ACCENT: Record<string, PedalAccent> = {
  overdrive: {
    card: 'from-orange-900/40 to-orange-950/40 border-orange-800/50',
    chip: 'text-orange-400 border-orange-800 hover:bg-orange-950/50 hover:border-orange-500',
  },
  delay: {
    card: 'from-blue-900/40 to-blue-950/40 border-blue-800/50',
    chip: 'text-blue-400 border-blue-800 hover:bg-blue-950/50 hover:border-blue-500',
  },
  reverb: {
    card: 'from-purple-900/40 to-purple-950/40 border-purple-800/50',
    chip: 'text-purple-400 border-purple-800 hover:bg-purple-950/50 hover:border-purple-500',
  },
}

const FALLBACK: PedalAccent = {
  card: 'from-zinc-800 to-zinc-900 border-zinc-700',
  chip: 'text-zinc-300 border-zinc-700 hover:bg-zinc-800',
}

export const pedalAccent = (kind: string): PedalAccent => ACCENT[kind] ?? FALLBACK
