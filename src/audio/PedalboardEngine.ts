// 오케스트레이터: [음원] → [페달 체인] → [출력].
// 상태(PedalboardState)를 받아 Tone 그래프를 그에 맞춰 reconcile한다.
// 노드는 한 번 만들어 재사용하고, 순서변경은 재연결일 뿐 재생성이 아니다.
import * as Tone from 'tone'
import type { Source } from './sources/Source'
import type { PedalInstance } from './pedals/Pedal'
import type { PedalboardState } from './types'
import { PEDAL_FACTORIES } from './pedals/factories'
import { computeChain } from './engine/computeChain'

interface ManagedPedal {
  kind: string
  pedal: PedalInstance
}

export class PedalboardEngine {
  private readonly source: Source
  private readonly instances = new Map<string, ManagedPedal>()
  private started = false

  constructor(source: Source) {
    this.source = source
  }

  /** 첫 호출 시 AudioContext를 재개(사용자 제스처 필요)한 뒤 음원 재생. */
  async play(): Promise<void> {
    if (!this.started) {
      await Tone.start()
      this.started = true
    }
    this.source.play()
  }

  stop(): void {
    this.source.stop()
  }

  /** 상태에 맞춰 노드를 생성/제거하고 체인을 재연결한다. */
  reconcile(state: PedalboardState): void {
    const wanted = new Set(state.pedals.map((p) => p.id))

    // 사라진 페달 dispose
    for (const [id, managed] of this.instances) {
      if (!wanted.has(id)) {
        managed.pedal.dispose()
        this.instances.delete(id)
      }
    }

    // 신규 페달 생성 + 모든 파라미터 적용
    for (const entry of state.pedals) {
      let managed = this.instances.get(entry.id)
      if (!managed) {
        const factory = PEDAL_FACTORIES[entry.kind]
        if (!factory) continue
        managed = { kind: entry.kind, pedal: factory() }
        this.instances.set(entry.id, managed)
      }
      for (const [paramId, value] of Object.entries(entry.params)) {
        managed.pedal.setParam(paramId, value)
      }
    }

    this.rewire(state)
  }

  /** source → (바이패스 아닌 페달 순서대로) → destination 으로 재연결. */
  private rewire(state: PedalboardState): void {
    this.source.output.disconnect()
    for (const { pedal } of this.instances.values()) pedal.output.disconnect()

    let prev: Tone.ToneAudioNode = this.source.output
    for (const id of computeChain(state)) {
      const managed = this.instances.get(id)
      if (!managed) continue
      prev.connect(managed.pedal.input)
      prev = managed.pedal.output
    }
    prev.connect(Tone.getDestination())
  }

  dispose(): void {
    this.source.output.disconnect()
    for (const { pedal } of this.instances.values()) pedal.dispose()
    this.instances.clear()
    this.source.dispose()
  }
}
