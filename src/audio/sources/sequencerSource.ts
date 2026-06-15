// 스텝 시퀀서 음원: 사용자가 찍은 그리드를 루프 재생한다. 기본 패턴 = 프리셋 리프라
// "찍기" 없이도 원클릭 재생이 동작한다. setPattern/setBpm은 내부 ref·transport만 갱신 →
// Tone 노드 재생성 없이 편집이 즉시 반영(노드 수명 원칙). output(sampler)은 안정적 참조.
import * as Tone from 'tone'
import type { Source } from './Source'
import { createGuitarSampler } from './guitarSampler'
import { SEQ_STEPS, activeNotesAt } from '../sequence/config'

export interface SequencerSource extends Source {
  setPattern(cells: boolean[][]): void
  setBpm(bpm: number): void
  getCurrentStep(): number // 재생 중 현재 스텝(0..15), 정지 시 -1. 플레이헤드 표시용.
}

export function createSequencerSource(
  initialCells: boolean[][],
  initialBpm: number,
): SequencerSource {
  let loaded = false
  let wantPlay = false
  let disposed = false
  let cells = initialCells // Tone.Sequence 콜백이 매 스텝 이 변수를 읽는다(편집 즉시 반영)
  let currentStep = -1 // 플레이헤드(소리와 싱크된 시점에 갱신)

  // 이 음원이 전역 트랜스포트의 유일한 사용자라 BPM을 직접 설정한다.
  const transport = Tone.getTransport()
  transport.bpm.value = initialBpm

  const sampler = createGuitarSampler(() => {
    if (disposed) return // 로드 전 dispose 시 좀비 start 방지
    loaded = true
    if (wantPlay) transport.start()
  })

  // 0..SEQ_STEPS-1 스텝을 16분음표로 순회(고정 길이라 노드 재생성 불필요).
  const steps = Array.from({ length: SEQ_STEPS }, (_, i) => i)
  const seq = new Tone.Sequence(
    (time, step) => {
      for (const note of activeNotesAt(cells, step)) {
        sampler.triggerAttackRelease(note, '16n', time)
      }
      // 오디오 스케줄 시간에 맞춰(룩어헤드 보정) 플레이헤드를 갱신해 소리와 싱크.
      Tone.getDraw().schedule(() => {
        currentStep = step
      }, time)
    },
    steps,
    '16n',
  )
  seq.start(0)

  return {
    output: sampler,
    play() {
      if (loaded) transport.start()
      else wantPlay = true // 로드되면 onload에서 시작
    },
    stop() {
      wantPlay = false
      transport.stop()
      currentStep = -1
    },
    setPattern(next) {
      cells = next
    },
    setBpm(bpm) {
      transport.bpm.value = bpm
    },
    getCurrentStep() {
      return currentStep
    },
    dispose() {
      disposed = true
      wantPlay = false
      transport.stop()
      currentStep = -1
      seq.dispose()
      sampler.dispose()
    },
  }
}
