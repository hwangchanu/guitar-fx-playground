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
      <p className="text-sm text-zinc-500">
        페달을 클릭하면 설명이 여기 표시됩니다.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">{spec.label}</h2>
      <p className="text-sm">{content.description}</p>
      <div>
        <h3 className="text-sm font-medium">체인 순서가 왜 중요한가</h3>
        <p className="mt-1 text-sm text-zinc-500">{content.whyOrder}</p>
      </div>
    </div>
  )
}
