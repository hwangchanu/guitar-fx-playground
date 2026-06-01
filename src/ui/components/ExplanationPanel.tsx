import { PEDAL_CONTENT } from '../../content/pedals'
import { PEDAL_SPECS } from '../../audio/pedals/specs'

interface Props {
  kind: string | null
}

export function ExplanationPanel({ kind }: Props) {
  const content = kind ? PEDAL_CONTENT[kind] : null
  const spec = kind ? PEDAL_SPECS[kind] : null

  if (!content || !spec) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="space-y-3 text-center">
          <div className="text-4xl">🎸</div>
          <p className="text-sm text-zinc-400">페달을 선택하면 설명이 여기 표시됩니다.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full space-y-6 p-6">
      <div>
        <h2 className="mb-2 text-2xl font-bold text-amber-400">{spec.label}</h2>
        <div className="h-1 w-16 rounded-full bg-amber-500" />
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-zinc-400">효과</h3>
          <p className="leading-relaxed text-zinc-200">{content.description}</p>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-zinc-400">순서</h3>
          <p className="leading-relaxed text-zinc-200">{content.whyOrder}</p>
        </div>
      </div>

      <div className="border-t border-zinc-800 pt-4">
        <p className="text-xs italic text-zinc-500">
          팁: 페달을 드래그해 순서를 바꾸고, 다양한 신호 체인을 실험해보세요.
        </p>
      </div>
    </div>
  )
}
